import superagent from 'superagent'
import * as cheerio from 'cheerio';

import Link from '../../../models/Link.js';

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

        let jsonRaw, time;

        $('script[type="application/ld+json"]').each((index, element) => {
          const scriptContent = $(element).html();
          if (scriptContent.includes('@type":"Product"')) {
            jsonRaw = scriptContent;
          }
        });


        const seller = $('div.ui-pdp-seller__link-trigger.non-selectable').text();


        $('script').each((index, element) => {
          const scriptContent = $(element).html();
          const regex = /"startTime":"([^"]+)"/;
          const match = scriptContent.match(regex);

          if (match && match[1]) {
            const startTimeValue = match[1];
            time = startTimeValue;

            return false;
          }
        });



        const result = JSON.parse(jsonRaw);



        return {
          ...result,
          seller: seller ?? '',
          dateMl: time ?? '',
          storeName: url.includes('shopee') ? 'shopee' : 'mercadolivre'
        };
      } catch (error) {
        console.log("🚀 84: ~ getDataWithRetry ~ error:", url, '\n', error);
        tentativaAtual++;
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return await Link.find({ link: url }) || {};
      }
    }

    throw new Error(`Falha após ${maxRetries} tentativas para ${url}`);
  },
};
