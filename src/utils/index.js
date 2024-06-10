import superagent from 'superagent'
import * as cheerio from 'cheerio';

import Link from '../models/Link.js';

export default {
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


  async getDataWithRetry(url, maxRetries = 5) {

    let tentativaAtual = 1;
    
    while (tentativaAtual <= maxRetries) {
      
      try {
        const response = await superagent.get(url).timeout({
          response: 5000,
          deadline: 10000,
        });
        
        
        const $ = cheerio.load(response.text);
        
        let jsonRaw, time, aggregateRating, result, sku;
        
        $('script[type="application/ld+json"]').each((index, element) => {
          const scriptContent = $(element).html();
          
          // Verificar se o script contém '@type":"Product"'
          if (scriptContent.includes('@type":"Product"')) {
              jsonRaw = scriptContent;
          }
      });


      const seller = $('.ui-pdp-seller__link-trigger-button span:nth-child(2)').text();
      const buyActive = $('[formaction="https://www.mercadolivre.com.br/gz/checkout/buy"]').length
        
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
        }else{ 
          result = {
            offers :{
              price : $('[itemprop="price"]').attr('content'),
              availability : buyActive ? 'http://schema.org/InStock' : 'http://schema.org/OutOfStock'
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
          seller : seller || result.offers.seller.name,
          sku : result.sku || result.productID,
          dateMl : time ?? '',
          storeName : url.includes('shopee') ? 'shopee' : 'mercadolivre',
          ratingSeller : aggregateRating,
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
