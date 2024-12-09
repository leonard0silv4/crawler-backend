import UserController from "./UserController.js";
import LinkController from "./mercadolivre_shopee/LinkController.js";

export default {
  async cronUsers() {
    try {
      console.log("Iniciando rotina de atualização...");

      const users = await UserController.getUsersWithSendEmail();

      if (!users.length) {
        console.log("Nenhum usuário com envio de email habilitado.");
        return;
      }

      for (const user of users) {
        console.log(`Processando usuário: ${user._id}`);
        await LinkController.updateCron(user._id, user.emailNotify);
      }

      console.log("Rotina concluída.");
    } catch (error) {
      console.error("Erro na rotina de atualização:", error);
    }
  },
};
