import axios from "axios";
import Bottleneck from "bottleneck";
import MeliProduct from "../models/Meli_products.js";
import { renewToken } from "../utils/meliService.js";
import { subDays, startOfDay } from "date-fns";


// Limite de 5 requisições por segundo
const limiter = new Bottleneck({
  minTime: 200, // 200ms entre chamadas
});

const shippingCostCache = new Map(); // chave: categoria_tipo_faixa, valor: custo vendedor

function arredondarPrecoParaFaixa(preco, faixa = 10) {
  return Math.ceil(preco / faixa) * faixa;
}

function gerarChaveFrete(category_id, listing_type_id, price) {
  const faixaPreco = arredondarPrecoParaFaixa(price);
  return `${category_id}_${listing_type_id}_${faixaPreco}`;
}

const obterCustoFreteProduto = limiter.wrap(async function (item) {
  const chave = gerarChaveFrete(
    item.category_id,
    item.listing_type_id,
    item.price
  );

  if (shippingCostCache.has(chave)) {
    return shippingCostCache.get(chave);
  }

  const zipCode = "01001-000"; // CEP fixo

  for (let tentativa = 1; tentativa <= 3; tentativa++) {
    try {
      const { data } = await axios.get(
        `https://api.mercadolibre.com/items/${item.id}/shipping_options`,
        { params: { zip_code: zipCode } }
      );

      const opcao = data.options?.[0];
      const custoVendedor = opcao?.list_cost ?? 0;

      shippingCostCache.set(chave, custoVendedor);
      return custoVendedor;
    } catch (err) {
      const status = err.response?.status;
      const isTransient =
        status === 500 || status === 503 || err.message.includes("timeout");

      if (tentativa < 3 && isTransient) {
        console.warn(
          `Tentativa ${tentativa} falhou para ${item.id}. Retentando...`
        );
        await new Promise((r) => setTimeout(r, 500 * tentativa)); // espera antes de tentar de novo
      } else {
        console.warn(
          "Erro ao obter frete:",
          item.id,
          err.response?.data || err.message
        );
        return null;
      }
    }
  }
});

export async function updateProductsAccount(conta) {
  try {
    const access_token = await renewToken(conta);
    const { user_id, _id: contaId, nickname } = conta;

    const tipos = ['gold_pro', 'gold_special', 'silver', 'bronze']; 
    const itemIds = [];


for (const tipo of tipos) {
  let offset = 0;
  const limit = 50;

  while (true) {
    const { data } = await axios.get(
      `https://api.mercadolibre.com/users/${user_id}/items/search`,
      {
        params: {
          limit,
          offset,
          listing_type_id: tipo,
        },
        headers: { Authorization: `Bearer ${access_token}` },
      }
    );

    itemIds.push(...data.results);

    if (data.results.length < limit) break;
    offset += limit;
    await new Promise((r) => setTimeout(r, 200));
  }
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
        if (!item ) continue;

        const ontem = startOfDay(subDays(new Date(), 1));
        const image = item.pictures?.[0]?.url || "";
        const SKU = item.seller_custom_field || "";

        const produto = await MeliProduct.findOne({ id: item.id });

        const shippingCost = await obterCustoFreteProduto(item);

        let novoRegistro;
        if (produto?.historySell?.length) {
          const ultimo = produto.historySell.at(-1);
          const sellQtyDia =
            item.sold_quantity - (ultimo.sellQtyAcumulado || 0);

          novoRegistro = {
            day: ontem,
            sellQty: Math.max(0, sellQtyDia),
            sellQtyAcumulado: item.sold_quantity,
            shippingCost,
          };
        } else {
          novoRegistro = {
            day: ontem,
            sellQty: 0,
            sellQtyAcumulado: item.sold_quantity,
            shippingCost,
          };
        }

        const diasDesdeInicio = Math.max(
          1,
          (Date.now() - new Date(item.start_time)) / (1000 * 60 * 60 * 24)
        );
        const averageSellDay = item.sold_quantity / diasDesdeInicio;

        const isFull = item.shipping?.logistic_type === "fulfillment";
        const estoqueFull = isFull ? item.available_quantity : 0;
        const estoqueNormal = isFull ? 0 : item.available_quantity;
        const salePrice = item.sale_price ?? item.price;

        const estoqueAtualTotal =
          (item.estoque_full ?? 0) + (item.available_quantity ?? 0);

        const registrosRecentes = produto?.historySell?.slice(-4) ?? [];
        const totalDias = registrosRecentes.length || 1; // evita divisão por 0
        const vendasRecentes = registrosRecentes.reduce(
          (acc, h) => acc + h.sellQty,
          0
        );
        const media4Dias = vendasRecentes / totalDias;

        const daysRestStock =
          media4Dias > 0 ? estoqueAtualTotal / media4Dias : Infinity;

        let alertRuptura = null;
        if (totalDias >= 3) {
          if (daysRestStock <= 7) {
            alertRuptura = "Estoque pode acabar em menos de 1 semana";
          } else if (daysRestStock <= 14) {
            alertRuptura = "Estoque suficiente para ~2 semanas";
          }
        } else {
          alertRuptura = "Dados insuficientes para previsão";
        }

        const variations = item.variations?.map(variacao => ({
          id: variacao.id,
          attributes: variacao.attribute_combinations?.map(attr => ({
            name: attr.name,
            value_name: attr.value_name,
          })) || [],
          available_quantity: variacao.available_quantity ?? 0,
        })) ?? [];

        const docData = {
          id: item.id,
          SKU,
          shippingCost,
          title: item.title,
          image,
          listingTypeId: item.listing_type_id,
          price: salePrice,
          isFull,
          available_quantity: estoqueNormal,
          estoque_full: estoqueFull,
          sold_quantity: item.sold_quantity,
          thumbnail: item.thumbnail,
          permalink: item.permalink,
          start_time: item.start_time,
          stop_time: item.stop_time,
          expiration_time: item.expiration_time,
          status: item.status,
          health: item.health ?? null,
          contaId,
          averageSellDay,
          nickname,
          user_id,
          daysRestStock,
          alertRuptura,
          variations
        };

        if (produto) {
          Object.assign(produto, docData);
          produto.historySell.push(novoRegistro);
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
