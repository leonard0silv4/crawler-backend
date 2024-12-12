import superagent from 'superagent'
import * as cheerio from 'cheerio';

import Link from '../models/Link.js';

export default {



  async updateMyPriceFromCatalog(catalogUrl){
    console.log('search on list sellers')
    const response = await superagent.get(`${catalogUrl}/s`).timeout({
      response: 3000, 
      deadline: 5000, 
    });

    const $ = cheerio.load(response.text);
    const form = $(`span:contains("${process.env.STORE_NAME}")`).closest('form')
    
    if(!form.length)
      return
    
    const fraction = form.find('.andes-money-amount__fraction').first().text().trim();
    const cents = form.find('.andes-money-amount__cents').first().text().trim();

    const price = parseFloat(`${fraction}.${cents}`);

    console.log(`Valor encontrado: ${price}`);
    return price;
  },

  async extractLinks(url) {
    try {
      const response = await superagent.get(url).timeout({
        response: 5000,
        deadline: 10000,
      });

      let linksArray = []

      const $ = cheerio.load(response.text);
      const links = $(".ui-search-result__wrapper a");

      links.each((_, value) => {
        const parts = $(value).attr("href").split('#');
        linksArray.push(parts[0])
      })
      console.log("🚀 ~ extractLinks ~ links found qtd:", linksArray?.length);
      return linksArray;
    } catch (err) {
      console.log(err);
    }

      
  },


  async getDataWithRetry(url, maxRetries = 3) {

    let tentativaAtual = 1;
    
    while (tentativaAtual <= maxRetries) {
      
      try {
        const response = await superagent.get(url).timeout({
          response: 5000,
          deadline: 10000,
        });
        
        
        const $ = cheerio.load(response.text);
        
        let jsonRaw, time, aggregateRating, result, sku, autoPrice;
        
      $('script[type="application/ld+json"]').each((index, element) => {
          const scriptContent = $(element).html();
          
          // Verificar se o script contém '@type":"Product"'
          if (scriptContent.includes('@type":"Product"')) {
              jsonRaw = scriptContent;

          }
      });

      
      const seller = $('.ui-pdp-container__row .ui-pdp-seller__link-trigger-button span:nth-child(2)').first().text();
      const buyActive = $('[formaction="https://www.mercadolivre.com.br/gz/checkout/buy"]').length
      const full = $('[href="#full_icon"]').length ? true : false
      const catalog = $('.ui-pdp-other-sellers-item__buybox').length ? true : false
      const paused = $('.ui-pdp-message.ui-vpp-message .andes-message__content').length ? true : false

      // if(catalog && seller != process.env.STORE_NAME){
      //   autoPrice = await this.updateMyPriceFromCatalog(url)
      // }
      
        
        $('script').each((index, element) => {
          const scriptContent = $(element).html();
          const regex = /"startTime":"([^"]+)"/;
          const sTime = scriptContent.match(regex);
          
          if (sTime && sTime[1]) {
            const startTimeValue = sTime[1];
            time = startTimeValue;
            return false;
          }
        });

        $('script').each((index, element) => {
          const scriptContent = $(element).html();
          const regex = /"sku":"([^"]+)"/;
          const sSku = scriptContent.match(regex);
          
          if (sSku && sSku[1]) {
            const skuParsed = sSku[1];
            sku = skuParsed;
            return false; 
          }
        });
        
        
        if(jsonRaw){
           result = JSON.parse(jsonRaw);
           if(paused) result.offers.availability = 'https://schema.org/OutOfStock'
           
        }else{ 
          result = {
            offers :{
              price : $('[itemprop="price"]').attr('content'),
              availability : buyActive ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock'
            },
            sku,
            name : $('.ui-pdp-title').text(),
            image : $('.ui-pdp-gallery__figure img').attr('src').replace('.jpg', '.webp'),
            
          };
        }
        
        if(result?.offers?.seller?.aggregateRating?.ratingValue){
          aggregateRating = result?.offers?.seller?.aggregateRating?.ratingValue;
        }

        
        return {
          ...result, 
          seller : seller || result?.offers?.seller?.name,
          sku : result.sku || result.productID,
          dateMl : time ?? '',
          storeName : url.includes('shopee') ? 'shopee' : 'mercadolivre',
          ratingSeller : aggregateRating,
          full,
          catalog,
          ...(autoPrice ? { autoPrice } : {}) // Adiciona autoPrice apenas se existir
        };
      } catch (error) {
        console.log("🚀 97: ~ getDataWithRetry ~ error:", url ,'\n', error);
        tentativaAtual++;
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return await Link.find({ link: url }) || {};
      }
    }

    throw new Error(`Falha após ${maxRetries} tentativas para ${url}`);
  },
};
