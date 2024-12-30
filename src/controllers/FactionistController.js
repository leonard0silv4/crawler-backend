import bcrypt from "bcrypt";
import User from "../models/User.js";
import Job from "../models/Job.js";
import verifyToken from "../middleware/authMiddleware.js";

export default {
  async indexUser(req, res) {
    try {
      const faccionistId = verifyToken.recoverUid(req, res);

      const jobs = await Job.find({ faccionistaId: faccionistId, pago: true })
        .setOptions({ bypassMiddleware: true })
        .select("orcamento rateLote lote advancedMoneyPayment isArchived pago")
        .lean();

      
      const jobsWithRate = jobs.filter((job) => job.rateLote);
      const jobsNotArchived = jobs.filter((job) => !job.isArchived && job.pago && job.advancedMoneyPayment );

      const totalAdvancedMoney = jobsNotArchived.reduce(
        (sum, job) => sum + job.advancedMoneyPayment,
        0
      );
      
      const totalRateLote = jobsWithRate.reduce(
        (sum, job) => sum + job.rateLote,
        0
      );
      
      const evaluationScore = jobsWithRate.length
      ? (totalRateLote / jobsWithRate.length).toFixed(2)
      : 0;
      

      const recentLotes = jobsWithRate
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) 
        .slice(0, 10) 
        .map((job) => ({
          lote: job.lote,
          rateLote: job.rateLote === 10 ? job.rateLote : `0${job.rateLote}`,
        }));

      const jobSummary = jobs.reduce(
        (summary, job) => {
          summary.totalOrcamentos += job.orcamento || 0;
          summary.totalJobs += 1;
          return summary;
        },
        { totalOrcamentos: 0, totalJobs: 0 } // Valores iniciais
      );

      const faccionists = await User.find({ _id: faccionistId }).select(
        "-password"
      );

      const startOfWeek = new Date();
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay()); // Domingo
      startOfWeek.setHours(0, 0, 0, 0);
  
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(endOfWeek.getDate() + 6); // Sábado
      endOfWeek.setHours(23, 59, 59, 999);
  
      // Verifica se algum trabalho foi alterado na última semana
      const hasUpdatesLastWeek = faccionists.some(
        (fac) =>
          fac.advanceMoneyLastModified &&
          new Date(fac.advanceMoneyLastModified) >= startOfWeek &&
          new Date(fac.advanceMoneyLastModified) <= endOfWeek
      );

      return res.json({
        ...faccionists,
        totalAdvancedMoney,
        jobSummary,
        evaluationScore,
        recentLotes,
        updateLastWeek: hasUpdatesLastWeek,
      });
    } catch (error) {
      console.error("Erro ao buscar faccionista:", error);
      throw new Error("Erro ao buscar faccionista");
    }
  },

  async index(req, res) {
    try {
      const ownerId = verifyToken.recoverUid(req, res);
      let faccionists;
      const { faccionistId = null } = req.params;
      
      // Busca os faccionistas relacionados ao ownerId
      if (faccionistId) {
        faccionists = await User.find({ ownerId, _id: faccionistId }).select(
          "-password"
        );
      } else {
        faccionists = await User.find({ ownerId }).select("-password");
      }

      const faccionistsStatus = await Promise.all(
        faccionists.map(async (faccionista) => {
          // jobs relacionados ao faccionista

          const jobsRate = await Job.find({ faccionistaId: faccionista._id })
          .setOptions({ bypassMiddleware: true }).sort({
            data: -1,})
          .lean();

              
          const jobsWithRate = jobsRate.filter((job) => job.rateLote);
          const jobs = jobsRate.filter((job) => !job.isArchived);
          
          const totalRateLote = jobsWithRate.reduce(
            (sum, job) => sum + job.rateLote,
            0
          );
          
          const evaluationScore = jobsWithRate.length
          ? (totalRateLote / jobsWithRate.length).toFixed(2)
          : 0;
          

          return {
            ...faccionista.toObject(),
            jobs,
            evaluationScore
          };
        })
      );

      // Retorna os faccionistas com os campos jobs
      return res.json(faccionistsStatus);
    } catch (error) {
      console.error("Erro ao buscar faccionistas:", error);
      throw new Error("Erro ao buscar faccionistas");
    }
  },

  async store(req, res) {
    try {
      const { username, lastName, address, password, pixKey } = req.body;
      const hashedPassword = await bcrypt.hash(password, 10);
      const ownerId = verifyToken.recoverUid(req, res);
      const role = await verifyToken.recoverRole(req, res);

      if (!ownerId || String(role).trim() !== "owner") {
        throw new Error("Owner ID inválido ou o usuário não é um owner");
      }

      // cria o faccionista
      const faccionista = new User({
        username,
        lastName,
        pixKey,
        address,
        password: hashedPassword,
        role: "faccionista",
        ownerId,
      });

      await faccionista.save();
      console.log("Usuário faccionista criado com sucesso:", faccionista);
      return res.json(faccionista);
    } catch (error) {
      console.error("Erro ao criar faccionista:", error.message);

      if (error.code === 11000) {
        const duplicatedField = Object.keys(error.keyValue)[0];
        const duplicatedValue = error.keyValue[duplicatedField];
        return res.status(409).json({
          error: `Já existe um registro com o campo '${duplicatedField}' igual a '${duplicatedValue}'.`,
        });
      }

      res
        .status(500)
        .json({ error: "stacktrace create faccionista on console" });
    }
  },

  async destroy(req, res) {
    const { id } = req.params;

    await Job.deleteMany({ faccionistaId: id });

    await User.findByIdAndDelete(id);
    res.end();
  },

  async update(req, res) {
    try {
      const ownerId = verifyToken.recoverUid(req, res);
      const { faccionistId } = req.params;

      // Verifica se o usuário está autenticado e é um owner
      if (!ownerId) {
        return res.status(401).json({ error: "Usuário não autenticado" });
      }

      // Verifica se o owner está tentando atualizar seu próprio faccionista
      if (faccionistId) {
        const faccionista = await User.findOne({ _id: faccionistId, ownerId });

        if (!faccionista) {
          return res.status(404).json({ error: "Faccionista não encontrado" });
        }

        const { username, lastName, password, pixKey, advanceMoney } = req.body;

        // Atualiza os campos que foram passados no corpo da requisição
        if (username) faccionista.username = username;
        if (lastName) faccionista.lastName = lastName;
        if (pixKey) faccionista.pixKey = pixKey;
        
        if (req.body.hasOwnProperty('advanceMoney')) {
          faccionista.advanceMoney = advanceMoney;
        }

        // Se uma nova senha for fornecida, a senha deve ser criptografada
        if (password) {
          const hashedPassword = await bcrypt.hash(password, 10);
          faccionista.password = hashedPassword;
        }

        await faccionista.save();

        return res.json(faccionista);
      }
    } catch (error) {
      console.error("Erro ao atualizar faccionista:", error);
      return res.status(500).json({ error: "Erro ao atualizar faccionista" });
    }
  },

  async findLastLoteByFaccionistaId(req, res) {
    const { faccionistId } = req.params;
    try {
      const lastLote = await Job.findOne({ faccionistaId: faccionistId })
        .sort({ data: -1 })
        .select("lote");

      res.json(lastLote ? lastLote.lote : null);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Erro ao encontrar o último lote" });
    }
  },
};
