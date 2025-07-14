import MeliProduct from "../models/Meli_products.js";
import Link from "../models/Link.js";
import User from "../models/User.js";
import NfeEntry from "../models/Nf.js";
import Log from "../models/Log.js";
import verifyToken from "../middleware/authMiddleware.js";
import { startOfDay, endOfDay, subDays } from "date-fns";

export default {
  async summary(req, res) {
    try {
      const { userId, role, ownerId } = await verifyToken.recoverAuth(req, res);
      const uidToQuery = role === "owner" ? String(userId) : String(ownerId);

      // === MeliProducts ===
      const produtos = await MeliProduct.find({
        historySell: { $exists: true, $not: { $size: 0 } },
      }).select("price historySell alertRuptura status");

      const ontem = subDays(new Date(), 1);
      const inicioOntem = startOfDay(ontem);
      const fimOntem = endOfDay(ontem);

      let totalVendasOntem = 0;
      let totalPedidosOntem = 0;
      let estoqueBaixoQtd = 0;

      for (const produto of produtos) {
        const history = produto.historySell;

        const registroOntem = history.find((h) => {
          const data = new Date(h.day);
          return data >= inicioOntem && data <= fimOntem;
        });

        if (registroOntem?.sellQty) {
          totalPedidosOntem += registroOntem.sellQty;
          if (produto.price) {
            totalVendasOntem += registroOntem.sellQty * produto.price;
          }
        }

        if (produto.alertRuptura && produto.status === "active") {
          estoqueBaixoQtd++;
        }
      }

      const meliAtivosQtd = await MeliProduct.countDocuments({ status: "active" });

      // === Links por storeName ===
      const [mercadoLivreCount, shopeeCount] = await Promise.all([
        Link.countDocuments({ uid: uidToQuery, storeName: "mercadolivre" }),
        Link.countDocuments({ uid: uidToQuery, storeName: "shopee" }),
      ]);

      // === Usuários ===
      const [faccionistasQtd, usuariosQtd] = await Promise.all([
        User.countDocuments({ ownerId: uidToQuery, role: "faccionista" }),
        User.countDocuments({ ownerId: uidToQuery }),
      ]);

      // === Notas fiscais ===
      const notasFiscaisQtd = await NfeEntry.countDocuments({ ownerId: uidToQuery });

      // === Logs (de hoje) ===
      const hoje = new Date();
      const logsHojeQtd = await Log.countDocuments({
        ownerId: uidToQuery.toString(),
        createdAt: {
          $gte: startOfDay(hoje),
          $lte: endOfDay(hoje),
        },
      });

      return res.json({
        vendasOntemReais: totalVendasOntem,
        pedidosOntemQtd: totalPedidosOntem,
        estoqueBaixoQtd,
        meliAtivosQtd,
        links: {
          mercadolivre: mercadoLivreCount,
          shopee: shopeeCount,
        },
        faccionistasQtd,
        usuariosQtd,
        notasFiscaisQtd,
        logsHojeQtd,
      });
    } catch (err) {
      console.error("Erro ao calcular resumo da dashboard:", err);
      res.status(500).json({ error: "Erro interno ao calcular resumo" });
    }
  },
};
