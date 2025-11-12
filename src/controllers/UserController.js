import "dotenv/config";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Role from "../models/Role.js";
import Permission from "../models/Permission.js";
import bcrypt from "bcrypt";
import verifyToken from "../middleware/authMiddleware.js";

export default {
  async login(req, res) {
    try {
      const { username, password } = req.body;

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

  async index(req, res) {
    const { skip = 0, limit = 20, search = "" } = req.query;

    const { userId, role, ownerId } = await verifyToken.recoverAuth(req, res);
    const uidToQuery = role === "owner" ? userId : ownerId;

    const query = {
      ownerId: uidToQuery,
      ...(search && {
        $or: [
          { username: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ],
      }),
    };

    const users = await User.find(query)
      .populate("role", "name")
      .select("username emailNotify role createdAt roleId")
      .skip(Number(skip))
      .limit(Number(limit));

    return res.json(users);
  },

  async destroy(req, res) {
    try {
      const { id } = req.params;
      await User.findByIdAndDelete(id);
      return res.status(204).send();
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Erro ao excluir usuário" });
    }
  },

  async update(req, res) {
    try {
      const { id } = req.params;
      const { username, email, password, roleId, permissions, notes } = req.body;

      const updateData = {};

      if (username) updateData.username = username;
      if (email) updateData.email = email;
      if (roleId) updateData.roleId = roleId;
      if (permissions) updateData.permissions = permissions;
      if (notes !== undefined) updateData.notes = notes;

      if (password) {
        const hashedPassword = await bcrypt.hash(password, 10);
        updateData.password = hashedPassword;
      }

      if (roleId) {
        const role = await Role.findById(roleId);
        if (role?.name === "faccionista") {
          updateData.role = "faccionista";
        } else if (role?.name) {
          updateData.role = role.name;
        }
      }

      const user = await User.findByIdAndUpdate(id, updateData, { new: true });
      return res.json(user);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Erro ao atualizar usuário" });
    }
  },

  async updateNotes(req, res) {
    try {
      const { id, value } = req.body;

      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({ error: "Usuário não encontrado." });
      }

      user.notes = value;
      await user.save();

      return res.json({ message: "Notas atualizadas com sucesso.", user });
    } catch (error) {
      console.error("Erro ao atualizar notas:", error);
      return res.status(500).json({ error: "Erro ao atualizar notas." });
    }
  },

  async store(req, res) {
    try {
      const { username, email, password, roleId, ...rest } = req.body;
      const hashedPassword = await bcrypt.hash(password, 10);

      const { userId, role, ownerId } = await verifyToken.recoverAuth(req, res);
      const uidToQuery = role === "owner" ? String(userId) : String(ownerId);

      let roleFromBase;
      if (roleId) {
        roleFromBase = await Role.findById(roleId);
        if (!roleFromBase) {
          return res.status(400).json({ error: "Role não encontrada" });
        }
      }

      const user = new User({
        username,
        emailNotify: email,
        password: hashedPassword,
        roleId,
        ownerId: uidToQuery,
        role: roleFromBase?.name,
        ...rest,
      });

      await user.save();

      return res.status(201).json(user);
    } catch (err) {
      if (err.code === 11000) {
        const duplicatedField = Object.keys(err.keyValue || {})[0];
        let message = "Campo duplicado.";


        if (duplicatedField === "username") {

          message = "Nome de usuário já está em uso.";
          return res.status(500).json({ error: message });
        }
      }

      console.error("Erro ao criar usuário:", err);
      return res.status(500).json({ error: "Erro ao criar usuário" });
    }
  },
};
