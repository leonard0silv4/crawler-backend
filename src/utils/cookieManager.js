import Cookie from '../models/Cookie.js';

// ⚙️ CONFIGURAÇÃO: Habilitar/Desabilitar uso de cookies
const USE_COOKIES = true; // true = usa cookies | false = não usa cookies

/**
 * Carrega cookies da collection MongoDB
 * @returns {Object} - Objeto com os cookies no formato { name: value }
 */
export async function loadCookies() {
  try {
    // Verificar se cookies estão habilitados
    if (!USE_COOKIES) {
      console.log('ℹ️  Cookies desabilitados (USE_COOKIES=false)');
      return {
        cookieObject: {},
        cookieString: '',
        cookies: []
      };
    }

    // Buscar todos os cookies do MongoDB
    const cookies = await Cookie.find({}).lean();

    if (!cookies || cookies.length === 0) {
      console.warn('⚠️  Nenhum cookie encontrado na collection do MongoDB.');
      return {
        cookieObject: {},
        cookieString: '',
        cookies: []
      };
    }

    // Processar cookies
    const cookieObject = {};
    const cookieStrings = [];

    cookies.forEach(cookie => {
      const name = cookie.name;
      const value = cookie.value;
      const domain = cookie.domain || '';

      // Adicionar ao objeto
      cookieObject[name] = value;

      // Adicionar à string
      cookieStrings.push(`${name}=${value}`);
    });

    console.log(`✓ ${cookies.length} cookies carregados do MongoDB`);
    
    return {
      cookieObject,        
      cookieString: cookieStrings.join('; '),  
      cookies              
    };

  } catch (error) {
    console.error('❌ Erro ao carregar cookies do MongoDB:', error.message);
    return {
      cookieObject: {},
      cookieString: '',
      cookies: []
    };
  }
}

/**
 * Injeta cookies em uma requisição superagent
 * @param {superagent.SuperAgentRequest} request - Request do superagent
 * @returns {superagent.SuperAgentRequest} - Request com cookies injetados
 */
export async function injectCookies(request) {
  // Verificar se cookies estão habilitados
  if (!USE_COOKIES) {
    console.log('ℹ️  Cookies não injetados (USE_COOKIES=false)');
    return request;
  }

  const { cookieString } = await loadCookies();
  
  if (cookieString) {
    return request.set('Cookie', cookieString);
  }
  
  return request;
}

export default {
  loadCookies,
  injectCookies
};

