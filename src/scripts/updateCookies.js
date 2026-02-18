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
        "expirationDate": 1805938137.242224,
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
        "domain": ".lista.mercadolivre.com.br",
        "expirationDate": 1773697247.072412,
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
        "expirationDate": 1802935037.513038,
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
        "hostOnly": false,
        "httpOnly": false,
        "name": "_cq_suid",
        "path": "/",
        "sameSite": "no_restriction",
        "secure": true,
        "session": true,
        "storeId": null,
        "value": "1.1771105258.bI7WnujdYmJNLyNH"
    },
    {
        "domain": ".mercadolivre.com.br",
        "expirationDate": 1805938137.242187,
        "hostOnly": false,
        "httpOnly": true,
        "name": "ssid",
        "path": "/",
        "sameSite": "no_restriction",
        "secure": true,
        "session": false,
        "storeId": null,
        "value": "ghy-021721-0tkb6DmwIuINYRgUdaIPNvh8RsemxZ-__-79131345-__-1866072536407--RRR_0-RRR_0"
    },
    {
        "domain": ".mercadolivre.com.br",
        "expirationDate": 1805938770.515243,
        "hostOnly": false,
        "httpOnly": true,
        "name": "nsa_rotok",
        "path": "/",
        "sameSite": "no_restriction",
        "secure": true,
        "session": false,
        "storeId": null,
        "value": "eyJhbGciOiJSUzI1NiIsImtpZCI6IjMiLCJ0eXAiOiJKV1QifQ.eyJpZGVudGlmaWVyIjoiNjhiZmY5ZmEtYjlhNC00ZmQ4LWI3MzAtNmJjYjY3MTg4ZjYzIiwicm90YXRpb25faWQiOiI0NDExMjg4Zi0xNWVmLTQ5MDQtYTE2Ni1kNDY5Yjc5ZWIxOTQiLCJwbGF0Zm9ybSI6Ik1MIiwicm90YXRpb25fZGF0ZSI6MTc3MTM3OTM2NSwiZXhwIjoxNzczOTcwNzY1LCJqdGkiOiIzNjgxOTBiYi0xMDBhLTQ0ZmYtYTIyMi0wODk5ZWNkNWFlNmUiLCJpYXQiOjE3NzEzNzg3NjUsInN1YiI6IjY4YmZmOWZhLWI5YTQtNGZkOC1iNzMwLTZiY2I2NzE4OGY2MyJ9.NIKYRDkjt8xZg8iWDkGed5QefwLt5o6-5FXhwASDvgEw1bI6NCJ_9TMzFbfYc-hNUKdUtDnWDlQIMcoGLeKdyRjICnjnmkX8g6yCQciTB4BvwxqAeWGU9wj7oIdFiTqF1Ghm616D81p65FCjt5-Zd5wqPaki3FC1J6su8mx8LC8kHVZxpiek6PfE0xPy5CtatuCjPARXgKt0sRxkxy6XWb_o93La3YNzhTbzZ-JyqlEFHhC5y2L2YXur_C_EHGyLIo17zROwf730yV6iQ5QcoursJOUC0q-tYtLqRgodQO3OkKo_hQpvcPHyi2GHmFeeuNDIGRTTCGwPxoB5togl5g"
    },
    {
        "domain": ".mercadolivre.com.br",
        "expirationDate": 1802914775,
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
        "domain": ".mercadolivre.com.br",
        "expirationDate": 1779262782,
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
        "domain": "lista.mercadolivre.com.br",
        "hostOnly": true,
        "httpOnly": true,
        "name": "_csrf",
        "path": "/",
        "sameSite": "no_restriction",
        "secure": true,
        "session": true,
        "storeId": null,
        "value": "zhccPfw7D8TBw-8I0vPRND4O"
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
        "expirationDate": 1771379966,
        "hostOnly": false,
        "httpOnly": false,
        "name": "_hjSession_720738",
        "path": "/",
        "sameSite": "no_restriction",
        "secure": true,
        "session": false,
        "storeId": null,
        "value": "eyJpZCI6ImM2OGIwMjM4LTIwMTktNGFmNy1iZTNlLTlmZGIwYWJjODM3YyIsImMiOjE3NzEzNzgxNjY5NDcsInMiOjAsInIiOjAsInNiIjowLCJzciI6MCwic2UiOjAsImZzIjowLCJzcCI6MH0="
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
        "expirationDate": 1771380657.156761,
        "hostOnly": false,
        "httpOnly": false,
        "name": "_mldataSessionId",
        "path": "/",
        "sameSite": null,
        "secure": true,
        "session": false,
        "storeId": null,
        "value": "cdd3e027-762d-4ead-ae89-838bfacd94c9"
    },
    {
        "domain": ".mercadolivre.com.br",
        "expirationDate": 1771382455.254888,
        "hostOnly": false,
        "httpOnly": false,
        "name": "_snoopy",
        "path": "/",
        "sameSite": "no_restriction",
        "secure": true,
        "session": false,
        "storeId": null,
        "value": "eyJmaW5nZXJwcmludCI6IjUyUUswcDdES25xRWdpMVdFV2c3bzlxaE1FN1kvVlhlSG1PL2VZLzd6ektwNGFkOTJQS1RXR0Y1Zys1ZXgwMVptSjNJaXpKR2d0aTlnVi91cXUrTVdtWmJTS0t4Ty9iYjRRODR2cHR1YzVzNDJidFhJNU5JbHBxK2Q5M3ZyUFdrMlVVQi9BOVp0ZlNMZC9wM1hGMXZodXVieDJpSDhsclo3NXNoMEtNSkJqQUVuT3FocDl3PSIsImtleSI6IjkvSnVsSHBSQ0IvTHd4emQ1c2dMb29vaDN0YVJNQzdjOVdocVZ2VW5UVzJLbkplZ1doamRMaHNxTDgwcFhGZ2ltVE92RTJmcUVSM1ZpRXRLTVZ6bGZHbk1jSjZVVWl5cCJ9"
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
        "domain": ".lista.mercadolivre.com.br",
        "expirationDate": 1771798473.475151,
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
        "expirationDate": 1771379937.512867,
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
        "expirationDate": 1771982937.512967,
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
        "expirationDate": 1805938137.24208,
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
        "expirationDate": 1771379369.88666,
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
        "expirationDate": 1805938137.241885,
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
        "expirationDate": 1805938137.242026,
        "hostOnly": false,
        "httpOnly": false,
        "name": "orguserid",
        "path": "/",
        "sameSite": "no_restriction",
        "secure": true,
        "session": false,
        "storeId": null,
        "value": "0h4900H0HT9"
    }
];

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
