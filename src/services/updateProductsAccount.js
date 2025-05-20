import axios from "axios";
import MeliProduct from "../models/Meli_products.js";
import { renovarTokenSeNecessario } from "../utils/meliService.js";

export async function updateProductsAccount(conta) {
  try {
    const access_token = await renovarTokenSeNecessario(conta);
    const { user_id, _id: contaId, nickname } = conta;

    let offset = 0;
    const limit = 50;
    const itemIds = [];

    while (true) {
      const { data } = await axios.get(
        `https://api.mercadolibre.com/users/${user_id}/items/search`,
        {
          params: { status: "active", offset, limit },
          headers: { Authorization: `Bearer ${access_token}` },
        }
      );

      itemIds.push(...data.results);
      if (itemIds.length >= data.paging.total) break;

      offset += limit;
    }

    if (!itemIds.length) return;

    for (let i = 0; i < itemIds.length; i += 20) {
      const lote = itemIds.slice(i, i + 20);
      const res = await axios.get(
        `https://api.mercadolibre.com/items?ids=${lote.join(",")}`,
        {
          headers: { Authorization: `Bearer ${access_token}` },
        }
      );

      for (const itemWrap of res.data) {
        const item = itemWrap.body;
        if (!item || item.status !== "active") continue;

        const hoje = new Date();
        const image = item.pictures?.[0]?.url || "";
        const SKU = item.seller_custom_field || "";

        const produto = await MeliProduct.findOne({ id: item.id });

        let novoRegistro;
        if (produto?.historySell?.length) {
          const ultimo = produto.historySell.at(-1);
          const sellQtyDia =
            item.sold_quantity - (ultimo.sellQtyAcumulado || 0);

          novoRegistro = {
            day: hoje,
            sellQty: Math.max(0, sellQtyDia),
            sellQtyAcumulado: item.sold_quantity,
          };
        } else {
          // Primeira coleta: marcar como 0 (neutro), só pra iniciar a contagem
          novoRegistro = {
            day: hoje,
            sellQty: 0,
            sellQtyAcumulado: item.sold_quantity,
          };
        }

        // Calcular média de vendas por dia
        const diasDesdeInicio = Math.max(
          1,
          (Date.now() - new Date(item.start_time)) / (1000 * 60 * 60 * 24)
        );
        const averageSellDay = item.sold_quantity / diasDesdeInicio;

        const docData = {
          id: item.id,
          SKU,
          title: item.title,
          image,
          price: item.price,
          available_quantity: item.available_quantity,
          sold_quantity: item.sold_quantity,
          thumbnail: item.thumbnail,
          permalink: item.permalink,
          start_time: item.start_time,
          stop_time: item.stop_time,
          expiration_time: item.expiration_time,
          status: item.status,
          estoque_full: item.fulfillment?.quantity || 0,
          health: item.health ?? null,
          contaId,
          averageSellDay,
          nickname,
          user_id,
        };

        if (produto) {
          Object.assign(produto, docData);

          // Empurra novo registro para o final
          produto.historySell.push(novoRegistro);

          // Limita para no máximo 4 itens (mantém os 4 mais recentes)
          if (produto.historySell.length > 4) {
            produto.historySell = produto.historySell.slice(-4);
          }

          await produto.save();
        } else {
          await MeliProduct.create({
            ...docData,
            historySell: [novoRegistro],
          });
        }
      }
    }
  } catch (err) {
    console.error(
      "❌ Erro ao atualizar produtos da conta:",
      conta.nickname,
      err.response?.data || err.message
    );
  }
}
