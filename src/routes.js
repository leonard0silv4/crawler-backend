import express from 'express';

import LinkController from './controllers/mercadoLivre/LinkController.js'
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


// Rotas mercado Livre
routes.get("/links",verifyJWT.isTokenized, LinkController.index);
routes.get("/links/update", verifyJWT.isTokenized, LinkController.update);
routes.post("/links", verifyJWT.isTokenized, LinkController.store);
routes.put("/links", verifyJWT.isTokenized, LinkController.updateOne);
routes.post("/list/ml", LinkController.storeList);
routes.delete("/links/:sku",verifyJWT.isTokenized,  LinkController.destroy);

routes.post("/login", UserController.login);
routes.post("/register", UserController.register);



export default routes;
