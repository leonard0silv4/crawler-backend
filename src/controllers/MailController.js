 import nodemailer from 'nodemailer';
 import hbs from 'nodemailer-express-handlebars'
 import path from 'path';
 

export default  {
    async index(req, res){

        const user = {
            name : 'Léo',
            email : 'leo07vasp@gmail.com'

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
            viewPath: path.resolve('./src/views'),
        };
    
    
        transporter.use('compile', hbs(handlebarOptions))
    
    
          const mailOptions = {
            from: '"Leonardo R." <leo07vasp@gmail.com>', 
            template: "email", 
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
                res.status(200).json({error : 'send fail'});
            } else {
                console.log(data)
                res.status(200).json({status : 'send success'});
            }
          });
    
    }
}