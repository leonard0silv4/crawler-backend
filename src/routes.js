import express from 'express';

import LinkController from './controllers/mercadolivre_shopee/LinkController.js'
import UserController from './controllers/UserController.js';
import MailController from './controllers/MailController.js';
import FactionistController from './controllers/FactionistController.js';
import JobController from './controllers/JobController.js';

import verifyJWT from './middleware/authMiddleware.js'

const routes = express.Router();

routes.get("/",  (req, res) => {
    res.json({status : new Date()});
});

routes.get("/health",  async (req, res) => {
    res.json({
        date : new Date(),
        status : 'ok : v1.2'
    })    
});

routes.get("/send", MailController.testIntegration);


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

// Rotas faccionista
routes.post("/factionist", verifyJWT.isTokenized, FactionistController.store);
routes.put("/factionist/:faccionistId", verifyJWT.isTokenized, FactionistController.update);
routes.get("/factionist/:faccionistId?", verifyJWT.isTokenized, FactionistController.index);
routes.delete("/factionist/:id",verifyJWT.isTokenized,  FactionistController.destroy);

// Rotas jobs
routes.post("/job", verifyJWT.isTokenized, JobController.storeJob);
routes.get("/job/:faccionistaId?", verifyJWT.isTokenized, JobController.indexJobs);
routes.put("/job/:id", verifyJWT.isTokenized, JobController.updateJob);
routes.put("/jobs/", verifyJWT.isTokenized, JobController.updateJobs);

export default routes;
