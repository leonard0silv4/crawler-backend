import "dotenv/config";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Role from "../models/Role.js"; // 👈 Isso é essencial
import Permission from "../models/Permission.js"; // 👈 Também
import bcrypt from "bcrypt";
import verifyToken from "../middleware/authMiddleware.js";

export default {
  async login(req, res) {
    try {
      const { username, password } = req.body;

      // Popula a roleId com as permissões
      const user = await User.findOne({ username }).populate({
        path: "roleId",
        populate: {
          path: "permissions",
        },
      });

      if (!user)
        return res.status(401).json({ error: "Usuário não encontrado" });

      const passwordMatch = await bcrypt.compare(password, user.password);
      if (!passwordMatch)
        return res.status(401).json({ error: "Falha na autenticação" });

      const permissions = user.roleId?.permissions?.map((p) => p.name) || [];

      const token = jwt.sign(
        { userId: user._id, roleUser: user.role, permissions },
        process.env.SECRET,
        { expiresIn: "365d" }
      );

      res.status(200).json({
        token,
        role: user.role,
        permissions,
      });
    } catch (error) {
      console.error("Erro no login:", error);
      res.status(500).json({ error: "Erro interno no login" });
    }
  },

  async getUsersWithSendEmail() {
    try {
      const users = await User.find({ sendEmail: true });
      return users;
    } catch (error) {
      console.error("Erro ao buscar usuários:", error);
      return [];
    }
  },

  async getUserConfig(req, res) {
    const userId = verifyToken.recoverUid(req, res);
    try {
      const users = await User.findById(userId).select(
        "sendEmail storeName emailNotify _id cronInterval"
      );

      return res.status(200).json(users);
    } catch (error) {
      console.error("Erro ao buscar usuários:", error);
      return res.status(500).json({ error: "Erro ao buscar usuários:" });
    }
  },

  async saveConfig(req, res) {
    const userId = verifyToken.recoverUid(req, res);
    try {
      const { emailNotify, storeName, sendEmail, hour } = req.body;
      await User.findOneAndUpdate(
        { _id: userId },
        {
          $set: {
            storeName,
            emailNotify,
            sendEmail,
            cronInterval: `0 ${hour} * * *`,
          },
        }
      ).then((obj) => {
        return res.json(obj);
      });
    } catch (error) {
      return res.status(500).json({ error: "Erro ao atualizar usuários:" });
    }
  },

  async register(req, res) {
    try {
      const { username, password } = req.body;
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = new User({
        username,
        password: hashedPassword,
        plan: null,
        mp_id: "basic",
        expiries_at: new Date(),
      });
      await user.save();
      res.status(201).json({ message: "Usuário cadastrado" });
    } catch (error) {
      res.status(500).json({ error });
    }
  },
};
