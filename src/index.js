import express from "express";
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import cors from 'cors';
import { engine } from 'express-handlebars';
import routes from './routes.js';

const app = express();
dotenv.config({ path: '../.env' });


app.engine('handlebars', engine());
app.set('view engine', 'handlebars');
app.set('views', './views');


mongoose.connect(
  `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@${process.env.MONGO_STRING}?retryWrites=true&w=majority`,
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }
);


app.use(cors());

app.use(express.json());
app.use(routes);

var porta = process.env.PORT || 3333;


app.listen(porta, () => {
  console.log(`exec in port: ${porta}`);
});
