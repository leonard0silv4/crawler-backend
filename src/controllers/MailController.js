import nodemailer from 'nodemailer'

export default  {

  async testIntegration(req, res){
    const transporter = nodemailer.createTransport({
      host: 'smtp.resend.com',
      port: 465,
      secure: true, // usar SSL
      auth: {
        user: 'resend',
        pass: `${process.env.RESEND_API_KEY}`,
      }
    });

    const mailOptions = {
      from: 'onboarding@resend.dev',
      to: 'leo07vasp@gmail.com',
      subject: 'Enviando Email usando Node.js',
      text: 'Isso foi fácil!'
    };

    transporter.sendMail(mailOptions, function(error, info){
      if (error) {
        console.log('Erro:', error);
        res.status(500).json({ error: error});
      } else {
        console.log('Email enviado:', info.response);
        res.status(200).json({ info });
        res
      }
    });
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
  
    try {


      const transporter = nodemailer.createTransport({
        host: 'smtp.resend.com',
        port: 465,
        secure: true, // usar SSL
        auth: {
          user: 'resend',
          pass: `${process.env.RESEND_API_KEY}`,
        }
      });
  
      const mailOptions = {
        from: `Status Produtos crawler (${process.env.CONF ?? 'prod'}) <onboarding@resend.dev>`,
        to: emailTo,
        subject: "Produtos Atualizados",
        html: emailContent
      };
  
      transporter.sendMail(mailOptions, function(error, info){
        if (error) {
          console.log('Erro:', error);
          res.status(500).json({ error: error});
        } else {
          console.log('Email enviado:', info.response);
          res.status(200).json({ info });
          res
        }
      });

      // await resend.emails.send({
      //   from: 'Status Produtos crawler <onboarding@resend.dev>',
      //   to: [emailTo],
      //   subject: "Produtos Atualizados",
      //   html: emailContent,
      // });
  
      // console.log("Email enviado com sucesso.");
    } catch (error) {
      console.error("Erro ao enviar email:", error);
    }
  },
}