import ExpedicaoRegistro from "../models/ExpedicaoRegistro.js";
import ExpedicaoMeta from "../models/ExpedicaoMeta.js";
import ExpedicaoDiaEncerrado from "../models/ExpedicaoDiaEncerrado.js";
import { emitSSE } from "../utils/emitSSE.js";

/**
 * Obtém a data de início do dia (00:00:00)
 */
function getStartOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Obtém o próximo dia útil
 */
function getNextDay(date = new Date()) {
  const d = new Date(date);
  d.setDate(d.getDate() + 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Determina a data de contabilização (considera se o dia foi encerrado)
 */
async function getDataContabilizacao() {
  const hoje = getStartOfDay();
  const diaEncerrado = await ExpedicaoDiaEncerrado.findOne({ data: hoje });
  
  if (diaEncerrado) {
    return getNextDay(hoje);
  }
  
  return hoje;
}

/**
 * Formata data para string YYYY-MM-DD
 */
function formatDate(date) {
  return date.toISOString().split("T")[0];
}

export default {
  /**
   * 1. Verificar Código de Barras (Duplicidade)
   * GET /expedicao/verificar/:orderId
   */
  async verificar(req, res) {
    try {
      const { orderId } = req.params;

      const registro = await ExpedicaoRegistro.findOne({ orderId });

      if (registro) {
        return res.status(200).json({
          existe: true,
          registro: {
            orderId: registro.orderId,
            mesaId: registro.mesaId,
            seller: registro.seller,
            dataContabilizacao: registro.dataContabilizacao,
            createdAt: registro.createdAt,
          },
        });
      }

      return res.status(404).json({
        existe: false,
        message: "Código não encontrado",
      });
    } catch (error) {
      console.error("Erro ao verificar código:", error);
      return res.status(500).json({ error: "Erro interno do servidor" });
    }
  },

  /**
   * 2. Registrar Novo Pacote
   * POST /expedicao/registrar
   */
  async registrar(req, res) {
    try {
      const { orderId, mesaId, seller } = req.body;

      // Validações
      if (!orderId || !mesaId) {
        return res.status(400).json({ 
          success: false,
          error: "orderId e mesaId são obrigatórios" 
        });
      }

      if (!["M1", "M2", "M3", "M4"].includes(mesaId)) {
        return res.status(400).json({ 
          success: false,
          error: "mesaId deve ser M1, M2, M3 ou M4" 
        });
      }

      if (seller && !["mercadoLivre", "shopee", "amazon", "outros"].includes(seller)) {
        return res.status(400).json({ 
          success: false,
          error: "seller inválido. Deve ser: mercadoLivre, shopee, amazon ou outros" 
        });
      }

      // Verificar duplicidade
      const existe = await ExpedicaoRegistro.findOne({ orderId });
      if (existe) {
        return res.status(409).json({
          success: false,
          error: "Código de barras já registrado",
          registroAnterior: {
            orderId: existe.orderId,
            mesaId: existe.mesaId,
            seller: existe.seller,
            dataContabilizacao: existe.dataContabilizacao,
            createdAt: existe.createdAt,
          },
        });
      }

      // data de contabilização
      const hoje = getStartOfDay();
      const diaEncerrado = await ExpedicaoDiaEncerrado.findOne({ data: hoje });
      
      let dataContabilizacao;
      let avisos = null;
      
      if (diaEncerrado) {
        // registrar para próximo dia
        dataContabilizacao = getNextDay(hoje);
        avisos = {
          diaEncerrado: true,
          message: `Dia ${formatDate(hoje)} foi encerrado. Pacote contabilizado para ${formatDate(dataContabilizacao)}.`,
        };
      } else {
        dataContabilizacao = hoje;
        avisos = {
          diaEncerrado: false,
        };
      }

      
      const novoRegistro = await ExpedicaoRegistro.create({
        orderId,
        mesaId,
        seller: seller || null,
        dataContabilizacao,
      });

      
      emitSSE("expedicao:update", {
        tipo: "novo_pacote",
        mesa: mesaId,
        orderId,
        seller: seller || null,
        dataContabilizacao: formatDate(dataContabilizacao),
        timestamp: new Date(),
      });

      return res.status(201).json({
        success: true,
        registro: {
          _id: novoRegistro._id,
          orderId: novoRegistro.orderId,
          mesaId: novoRegistro.mesaId,
          seller: novoRegistro.seller,
          dataContabilizacao: novoRegistro.dataContabilizacao,
          createdAt: novoRegistro.createdAt,
        },
        avisos,
      });
    } catch (error) {
      console.error("Erro ao registrar pacote:", error);
      return res.status(500).json({ 
        success: false,
        error: "Erro interno do servidor" 
      });
    }
  },

  /**
   * obter meta do dia
   * GET /expedicao/meta
   */
  async obterMeta(req, res) {
    try {
      let dataConsulta;
      
      if (req.query.data) {
        dataConsulta = getStartOfDay(new Date(req.query.data));
      } else {
        // se nao existe, usar data  atual
        dataConsulta = await getDataContabilizacao();
      }

      // verificar se dia encerrado
      const hoje = getStartOfDay();
      const diaEncerrado = await ExpedicaoDiaEncerrado.findOne({ data: hoje });

      const meta = await ExpedicaoMeta.findOne({ data: dataConsulta });

      if (meta) {
        return res.status(200).json({
          data: formatDate(dataConsulta),
          tipoConfiguracao: meta.tipoConfiguracao,
          total: meta.tipoConfiguracao === "total" ? meta.total : null,
          porSeller: meta.tipoConfiguracao === "porSeller" ? meta.porSeller : null,
          horariosColeta: meta.horariosColeta || {
            mercadoLivre: "11:00",
            shopee: "14:00",
            amazon: "16:00",
            outros: "17:30",
          },
          diaEncerrado: !!diaEncerrado,
        });
      }

      return res.status(200).json({
        data: formatDate(dataConsulta),
        tipoConfiguracao: null,
        total: 0,
        porSeller: {
          mercadoLivre: 0,
          shopee: 0,
          amazon: 0,
          outros: 0,
        },
        horariosColeta: {
          mercadoLivre: "11:00",
          shopee: "14:00",
          amazon: "16:00",
          outros: "17:30",
        },
        diaEncerrado: !!diaEncerrado,
      });
    } catch (error) {
      console.error("Erro ao obter meta:", error);
      return res.status(500).json({ error: "Erro interno do servidor" });
    }
  },

  /**
   * meta do Dia
   * POST /expedicao/meta
   */
  async configurarMeta(req, res) {
    try {
      const { tipoConfiguracao, total, porSeller, horariosColeta, data } = req.body;

      // Validações
      if (!tipoConfiguracao || !["total", "porSeller"].includes(tipoConfiguracao)) {
        return res.status(400).json({
          success: false,
          error: 'tipoConfiguracao é obrigatório e deve ser "total" ou "porSeller"',
        });
      }

      if (tipoConfiguracao === "total") {
        if (total === undefined || total === null) {
          return res.status(400).json({
            success: false,
            error: 'Campo "total" é obrigatório quando tipoConfiguracao é "total"',
          });
        }
        if (porSeller !== undefined && porSeller !== null) {
          return res.status(400).json({
            success: false,
            error: 'Campo "porSeller" deve ser null quando tipoConfiguracao é "total"',
          });
        }
      }

      if (tipoConfiguracao === "porSeller") {
        if (!porSeller || typeof porSeller !== "object") {
          return res.status(400).json({
            success: false,
            error: 'Campo "porSeller" é obrigatório quando tipoConfiguracao é "porSeller"',
          });
        }
        if (total !== undefined && total !== null) {
          return res.status(400).json({
            success: false,
            error: 'Campo "total" deve ser null quando tipoConfiguracao é "porSeller"',
          });
        }
      }

      // data da meta
      const dataMeta = data ? getStartOfDay(new Date(data)) : await getDataContabilizacao();

      const dadosMeta = {
        data: dataMeta,
        tipoConfiguracao,
        total: tipoConfiguracao === "total" ? total : null,
        porSeller: tipoConfiguracao === "porSeller" ? porSeller : null,
        horariosColeta: horariosColeta || {
          mercadoLivre: "11:00",
          shopee: "14:00",
          amazon: "16:00",
          outros: "17:30",
        },
      };

      const meta = await ExpedicaoMeta.findOneAndUpdate(
        { data: dataMeta },
        dadosMeta,
        { new: true, upsert: true }
      );

      return res.status(200).json({
        success: true,
        meta: {
          _id: meta._id,
          data: formatDate(meta.data),
          tipoConfiguracao: meta.tipoConfiguracao,
          total: meta.total,
          porSeller: meta.porSeller,
          horariosColeta: meta.horariosColeta,
          createdAt: meta.createdAt,
          updatedAt: meta.updatedAt,
        },
      });
    } catch (error) {
      console.error("Erro ao configurar meta:", error);
      return res.status(500).json({ 
        success: false,
        error: "Erro interno do servidor" 
      });
    }
  },

  /**
   * 5. Encerrar Dia
   * POST /expedicao/encerrar-dia
   */
  async encerrarDia(req, res) {
    try {
      const { data } = req.body;

      // Determinar data a ser encerrada
      let dataEncerrar;
      if (data) {
        dataEncerrar = getStartOfDay(new Date(data));
      } else {
        dataEncerrar = getStartOfDay();
      }

      // Validar se não é data futura
      const hoje = getStartOfDay();
      if (dataEncerrar > hoje) {
        return res.status(400).json({
          success: false,
          error: "Não é possível encerrar dias futuros",
        });
      }

      // Verificar se já foi encerrado
      const jaEncerrado = await ExpedicaoDiaEncerrado.findOne({ data: dataEncerrar });
      if (jaEncerrado) {
        return res.status(409).json({
          success: false,
          error: "Este dia já foi encerrado anteriormente",
          encerradoEm: jaEncerrado.encerradoEm,
        });
      }

      // Calcular total de pacotes do dia
      const totalPacotes = await ExpedicaoRegistro.countDocuments({
        dataContabilizacao: dataEncerrar,
      });

      // Obter usuário que está encerrando (se disponível no req.user)
      const encerradoPor = req.user?.id || req.user?._id || "sistema";

      // Criar registro de encerramento
      const diaEncerrado = await ExpedicaoDiaEncerrado.create({
        data: dataEncerrar,
        encerradoEm: new Date(),
        encerradoPor: String(encerradoPor),
        totalPacotes,
      });

      // Emitir evento SSE
      emitSSE("expedicao:dia_encerrado", {
        tipo: "dia_encerrado",
        data: formatDate(dataEncerrar),
        totalPacotes,
        timestamp: new Date(),
      });

      // Calcular próximo dia
      const proximoDia = getNextDay(dataEncerrar);

      return res.status(200).json({
        success: true,
        diaEncerrado: {
          _id: diaEncerrado._id,
          data: formatDate(diaEncerrado.data),
          encerradoEm: diaEncerrado.encerradoEm,
          encerradoPor: diaEncerrado.encerradoPor,
          totalPacotes: diaEncerrado.totalPacotes,
          createdAt: diaEncerrado.createdAt,
        },
        message: `Dia ${formatDate(dataEncerrar)} encerrado com sucesso. Próximos registros serão contabilizados para ${formatDate(proximoDia)}.`,
      });
    } catch (error) {
      console.error("Erro ao encerrar dia:", error);
      return res.status(500).json({ 
        success: false,
        error: "Erro interno do servidor" 
      });
    }
  },

  /**
   * 6. Verificar se Dia foi Encerrado
   * GET /expedicao/dia-encerrado
   */
  async verificarDiaEncerrado(req, res) {
    try {
      const { data } = req.query;

      // Determinar data a verificar
      let dataVerificar;
      if (data) {
        dataVerificar = getStartOfDay(new Date(data));
      } else {
        dataVerificar = getStartOfDay();
      }

      const diaEncerrado = await ExpedicaoDiaEncerrado.findOne({ data: dataVerificar });

      if (diaEncerrado) {
        const proximoDia = getNextDay(dataVerificar);

        return res.status(200).json({
          encerrado: true,
          data: formatDate(dataVerificar),
          encerradoEm: diaEncerrado.encerradoEm,
          totalPacotes: diaEncerrado.totalPacotes,
          proximoDiaUtil: formatDate(proximoDia),
        });
      }

      return res.status(200).json({
        encerrado: false,
        data: formatDate(dataVerificar),
      });
    } catch (error) {
      console.error("Erro ao verificar dia encerrado:", error);
      return res.status(500).json({ error: "Erro interno do servidor" });
    }
  },

  /**
   * 7. Obter Produtividade (Dashboard)
   * GET /expedicao/produtividade
   */
  async produtividade(req, res) {
    try {
      // Determinar data de contabilização
      const dataConsulta = req.query.data 
        ? getStartOfDay(new Date(req.query.data))
        : await getDataContabilizacao();

      // Verificar se dia foi encerrado
      const hoje = getStartOfDay();
      const diaEncerrado = await ExpedicaoDiaEncerrado.findOne({ data: hoje });

      // Buscar meta do dia
      const meta = await ExpedicaoMeta.findOne({ data: dataConsulta });

      // Buscar registros do dia (baseado em dataContabilizacao)
      const registros = await ExpedicaoRegistro.find({
        dataContabilizacao: dataConsulta,
      });

      const totalGeral = registros.length;

      // Calcular por seller
      const porSellerContagem = await ExpedicaoRegistro.aggregate([
        {
          $match: {
            dataContabilizacao: dataConsulta,
          },
        },
        {
          $group: {
            _id: "$seller",
            count: { $sum: 1 },
          },
        },
      ]);

      let porSeller;
      if (meta && meta.tipoConfiguracao === "porSeller") {
        // Formato detalhado com metas
        porSeller = {};
        const sellers = ["mercadoLivre", "shopee", "amazon", "outros"];
        
        sellers.forEach((seller) => {
          const contagem = porSellerContagem.find((p) => p._id === seller);
          const atual = contagem ? contagem.count : 0;
          const metaSeller = meta.porSeller?.[seller] || 0;
          porSeller[seller] = {
            atual,
            meta: metaSeller,
            porcentagem: metaSeller > 0 ? (atual / metaSeller) * 100 : 0,
          };
        });
      } else {
        // Formato simples sem metas
        porSeller = {
          mercadoLivre: 0,
          shopee: 0,
          amazon: 0,
          outros: 0,
        };
        porSellerContagem.forEach((item) => {
          if (item._id && porSeller[item._id] !== undefined) {
            porSeller[item._id] = item.count;
          }
        });
      }

      // Calcular porcentagem concluída (se meta for total)
      let porcentagemConcluida = null;
      if (meta && meta.tipoConfiguracao === "total" && meta.total > 0) {
        porcentagemConcluida = (totalGeral / meta.total) * 100;
      }

      // Calcular por mesa
      const mesas = ["M1", "M2", "M3", "M4"];
      const porMesa = {};

      for (const mesa of mesas) {
        const registrosMesa = registros.filter((r) => r.mesaId === mesa);

        // Total do dia
        const totalDia = registrosMesa.length;

        // Ritmo atual (últimos 60 minutos - usa createdAt)
        const agora = new Date();
        const umHoraAtras = new Date(agora.getTime() - 60 * 60 * 1000);
        const ritmoAtual = await ExpedicaoRegistro.countDocuments({
          mesaId: mesa,
          createdAt: { $gte: umHoraAtras, $lte: agora },
        });

        // Por hora (usa createdAt para hora, mas filtra por dataContabilizacao)
        const porHora = {
          "07:00 às 08:00": 0,
          "08:00 às 09:00": 0,
          "09:00 às 10:00": 0,
          "10:00 às 11:00": 0,
          "11:00 às 12:00": 0,
          "12:00 às 13:00": 0,
          "13:00 às 14:00": 0,
          "14:00 às 15:00": 0,
          "15:00 às 16:00": 0,
          "16:00 às 17:00": 0,
        };

        registrosMesa.forEach((reg) => {
          const hora = reg.createdAt.getHours();
          const faixa = `${hora.toString().padStart(2, "0")}:00 às ${(hora + 1)
            .toString()
            .padStart(2, "0")}:00`;
          if (porHora[faixa] !== undefined) {
            porHora[faixa]++;
          }
        });

        porMesa[mesa] = { totalDia, ritmoAtual, porHora };
      }

      return res.status(200).json({
        data: formatDate(dataConsulta),
        diaEncerrado: !!diaEncerrado,
        meta: meta
          ? {
              tipoConfiguracao: meta.tipoConfiguracao,
              total: meta.tipoConfiguracao === "total" ? meta.total : null,
              porSeller: meta.tipoConfiguracao === "porSeller" ? meta.porSeller : null,
            }
          : null,
        totalGeral,
        porcentagemConcluida,
        porSeller,
        porMesa,
      });
    } catch (error) {
      console.error("Erro ao obter produtividade:", error);
      return res.status(500).json({ error: "Erro interno do servidor" });
    }
  },
};

