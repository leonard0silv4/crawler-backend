import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Cookie from '../models/Cookie.js';

// Carregar variáveis de ambiente do diretório pai
dotenv.config({ path: "../../.env" });

// Novos cookies
const newCookies = [
    {
        "domain": ".mercadolivre.com.br",
        "hostOnly": false,
        "httpOnly": false,
        "name": "main_attributes",
        "path": "/",
        "sameSite": "no_restriction",
        "secure": true,
        "session": true,
        "storeId": null,
        "value": ""
    },
    {
        "domain": ".www.mercadolivre.com.br",
        "expirationDate": 1772233593.160859,
        "hostOnly": false,
        "httpOnly": true,
        "name": "c_Z1laz4H",
        "path": "/",
        "sameSite": "no_restriction",
        "secure": true,
        "session": false,
        "storeId": null,
        "value": "1"
    },
    {
        "domain": ".mercadolivre.com.br",
        "hostOnly": false,
        "httpOnly": false,
        "name": "last_query",
        "path": "/",
        "sameSite": "no_restriction",
        "secure": true,
        "session": true,
        "storeId": null,
        "value": ""
    },
    {
        "domain": ".mercadolivre.com.br",
        "expirationDate": 1806013250.632654,
        "hostOnly": false,
        "httpOnly": false,
        "name": "orguseridp",
        "path": "/",
        "sameSite": "no_restriction",
        "secure": true,
        "session": false,
        "storeId": null,
        "value": "79131345"
    },
    {
        "domain": ".mercadolivre.com.br",
        "expirationDate": 1782224951,
        "hostOnly": false,
        "httpOnly": false,
        "name": "_hjSessionUser_562167",
        "path": "/",
        "sameSite": "no_restriction",
        "secure": true,
        "session": false,
        "storeId": null,
        "value": "eyJpZCI6IjE3OTIzMjhhLTk0ZGEtNWE2OS04YjZlLTdiZmRiMThlYzczZiIsImNyZWF0ZWQiOjE2OTQyNjc0MTg3MTksImV4aXN0aW5nIjp0cnVlfQ=="
    },
    {
        "domain": "www.mercadolivre.com.br",
        "hostOnly": true,
        "httpOnly": true,
        "name": "_csrf",
        "path": "/",
        "sameSite": "no_restriction",
        "secure": true,
        "session": true,
        "storeId": null,
        "value": "6GUB0QKsu3_eTHJy10jhmIus"
    },
    {
        "domain": ".mercadolivre.com.br",
        "expirationDate": 1771763675.029199,
        "hostOnly": false,
        "httpOnly": true,
        "name": "cp",
        "path": "/",
        "sameSite": "no_restriction",
        "secure": true,
        "session": false,
        "storeId": null,
        "value": "86010610"
    },
    {
        "domain": ".mercadolivre.com.br",
        "expirationDate": 1803010151.537733,
        "hostOnly": false,
        "httpOnly": false,
        "name": "cookiesPreferencesNotLogged",
        "path": "/",
        "sameSite": "no_restriction",
        "secure": true,
        "session": false,
        "storeId": null,
        "value": "%7B%22categories%22%3A%7B%22advertising%22%3Atrue%2C%22functionality%22%3Anull%2C%22performance%22%3Anull%2C%22traceability%22%3Anull%7D%7D"
    },
    {
        "domain": ".mercadolivre.com.br",
        "expirationDate": 1797512112,
        "hostOnly": false,
        "httpOnly": false,
        "name": "_hjSessionUser_580848",
        "path": "/",
        "sameSite": "no_restriction",
        "secure": true,
        "session": false,
        "storeId": null,
        "value": "eyJpZCI6ImIzNmExOTJlLTE3M2ItNTgyOC1iNGFmLTZiZWMwNTBkYWFkNCIsImNyZWF0ZWQiOjE2OTQwMDkwNjIyNDQsImV4aXN0aW5nIjp0cnVlfQ=="
    },
    {
        "domain": ".mercadolivre.com.br",
        "expirationDate": 1806013250.632519,
        "hostOnly": false,
        "httpOnly": true,
        "name": "ssid",
        "path": "/",
        "sameSite": "no_restriction",
        "secure": true,
        "session": false,
        "storeId": null,
        "value": "ghy-021818-sKjfMTINQlXUSU2kI0saPYqdQCoGJO-__-79131345-__-1866147650066--RRR_0-RRR_0"
    },
    {
        "domain": ".mercadolivre.com.br",
        "expirationDate": 1806013252.118898,
        "hostOnly": false,
        "httpOnly": true,
        "name": "nsa_rotok",
        "path": "/",
        "sameSite": "no_restriction",
        "secure": true,
        "session": false,
        "storeId": null,
        "value": "eyJhbGciOiJSUzI1NiIsImtpZCI6IjMiLCJ0eXAiOiJKV1QifQ.eyJpZGVudGlmaWVyIjoiZTRmYWUxNDItOTI1NC00MDRmLTk2YzgtODQ5N2EzOTQ2MWU5Iiwicm90YXRpb25faWQiOiI1YjcyN2NkYy1kN2Q2LTQzNzItYTEwMS03NWQzNzRjYTMyM2YiLCJwbGF0Zm9ybSI6Ik1MIiwicm90YXRpb25fZGF0ZSI6MTc3MTQ1Mzg1MCwiZXhwIjoxNzc0MDQ1MjUwLCJqdGkiOiJhNmRkOGRlMC0yMzc5LTRhYzgtYmQzZi04NGEyNzc2YzQzNzgiLCJpYXQiOjE3NzE0NTMyNTAsInN1YiI6ImU0ZmFlMTQyLTkyNTQtNDA0Zi05NmM4LTg0OTdhMzk0NjFlOSJ9.RwsiNKLHYrOtLynExlhH2bYrj5YkhEz7ZaVcjO4WT51rem3SWeQHSIPMuTvWS9Ye7H9drRtCsoU6D8MGAlb7rllBDfjeTl9DexlXvdBbkqIs0dOdPYZucX5H8e_h3xwEzUSQDCDz56RYp7-p8dZqd0K6TSpn4w7BSTaHaAYSDm80cN4VvsiP2dM1MZHUYzBtffZegbu7VNpaH7clQWgibkUb0NfChU1AF_LBX0hqFhuIw72c7NT1KbiH5EIlny7Tt00EyNXKn_5N-QDDVUR808ghkc-ma9pvxVxmJ9qmgfDJiq65Rsdc4iHp4lupbWCl56qgwUz7B-klUzetn9wpug"
    },
    {
        "domain": ".mercadolivre.com.br",
        "expirationDate": 1802989251,
        "hostOnly": false,
        "httpOnly": false,
        "name": "_hjSessionUser_720738",
        "path": "/",
        "sameSite": "no_restriction",
        "secure": true,
        "session": false,
        "storeId": null,
        "value": "eyJpZCI6IjQwZjA1NDI4LWUzZDktNTY4Ni04NTQzLWI4Zjk0NmE2NjViZiIsImNyZWF0ZWQiOjE2OTM4Mjc0NTA5NjYsImV4aXN0aW5nIjp0cnVlfQ=="
    },
    {
        "domain": ".mercadolivre.com.br",
        "expirationDate": 1773178846,
        "hostOnly": false,
        "httpOnly": false,
        "name": "LAST_SEARCH",
        "path": "/",
        "sameSite": "no_restriction",
        "secure": true,
        "session": false,
        "storeId": null,
        "value": "bone%20trucker"
    },
    {
        "domain": "www.mercadolivre.com.br",
        "expirationDate": 1802967340,
        "hostOnly": true,
        "httpOnly": false,
        "name": "__rtbh.lid",
        "path": "/",
        "sameSite": "no_restriction",
        "secure": true,
        "session": false,
        "storeId": null,
        "value": "%7B%22eventType%22%3A%22lid%22%2C%22id%22%3A%223UTJAX97rD6DS1uL1gIE%22%2C%22expiryDate%22%3A%222027-02-18T16%3A15%3A40.020Z%22%7D"
    },
    {
        "domain": "www.mercadolivre.com.br",
        "expirationDate": 1802967340,
        "hostOnly": true,
        "httpOnly": false,
        "name": "__rtbh.uid",
        "path": "/",
        "sameSite": "no_restriction",
        "secure": true,
        "session": false,
        "storeId": null,
        "value": "%7B%22eventType%22%3A%22uid%22%2C%22id%22%3A%2279131345%22%2C%22expiryDate%22%3A%222027-02-18T16%3A15%3A40.008Z%22%7D"
    },
    {
        "domain": ".mercadolivre.com.br",
        "expirationDate": 1779315346,
        "hostOnly": false,
        "httpOnly": false,
        "name": "_cq_duid",
        "path": "/",
        "sameSite": "no_restriction",
        "secure": true,
        "session": false,
        "storeId": null,
        "value": "1.1704892813.hBSOB2kbdVVZNImf"
    },
    {
        "domain": ".mercadolivre.com.br",
        "expirationDate": 1800629279.231409,
        "hostOnly": false,
        "httpOnly": false,
        "name": "_d2id",
        "path": "/",
        "sameSite": "no_restriction",
        "secure": true,
        "session": false,
        "storeId": null,
        "value": "518775ee-46ce-4b7d-8932-dfe59974e7ea"
    },
    {
        "domain": ".mercadolivre.com.br",
        "expirationDate": 1771454954,
        "hostOnly": false,
        "httpOnly": false,
        "name": "_hjSession_720738",
        "path": "/",
        "sameSite": "no_restriction",
        "secure": true,
        "session": false,
        "storeId": null,
        "value": "eyJpZCI6ImNkMGRlMzdlLTNmYmEtNDRmMi1iNDNiLWRhYWJkNGNmMjljNCIsImMiOjE3NzE0NTMxMjM3NDYsInMiOjAsInIiOjAsInNiIjowLCJzciI6MCwic2UiOjAsImZzIjowLCJzcCI6MH0="
    },
    {
        "domain": ".mercadolivre.com.br",
        "expirationDate": 1782224856,
        "hostOnly": false,
        "httpOnly": false,
        "name": "_hjSessionUser_677606",
        "path": "/",
        "sameSite": "no_restriction",
        "secure": true,
        "session": false,
        "storeId": null,
        "value": "eyJpZCI6IjZjYWFiZDY2LWVkOTQtNTllYy05ZmU1LWI1ZWYyZGM2MWVmYiIsImNyZWF0ZWQiOjE3MDA2NTc2MDc1MzIsImV4aXN0aW5nIjp0cnVlfQ=="
    },
    {
        "domain": ".mercadolivre.com.br",
        "expirationDate": 1771455057,
        "hostOnly": false,
        "httpOnly": false,
        "name": "_mldataSessionId",
        "path": "/",
        "sameSite": "no_restriction",
        "secure": true,
        "session": false,
        "storeId": null,
        "value": "8696c152-da96-42f2-93d1-714e7ac5957a"
    },
    {
        "domain": ".mercadolivre.com.br",
        "hostOnly": false,
        "httpOnly": false,
        "name": "backend_dejavu_info",
        "path": "/",
        "sameSite": "no_restriction",
        "secure": true,
        "session": true,
        "storeId": null,
        "value": "j%3A%7B%7D"
    },
    {
        "domain": ".www.mercadolivre.com.br",
        "expirationDate": 1773239193.399731,
        "hostOnly": false,
        "httpOnly": true,
        "name": "c_ui-navigation",
        "path": "/",
        "sameSite": "no_restriction",
        "secure": true,
        "session": false,
        "storeId": null,
        "value": "6.9.0"
    },
    {
        "domain": ".www.mercadolivre.com.br",
        "expirationDate": 1774023336.800258,
        "hostOnly": false,
        "httpOnly": true,
        "name": "c_Z1jYmnu",
        "path": "/",
        "sameSite": "no_restriction",
        "secure": true,
        "session": false,
        "storeId": null,
        "value": "1"
    },
    {
        "domain": ".www.mercadolivre.com.br",
        "expirationDate": 1773697223.850562,
        "hostOnly": false,
        "httpOnly": true,
        "name": "c_Z2qNAD5",
        "path": "/",
        "sameSite": "no_restriction",
        "secure": true,
        "session": false,
        "storeId": null,
        "value": "1"
    },
    {
        "domain": ".mercadolivre.com.br",
        "hostOnly": false,
        "httpOnly": false,
        "name": "categories",
        "path": "/",
        "sameSite": "no_restriction",
        "secure": true,
        "session": true,
        "storeId": null,
        "value": ""
    },
    {
        "domain": ".mercadolivre.com.br",
        "hostOnly": false,
        "httpOnly": false,
        "name": "category",
        "path": "/",
        "sameSite": "no_restriction",
        "secure": true,
        "session": true,
        "storeId": null,
        "value": ""
    },
    {
        "domain": ".mercadolivre.com.br",
        "expirationDate": 1771455051.537595,
        "hostOnly": false,
        "httpOnly": false,
        "name": "cookiesPreferencesLogged",
        "path": "/",
        "sameSite": "no_restriction",
        "secure": true,
        "session": false,
        "storeId": null,
        "value": "%7B%22userId%22%3A79131345%2C%22categories%22%3A%7B%22advertising%22%3Atrue%2C%22functionality%22%3Anull%2C%22performance%22%3Anull%2C%22traceability%22%3Anull%7D%7D"
    },
    {
        "domain": ".mercadolivre.com.br",
        "expirationDate": 1772058051.537665,
        "hostOnly": false,
        "httpOnly": false,
        "name": "cookiesPreferencesLoggedFallback",
        "path": "/",
        "sameSite": "no_restriction",
        "secure": true,
        "session": false,
        "storeId": null,
        "value": "%7B%22userId%22%3A79131345%2C%22categories%22%3A%7B%22advertising%22%3Atrue%2C%22functionality%22%3Anull%2C%22performance%22%3Anull%2C%22traceability%22%3Anull%7D%7D"
    },
    {
        "domain": ".mercadolivre.com.br",
        "expirationDate": 1806013250.632556,
        "hostOnly": false,
        "httpOnly": true,
        "name": "ftid",
        "path": "/",
        "sameSite": "no_restriction",
        "secure": true,
        "session": false,
        "storeId": null,
        "value": "TevBZPr3c3UQryZFEhiZmqO0oQpC72Qq-1771378085869"
    },
    {
        "domain": ".mercadolivre.com.br",
        "expirationDate": 1771453851.537798,
        "hostOnly": false,
        "httpOnly": false,
        "name": "hide-cookie-banner",
        "path": "/",
        "sameSite": "no_restriction",
        "secure": true,
        "session": false,
        "storeId": null,
        "value": "79131345-COOKIE_PREFERENCES_ALREADY_SET"
    },
    {
        "domain": ".mercadolivre.com.br",
        "hostOnly": false,
        "httpOnly": false,
        "name": "main_domain",
        "path": "/",
        "sameSite": "no_restriction",
        "secure": true,
        "session": true,
        "storeId": null,
        "value": ""
    },
    {
        "domain": ".mercadolivre.com.br",
        "hostOnly": false,
        "httpOnly": false,
        "name": "ml_cart-quantity",
        "path": "/",
        "sameSite": "no_restriction",
        "secure": true,
        "session": true,
        "storeId": null,
        "value": "0"
    },
    {
        "domain": ".mercadolivre.com.br",
        "expirationDate": 1806013250.63231,
        "hostOnly": false,
        "httpOnly": false,
        "name": "orgnickp",
        "path": "/",
        "sameSite": "no_restriction",
        "secure": true,
        "session": false,
        "storeId": null,
        "value": "LEO07VASP"
    },
    {
        "domain": ".mercadolivre.com.br",
        "expirationDate": 1806013250.632466,
        "hostOnly": false,
        "httpOnly": false,
        "name": "orguserid",
        "path": "/",
        "sameSite": "no_restriction",
        "secure": true,
        "session": false,
        "storeId": null,
        "value": "Hh400HH0HT9"
    },
    {
        "domain": "www.mercadolivre.com.br",
        "expirationDate": 1772750328,
        "hostOnly": true,
        "httpOnly": false,
        "name": "QSI_SI_d4ikElJeWDP7fzo_intercept",
        "path": "/",
        "sameSite": null,
        "secure": true,
        "session": false,
        "storeId": null,
        "value": "true"
    }
]

/**
 * Mapeia sameSite para o formato do modelo
 */
function mapSameSite(sameSite) {
  if (sameSite === 'no_restriction') return 'None';
  if (sameSite === null || sameSite === undefined) return null;
  return sameSite;
}

/**
 * Converte os novos cookies para o formato do modelo
 */
function convertCookies(cookies) {
  return cookies.map(cookie => {
    const converted = {
      name: cookie.name,
      value: cookie.value,
      domain: cookie.domain,
      path: cookie.path,
      httpOnly: cookie.httpOnly,
      secure: cookie.secure,
      sameSite: mapSameSite(cookie.sameSite)
    };

    // Adicionar expiry se existir expirationDate (converter para inteiro)
    if (cookie.expirationDate) {
      converted.expiry = Math.floor(cookie.expirationDate);
    }

    return converted;
  });
}

/**
 * Atualiza os cookies no MongoDB
 */
async function updateCookies() {
  try {
    console.log('🔄 Iniciando atualização dos cookies...');

    // Conectar ao MongoDB usando as mesmas variáveis do index.js
    const mongoUri = `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@${process.env.MONGO_STRING}?retryWrites=true&w=majority`;
    await mongoose.connect(mongoUri);
    console.log('✓ Conectado ao MongoDB');

    // Deletar todos os cookies antigos
    const deleteResult = await Cookie.deleteMany({});
    console.log(`✓ ${deleteResult.deletedCount} cookies antigos removidos`);

    // Converter e inserir os novos cookies
    const convertedCookies = convertCookies(newCookies);
    
    // Filtrar cookies com valor vazio (o modelo exige value obrigatório)
    const validCookies = convertedCookies.filter(cookie => cookie.value && cookie.value.trim() !== '');
    const skippedCookies = convertedCookies.length - validCookies.length;
    
    if (skippedCookies > 0) {
      console.log(`⚠️  ${skippedCookies} cookies com valor vazio foram ignorados`);
    }
    
    const insertResult = await Cookie.insertMany(validCookies);
    console.log(`✓ ${insertResult.length} novos cookies inseridos`);

    // Verificar os cookies inseridos
    const allCookies = await Cookie.find({});
    console.log('\n📋 Resumo dos cookies na collection:');
    console.log(`   Total de cookies: ${allCookies.length}`);
    console.log('\n   Cookies por domínio:');
    
    const byDomain = {};
    allCookies.forEach(cookie => {
      byDomain[cookie.domain] = (byDomain[cookie.domain] || 0) + 1;
    });
    
    Object.entries(byDomain).forEach(([domain, count]) => {
      console.log(`   - ${domain}: ${count} cookies`);
    });

    console.log('\n✅ Atualização concluída com sucesso!');
    
    await mongoose.connection.close();
    console.log('✓ Conexão com MongoDB fechada');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao atualizar cookies:', error);
    process.exit(1);
  }
}

// Executar o script
updateCookies();
