import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import cors from "cors";

import routes from "./routes.js";
import cron from "node-cron";
import http from "http";
import { Server } from "socket.io";
import CronController from "./controllers/CronController.js";

dotenv.config({ path: "../.env" });

const app = express();

// Criação do servidor HTTP para integrar o Socket.IO
const server = http.createServer(app);

// Configuração do Socket.IO com CORS
const io = new Server(server, {
  cors: {
    origin: "*", // Altere para a URL do seu frontend em produção
    methods: ["GET", "POST"],
  },
});

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
cron.schedule("*/1 * * * *", () => {
  console.log("Executando Cron Job...");
  CronController.cronUsers();
});

// Middlewares
app.use(cors());
app.use(express.json());

// Rotas
app.use(routes);

// // Configuração do Socket.IO
// io.on("connection", (socket) => {
  
// socket.on("updateJob", (data) => {
  
//     io.emit("jobUpdated", {
//       id: data.id, // O ID do job ou usuário
//       ...data,     // Outros campos atualizados
//     });
//   });

//   socket.on("disconnect", () => {
//     console.log(`Cliente desconectado: ${socket.id}`);
//   });
// });

// Exponha o io globalmente, caso necessário
app.set("socketio", io);

// Porta do servidor
const PORT = process.env.PORT || 3333;

// Inicia o servidor HTTP
server.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
