import Permission from "../models/Permission.js";

export default {
  async index(req, res) {
    const permissions = await Permission.find({});
    return res.json(permissions);
  },
};
