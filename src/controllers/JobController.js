import mongoose from "mongoose";
import Job from "../models/Job.js";
import User from "../models/User.js";
import Log from "../models/Log.js";
import verifyToken from "../middleware/authMiddleware.js";
import LogController from "./LogController.js";


const custoPorMetro = 0.4;

const JobController = {

  emitSSE(event, data) {
    if (global.sseClients && global.sseClients.length > 0) {
      global.sseClients.forEach((client) => {
        client.write(`event: ${event}\n`);
        client.write(`data: ${JSON.stringify(data)}\n\n`);
      });
    }
  },
  async storeJob(req, res) {
    const localDate = new Date();


    const { userId, role, ownerId } = await verifyToken.recoverAuth(req, res);
    const uidToQuery = role === "owner" ? String(userId) : String(ownerId);

    const {
      lote,
      qtd,
      larg,
      compr,
      emenda,
      totMetros,
      orcamento,
      qtdRolo,
      recebidoConferido,
      lotePronto,
      recebido,
      aprovado,
      emAnalise,
      isArchived,
      pago,
      dataPgto,
      faccionistaId,
      observacao,
    } = req.body;

    try {
      const job = new Job({
        lote,
        data: new Date(localDate.getTime()).toISOString(),
        qtd,
        larg,
        compr,
        emenda,
        totMetros,
        orcamento,
        qtdRolo,
        recebidoConferido,
        lotePronto,
        recebido,
        emAnalise,
        isArchived,
        aprovado,
        pago,
        dataPgto,
        faccionistaId,
        observacao,
        ownerId: uidToQuery,
      });

      const jobSaved = await job.save();

      await LogController.logJobChange({
        jobId: jobSaved._id,
        userId,
        action: "create",
        newValue: jobSaved.toObject(),
        req,
        res
      });

      return res.send(jobSaved);
    } catch (error) {
      return res.end("Erro ao salvar costura:", error);
    }
  },

  async indexJobs(req, res) {
    let { faccionistaId } = req.params;
    if (!faccionistaId) faccionistaId = await verifyToken.recoverUid(req, res);

    try {

      const Jobs = await Job.find({ faccionistaId }).select("-password").sort({ data: -1 });

      return res.json(Jobs);
    } catch (error) {
      console.error("Erro ao buscar jobs:", error);
      throw new Error("Erro ao buscar jobs");
    }
  },

  async updateJob(req, res) {
    const { id } = req.params;
    const { field, ids } = req.body;
    const localDate = new Date();
    const userId = await verifyToken.recoverUid(req, res);



    if (!["recebidoConferido", "lotePronto", "pago", "lotePronto", "aprovado", "recebido", "emenda", "isArchived"].includes(field)) {
      return res
        .status(400)
        .json({ error: "Campo inválido para atualização." });
    }

    try {
      const job = await Job.findById(id);
      if (!job) {
        return res.status(404).json({ error: "Job não encontrado." });
      }

      if (field == 'pago') {
        job['dataPgto'] = new Date(localDate.getTime()).toISOString();
      }

      if (field == 'recebidoConferido') {
        job['dataRecebidoConferido'] = new Date(localDate.getTime()).toISOString();
      }

      if (field == 'lotePronto') {
        job['dataLotePronto'] = new Date(localDate.getTime()).toISOString();
      }

      if (field == 'recebido') {
        job['dataRecebido'] = new Date(localDate.getTime()).toISOString();
      }

      if (field == 'aprovado') {
        job['dataAprovado'] = new Date(localDate.getTime()).toISOString();
      }


      // Atualiza o campo
      const oldValue = job[field];
      job[field] = !job[field];

      if (field === "emenda") {

        // Pegando os valores necessários do job
        const { qtd, larg, compr } = job;

        if (!qtd || !larg || !compr) {
          return res.status(400).json({ error: "Valores insuficientes para calcular o orçamento." });
        }

        // Calcula total de metros com base na quantidade
        let totMetros = (larg * 2 + compr * 2) * qtd;

        // Ajusta orçamento com base na emenda
        let orcamento = totMetros * custoPorMetro;

        if (job.emenda) {
          // Adiciona custo da emenda e ajusta totMetros
          totMetros = (larg * 2 + compr * 3) * qtd;
          orcamento = totMetros * custoPorMetro;
        }

        // Atualiza os valores no job
        job.totMetros = parseFloat(totMetros.toFixed(2));
        job.orcamento = parseFloat(orcamento.toFixed(2));
      }



      JobController.emitSSE("jobUpdated", { job });


      await job.save();

      await LogController.logJobChange({
        jobId: job._id,
        userId,
        action: "update",
        field,
        oldValue,
        newValue: job[field],
        req,
        res
      });

      return res.json({ message: "Job atualizado com sucesso.", job });
    } catch (error) {
      console.error("Erro ao atualizar job:", error);
      return res.status(500).json({ error: "Erro ao atualizar job." });
    }
  },

  async updateSizes(req, res) {

    const { id, field, value } = req.body;

    const userId = await verifyToken.recoverUid(req, res);

    // Validação do campo
    if (!["qtd", "larg", "compr"].includes(field)) {
      return res.status(400).json({ error: "Campo inválido para atualização." });
    }


    try {
      const job = await Job.findById(id);
      if (!job) {
        return res.status(404).json({ error: "Job não encontrado." });
      }


      const oldValue = job[field];
      job[field] = value;


      // Pegando os valores necessários do job
      const { qtd, larg, compr } = job;

      if (!qtd || !larg || !compr) {
        return res.status(400).json({ error: "Valores insuficientes para calcular o orçamento." });
      }

      // Calcula total de metros com base na quantidade
      let totMetros = (larg * 2 + compr * 2) * qtd;

      // Ajusta orçamento com base na emenda
      let orcamento = totMetros * custoPorMetro;

      job.qtdRolo = (
        ((larg * 2 + compr * 2) * qtd) /
        50
      ).toFixed(2);


      if (job.emenda) {
        // Adiciona custo da emenda e ajusta totMetros
        totMetros = (larg * 2 + compr * 3) * qtd;
        orcamento = totMetros * custoPorMetro;
      }

      // Atualiza os valores no job
      job.totMetros = parseFloat(totMetros.toFixed(2));
      job.orcamento = parseFloat(orcamento.toFixed(2));




      JobController.emitSSE("jobUpdated", { job });


      await job.save();

      await LogController.logJobChange({
        jobId: job._id,
        userId,
        action: "update",
        field,
        oldValue,
        newValue: value,
        req,
        res
      });


      return res.json({ message: "Job atualizado com sucesso.", job });
    } catch (error) {
      console.error("Erro ao atualizar job:", error);
      return res.status(500).json({ error: "Erro ao atualizar job." });
    }

    res.end();
  },

  async updateRate(req, res) {
    const { id, value } = req.body;
    const userId = await verifyToken.recoverUid(req, res);

    try {
      const job = await Job.findById(id);
      const oldRate = job.rateLote;


      job.rateLote = value

      await job.save();
      await LogController.logJobChange({
        jobId: job._id,
        userId,
        action: "update",
        field: "rateLote",
        oldValue: oldRate,
        newValue: value,
        req,
        res
      });

      JobController.emitSSE("jobUpdated", { job });

      return res.json({ message: "Job atualizado com sucesso.", job });

    } catch (error) {
      console.error("Erro updateRate:", error);
      return res.status(500).json({ error: "Erro updateRate." });

    }
  },

  async updateObservacao(req, res) {
    const { id, value } = req.body;
    const userId = await verifyToken.recoverUid(req, res);

    try {
      const job = await Job.findById(id);
      if (!job) {
        return res.status(404).json({ error: "Job não encontrado." });
      }

      const oldObservacao = job.observacao;

      job.observacao = value;

      await job.save();
      await LogController.logJobChange({
        jobId: job._id,
        userId,
        action: "update",
        field: "observacao",
        oldValue: oldObservacao,
        newValue: value,
        req,
        res
      });

      JobController.emitSSE("jobUpdated", { job });

      return res.json({ message: "Observação atualizada com sucesso.", job });

    } catch (error) {
      console.error("Erro updateObservacao:", error);
      return res.status(500).json({ error: "Erro ao atualizar observação." });
    }
  },

  async indexRate(req, res) {
    const { id } = req.params;

    try {
      const job = await Job.findById(id);
      return res.json({ job });

    } catch (error) {
      console.error("Erro indexRate:", error);
      return res.status(500).json({ error: "Erro indexRate." });

    }
  },

  async updateJobs(req, res) {

    const localDate = new Date();

    const { ids, field } = req.body;

    const userId = await verifyToken.recoverUid(req, res);


    // Validação do campo
    if (!["recebidoConferido", "lotePronto", "pago", "aprovado", "recebido", "emenda", "emAnalise", "isArchived"].includes(field)) {
      return res.status(400).json({ error: "Campo inválido para atualização." });
    }

    try {
      // Busca e atualiza todos os Jobs correspondentes
      const jobs = await Job.find({ _id: { $in: ids } });
      if (!jobs || jobs.length === 0) {
        return res.status(404).json({ error: "Nenhum job encontrado." });
      }

      // Atualiza o campo para cada job encontrado
      for (const job of jobs) {
        if (field === "pago") {
          job["dataPgto"] = new Date(localDate.getTime()).toISOString();
        }

        if (field == 'recebido') {
          job['dataRecebido'] = new Date(localDate.getTime()).toISOString();
        }

        if (field == 'aprovado') {
          job['dataAprovado'] = new Date(localDate.getTime()).toISOString();
        }

        const oldValue = job[field];
        job[field] = !job[field];

        if (field == "recebido") {
          if (job["aprovado"] == false) {
            job['emAnalise'] = true
          }
        }

        if (field == "aprovado") {
          job['emAnalise'] = false
        }

        if (field === "emenda") {

          // Pegando os valores necessários do job
          const { qtd, larg, compr } = job;

          if (!qtd || !larg || !compr) {
            return res.status(400).json({ error: "Valores insuficientes para calcular o orçamento." });
          }

          // Calcula total de metros com base na quantidade
          let totMetros = (larg * 2 + compr * 2) * qtd;

          // Ajusta orçamento com base na emenda
          let orcamento = totMetros * custoPorMetro;

          if (job.emenda) {
            // Adiciona custo da emenda e ajusta totMetros
            totMetros = (larg * 2 + compr * 3) * qtd;
            orcamento = totMetros * custoPorMetro;
          }

          // Atualiza os valores no job
          job.totMetros = parseFloat(totMetros.toFixed(2));
          job.orcamento = parseFloat(orcamento.toFixed(2));
        }


        await job.save();
        await LogController.logJobChange({
          jobId: job._id,
          userId,
          action: "update",
          field,
          oldValue,
          newValue: job[field],
          req,
          res
        });

        JobController.emitSSE("jobUpdated", { job });
      }



      return res.json({ message: "Jobs atualizados com sucesso.", jobs });
    } catch (error) {
      console.error("Erro ao atualizar jobs:", error);
      return res.status(500).json({ error: "Erro ao atualizar jobs." });
    }
  },

  async updateJobHasSplit(req, res) {
    const { ids, value } = req.body
    const userId = await verifyToken.recoverUid(req, res);

    try {
      // Busca e atualiza todos os Jobs correspondentes
      const jobs = await Job.find({ _id: { $in: ids } });
      if (!jobs || jobs.length === 0) {
        return res.status(404).json({ error: "Nenhum job encontrado." });
      }

      // Atualiza o campo para cada job encontrado
      for (const job of jobs) {
        job.advancedMoneyPayment = value;
        await job.save();
        await LogController.logJobChange({
          jobId: job._id,
          userId,
          action: "update",
          field: "pago",
          oldValue: true,
          newValue: false,
          req,
          res
        });
      }



      return res.json({ message: "Jobs atualizados com sucesso.", jobs });
    } catch (error) {
      console.error("Erro ao atualizar jobs:", error);
      return res.status(500).json({ error: "Erro ao atualizar jobs." });
    }

  },

  async confirmReceiptByQrCode(req, res) {
    try {
      const { idFaccionista, idLote } = req.params;

      if (!mongoose.Types.ObjectId.isValid(idFaccionista) || !mongoose.Types.ObjectId.isValid(idLote)) {
        return res.status(400).json({
          success: false,
          error: "Parâmetros inválidos",
          message: "Os IDs fornecidos não são válidos"
        });
      }

      const { userId: authUserId, role, ownerId: authOwnerId } = await verifyToken.recoverAuth(req, res);
      const isFaccionista = role === "faccionista";
      const ownerReference = String(authOwnerId ?? authUserId);

      const job = await Job.findById(idLote)
        .setOptions({ bypassMiddleware: true })
        .select("lote faccionistaId ownerId recebidoConferido dataRecebidoConferido recebido dataRecebido")
        .lean();

      if (!job) {
        return res.status(404).json({
          success: false,
          error: "Lote não encontrado",
          message: "O lote especificado não existe"
        });
      }

      const jobOwnerId = job.ownerId ? String(job.ownerId) : null;
      if (!jobOwnerId || jobOwnerId !== ownerReference) {
        return res.status(403).json({
          success: false,
          error: "Sem permissão",
          message: "Este lote não pertence à sua conta"
        });
      }

      if (String(job.faccionistaId) !== String(idFaccionista)) {
        return res.status(400).json({
          success: false,
          error: "Faccionista incompatível",
          message: "O lote informado não pertence a esse faccionista"
        });
      }

      if (isFaccionista && String(authUserId) !== String(job.faccionistaId)) {
        return res.status(403).json({
          success: false,
          error: "Sem permissão",
          message: "Você não está autorizado a confirmar este lote"
        });
      }

      const faccionista = await User.findById(job.faccionistaId).select("username lastName").lean();
      if (!faccionista) {
        return res.status(404).json({
          success: false,
          error: "Faccionista não encontrado",
          message: "Não foi possível localizar o faccionista do lote"
        });
      }

      const nomeFaccionista = faccionista.lastName
        ? `${faccionista.username} ${faccionista.lastName}`
        : faccionista.username;

      const relevantField = isFaccionista ? "recebidoConferido" : "recebido";
      const relevantDateField = isFaccionista ? "dataRecebidoConferido" : "dataRecebido";
      const alreadyMarked = Boolean(job[relevantField]);

      if (alreadyMarked) {
        const dataObj = job[relevantDateField] ? new Date(job[relevantDateField]) : null;
        const timestampIso = dataObj ? dataObj.toISOString() : null;

        const responseData = {
          nomeFaccionista,
          lote: job.lote,
          updatedField: relevantField,
          timestampIso,
          dataFormatada: dataObj ? dataObj.toLocaleDateString("pt-BR") : null,
          horaFormatada: dataObj ? dataObj.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : null,
          message: isFaccionista
            ? "Este lote já foi confirmado anteriormente pelo faccionista."
            : "Este lote já foi marcado como recebido pela empresa."
        };

        if (isFaccionista) {
          responseData.dataRecebidoConferido = timestampIso;
        } else {
          responseData.dataRecebido = timestampIso;
        }

        return res.json({
          success: true,
          alreadyMarked: true,
          data: responseData
        });
      }

      const now = new Date();
      const updateFields = {
        [relevantField]: true,
        [relevantDateField]: now
      };

      if (isFaccionista) {
        updateFields.receivedCheckedByQrCode = true;
      }

      const updatedJob = await Job.findOneAndUpdate(
        { _id: idLote },
        { $set: updateFields },
        { new: true }
      ).setOptions({ bypassMiddleware: true });

      JobController.emitSSE("jobUpdated", { job: updatedJob });

      Log.create({
        jobId: updatedJob._id,
        userId: authUserId,
        action: "update",
        field: relevantField,
        oldValue: job[relevantField] ?? false,
        newValue: true,
        ownerId: String(updatedJob.ownerId),
      }).catch((logError) => {
        console.error("Erro ao criar log:", logError);
      });

      const timestampIso = now.toISOString();
      const dataFormatada = now.toLocaleDateString("pt-BR");
      const horaFormatada = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

      const responseData = {
        nomeFaccionista,
        lote: updatedJob.lote,
        updatedField: relevantField,
        timestampIso,
        dataFormatada,
        horaFormatada,
        message: isFaccionista
          ? "Lote marcado como recebido e conferido pelo faccionista."
          : "Lote marcado como recebido pela empresa."
      };

      if (isFaccionista) {
        responseData.dataRecebidoConferido = timestampIso;
      } else {
        responseData.dataRecebido = timestampIso;
      }

      return res.json({
        success: true,
        alreadyMarked: false,
        data: responseData
      });
    } catch (error) {
      console.error("Erro ao confirmar recebimento por QR Code:", error);
      return res.status(500).json({
        success: false,
        error: "Erro ao processar solicitação",
        message: error.message || "Ocorreu um erro interno no servidor"
      });
    }
  }

}


export default JobController;