import "dotenv/config";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import bcrypt from "bcrypt";
import moment from "moment";

export default {
  async login(req, res) {
    try {
      const { username, password } = req.body;
      const user = await User.findOne({ username });
      if (!user)
        return res.status(401).json({ error: "Usuário não encontrado" });

      if (moment(user.expiries_at).format() < moment().format())
        return res.status(440).json({ error: "Assinatura expirada" });

      const passwordMatch = await bcrypt.compare(password, user.password);
      if (!passwordMatch)
        return res.status(401).json({ error: "Falha na autenticação" });

      const token = jwt.sign({ userId: user._id }, process.env.SECRET, {
        expiresIn: "12h",
      });

      res.status(200).json({ token });
    } catch (error) {
      res.status(500).json({ error: "stacktrace login" });
    }
  },

  async pay(req, res) {
    // console.log(process.env.MP_ACCESS_TOKEN)
    // const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN, options: { timeout: 5000, idempotencyKey: 'abc' } });
    // console.log(client)
    // const payment = new Customer(client);
    //  console.log(payment)
    // const body = {
    //   transaction_amount: 0.89,
    //   description: 'teste',
    //   payment_method_id: 'visa',
    //   payer: {
    //     email: 'jhon@doe.com'
    //   },
    // };

    //  payment.create({ body }).then((res) => console.log(res)).catch((err) => console.log(err));
    try {
      const client = new MercadoPagoConfig({
        accessToken: process.env.MP_ACCESS_TOKEN,
      });
      const customerClient = new Customer(client);

      customerClient
        .get({ customerId: "1182098345-p3HQJizMbA637K" })
        .then(console.log)
        .catch(console.log);
    } catch (err) {
      console.log(err);
    }
  },

  async register(req, res) {
    try {
      const { username, password } = req.body;
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = new User({
        username,
        password: hashedPassword,
        plan: null,
        mp_id: "basic",
        expiries_at: new Date(),
      });
      await user.save();
      res.status(201).json({ message: "Usuário cadastrado" });
    } catch (error) {
      res.status(500).json({ error });
    }
  },
};
