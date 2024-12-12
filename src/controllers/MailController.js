import nodemailer from 'nodemailer'
import { MailerSend, EmailParams, Sender, Recipient } from "mailersend";


export default  {

  async testIntegration(req, res){
      const {email} = req.query;
    try{
      const mailerSend = new MailerSend({
        apiKey: process.env.MAIL_SENDER,
      });
      
      const sentFrom = new Sender("MS_JYchjA@trial-pxkjn41e75plz781.mlsender.net", "Your name");
      
      const recipients = [
        new Recipient(`${email || 'leo07vasp@gmail.com'}`, "Leonardo Rodrigues da Silva")
      ];
      
      const emailParams = new EmailParams()
        .setFrom(sentFrom)
        .setTo(recipients)
        .setReplyTo(sentFrom)
        .setSubject("This is a Subject")
        .setHtml("<strong>Email funcionando</strong>");
      
      await mailerSend.email.send(emailParams);
  
      console.log('Email enviado:');
      res.status(200).json({ msg: `email enviado : ${email || 'leo07vasp@gmail.com'}` });
    }catch(err){
      res.status(500).json({ error: err});
    }
  },
   
  async sendEmailWithUpdates(updatedProducts, emailTo) {


    if (!updatedProducts.length) {
      console.log("Nenhum produto atualizado, email não será enviado.");
      return;
    }
  
    const rows = updatedProducts
      .map(
        (product) => `
        <tr>
          <td>${product.name}</td>
          <td><a href="${product.link}" target="_blank">Link</a></td>
          <td>${product.newPrice.toFixed(2)}</td>
          <td>${product.oldPrice.toFixed(2)}</td>
          <td>${product.myPrice.toFixed(2)}</td>
          <td><span style="color: ${product.status == 'Perdendo' ? 'red' : 'green'}">${product.status}</td>
          <td>${product.full ? '<img width="22" height="22" src="https://www.iconsdb.com/icons/preview/green/bolt-xxl.png"/>': ''}</td>
        </tr>
      `
      )
      .join("");
  
    const emailContent = `
      <html>
        <body>
          <h2>Produtos Atualizados</h2>
          <table border="1" cellpadding="5" cellspacing="0">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Link</th>
                <th>Preço Atual</th>
                <th>Preço Antigo</th>
                <th>Meu Preço</th>
                <th>Status</th>
                <th>FULL</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
        </body>
      </html>
    `;
     
    
    try{
      const mailerSend = new MailerSend({
        apiKey: process.env.MAIL_SENDER,
      });
      
      const sentFrom = new Sender("MS_JYchjA@trial-pxkjn41e75plz781.mlsender.net", "Report Mercado Livre");
      
      const recipients = [
        new Recipient(emailTo)
      ];
      
      const emailParams = new EmailParams()
        .setFrom(sentFrom)
        .setTo(recipients)
        .setReplyTo(sentFrom)
        .setSubject("Produtos Atualizados")
        .setHtml(emailContent)
        
      
      await mailerSend.email.send(emailParams);
  
      console.log(`Email enviado:${emailTo}`);
    }catch(err){

      console.log("🚀 ~ sendEmailWithUpdates ~ err:", err);
      
    }

  },
}