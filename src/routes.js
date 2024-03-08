import express from 'express';

import LinkController from './controllers/mercadolivre_shopee/LinkController.js'
import UserController from './controllers/UserController.js';
import MailController from './controllers/MailController.js';
import verifyJWT from './middleware/authMiddleware.js'

const routes = express.Router();

routes.get("/",  (req, res) => {
    res.json({status : new Date()});
});

routes.get("/healthz",  async (req, res) => {
    res.json({
        date : new Date(),
        status : 'ok'
    })    
});

routes.get("/send",verifyJWT.isTokenized, MailController.index);


// Rotas de links
routes.get("/links",verifyJWT.isTokenized, LinkController.index);
routes.get("/links/update/:storeName", verifyJWT.isTokenized, LinkController.update);
routes.put("/links", verifyJWT.isTokenized, LinkController.updateOne);
routes.post("/links", verifyJWT.isTokenized, LinkController.store);
routes.post("/list/batch", LinkController.storeList);
routes.post("/links/clearRates/:storeName",verifyJWT.isTokenized, LinkController.clearRate);
routes.delete("/links/:sku",verifyJWT.isTokenized,  LinkController.destroy);
routes.delete("/links/clearAll/:storeName",verifyJWT.isTokenized,  LinkController.destroyAll);

// Rotas de login
routes.post("/login", UserController.login);
routes.post("/register", UserController.register);



export default routes;
