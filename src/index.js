import express from "express";
import 'dotenv/config'
import mongoose from 'mongoose';
import cors from 'cors';
// const path = require("path");

import routes from './routes.js';

const app = express();

mongoose.connect(
  // "mongodb+srv://rafael_:manu18gabi21@omnistack.ww2gz.mongodb.net/AGMATOS?retryWrites=true&w=majority",
  `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@${process.env.MONGO_STRING}?retryWrites=true&w=majority`,
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }
);

// GET, POST, PUT, DELETE

// req.query = acessar query params url req.query.id
// req.params = acessar route params app.put('usr/:id') => req.params.id

// app.use(cors({ origin: "http://192.168.0.12" }));
app.use(cors());
// app.options("*", cors());
app.use(express.json());
app.use(routes);
// app.use("/files", express.static(path.resolve(__dirname, "..", "uploads")));


var porta = process.env.PORT || 3333;

// app.get('/', (req, res) =>{
//   res.send('hre')
// })



app.listen(porta, () => {
  console.log(`exec in port: ${porta}`);
});
