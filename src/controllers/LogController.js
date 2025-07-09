import mongoose from "mongoose";
import Log from "../models/Log.js";
import Job from "../models/Job.js";
import verifyToken from "../middleware/authMiddleware.js";

export default {
  async index(req, res) {
    const {
      jobId,
      idLote,
      startDate,
      endDate,
      skip = 0,
      limit = 20,
    } = req.query;

    const { userId, role, ownerId } = await verifyToken.recoverAuth(req, res);
    const uidToQuery = role === "owner" ? String(userId) : String(ownerId);

    const filter = { ownerId: uidToQuery };

    if (jobId && mongoose.Types.ObjectId.isValid(jobId)) {
      filter.jobId = jobId;
    }

    if (idLote && !jobId) {
      const jobsComLote = await Job.find({ lote: String(idLote) }, "_id").setOptions({ bypassMiddleware: true });
      if (!jobsComLote.length) {
        return res
          .status(404)
          .json({ error: `Nenhum job encontrado com lote '${idLote}'` });
      }
      const jobIds = jobsComLote.map((job) => job._id);
      filter.jobId = { $in: jobIds };
    }

    // Filtro por datas
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    try {
      const logs = await Log.find(filter)
        .populate("userId", "username")
        .sort({ createdAt: -1 })
        .skip(Number(skip))
        .limit(Number(limit));

      const jobIds = [...new Set(logs.map((log) => log.jobId.toString()))];

      const jobs = await Job.find({ _id: { $in: jobIds } })
        .setOptions({ bypassMiddleware: true })
        .populate("faccionistaId", "username lastName");

      const jobMap = {};
      jobs.forEach((job) => {
        jobMap[job._id.toString()] = job;
      });

      const formatted = logs.map((log) => {
        const job = jobMap[log.jobId?.toString()] || {};
        return {
          username: log.userId?.username || "Desconhecido",
          faccionistaId_userName: job.faccionistaId?.username || "N/A",
          faccionistaId_lastName: job.faccionistaId?.lastName || "N/A",
          action: log.action,
          field: log.field || null,
          jobIdLote: job.lote || "N/A",
          oldValue: log.oldValue ?? null,
          newValue: log.newValue ?? null,
          createdAt: log.createdAt,
        };
      });

      return res.json(formatted);
    } catch (err) {
      console.error("Erro ao buscar logs:", err);
      return res.status(500).json({ error: "Erro ao buscar logs." });
    }
  },

  async logJobChange({
    jobId,
    userId,
    action,
    field,
    oldValue,
    newValue,
    req,
    res,
  }) {
    const {
      userId: authUserId,
      role,
      ownerId,
    } = await verifyToken.recoverAuth(req, res);
    const uidToQuery = role === "owner" ? String(authUserId) : String(ownerId);

    const log = {
      jobId,
      userId,
      action,
      field: action === "update" ? field : undefined,
      oldValue: action === "update" ? oldValue : undefined,
      newValue,
      ownerId: uidToQuery,
    };
    await Log.create(log);
  },
};
