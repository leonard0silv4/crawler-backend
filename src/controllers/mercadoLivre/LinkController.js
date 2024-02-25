import Link from "../../models/Link.js";
import verifyToken from "../../middleware/authMiddleware.js";
import UtilsController from "../../utils/index.js";

export default {
  async store(req, res) {
    try {
      const { link, myPrice } = req.body;
      const {
        sku,
        name,
        offers: { availability: status, price },
        image,
        seller,
        dateMl,
      } = await UtilsController.getDataWithRetry(link);
      const dataLink = await Link.findOne({
        sku: sku,
        uid: verifyToken.recoverUid(req, res),
      });

      if (dataLink == undefined) {
        const dataAdded = await Link.create({
          sku,
          link,
          name,
          status,
          seller,
          dateMl,
          myPrice: Number(myPrice),
          nowPrice: Number(price),
          lastPrice: Number(price),
          image,
          uid: verifyToken.recoverUid(req, res),
        });
        return res.json(dataAdded);
      }

      const priceUpdate = {
        nowPrice: dataLink.nowPrice,
        lastPrice: dataLink.lastPrice,
      };

      if (dataLink.nowPrice != price) {
        priceUpdate.lastPrice = dataLink.nowPrice;
        priceUpdate.nowPrice = price;
      }

      await Link.findOneAndUpdate(
        { _id: dataLink._id, uid: verifyToken.recoverUid(req, res) },
        {
          $set: {
            status: status,
            nowPrice: priceUpdate.nowPrice,
            lastPrice: priceUpdate.lastPrice,
          },
        }
      ).then((obj) => {
        return res.json(obj);
      });
    } catch (error) {
      console.error("Erro durante a inserção do link", error);
      return res.status(500).end();
    }
  },

  async storeList(req, res) {
    const { myPrice } = req.body;

    const links = await UtilsController.extractLinks(req.body.link);
    if (!links) res.end();

    try {
      for (let i = 0; i < links.length; i++) {
        const result = await UtilsController.getDataWithRetry(links[i]);

        const {
          sku,
          name,
          image,
          seller,
          dateMl,
          offers: { availability: status = "OutOfStock", price = 0 } = {},
        } = result || {};

        const dataLink = await Link.findOne({ link: links[i] });

        if (!dataLink && name && image) {
          console.log(i, "Link não encontrado, criando novo...");
          await Link.create({
            sku,
            link: links[i],
            name,
            status,
            seller,
            dateMl,
            myPrice: Number(myPrice),
            nowPrice: Number(price),
            lastPrice: Number(price),
            image,
            uid: verifyToken.recoverUid(req, res),
          });
        } else {
          const priceUpdate = {
            nowPrice: dataLink.nowPrice,
            lastPrice: dataLink.lastPrice,
          };

          if (dataLink.nowPrice != price && price !== 0) {
            priceUpdate.lastPrice = dataLink.nowPrice;
            priceUpdate.nowPrice = price;
          }

          await Link.findOneAndUpdate(
            { _id: dataLink._id, uid: verifyToken.recoverUid(req, res) },
            {
              $set: {
                status: status,
                nowPrice: priceUpdate.nowPrice,
                lastPrice: priceUpdate.lastPrice,
                myPrice: myPrice,
              },
            }
          ).then((obj) => {
            console.log("Link já existe...", i, dataLink.name, "atualizado...");
          });
        }
      }
    } catch (error) {
      console.error("Erro durante a inserção da lista de links", error);
      return res.end();
    }

    res.end();
  },

  async index(req, res) {
    const { page, perPage } = req.query;

    try {
      const links = await Link.aggregate([
        { $match: { uid: verifyToken.recoverUid(req, res) } },
        {
          $facet: {
            metadata: [{ $count: "totalCount" }],
            data: [
              { $sort: { created_at: -1 } },
              { $skip: (page - 1) * perPage },
              { $limit: Number(perPage) },
            ],
          },
        },
      ]);

      return res.status(200).json({
        metadata: {
          totalCount: links[0].metadata[0].totalCount,
          page: Number(page),
          pageSize: Number(perPage),
        },
        data: links[0].data,
      });
    } catch (error) {
      return res.status(500).end();
    }
  },

  async updateOne(req, res) {
    const { id, myPrice } = req.body;

    await Link.findOneAndUpdate(
      { _id: id, uid: verifyToken.recoverUid(req, res) },
      {
        $set: {
          myPrice: myPrice,
        },
      }
    );

    return res.status(200).end();
  },

  async update(req, res) {
    const dataLink = await Link.find({
      uid: verifyToken.recoverUid(req, res),
    }).sort({ created_at: -1 });

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    for (let i = 0; i < dataLink.length; i++) {
      try {
        const result = await UtilsController.getDataWithRetry(dataLink[i].link);

        const {
          seller,
          dateMl,
          offers: { availability: status, price } = {},
        } = result || {};
        const asUpdate = {
          sku: dataLink[i].sku,
          name: dataLink[i].name,
          status: status ?? dataLink[i].status,
          nowPrice: dataLink[i].nowPrice,
          lastPrice: dataLink[i].lastPrice,
          seller,
          dateMl,
        };

        if (price && Number(dataLink[i].nowPrice) != Number(price)) {
          asUpdate.lastPrice = dataLink[i].nowPrice;
          asUpdate.nowPrice = price;
          res.write(`data: ${JSON.stringify(asUpdate)}\n\n`);
        }

        await Link.findOneAndUpdate(
          { _id: dataLink[i]._id, uid: verifyToken.recoverUid(req, res) },
          {
            $set: {
              nowPrice: asUpdate.nowPrice,
              lastPrice: asUpdate.lastPrice,
              status: asUpdate.status,
            },
          }
        ).then((obj) => {
          const percent = ((i + 1) / dataLink.length) * 100;
          res.write(`data: ${percent.toFixed(0)}%\n\n`);
        });
      } catch (error) {
        console.error(`Erro durante a busca para ${dataLink[i].link}`, error);
        return res.status(500);
      }
    }

    res.end();
  },

  async destroy(req, res) {
    const { sku } = req.params;
    await Link.deleteOne({ sku: sku, uid: verifyToken.recoverUid(req, res) });
    res.end();
  },

  async clearRate(req, res) {
    Link.updateMany({ uid: verifyToken.recoverUid(req, res) }, [
      { $set: { lastPrice: "$nowPrice" } },
    ])
      .then((result) => {
        res.status(200).end();

      })
      .catch((err) => {
        console.error("Error updating documents:", err);
      });

    res.end();
  },
};
