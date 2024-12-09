import "dotenv/config";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import bcrypt from "bcrypt";
import moment from "moment";
import verifyToken from "../middleware/authMiddleware.js";

export default {
  async login(req, res) {
    try {
      const { username, password } = req.body;
      const user = await User.findOne({ username });
      if (!user)
        return res.status(401).json({ error: "Usuário não encontrado" });

      // if (moment(user.expiries_at).format() < moment().format())
      //   return res.status(440).json({ error: "Assinatura expirada" });

      const passwordMatch = await bcrypt.compare(password, user.password);
      if (!passwordMatch)
        return res.status(401).json({ error: "Falha na autenticação" });

      const token = jwt.sign({ userId: user._id }, process.env.SECRET, {
        expiresIn: "12h",
      });

      res.status(200).json({ token });
    } catch (error) {
      res.status(500).json({ error: "stacktrace login" });
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
        "sendEmail storeName emailNotify _id"
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
      const { emailNotify, storeName, sendEmail } = req.body;

      await User.findOneAndUpdate(
        { _id: userId },
        {
          $set: { storeName, emailNotify, sendEmail },
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
