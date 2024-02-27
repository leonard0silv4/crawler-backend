import superagent from 'superagent'
import * as cheerio from 'cheerio';
// import puppeteer from 'puppeteer';
 

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
      console.log("🚀 ~ extractLinks ~ linksArray qtd:", linksArray?.length);
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
        const jsonRaw = $("script[type='application/ld+json']")[0].children[0].data;
        const seller = $('div.ui-pdp-seller__link-trigger.non-selectable').text();
        const buyActive = $('[formaction="https://www.mercadolivre.com.br/gz/checkout/buy"]').length
        let time;
        
        // await (async () => {
        //   const browser = await puppeteer.launch();
        //   const page = await browser.newPage();
        //   await page.goto(url);
          
        //   time = await page.evaluate(() => {
        //     return window.__PRELOADED_STATE__.initialState?.track?.gtm_event?.startTime;
        //   });
          
        //   await browser.close();
        // })();
        
        const result = JSON.parse(jsonRaw);
        
        //  console.log('buyActive',  buyActive)
        //  console.log('search', result)
        //  if(buyActive == 0) result.offers.availability = 'OutOfStock'

        return {
          ...result, 
          seller : seller ?? '',
          dateMl : time ?? '',
          storeName : 'mercadoLivre'
        };
      } catch (error) {
        console.log("🚀 84: ~ getDataWithRetry ~ error:", url ,'\n', error);
        tentativaAtual++;
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return await Link.find({ link: url });
      }
    }

    throw new Error(`Falha após ${maxRetries} tentativas para ${url}`);
  },
};
