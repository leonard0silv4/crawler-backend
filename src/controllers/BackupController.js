import User from "../models/User.js";
import Role from "../models/Role.js";
import Permission from "../models/Permission.js";
import Job from "../models/Job.js";
import Log from "../models/Log.js";
import Conta from "../models/Conta.js";
import Link from "../models/Link.js";
import MeliProducts from "../models/Meli_products.js";

export default {
  async backup(req, res) {
    try {
      const [users, roles, permissions, jobs, logs, contas, links, meliProducts] = await Promise.all([
        User.find().lean(),
        Role.find().lean(),
        Permission.find().lean(),
        Job.find().lean(),
        Log.find().lean(),
        Conta.find().lean(),
        Link.find().lean(),
        MeliProducts.find().lean(),
      ]);

      const backupData = {
        timestamp: new Date(),
        users,
        roles,
        permissions,
        jobs,
        logs,
        contas,
        links,
        meliProducts,
      };

      res.setHeader("Content-Type", "application/json");
      res.setHeader("Content-Disposition", "attachment; filename=backup.json");
      return res.status(200).json(backupData);
    } catch (err) {
      console.error("Erro ao gerar backup:", err);
      return res.status(500).json({ error: "Erro ao gerar backup" });
    }
  },
};
