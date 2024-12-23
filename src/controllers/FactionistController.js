import bcrypt from "bcrypt";
import User from "../models/User.js";
import Job from "../models/Job.js";
import verifyToken from "../middleware/authMiddleware.js";

export default {
  async index(req, res) {
    try {
      const ownerId = verifyToken.recoverUid(req, res);
      let faccionists;
      const { faccionistId = null } = req.params

      // Busca os faccionistas relacionados ao ownerId
      if(faccionistId){
        faccionists = await User.find({ ownerId, _id : faccionistId }).select("-password"); 
      }else{
        faccionists = await User.find({ ownerId }).select("-password"); 
      }

      const faccionistsStatus = await Promise.all(
        faccionists.map(async (faccionista) => {
          // jobs relacionados ao faccionista
          
          const jobs = await Job.find({ faccionistaId: faccionista._id,  });

          return {
            ...faccionista.toObject(), 
            jobs,
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

  async update(req, res){
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

        const { username, lastName, password, pixKey } = req.body;

        // Atualiza os campos que foram passados no corpo da requisição
        if (username) faccionista.username = username;
        if (lastName) faccionista.lastName = lastName;
        if (pixKey) faccionista.pixKey = pixKey;

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
  }


};
