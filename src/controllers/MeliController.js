import Conta from "../models/Conta.js";
import MeliProduct from "../models/Meli_products.js";
import jwt from "jsonwebtoken";

import axios from "axios";

const CLIENT_ID = process.env.ML_CLIENT_ID;
const CLIENT_SECRET = process.env.ML_CLIENT_SECRET;
const REDIRECT_URI = process.env.ML_REDIRECT_URI;

export default {
  async authRedirect(req, res) {
    const token = req.query.token;
    const decoded = jwt.verify(token, process.env.SECRET);
    const uid = decoded.userId;

    const redirectUrl = `https://auth.mercadolivre.com.br/authorization?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&state=${uid}`;
    res.redirect(redirectUrl);
  },

  async authCallback(req, res) {
    const { code, state } = req.query;
    const uid = state;

    try {
      const response = await axios.post(
        "https://api.mercadolibre.com/oauth/token",
        null,
        {
          params: {
            grant_type: "authorization_code",
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            code,
            redirect_uri: REDIRECT_URI,
          },
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        }
      );

      const { access_token, refresh_token, user_id, expires_in } =
        response.data;

      const userInfo = await axios.get(
        "https://api.mercadolibre.com/users/me",
        {
          headers: { Authorization: `Bearer ${access_token}` },
        }
      );

      const nickname = userInfo.data.nickname;

      await Conta.findOneAndUpdate(
        { user_id },
        {
          access_token,
          refresh_token,
          nickname,
          expires_at: new Date(Date.now() + expires_in * 1000),
          uid,
        },
        { upsert: true }
      );

      res.send(
        `Conta ${nickname} conectada com sucesso! pode retornar a tela principal`
      );
    } catch (err) {
      console.error("Erro na autenticação:", err.response?.data || err.message);
      res.status(500).send("Erro ao autenticar");
    }
  },

  async listarProdutos(req, res) {
    const { user_id } = req.query;

    if (!user_id) {
      return res.status(400).json({ error: "user_id é obrigatório" });
    }

    try {
      const produtos = await MeliProduct.find({ user_id: Number(user_id) });
      return res.json(produtos);
    } catch (err) {
      console.error(err.response?.data || err.message);
      res.status(500).send("Erro ao listar produtos");
    }
  },

  async getAccounts(req, res) {
    const contas = await Conta.find({
      access_token: { $exists: true },
      $or: [{ disabled: { $exists: false } }, { disabled: false }],
    });
    res.json(contas);
  },
};
