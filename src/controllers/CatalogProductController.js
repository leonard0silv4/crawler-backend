import xlsx from "xlsx";
import multer from "multer";
import CatalogProduct from "../models/CatalogProduct.js";

const upload = multer({ storage: multer.memoryStorage() });

function parseBrNumber(value) {
  if (value == null) return 0;
  if (typeof value === "number") return value;
  return Number(String(value).replace(/\./g, "").replace(",", ".")) || 0;
}

export default {
  async index(req, res) {
    try {
      const { search, cursor, limit = 50 } = req.query;
      const query = {};

      if (search) {
        query.$or = [
          { sku1: { $regex: search, $options: "i" } },
          { sku2: { $regex: search, $options: "i" } },
          { sku3: { $regex: search, $options: "i" } },
          { medidas: { $regex: search, $options: "i" } },
          { produto: { $regex: search, $options: "i" } },
        ];
      }

      if (cursor && cursor !== "0") {
        const parsedCursor = new Date(cursor);
        if (!isNaN(parsedCursor.getTime())) {
          query.createdAt = { $lt: parsedCursor };
        }
      }

      const lim = Number(limit);
      const produtos = await CatalogProduct.find(query)
        .sort({ createdAt: -1 })
        .limit(lim + 1);

      const hasNextPage = produtos.length > lim;
      if (hasNextPage) produtos.pop();

      const nextCursor = hasNextPage
        ? produtos[produtos.length - 1].createdAt
        : null;

      return res.json({ data: produtos, nextCursor, hasNextPage });
    } catch (err) {
      console.error("Erro na listagem de catálogo:", err);
      return res.status(500).json({ error: "Erro ao buscar produtos do catálogo" });
    }
  },

  async store(req, res) {
    try {
      const { sku1, sku2, sku3, produto, medidas, largura, comprimento, altura, peso } = req.body;

      const product = new CatalogProduct({
        sku1,
        sku2,
        sku3,
        produto,
        medidas,
        largura,
        comprimento,
        altura,
        peso,
      });
      await product.save();

      return res.status(201).json(product);
    } catch (err) {
      if (err.code === 11000) {
        return res.status(409).json({ error: "SKU já cadastrado no catálogo" });
      }
      console.error("Erro ao criar produto no catálogo:", err);
      return res.status(400).json({ error: "Erro ao criar produto", details: err.message });
    }
  },

  async update(req, res) {
    try {
      const { id } = req.params;
      const { sku1, sku2, sku3, produto, medidas, largura, comprimento, altura, peso } = req.body;

      const product = await CatalogProduct.findByIdAndUpdate(
        id,
        { sku1, sku2, sku3, produto, medidas, largura, comprimento, altura, peso },
        { new: true, runValidators: true }
      );

      if (!product) return res.status(404).json({ error: "Produto não encontrado" });

      return res.json(product);
    } catch (err) {
      console.error("Erro ao atualizar produto do catálogo:", err);
      return res.status(400).json({ error: "Erro ao atualizar produto", details: err.message });
    }
  },

  async destroy(req, res) {
    try {
      const { id } = req.params;
      const product = await CatalogProduct.findByIdAndDelete(id);

      if (!product) return res.status(404).json({ error: "Produto não encontrado" });

      return res.json({ message: "Produto removido com sucesso" });
    } catch (err) {
      console.error("Erro ao deletar produto do catálogo:", err);
      return res.status(500).json({ error: "Erro ao deletar produto" });
    }
  },

  async importFromXLS(req, res) {
    upload.single("file")(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ error: "Erro no upload do arquivo." });
      }

      try {
        const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = xlsx.utils.sheet_to_json(sheet);

        const headerMap = {
          "SKU-1": "sku1",
          "SKU-2": "sku2",
          PRODUTO: "produto",
          MEDIDAS: "medidas",
          LARG: "largura",
          COMP: "comprimento",
          ALTURA: "altura",
          KG: "peso",
        };

        const allSku1 = rows
          .map((r) => (r["SKU-1"] || "").toString().trim())
          .filter(Boolean);

        const existing = await CatalogProduct.find({ sku1: { $in: allSku1 } }).select("sku1");
        const existingSet = new Set(existing.map((p) => p.sku1));

        const toInsert = [];
        let skipped = 0;

        for (const row of rows) {
          const sku1 = (row["SKU-1"] || "").toString().trim();
          if (!sku1 || existingSet.has(sku1)) {
            skipped++;
            continue;
          }

          const largura = parseBrNumber(row["LARG"]);
          const comprimento = parseBrNumber(row["COMP"]);
          const altura = parseBrNumber(row["ALTURA"]);
          const pesoCubico =
            largura > 0 && comprimento > 0 && altura > 0
              ? Math.round(((largura * comprimento * altura) / 6000) * 1000) / 1000
              : 0;

          toInsert.push({
            sku1,
            sku2: (row["SKU-2"] || "").toString().trim(),
            sku3: (row["SKU-3"] || "").toString().trim(),
            produto: (row["PRODUTO"] || "").toString().trim(),
            medidas: (row["MEDIDAS"] || "").toString().trim(),
            largura,
            comprimento,
            altura,
            peso: parseBrNumber(row["KG"]),
            pesoCubico,
          });
        }

        const inserted = await CatalogProduct.insertMany(toInsert, { ordered: false });

        return res.status(201).json({
          message: "Importação concluída",
          total: rows.length,
          imported: inserted.length,
          skipped,
        });
      } catch (error) {
        console.error("Erro na importação do catálogo:", error);
        return res.status(500).json({ error: "Erro ao importar produtos." });
      }
    });
  },
};
