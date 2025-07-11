import multer from "multer";
import { parseStringPromise } from "xml2js";
import NfeEntry from "../models/Nf.js";
import verifyToken from "../middleware/authMiddleware.js";


const upload = multer({ storage: multer.memoryStorage() });

export default {
  async process(req, res) {
    upload.single("file")(req, res, async (err) => {
      if (err) {
        return res
          .status(400)
          .json({ success: false, error: "Erro no upload do arquivo." });
      }

      try {
        const xmlContent = req.file.buffer.toString("utf-8");

        const parsed = await parseStringPromise(xmlContent, {
          explicitArray: false,
          mergeAttrs: true,
          trim: true,
        });

        res.json({ success: true, data: parsed });
      } catch (error) {
        console.error("Erro ao processar XML:", error);
        res
          .status(500)
          .json({ success: false, error: "Erro ao processar o XML." });
      }
    });
  },
  async index(req, res) {
    try {
      const { search, startDate, endDate, cursor, limit = 20 } = req.query;
      const { role, userId, ownerId } = await verifyToken.recoverAuth(req, res);
      

      const uidToQuery = role === "owner" ? userId : ownerId;
      const query = { ownerId: uidToQuery };

      if (search) {
        query.$or = [
          { "fornecedor.nome": { $regex: search, $options: "i" } },
          { "produtos.name": { $regex: search, $options: "i" } },
          { "produtos.sku": { $regex: search, $options: "i" } },
        ];
      }

      if (startDate && endDate) {
        query.dataEmissao = {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        };
      }

  if (cursor && cursor !== "0") {
  const parsedCursor = new Date(cursor);
  if (!isNaN(parsedCursor.getTime())) {
    query.createdAt = { $lt: parsedCursor };
  }
}

      const notas = await NfeEntry.find(query)
        .sort({ createdAt: -1 })
        .limit(Number(limit) + 1);

      const hasNextPage = notas.length > limit;
      if (hasNextPage) notas.pop(); // remove o extra

      const nextCursor = hasNextPage ? notas[notas.length - 1].createdAt : null;

      return res.json({
        data: notas,
        nextCursor,
        hasNextPage,
      });
    } catch (err) {
      console.error("Erro na listagem de notas:", err);
      return res.status(500).json({ error: "Erro ao buscar notas" });
    }
  },
  async store(req, res) {
    try {
      const { fornecedor, numeroNota, dataEmissao, valores, produtos, manual } =
        req.body;
      const { userId, ownerId } = await verifyToken.recoverAuth(req, res);
      
      const nota = await NfeEntry.create({
        fornecedor,
        numeroNota,
        dataEmissao,
        valores,
        produtos,
        manual,
        criadoPor: userId,
        ownerId,
      });

      return res.json(nota);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Erro ao salvar nota fiscal" });
    }
  },
  async show(req, res) {
    const { id } = req.params;
    const nota = await NfeEntry.findById(id);
    if (!nota) return res.status(404).json({ error: "Nota não encontrada" });
    return res.json(nota);
  },

  async update(req, res) {
    const { id } = req.params;
    const nota = await NfeEntry.findById(id);
    if (!nota || !nota.manual)
      return res.status(400).json({ error: "Nota não editável" });

    Object.assign(nota, req.body);
    await nota.save();
    return res.json(nota);
  },

  async destroy(req, res) {
    const { id } = req.params;
    await NfeEntry.findByIdAndDelete(id);
    return res.json({ success: true });
  },
};
