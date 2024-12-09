import express from 'express';

import LinkController from './controllers/mercadolivre_shopee/LinkController.js'
import UserController from './controllers/UserController.js';

import verifyJWT from './middleware/authMiddleware.js'

const routes = express.Router();

routes.get("/",  (req, res) => {
    res.json({status : new Date()});
});

routes.get("/health",  async (req, res) => {
    res.json({
        date : new Date(),
        status : 'ok v2'
    })    
});



// Rotas de links
routes.get("/links",verifyJWT.isTokenized, LinkController.index);
routes.get("/tags",verifyJWT.isTokenized, LinkController.getUniqueTags);
routes.get("/links/update/:storeName", verifyJWT.isTokenized, LinkController.update);
routes.put("/links", verifyJWT.isTokenized, LinkController.updateOne);
routes.post("/links", verifyJWT.isTokenized, LinkController.store);
routes.post("/list/batch", LinkController.storeList);
routes.post("/links/clearRates/:storeName",verifyJWT.isTokenized, LinkController.clearRate);
routes.delete("/links/tags/:id/:tag",verifyJWT.isTokenized,  LinkController.destroyTag);
routes.delete("/links/:sku",verifyJWT.isTokenized,  LinkController.destroy);
routes.delete("/links/clearAll/:storeName",verifyJWT.isTokenized,  LinkController.destroyAll);

// Rotas de usuário
routes.post("/login", UserController.login);
routes.post("/register", UserController.register);
routes.get("/config", verifyJWT.isTokenized, UserController.getUserConfig);
routes.post("/saveConfig", verifyJWT.isTokenized, UserController.saveConfig);



export default routes;
