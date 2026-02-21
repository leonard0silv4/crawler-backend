import Bottleneck from "bottleneck";
import SellerPage from "../models/SellerPage.js";

/**
 * Fila global de scraping de sellers.
 *
 * maxConcurrent: 2  → no máximo 2 sellers rodando ao mesmo tempo.
 * minTime: 1000     → pelo menos 1 s entre o início de jobs consecutivos,
 *                     evitando burst de requisições ao ML.
 */
const limiter = new Bottleneck({
  maxConcurrent: 2,
  minTime: 1000,
});

/**
 * Rastreia sellers que estão aguardando na fila OU rodando.
 * Impede que o mesmo seller seja adicionado duas vezes.
 */
const pendingIds = new Set();

/**
 * Retorna true se o seller já está na fila ou em execução.
 */
export function isSellerPending(sellerId) {
  return pendingIds.has(String(sellerId));
}

/**
 * Adiciona um seller à fila de scraping.
 *
 * @param {object}   seller    - documento SellerPage
 * @param {Function} scraperFn - função que executa o scraping (runScraperForSeller)
 * @returns {boolean}          - false se o seller já estava na fila
 */
export function enqueueSellerScrape(seller, scraperFn) {
  const id = String(seller._id);

  if (pendingIds.has(id)) {
    console.log(`[ScraperQueue] Seller ${id} já está na fila. Ignorando.`);
    return false;
  }

  pendingIds.add(id);
  console.log(
    `[ScraperQueue] Seller ${id} enfileirado. ` +
      `Na fila: ${pendingIds.size} | Rodando: ${limiter.running()} | Aguardando: ${limiter.queued()}`
  );

  limiter
    .schedule(() => scraperFn(seller))
    .catch((err) =>
      console.error(`[ScraperQueue] Erro no seller ${id}:`, err.message)
    )
    .finally(() => {
      pendingIds.delete(id);
      console.log(
        `[ScraperQueue] Seller ${id} concluído. ` +
          `Restantes na fila: ${pendingIds.size}`
      );
    });

  return true;
}

/**
 * Retorna o estado atual da fila (útil para debug).
 */
export function getQueueStats() {
  return {
    running: limiter.running(),
    queued: limiter.queued(),
    pending: [...pendingIds],
  };
}

/**
 * Limpa o flag `scraping: true` de todos os sellers no MongoDB.
 * Chamado na inicialização do servidor para recuperar de restarts inesperados.
 */
export async function resetStaleScrapingFlags() {
  const result = await SellerPage.updateMany(
    { scraping: true },
    { $set: { scraping: false, scrapingStartedAt: null } }
  );
  if (result.modifiedCount > 0) {
    console.log(
      `[ScraperQueue] ${result.modifiedCount} seller(s) com scraping travado foram resetados.`
    );
  }
}

/**
 * Reseta sellers cujo scraping está ativo há mais do que `timeoutMinutes`.
 * Chamado periodicamente pelo cron para liberar travas silenciosas.
 */
export async function resetStaleByTimeout(timeoutMinutes = 30) {
  const cutoff = new Date(Date.now() - timeoutMinutes * 60 * 1000);
  const result = await SellerPage.updateMany(
    { scraping: true, scrapingStartedAt: { $lt: cutoff } },
    { $set: { scraping: false, scrapingStartedAt: null } }
  );
  if (result.modifiedCount > 0) {
    console.warn(
      `[ScraperQueue] Auto-reset: ${result.modifiedCount} seller(s) travados há mais de ${timeoutMinutes}min foram liberados.`
    );
  }
  return result.modifiedCount;
}
