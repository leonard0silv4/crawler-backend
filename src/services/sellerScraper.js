import superagent from "superagent";
import * as cheerio from "cheerio";
import { format } from "date-fns";

import SellerPage from "../models/SellerPage.js";
import SellerProduct from "../models/SellerProduct.js";
import SellerAlert from "../models/SellerAlert.js";
import { loadCookies } from "../utils/cookieManager.js";

/**
 * Extrai o MLB ID do produto a partir da URL.
 * Ex: https://produto.mercadolivre.com.br/MLB-1234567890-titulo → "MLB1234567890"
 */
function extractSkuFromUrl(url) {
  const match = url.match(/MLB-?(\d+)/i);
  return match ? `MLB${match[1]}` : "";
}

/**
 * Remove query string e fragmento, deixando apenas origem + pathname.
 */
function cleanUrl(url) {
  try {
    const parsed = new URL(url);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return url.split("#")[0].split("?")[0];
  }
}

/**
 * Número de itens por página do Mercado Livre (páginas de loja/tienda).
 */
const ML_PAGE_SIZE = 48;

/**
 * Constrói a URL de uma página específica do seller usando o padrão _Desde_ do ML.
 *
 * Fórmula confirmada pelo usuário:
 *   - Página 1 → sem _Desde_ (URL base)
 *   - Página 2 → _Desde_49  (offset = 1 + (2-1)*48 = 49)
 *   - Página n → _Desde_{1 + (n-1)*48}
 *   - Exemplo: página 42 → _Desde_1969 = 1 + 41*48 ✓
 *
 * O parâmetro é inserido imediatamente antes de "_NoIndex_True" na URL.
 * Se "_NoIndex_True" não estiver presente, é inserido no final do path.
 */
function buildPageUrl(baseUrl, pageNumber) {
  if (pageNumber <= 1) return baseUrl;

  const offset = 1 + (pageNumber - 1) * ML_PAGE_SIZE;

  // Remove qualquer _Desde_ já presente (para evitar duplicação em re-chamadas)
  const cleanBase = baseUrl.replace(/_Desde_\d+_/g, "_").replace(/_Desde_\d+$/g, "");

  if (cleanBase.includes("_NoIndex_True")) {
    return cleanBase.replace("_NoIndex_True", `_Desde_${offset}_NoIndex_True`);
  }

  // Fallback para URLs sem _NoIndex_True
  const sep = cleanBase.endsWith("/") ? "" : "/";
  return `${cleanBase}${sep}_Desde_${offset}`;
}

/**
 * Extrai o total de resultados exibido pelo ML na página de listagem.
 * Ex: "2.017 resultados" → 2017
 */
function parseTotalCount($) {
  const candidates = [
    $(".ui-search-search-result__quantity-results").text(),
    $('[class*="quantity-results"]').text(),
    $('[class*="result-info"]').text(),
  ];

  for (const text of candidates) {
    // aceita "2.017 resultados", "2017 resultados", "2,017 results"
    const match = text.match(/([\d.,]+)\s*resultado/i);
    if (match) {
      return parseInt(match[1].replace(/[.,]/g, ""), 10);
    }
  }
  return null;
}

/**
 * Busca e faz parse dos produtos de uma única página.
 * Retorna { products, totalCount }.
 *  - products   : array de produtos encontrados na página
 *  - totalCount : total de resultados do seller (quando detectável), ou null
 */
async function extractProductsFromPage(url) {
  const { cookieString } = await loadCookies();

  const request = superagent
    .get(url)
    .timeout({ response: 10000, deadline: 15000 });
  if (cookieString) {
    request.set("Cookie", cookieString);
  }

  const response = await request;
  const $ = cheerio.load(response.text);

  const products = [];
  const seen = new Set();

  $(".ui-search-layout__item, .andes-card").each((_, el) => {
    const linkEl = $(el)
      .find(
        "a.poly-component__title, .poly-component__title a, .ui-search-item__group__element, .ui-search-result__wrapper a"
      )
      .first();

    const href = linkEl.attr("href");
    if (!href || href === "#") return;

    const productUrl = cleanUrl(href);
    if (!productUrl || seen.has(productUrl)) return;
    seen.add(productUrl);

    const sku = extractSkuFromUrl(productUrl);

    const name = $(el)
      .find(".poly-component__title, .ui-search-item__title")
      .first()
      .text()
      .trim();

    const imgEl = $(el).find("img").first();
    const image =
      imgEl.attr("src") ||
      imgEl.attr("data-src") ||
      imgEl.attr("data-lazy") ||
      "";

    const fractionText = $(el)
      .find(".andes-money-amount__fraction")
      .first()
      .text()
      .trim()
      .replace(/\./g, "")
      .replace(/,/g, "");
    const centsText = $(el)
      .find(".andes-money-amount__cents")
      .first()
      .text()
      .trim();
    const price = fractionText
      ? parseFloat(`${fractionText}.${centsText || "00"}`)
      : 0;

    if (productUrl && name) {
      products.push({ url: productUrl, name, image, price, sku });
    }
  });

  const totalCount = parseTotalCount($);

  return { products, totalCount };
}

/**
 * Navega por TODAS as páginas do seller construindo as URLs programaticamente
 * com o padrão _Desde_ do Mercado Livre.
 *
 * Estratégia:
 *  1. Carrega página 1 e tenta extrair o total de resultados.
 *  2. Se o total for encontrado → calcula o número exato de páginas.
 *  3. Se não for encontrado → itera até receber uma página vazia (fallback).
 *  4. Para em MAX_PAGES como segurança extra.
 */
async function scrapeAllPages(baseUrl) {
  const allProducts = [];
  const globalSeen = new Set();
  const MAX_PAGES = 200; // segurança para sellers muito grandes

  const addProducts = (products) => {
    for (const p of products) {
      if (!globalSeen.has(p.url)) {
        globalSeen.add(p.url);
        allProducts.push(p);
      }
    }
  };

  // ── Página 1 ──────────────────────────────────────────────────────────────
  console.log(`[SellerScraper] Buscando página 1: ${baseUrl}`);
  const firstResult = await extractProductsFromPage(baseUrl);
  addProducts(firstResult.products);

  const totalCount = firstResult.totalCount;
  const totalPages = totalCount
    ? Math.min(Math.ceil(totalCount / ML_PAGE_SIZE), MAX_PAGES)
    : MAX_PAGES;

  if (totalCount) {
    console.log(
      `[SellerScraper] Total detectado: ${totalCount} produtos → ${totalPages} páginas`
    );
  } else {
    console.log(
      `[SellerScraper] Total não detectado. Iterando até página vazia (máx ${MAX_PAGES})`
    );
  }

  if (firstResult.products.length === 0) {
    console.warn("[SellerScraper] Página 1 sem produtos. Verifique a URL.");
    return allProducts;
  }

  // ── Páginas 2 … N ──────────────────────────────────────────────────────────
  for (let page = 2; page <= totalPages; page++) {
    const url = buildPageUrl(baseUrl, page);
    console.log(`[SellerScraper] Buscando página ${page}/${totalPages}: ${url}`);

    await new Promise((resolve) => setTimeout(resolve, 600));

    let result;
    try {
      result = await extractProductsFromPage(url);
    } catch (err) {
      console.error(`[SellerScraper] Erro na página ${page}:`, err.message);
      break;
    }

    if (result.products.length === 0) {
      console.log(`[SellerScraper] Página ${page} vazia. Paginação encerrada.`);
      break;
    }

    addProducts(result.products);

    // Se retornou menos que uma página cheia (e não sabíamos o total), é a última
    if (!totalCount && result.products.length < ML_PAGE_SIZE) {
      console.log(`[SellerScraper] Página ${page} parcial (${result.products.length} itens). Última página.`);
      break;
    }
  }

  console.log(
    `[SellerScraper] Paginação concluída: ${allProducts.length} produtos únicos em ${baseUrl}`
  );
  return allProducts;
}

/**
 * Executa o scraping completo de um seller, atualizando produtos e gerando alertas.
 */
export async function runScraperForSeller(seller) {
  const today = format(new Date(), "yyyy-MM-dd");
  const alertsToCreate = [];

  console.log(`[SellerScraper] Iniciando scraping do seller ${seller._id} — ${seller.url}`);

  // --- 1. Coleta todos os produtos ---
  let scrapedProducts;
  try {
    scrapedProducts = await scrapeAllPages(seller.url);
  } catch (err) {
    console.error(`[SellerScraper] Erro ao scrape seller ${seller._id}:`, err.message);
    return;
  }

  if (!scrapedProducts.length) {
    console.warn(`[SellerScraper] Nenhum produto encontrado para seller ${seller._id}`);
    return;
  }

  console.log(
    `[SellerScraper] Seller ${seller._id}: ${scrapedProducts.length} produtos coletados`
  );

  // --- 2. Reseta flags da execução anterior ---
  await SellerProduct.updateMany(
    { sellerId: seller._id },
    { $set: { isNew: false, priceChanged: false } }
  );

  // --- 3. Processa cada produto coletado ---
  for (const scraped of scrapedProducts) {
    const existing = await SellerProduct.findOne({
      sellerId: seller._id,
      url: scraped.url,
    });

    if (!existing) {
      // ── Produto novo ──
      let newProduct;
      try {
        newProduct = await SellerProduct.create({
          sellerId: seller._id,
          url: scraped.url,
          name: scraped.name,
          image: scraped.image,
          sku: scraped.sku,
          currentPrice: scraped.price,
          priceHistory: [{ price: scraped.price, date: today }],
          isNew: true,
          priceChanged: false,
        });
      } catch (err) {
        // Pode ocorrer duplicate key se houtra execução paralela; ignora
        if (err.code === 11000) continue;
        throw err;
      }

      alertsToCreate.push({
        sellerId: seller._id,
        productId: newProduct._id,
        productName: scraped.name,
        type: "new_product",
        oldPrice: 0,
        newPrice: scraped.price,
      });
    } else {
      // ── Produto existente ──
      let priceHistory = existing.priceHistory.map((h) => ({ ...h }));
      let priceChanged = false;

      const todayEntryIdx = priceHistory.findIndex((h) => h.date === today);

      if (todayEntryIdx !== -1) {
        // Mesma data → apenas atualiza o preço do registro de hoje
        priceHistory[todayEntryIdx] = { price: scraped.price, date: today };
      } else {
        // Novo dia → adiciona nova entrada
        priceHistory.push({ price: scraped.price, date: today });
        // Mantém máximo de 4 dias (remove o mais antigo se necessário)
        if (priceHistory.length > 4) {
          priceHistory = priceHistory.slice(priceHistory.length - 4);
        }
      }

      if (existing.currentPrice !== scraped.price) {
        priceChanged = true;
      }

      await SellerProduct.findByIdAndUpdate(existing._id, {
        $set: {
          name: scraped.name,
          image: scraped.image || existing.image,
          currentPrice: scraped.price,
          priceHistory,
          priceChanged,
          isNew: false,
        },
      });

      if (priceChanged) {
        alertsToCreate.push({
          sellerId: seller._id,
          productId: existing._id,
          productName: scraped.name,
          type: "price_change",
          oldPrice: existing.currentPrice,
          newPrice: scraped.price,
        });
      }
    }
  }

  // --- 4. Salva alertas em lote ---
  if (alertsToCreate.length) {
    await SellerAlert.insertMany(alertsToCreate);
  }

  // --- 5. Atualiza data da última execução ---
  await SellerPage.findByIdAndUpdate(seller._id, {
    $set: { lastRunAt: new Date() },
  });

  console.log(
    `[SellerScraper] Seller ${seller._id}: concluído — ${alertsToCreate.length} alertas gerados`
  );
}

/**
 * Executa o scraping de todos os sellers ativos.
 * Chamado pelo cron diário.
 */
export async function runAllActiveSellers() {
  const sellers = await SellerPage.find({ active: true });
  console.log(`[SellerScraper] Iniciando cron — ${sellers.length} sellers ativos`);

  for (const seller of sellers) {
    try {
      await runScraperForSeller(seller);
    } catch (err) {
      console.error(`[SellerScraper] Erro no seller ${seller._id}:`, err.message);
    }
  }

  console.log("[SellerScraper] Cron concluído");
}
