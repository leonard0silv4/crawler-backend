import Role from "../models/Role.js";

export default {
  async index(req, res) {
    const roles = await Role.find({}, "_id name permissions").populate(
      "permissions",
      "name description"
    );
    return res.json(roles);
  },

  async show(req, res) {
    const role = await Role.findById(req.params.id).populate("permissions");
    if (!role) return res.status(404).json({ error: "Role não encontrada" });
    return res.json(role.permissions);
  },

  async store(req, res) {
    try {
      const { name, permissions } = req.body;

      const role = new Role({ name, permissions });
      await role.save();

      return res.status(201).json(role);
    } catch (err) {
      if (err.code === 11000) {
        return res
          .status(400)
          .json({ error: "Já existe um esquema de permissão com esse nome." });
      }

      console.error("Erro ao criar role:", err);
      return res.status(500).json({ error: "Erro ao criar role." });
    }
  },
  async delete(req, res) {
    try {
      const { id } = req.params;
      await Role.findByIdAndDelete(id);
      return res.status(200).json({ message: "Role deletada com sucesso" });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Erro ao deletar role" });
    }
  },
  async updatePermissions(req, res) {
    const { id } = req.params;
    const { permissions } = req.body;

    await Role.findByIdAndUpdate(id, {
      permissions,
    });

    res.json({ success: true });
  },
};
