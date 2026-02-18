import SellerPage from "../models/SellerPage.js";
import SellerProduct from "../models/SellerProduct.js";
import SellerAlert from "../models/SellerAlert.js";
import verifyToken from "../middleware/authMiddleware.js";
import { runScraperForSeller } from "../services/sellerScraper.js";

const SellerMonitorController = {
  /**
   * Lista todos os sellers cadastrados pelo usuário, com contagem de produtos
   * e alertas não lidos.
   */
  async index(req, res) {
    try {
      const { userId, role, ownerId } = await verifyToken.recoverAuth(req, res);
      const uid = role === "owner" ? userId : ownerId;

      const sellers = await SellerPage.find({ uid: String(uid) })
        .sort({ createdAt: -1 })
        .lean();

      const sellersWithStats = await Promise.all(
        sellers.map(async (seller) => {
          const totalProducts = await SellerProduct.countDocuments({
            sellerId: seller._id,
          });
          const unreadAlerts = await SellerAlert.countDocuments({
            sellerId: seller._id,
            read: false,
          });
          return { ...seller, totalProducts, unreadAlerts };
        })
      );

      return res.json(sellersWithStats);
    } catch (err) {
      console.error("[SellerMonitor] index error:", err);
      return res.status(500).json({ error: "Erro ao listar sellers" });
    }
  },

  /**
   * Cadastra um novo seller (URL de listagem) e dispara o scraping inicial.
   */
  async store(req, res) {
    try {
      const { userId, role, ownerId } = await verifyToken.recoverAuth(req, res);
      const uid = role === "owner" ? userId : ownerId;

      const { url, name } = req.body;
      if (!url) return res.status(400).json({ error: "URL é obrigatória" });

      const exists = await SellerPage.findOne({ url, uid: String(uid) });
      if (exists)
        return res.status(409).json({ error: "Seller já cadastrado" });

      const seller = await SellerPage.create({
        url,
        name: name || "",
        uid: String(uid),
      });

      // Dispara scraping inicial em background (não bloqueia a resposta)
      runScraperForSeller(seller).catch((err) =>
        console.error("[SellerMonitor] scrape inicial error:", err)
      );

      return res.status(201).json(seller);
    } catch (err) {
      console.error("[SellerMonitor] store error:", err);
      return res.status(500).json({ error: "Erro ao cadastrar seller" });
    }
  },

  /**
   * Remove um seller e todos os seus produtos/alertas.
   */
  async destroy(req, res) {
    try {
      const { userId, role, ownerId } = await verifyToken.recoverAuth(req, res);
      const uid = role === "owner" ? userId : ownerId;

      const { id } = req.params;
      const seller = await SellerPage.findOne({ _id: id, uid: String(uid) });
      if (!seller)
        return res.status(404).json({ error: "Seller não encontrado" });

      await SellerProduct.deleteMany({ sellerId: seller._id });
      await SellerAlert.deleteMany({ sellerId: seller._id });
      await SellerPage.deleteOne({ _id: seller._id });

      return res.json({ ok: true });
    } catch (err) {
      console.error("[SellerMonitor] destroy error:", err);
      return res.status(500).json({ error: "Erro ao remover seller" });
    }
  },

  /**
   * Retorna todos os produtos de um seller.
   * Ordenação: novos e atualizados primeiro, depois por data de atualização.
   */
  async getProducts(req, res) {
    try {
      const { userId, role, ownerId } = await verifyToken.recoverAuth(req, res);
      const uid = role === "owner" ? userId : ownerId;

      const { id } = req.params;
      const seller = await SellerPage.findOne({ _id: id, uid: String(uid) });
      if (!seller)
        return res.status(404).json({ error: "Seller não encontrado" });

      const products = await SellerProduct.find({ sellerId: seller._id })
        .sort({ isNew: -1, priceChanged: -1, updatedAt: -1 })
        .lean();

      return res.json(products);
    } catch (err) {
      console.error("[SellerMonitor] getProducts error:", err);
      return res.status(500).json({ error: "Erro ao listar produtos" });
    }
  },

  /**
   * Dispara manualmente o scraping de um seller.
   */
  async runScrape(req, res) {
    try {
      const { userId, role, ownerId } = await verifyToken.recoverAuth(req, res);
      const uid = role === "owner" ? userId : ownerId;

      const { id } = req.params;
      const seller = await SellerPage.findOne({ _id: id, uid: String(uid) });
      if (!seller)
        return res.status(404).json({ error: "Seller não encontrado" });

      // Execução síncrona para o manual (aguarda concluir e retorna resultado)
      await runScraperForSeller(seller);

      const updatedSeller = await SellerPage.findById(seller._id).lean();
      const totalProducts = await SellerProduct.countDocuments({
        sellerId: seller._id,
      });
      const unreadAlerts = await SellerAlert.countDocuments({
        sellerId: seller._id,
        read: false,
      });

      return res.json({
        ok: true,
        message: "Scraping concluído com sucesso",
        seller: { ...updatedSeller, totalProducts, unreadAlerts },
      });
    } catch (err) {
      console.error("[SellerMonitor] runScrape error:", err);
      return res.status(500).json({ error: "Erro ao executar scraping" });
    }
  },

  /**
   * Retorna todos os alertas de um seller (mais recentes primeiro).
   */
  async getAlerts(req, res) {
    try {
      const { userId, role, ownerId } = await verifyToken.recoverAuth(req, res);
      const uid = role === "owner" ? userId : ownerId;

      const { id } = req.params;
      const seller = await SellerPage.findOne({ _id: id, uid: String(uid) });
      if (!seller)
        return res.status(404).json({ error: "Seller não encontrado" });

      const alerts = await SellerAlert.find({ sellerId: seller._id })
        .sort({ createdAt: -1 })
        .lean();

      return res.json(alerts);
    } catch (err) {
      console.error("[SellerMonitor] getAlerts error:", err);
      return res.status(500).json({ error: "Erro ao listar alertas" });
    }
  },

  /**
   * Marca um alerta individual como lido.
   */
  async markAlertRead(req, res) {
    try {
      const { alertId } = req.params;
      await SellerAlert.findByIdAndUpdate(alertId, { $set: { read: true } });
      return res.json({ ok: true });
    } catch (err) {
      console.error("[SellerMonitor] markAlertRead error:", err);
      return res.status(500).json({ error: "Erro ao marcar alerta" });
    }
  },

  /**
   * Marca todos os alertas de um seller como lidos.
   */
  async markAllAlertsRead(req, res) {
    try {
      const { id } = req.params;
      await SellerAlert.updateMany(
        { sellerId: id, read: false },
        { $set: { read: true } }
      );
      return res.json({ ok: true });
    } catch (err) {
      console.error("[SellerMonitor] markAllAlertsRead error:", err);
      return res.status(500).json({ error: "Erro ao marcar alertas" });
    }
  },
};

export default SellerMonitorController;
