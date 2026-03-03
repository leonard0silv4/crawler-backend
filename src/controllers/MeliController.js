import Conta from "../models/Conta.js";
import MeliProduct from "../models/Meli_products.js";
import jwt from "jsonwebtoken";
import { updateProductsAccount } from "../services/updateProductsAccount.js";
import { renewToken } from "../utils/meliService.js";

import axios from "axios";

const CLIENT_ID = process.env.ML_CLIENT_ID;
const CLIENT_SECRET = process.env.ML_CLIENT_SECRET;
const REDIRECT_URI = process.env.ML_REDIRECT_URI;

async function getAllActiveContas() {
  const contas = await Conta.find({
    access_token: { $exists: true },
    $or: [{ disabled: { $exists: false } }, { disabled: false }],
  });
  if (!contas.length) throw new Error("Nenhuma conta do Mercado Livre autenticada encontrada.");
  return contas;
}

// Tenta cada conta em sequência até que uma tenha acesso ao envio.
// A API do ML retorna 401 quando a conta não é dona do envio.
async function fetchShipmentWithAnyAccount(shipmentId) {
  const contas = await getAllActiveContas();
  let lastError = null;

  for (const conta of contas) {
    try {
      const token = await renewToken(conta);
      const headers = { Authorization: `Bearer ${token}` };

      const { data: shipment } = await axios.get(
        `https://api.mercadolibre.com/shipments/${shipmentId}`,
        { headers }
      );

      return { shipment, headers, nickname: conta.nickname };
    } catch (err) {
      const status = err.response?.status;
      if (status === 401 || status === 403) {
        lastError = err;
        continue;
      }
      throw err;
    }
  }

  throw lastError ?? new Error("Nenhuma conta autorizada para este envio.");
}

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

      const contaAtualizada = await Conta.findOneAndUpdate(
        { user_id },
        {
          access_token,
          refresh_token,
          nickname,
          expires_at: new Date(Date.now() + expires_in * 1000),
          uid,
        },
        { upsert: true, new: true }
      );

      updateProductsAccount(contaAtualizada);
      res.send(
        `Conta ${nickname} conectada com sucesso! Estamos buscando seus produtos...`
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

  async getShipment(req, res) {
    const { shipmentId } = req.params;

    if (!shipmentId || !/^\d+$/.test(shipmentId)) {
      return res.status(400).json({ error: "shipmentId inválido. Informe apenas os dígitos do código de barras." });
    }

    try {
      const { shipment, headers, nickname } = await fetchShipmentWithAnyAccount(shipmentId);

      const orderId = shipment.order_id;

      const [orderRes, shipmentItemsRes] = await Promise.allSettled([
        orderId
          ? axios.get(`https://api.mercadolibre.com/orders/${orderId}`, { headers })
          : Promise.resolve(null),
        axios.get(`https://api.mercadolibre.com/shipments/${shipmentId}/items`, { headers }),
      ]);

      const order = orderRes.status === "fulfilled" && orderRes.value ? orderRes.value.data : null;
      const shipmentItems = shipmentItemsRes.status === "fulfilled" ? shipmentItemsRes.value.data : [];

      const dimensions = shipment.dimensions ?? null;

      const items = order?.order_items?.map((item) => ({
        id: item.item?.id,
        title: item.item?.title,
        sku: item.item?.seller_sku ?? null,
        quantity: item.quantity,
        unit_price: item.unit_price,
        variation_id: item.item?.variation_id ?? null,
      })) ?? [];

      return res.json({
        shipment_id: shipment.id,
        order_id: orderId ?? null,
        seller_nickname: nickname ?? null,
        status: shipment.status,
        substatus: shipment.substatus ?? null,
        logistic_type: shipment.logistic_type ?? null,
        mode: shipment.mode ?? null,
        dimensions: dimensions
          ? {
              height_cm: dimensions.height,
              width_cm: dimensions.width,
              length_cm: dimensions.length,
              weight_g: dimensions.weight,
            }
          : null,
        shipment_items: Array.isArray(shipmentItems) ? shipmentItems : [],
        order_items: items,
        date_created: shipment.date_created ?? null,
        last_updated: shipment.last_updated ?? null,
      });
    } catch (err) {
      const status = err.response?.status;
      const mlError = err.response?.data;

      if (status === 404) {
        return res.status(404).json({ error: `Envio ${shipmentId} não encontrado no Mercado Livre.` });
      }

      if (status === 401 || status === 403) {
        return res.status(403).json({
          error: "Nenhuma das contas conectadas tem acesso a este envio.",
          detail: "O envio pode pertencer a uma conta do Mercado Livre ainda não autenticada no sistema.",
        });
      }

      console.error("[getShipment] Erro:", mlError ?? err.message);
      return res.status(500).json({ error: "Erro ao consultar envio no Mercado Livre.", detail: mlError ?? err.message });
    }
  },
};
