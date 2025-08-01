import xlsx from "xlsx";
import multer from "multer";
import verifyToken from "../middleware/authMiddleware.js";
import Product from "../models/Product.js";
import { emitSSE } from "../utils/emitSSE.js";

const upload = multer({ storage: multer.memoryStorage() });

export default {
  async index(req, res) {
    try {
      const { search, cursor, limit = 20 } = req.query;
      const { role, userId, ownerId } = await verifyToken.recoverAuth(req, res);

      const uidToQuery = role === "owner" ? userId : ownerId;
      const query = { ownerId: uidToQuery };

      if (search) {
        query.$or = [
          { nome: { $regex: search, $options: "i" } },
          { sku: { $regex: search, $options: "i" } },
          { descricao: { $regex: search, $options: "i" } },
        ];
      }

      if (cursor && cursor !== "0") {
        const parsedCursor = new Date(cursor);
        if (!isNaN(parsedCursor.getTime())) {
          query.createdAt = { $lt: parsedCursor };
        }
      }

      const produtos = await Product.find(query)
        .sort({ createdAt: -1 })
        .limit(Number(limit) + 1);

      const hasNextPage = produtos.length > limit;
      if (hasNextPage) produtos.pop();

      const nextCursor = hasNextPage
        ? produtos[produtos.length - 1].createdAt
        : null;

      return res.json({
        data: produtos,
        nextCursor,
        hasNextPage,
      });
    } catch (err) {
      console.error("Erro na listagem de produtos:", err);
      return res.status(500).json({ error: "Erro ao buscar produtos" });
    }
  },
  async store(req, res) {
    const { userId, ownerId } = await verifyToken.recoverAuth(req, res);

    try {
      const { nome, sku, descricao, preco } = req.body;
      const product = await Product.create({
        nome,
        sku,
        descricao,
        preco,
        criadoPor: userId,
        ownerId,
      });
      res.status(201).json(product);
    } catch (err) {
      res
        .status(400)
        .json({ error: "Erro ao criar produto", details: err.message });
    }
  },
  async update(req, res) {
    try {
      const { id } = req.params;
      const { nome, sku, descricao, preco } = req.body;

      const product = await Product.findByIdAndUpdate(
        id,
        { nome, sku, descricao, preco },
        { new: true }
      );

      if (!product)
        return res.status(404).json({ error: "Produto não encontrado" });

      res.json(product);
    } catch (err) {
      res
        .status(400)
        .json({ error: "Erro ao atualizar produto", details: err.message });
    }
  },
  async delete(req, res) {
    try {
      const { id } = req.params;
      const produto = await Product.findByIdAndDelete(id);

      if (!produto) {
        return res.status(404).json({ error: "Produto não encontrado" });
      }

      return res.json({ message: "Produto deletado com sucesso" });
    } catch (err) {
      console.error("Erro ao deletar produto:", err);
      return res.status(500).json({ error: "Erro ao deletar produto" });
    }
  },
  async deleteAll(req, res) {
    try {
      const { userId, ownerId } = await verifyToken.recoverAuth(req, res);

      const result = await Product.deleteMany({ ownerId });

      return res.json({
        message: "Produtos deletados com sucesso",
        deletedCount: result.deletedCount,
      });
    } catch (err) {
      console.error("Erro ao deletar todos os produtos:", err);
      return res.status(500).json({ error: "Erro ao deletar produtos" });
    }
  },
  async importFromXLS(req, res) {
    const { userId, ownerId } = await verifyToken.recoverAuth(req, res);

    upload.single("file")(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ error: "Erro no upload do arquivo." });
      }

      try {
        const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(sheet);

        const total = data.length;
        let ignoradosPorDuplicado = 0;
        let processed = 0;

        const allSkus = data
          .map((row) => row["Código (SKU)"]?.trim())
          .filter((sku) => !!sku);

        const existingProducts = await Product.find({
          sku: { $in: allSkus },
        }).select("sku");

        const existingSkusSet = new Set(existingProducts.map((p) => p.sku));
        const produtosParaInserir = [];

        for (const row of data) {
          const nome = row["Descrição"]?.trim();
          const sku = row["Código (SKU)"]?.trim();

          if (!nome || !sku || existingSkusSet.has(sku)) {
            ignoradosPorDuplicado++;
          } else {
            produtosParaInserir.push({
              nome,
              sku,
              descricao: row["Descrição complementar"] || "",
              preco: Number(row["Preço"] || 0),
              criadoPor: userId,
              ownerId,
            });
          }

          processed++;
          emitSSE("importProgress", {
            processed,
            total,
            percent: Math.round((processed / total) * 100),
          });
        }

        const produtosImportados = await Product.insertMany(
          produtosParaInserir,
          {
            ordered: false, 
          }
        );

        console.log({
          totalLido: total,
          produtosImportados: produtosImportados.length,
          ignoradosPorDuplicado,
        });

        emitSSE("importFinished", {
          total,
          imported: produtosImportados.length,
        });

        return res.status(201).json({
          message: "Importação concluída",
          produtos: produtosImportados,
        });
      } catch (error) {
        console.error("Erro na importação:", error);

        emitSSE("importError", {
          message: "Erro ao importar produtos",
        });

        return res.status(500).json({ error: "Erro ao importar produtos." });
      }
    });
  },
};
