import Job from "../models/Job.js";
import verifyToken from "../middleware/authMiddleware.js";

const localDate = new Date();


const JobController = {

  emitSSE(event, data) {
    if (global.sseClients && global.sseClients.length > 0) {
      global.sseClients.forEach((client) => {
        client.write(`event: ${event}\n`);
        client.write(`data: ${JSON.stringify(data)}\n\n`);
      });
    }
  },
  async storeJob(req, res) {

      const ownerId = await verifyToken.recoverUid(req, res);

        const {
          lote,
          qtd,
          larg,
          compr,
          emenda,
          totMetros,
          orcamento,
          recebidoConferido,
          lotePronto,
          recebido,
          aprovado,
          pago,
          dataPgto,
          caixa,
          faccionistaId,
        } = req.body;
    
        try {
          const job = new Job({
            lote,
            data : new Date(localDate.getTime() - localDate.getTimezoneOffset() * 60000).toISOString(),
            qtd,
            larg,
            compr,
            emenda,
            totMetros,
            orcamento,
            recebidoConferido,
            lotePronto,
            recebido,
            aprovado,
            pago,
            dataPgto,
            caixa,
            faccionistaId,
            ownerId,
          });
    
          const jobSaved = await job.save();
          return res.send(jobSaved);
        } catch (error) {
          return res.end("Erro ao salvar costura:", error);
        }
      },
    
      async indexJobs(req, res) {
        let { faccionistaId } = req.params;
        if (!faccionistaId) faccionistaId = await verifyToken.recoverUid(req, res);
        

        try {
          const Jobs = await Job.find({ faccionistaId }).select("-password"); // Exclui o campo de senha da resposta
          return res.json(Jobs);
        } catch (error) {
          console.error("Erro ao buscar jobs:", error);
          throw new Error("Erro ao buscar jobs");
        }
      },
    
      async updateJob(req, res) {
        const { id } = req.params;
        const { field, ids } = req.body;
    
        if (!["recebidoConferido", "lotePronto", "pago" , "lotePronto" , "aprovado" , "recebido", "emenda"].includes(field)) {
          return res
            .status(400)
            .json({ error: "Campo inválido para atualização." });
        }
    
        try {
          const job = await Job.findById(id);
          if (!job) {
            return res.status(404).json({ error: "Job não encontrado." });
          }
          
          if(field == 'pago' ){
            job['dataPgto'] = new Date(localDate.getTime() - localDate.getTimezoneOffset() * 60000).toISOString();
          }

          // Atualiza o campo
          job[field] = !job[field];
    
          // const io = req.app.get("socketio");
          // io.emit("jobUpdated", {
          //   job,
          // });

          JobController.emitSSE("jobUpdated", { job });

    
          await job.save();
    
          return res.json({ message: "Job atualizado com sucesso.", job });
        } catch (error) {
          console.error("Erro ao atualizar job:", error);
          return res.status(500).json({ error: "Erro ao atualizar job." });
        }
      },

      
      async updateJobs(req, res) {
        const { ids, field } = req.body; // Recebe os IDs como um array no corpo da requisição
        
        // Validação do campo
        if (!["recebidoConferido", "lotePronto", "pago", "aprovado", "recebido", "emenda"].includes(field)) {
          return res.status(400).json({ error: "Campo inválido para atualização." });
        }
      
        try {
          // Busca e atualiza todos os Jobs correspondentes
          const jobs = await Job.find({ _id: { $in: ids } });
          if (!jobs || jobs.length === 0) {
            return res.status(404).json({ error: "Nenhum job encontrado." });
          }
      
          // Atualiza o campo para cada job encontrado
          for (const job of jobs) {
            if (field === "pago") {
              job["dataPgto"] = new Date(localDate.getTime() - localDate.getTimezoneOffset() * 60000).toISOString();
            }
      
            job[field] = !job[field]; // Inverte o valor do campo
      
            if (field === "emenda") {
              const fator = 0.65; // Fator baseado no cálculo do cliente
              const custoPorMetro = 234 / 390; // Ajuste o custo por metro, se necessário
      
              // Pegando os valores necessários do job
              const { qtd, larg, compr } = job;
      
              if (!qtd || !larg || !compr) {
                return res.status(400).json({ error: "Valores insuficientes para calcular o orçamento." });
              }
              // Aplicando a fórmula
              const metrosBase = qtd * larg * compr * fator;
              const totMetros = job.emenda == true ? metrosBase * 1.3 : metrosBase;
              job.orcamento = totMetros * custoPorMetro;
            }

            
            await job.save(); // Salva as alterações
            // const io = req.app.get("socketio");
            // io.emit("jobUpdated", {
            //   job,
            // });
            JobController.emitSSE("jobUpdated", { job });
          }
      
          // Envia atualização via socket.io
          // const io = req.app.get("socketio");
          // io.emit("jobsUpdated", {
          //   job,
          // });
      
          return res.json({ message: "Jobs atualizados com sucesso.", jobs });
        } catch (error) {
          console.error("Erro ao atualizar jobs:", error);
          return res.status(500).json({ error: "Erro ao atualizar jobs." });
        }
      }
      
}


export default JobController;