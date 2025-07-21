import axios from "axios";
import { parseISO, isSameDay } from "date-fns";

const BASELINKER_API_URL = "https://api.baselinker.com/connector.php";
const TOKEN = process.env.BASER_LINK_TOKEN;

const VALID_STATUS_IDS = [
  149827, 149829, 149830, 149832, 149833, 149834,
  149835, 149836, 151744, 151912,
];
const CURRENCY = "BRL";

export default {
  async summary(req, res) {
    try {
      const { day } = req.query;

      if (!day) {
        return res.status(400).json({
          error: "Parâmetro 'day' é obrigatório no formato YYYY-MM-DD.",
        });
      }

      const dateObj = parseISO(day);
      const startTimestamp = Math.floor(dateObj.setUTCHours(0, 0, 0, 0) / 1000);
      const endTimestamp = Math.floor(dateObj.setUTCHours(23, 59, 59, 999) / 1000);

      const groupedBySource = {};

      let currentDateFrom = startTimestamp;
      let keepFetching = true;

      while (keepFetching) {
        console.log('ch+ 1')
        const response = await axios.post(
          BASELINKER_API_URL,
          new URLSearchParams({
            method: "getOrders",
            parameters: JSON.stringify({
              date_confirmed_from: currentDateFrom,
              date_confirmed_to: endTimestamp,
            }),
          }),
          {
            headers: {
              "X-BLToken": TOKEN,
              "Content-Type": "application/x-www-form-urlencoded",
            },
          }
        );

        const orders = response.data.orders || [];
        if (orders.length === 0) break;

        for (const order of orders) {
          const orderDate = new Date(Number(order.date_confirmed) * 1000);
          if (!isSameDay(orderDate, dateObj)) continue;

          if (order.currency !== CURRENCY) continue;
          if (order.status_id !== undefined && !VALID_STATUS_IDS.includes(order.status_id)) continue;

          const source = order.order_source || "outros";
          const productsTotal = (order.products || []).reduce((sum, product) => {
            const price = parseFloat(product.price_brutto || 0);
            const quantity = parseFloat(product.quantity || 1);
            return sum + price * quantity;
          }, 0);

          const shipping = parseFloat(order.delivery_price || 0);

          if (!groupedBySource[source]) {
            groupedBySource[source] = {
              source,
              totalOrders: 0,
              totalProductsAmount: 0,
              totalShipping: 0,
              totalAmount: 0,
            };
          }

          groupedBySource[source].totalOrders += 1;
          groupedBySource[source].totalProductsAmount += productsTotal;
          groupedBySource[source].totalShipping += shipping;
          groupedBySource[source].totalAmount += productsTotal + shipping;
        }

        if (orders.length < 100) {
          keepFetching = false;
        } else {
          const lastConfirmed = Math.max(...orders.map((o) => Number(o.date_confirmed || 0)));
          currentDateFrom = lastConfirmed + 1;
        }
      }

      // Ordenar por totalAmount desc
      const result = Object.values(groupedBySource).map((item) => ({
        ...item,
        totalProductsAmount: Number(item.totalProductsAmount.toFixed(2)),
        totalShipping: Number(item.totalShipping.toFixed(2)),
        totalAmount: Number(item.totalAmount.toFixed(2)),
      }));

      result.sort((a, b) => b.totalAmount - a.totalAmount);

      return res.json(result);
    } catch (error) {
      console.error("Erro ao buscar pedidos do BaseLinker:", error.response?.data || error.message);
      return res.status(500).json({ error: "Erro ao buscar dados do BaseLinker." });
    }
  },
};
