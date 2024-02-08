import superagent from 'superagent'
import  cheerio  from 'cheerio';
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
      console.log("🚀 ~ extractLinks ~ linksArray:", linksArray);
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
        const jsonRaw = $("script[type='application/ld+json']")[0].children[0]
          .data;
        const result = JSON.parse(jsonRaw);

        return result;
      } catch (error) {
        tentativaAtual++;
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return await Link.find({ link: url });
      }
    }

    throw new Error(`Falha após ${maxRetries} tentativas para ${url}`);
  },
};
