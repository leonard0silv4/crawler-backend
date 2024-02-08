import express from 'express';
import nodemailer from 'nodemailer';
import hbs from 'nodemailer-express-handlebars'
import path from 'path';



import LinkController from './controllers/LinkController.js'
import UserController from './controllers/UserController.js';
import verifyJWT from './middleware/authMiddleware.js'

const routes = express.Router();

routes.get("/",  (req, res) => {
    res.json({status : new Date()});
});



routes.get("/healthz",  async (req, res) => {

    const user = {
        name : 'Gabriela Silva',
        email : 'agabzinha.silva@gmail.com'
    }


    let transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.MAIL_USERNAME,
          pass: process.env.MAIL_PASSWORD,
          
        }
      });

      const handlebarOptions = {
        viewEngine: {
            partialsDir: path.resolve('./src/views'),
            defaultLayout: false,
        },
        viewPath: path.resolve('./src/views/'),
    };


    transporter.use('compile', hbs(handlebarOptions))


      const mailOptions = {
        from: '"Leonardo R." <leo07vasp@gmail.com>', // sender address
        template: "email", // the name of the template file, i.e., email.handlebars
        to: user.email,
        subject: `Welcome to My Company, ${user.name}`,
        context: {
          name: user.name,
          company: 'my company'
        },
      };

      transporter.sendMail(mailOptions, function(err, data) {
        if (err) {
            console.log(err)
            res.status(200).json({error : 'fail'});
        } else {
            console.log(data)
            res.status(200).json({status : 'ok'});
        }
      });



    
});

routes.get("/links",verifyJWT.isTokenized, LinkController.index);
routes.get("/links/update", verifyJWT.isTokenized, LinkController.update);
routes.post("/links", verifyJWT.isTokenized, LinkController.store);
routes.post("/list/ml", LinkController.storeList);
routes.delete("/links/:sku",verifyJWT.isTokenized,  LinkController.destroy);

routes.post("/login", UserController.login);
routes.post("/register", UserController.register);



export default routes;
