import express from 'express';

import BackupController from './controllers/BackupController.js'
import LinkController from './controllers/mercadolivre_shopee/LinkController.js'
import UserController from './controllers/UserController.js';
import MailController from './controllers/MailController.js';
import FactionistController from './controllers/FactionistController.js';
import JobController from './controllers/JobController.js';
import PdfController from './controllers/PdfController.js';
import MeliController from './controllers/MeliController.js';
import CronController from './controllers/CronController.js';
import LogController from './controllers/LogController.js';
import RoleController from './controllers/RoleController.js';
import PermissionController from './controllers/PermissionController.js';
import DashboardController from './controllers/DashboardController.js';
import OrdersController from "./controllers/OrderController.js";


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
routes.get("/config", verifyJWT.isTokenized, UserController.getUserConfig);
routes.post("/saveConfig", verifyJWT.isTokenized, UserController.saveConfig);

// Rotas de gerencia de usuarios
routes.get("/users",verifyJWT.isTokenized, UserController.index);
routes.post("/users",verifyJWT.isTokenized, UserController.store);
routes.put('/users/:id', verifyJWT.isTokenized, UserController.update);
routes.delete('/users/:id', verifyJWT.isTokenized, UserController.destroy);

// Roles
routes.get("/roles",  RoleController.index);
routes.get("/roles/:id", verifyJWT.isTokenized, RoleController.show);
routes.post("/roles", verifyJWT.isTokenized, RoleController.store);
routes.delete("/roles/:id", verifyJWT.isTokenized, RoleController.delete);
routes.put("/roles/:id/permissions", verifyJWT.isTokenized, RoleController.updatePermissions);

// Dashboard
routes.get("/dashboard/summary", verifyJWT.isTokenized, DashboardController.summary);


// Permissions
routes.get("/permissions", verifyJWT.isTokenized, PermissionController.index);


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
routes.post("/nfe/pdf", verifyJWT.isTokenized, PdfController.generatePdfNf);

// Logs
routes.get("/logs", verifyJWT.isTokenized,  LogController.index); 


// Rotas Meli connection
routes.get('/auth', MeliController.authRedirect);
routes.get('/runcron', CronController.cronUserMeli);
routes.get('/callback', MeliController.authCallback);
routes.get('/accounts/',verifyJWT.isTokenized, MeliController.getAccounts);
routes.get('/accounts/products',verifyJWT.isTokenized, MeliController.listarProdutos);
routes.post('/callback/api/hook',  async(req, res) => {
    res.json({
        date : new Date(),
        status : 'callback ML : v1.3',
    })    
});

routes.get("/jobs/archive", CronController.archiveJobs);


// Routas Nf xml
routes.post('/nfe/parse',verifyJWT.isTokenized, NfController.process);
routes.post("/nfe",verifyJWT.isTokenized, NfController.store); 
routes.get("/nfe",verifyJWT.isTokenized, NfController.index);
routes.get("/nfe/:id",verifyJWT.isTokenized, NfController.show);
routes.put("/nfe/:id",verifyJWT.isTokenized, NfController.update);
routes.delete("/nfe/:id",verifyJWT.isTokenized, NfController.destroy);

// backup
routes.get("/backup", BackupController.backup);

// BaserLink orders

routes.get(
  "/orders/summary",
  // verifyJWT.isTokenized,
  OrdersController.summary
);

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
