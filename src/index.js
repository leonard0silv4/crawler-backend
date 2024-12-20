import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import cors from "cors";

import routes from "./routes.js";
import cron from "node-cron";
import http from "http";
import CronController from "./controllers/CronController.js";

dotenv.config({ path: "../.env" });

const app = express();

const server = http.createServer(app);

// Conexão com o MongoDB
mongoose
  .connect(
    `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@${process.env.MONGO_STRING}?retryWrites=true&w=majority`,
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  )
  .then(() => console.log("MongoDB conectado com sucesso!"))
  .catch((err) => console.error("Erro ao conectar ao MongoDB:", err));

// Cron job
cron.schedule("*/30 * * * *", () => {
  console.log("Executando Cron Job...");
  CronController.cronUsers();
});

// Middlewares
app.use(cors());
app.use(express.json());

// Rotas
app.use(routes);


// Porta do servidor
const PORT = process.env.PORT || 3333;

// Inicia o servidor HTTP
server.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
