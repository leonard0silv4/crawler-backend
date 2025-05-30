import express from 'express';

import LinkController from './controllers/mercadolivre_shopee/LinkController.js'
import UserController from './controllers/UserController.js';
import MailController from './controllers/MailController.js';
import FactionistController from './controllers/FactionistController.js';
import JobController from './controllers/JobController.js';
import PdfController from './controllers/PdfController.js';
import MeliController from './controllers/MeliController.js';
import CronController from './controllers/CronController.js';

import verifyJWT from './middleware/authMiddleware.js'
import NfController from './controllers/NfController.js';

const routes = express.Router();

routes.get("/",  (req, res) => {
    res.json({status : new Date()});
});

routes.get("/health",  async (req, res) => {
    res.json({
        date : new Date(),
        status : 'ok : v1.3'
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
routes.get("/factionistUser/", verifyJWT.isTokenized, FactionistController.indexUser);
routes.get("/factionistJob/:faccionistId", verifyJWT.isTokenized, FactionistController.findLastLoteByFaccionistaId);
routes.delete("/factionist/:id",verifyJWT.isTokenized,  FactionistController.destroy);

// Rotas jobs
routes.post("/job", verifyJWT.isTokenized, JobController.storeJob);
routes.get("/job/:faccionistaId?", verifyJWT.isTokenized, JobController.indexJobs);
routes.put("/job/:id", verifyJWT.isTokenized, JobController.updateJob);
routes.put("/jobs/", verifyJWT.isTokenized, JobController.updateJobs);
routes.put("/jobs/sizes", verifyJWT.isTokenized, JobController.updateSizes);

routes.put("/jobs/rate", verifyJWT.isTokenized, JobController.updateRate);
routes.get("/jobs/rate/:id", verifyJWT.isTokenized, JobController.indexRate);
routes.put("/jobs/splitAdvancedMoney", verifyJWT.isTokenized, JobController.updateJobHasSplit);

// Rota pdf
routes.post("/report/pdf", verifyJWT.isTokenized, PdfController.index);

// Rotas Meli connection
routes.get('/auth', MeliController.authRedirect);
routes.get('/teste', CronController.cronUserMeli);
routes.get('/callback', MeliController.authCallback);
routes.get('/accounts/',verifyJWT.isTokenized, MeliController.getAccounts);
routes.get('/accounts/products',verifyJWT.isTokenized, MeliController.listarProdutos);
routes.post('/callback/api/hook',  async(req, res) => {
    res.json({
        date : new Date(),
        status : 'callback ML : v1.3',
    })    
});

// Routas Nf xml
routes.post('/xml', NfController.index);



routes.get("/events", (req, res) => {
    
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
  
    
    res.write(`data: Conexão estabelecida\n\n`);
  
    
    const intervalId = setInterval(() => {
      res.write(`data: Ping\n\n`); 
    }, 30000); 
  
    
    global.sseClients = global.sseClients || [];
    global.sseClients.push(res);
  
    
    req.on("close", () => {
      clearInterval(intervalId);
      global.sseClients = global.sseClients.filter((client) => client !== res);
    });
  });

export default routes;
