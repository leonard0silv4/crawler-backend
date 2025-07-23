import axios from "axios";
import { format, eachDayOfInterval, endOfMonth, parseISO } from "date-fns";
import BaseLinkerMonthlySummary from "../models/BaseLinkerMonthlySummary.js";

const BASELINKER_API_URL = "https://api.baselinker.com/connector.php";
const TOKEN = process.env.BASER_LINK_TOKEN;
const VALID_STATUS_IDS = [
  149827, 149829, 149830, 149832, 149833, 149834, 149835, 149836, 151744,
  151912,
];
const CURRENCY = "BRL";

export async function fetchAndStoreMonthlySummary(year, month) {
  const monthStr = `${year}-${String(month).padStart(2, "0")}`;
  const startDate = parseISO(`${monthStr}-01`);
  const endDate = endOfMonth(startDate);
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const summaryMap = new Map();
  const hourlyMap = new Map();
  let totalOrdersCount = 0;

  for (const day of days) {
    const dateStr = format(day, "yyyy-MM-dd");
    console.log(`📅 [DIA] Buscando pedidos para ${dateStr}`);

    const dateObj = parseISO(dateStr);
    const startTimestamp = Math.floor(dateObj.setUTCHours(0, 0, 0, 0) / 1000);
    const endTimestamp = Math.floor(
      dateObj.setUTCHours(23, 59, 59, 999) / 1000
    );

    let currentDateFrom = startTimestamp;
    let keepFetching = true;
    let dailyOrderCount = 0;

    while (keepFetching) {
      console.log(`  🔁 [API] Chamada getOrders - from ${currentDateFrom}`);

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
        const orderDate = new Date(Number(order.date_add) * 1000);
        if (orderDate.toISOString().slice(0, 10) !== dateStr) continue;
        if (order.currency !== CURRENCY) continue;
        if (
          order.status_id !== undefined &&
          !VALID_STATUS_IDS.includes(order.status_id)
        )
          continue;

        const source = order.order_source || "outros";
        const productsTotal = (order.products || []).reduce((sum, product) => {
          const price = parseFloat(product.price_brutto || 0);
          const quantity = parseFloat(product.quantity || 1);
          return sum + price * quantity;
        }, 0);

        const shipping = parseFloat(order.delivery_price || 0);
        const total = productsTotal + shipping;

        const current = summaryMap.get(source) || {
          source,
          totalOrders: 0,
          totalProductsAmount: 0,
          totalShipping: 0,
          totalAmount: 0,
        };

        current.totalOrders += 1;
        current.totalProductsAmount += productsTotal;
        current.totalShipping += shipping;
        current.totalAmount += total;
        summaryMap.set(source, current);

        const hour = orderDate.getHours().toString().padStart(2, "0") + ":00";
        hourlyMap.set(hour, (hourlyMap.get(hour) || 0) + total);

        dailyOrderCount += 1;
        totalOrdersCount += 1;
      }

      if (orders.length < 100) {
        keepFetching = false;
      } else {
        const validConfirmedDates = orders
          .map((o) => Number(o.date_confirmed))
          .filter((ts) => ts && ts >= currentDateFrom && ts <= endTimestamp);

        if (validConfirmedDates.length === 0) {
          console.warn(
            `⚠️ Nenhum date_confirmed válido após ${currentDateFrom}, encerrando loop para evitar travamento.`
          );
          break;
        }

        const lastConfirmed = Math.max(...validConfirmedDates);
        currentDateFrom = lastConfirmed + 1;
      }
    }

    console.log(
      `  ✅ [OK] ${dateStr} - ${dailyOrderCount} pedidos processados`
    );
  }

  const summary = Array.from(summaryMap.values()).map((item) => ({
    ...item,
    totalProductsAmount: Number(item.totalProductsAmount.toFixed(2)),
    totalShipping: Number(item.totalShipping.toFixed(2)),
    totalAmount: Number(item.totalAmount.toFixed(2)),
  }));

  const hourlySales = Array.from({ length: 24 }, (_, h) => {
    const hour = h.toString().padStart(2, "0") + ":00";
    return {
      hour,
      totalAmount: Number((hourlyMap.get(hour) || 0).toFixed(2)),
    };
  });

await BaseLinkerMonthlySummary.deleteMany({ month: monthStr }); // garante limpeza

if (!monthStr || !summary.length) {
  throw new Error(`Dados inválidos para salvar resumo: month=${monthStr}, summary vazio`);
}

await BaseLinkerMonthlySummary.create({
  month: monthStr,
  summary,
  hourlySales,
});

  console.log(
    `🧾 [FINALIZADO] Resumo ${monthStr} salvo com ${totalOrdersCount} pedidos agregados`
  );
}
