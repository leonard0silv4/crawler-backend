import cron from 'node-cron';

import UserController from "./UserController.js";
import Conta from "../models/Conta.js";

import LinkController from "./mercadolivre_shopee/LinkController.js";
import  {updateProductsAccount}  from "../services/updateProductsAccount.js";


let scheduledCrons = {}; // Armazenar crons ativos por usuário


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
  
        // Verificar se o cron já foi agendado para esse usuário
        const cronInterval = user.cronInterval || '0 * * * *'; // Padrão é executar a cada hora
  
        // Se já existe um cron agendado para esse usuário e o cronInterval não mudou, não faça nada
        if (scheduledCrons[user._id] && scheduledCrons[user._id].cronInterval === cronInterval) {
          console.log(`Cron já agendado para o usuário ${user._id} com o mesmo cronInterval. Nenhuma ação necessária.`);
          continue;
        }
  
        // Se houver um cron ativo, pare o cron anterior
        if (scheduledCrons[user._id]) {
          scheduledCrons[user._id].task.stop();
          console.log(`Cron anterior para o usuário ${user._id} cancelado.`);
        }
  
        // Agendar o novo cron para o usuário
        const task = cron.schedule(cronInterval, () => {
          LinkController.updateCron(user._id, user.emailNotify);
        });
  
        // Armazenar a tarefa agendada e o cronInterval para o usuário
        scheduledCrons[user._id] = { task, cronInterval };
        console.log(`Novo cron agendado para o usuário ${user._id} com tempo ${cronInterval}.`);
      }
  
      console.log("Rotina concluída.");
    } catch (error) {
      console.error("Erro na rotina de atualização:", error);
    }
  },

  async cronUserMeli() {
  const contas = await Conta.find({ access_token: { $exists: true } });

  for (const conta of contas) {
    await updateProductsAccount(conta);
  }
  }
}
