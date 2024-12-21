import Job from "../models/Job.js";
import PDFDocument from "pdfkit";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default {
  async index(req, res) {
    try {
      const { ids, user, pixKey } = req.body;

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: "Nenhum ID foi enviado" });
      }

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=relatorio.pdf"
      );

      const jobs = await Job.find({ _id: { $in: ids } });

      const doc = new PDFDocument();
      doc.fontSize(20).text(`Relatório de Lotes ${user}`, { align: "center" });
      doc.moveDown();

      jobs.forEach((job) => {
        doc.fontSize(12).text(`Lote: `, { continued: true });
        doc.font("Helvetica-Bold").text(`${job.lote}`);

        doc
          .font("Helvetica")
          .fontSize(12)
          .text(
            `Data de entrada: ${format(job.data, "PP HH:mm", { locale: ptBR })}`
          );

        doc
          .font("Helvetica")
          .fontSize(12)
          .text(`Quantidade:`, { continued: true });
        doc.font("Helvetica-Bold").text(`${job.qtd}`);

        doc.font("Helvetica").fontSize(12).text(`Metros:`, { continued: true });
        doc.font("Helvetica-Bold").text(`${job.totMetros.toFixed(2)}`);

        doc
          .font("Helvetica")
          .fontSize(12)
          .text(`Preço: R$`, { continued: true });
        doc.font("Helvetica-Bold").text(`${job.orcamento.toFixed(2)}`);

        if (job.dataPgto) {
          doc
            .font("Helvetica")
            .fontSize(12)
            .text(`Data do pagamento: `, { continued: true });
          doc
            .font("Helvetica-Bold")
            .text(
              `${format(job.dataPgto, "PP HH:mm", { locale: ptBR }) ?? ""}`
            );
        }

        doc
          .font("Helvetica")
          .fontSize(12)
          .text(`Chave pix do pagamento: `, { continued: true });
        doc.font("Helvetica-Bold").text(pixKey ?? "");

        doc.moveDown();
      });

      // Cálculo do valor total
      const total = jobs.reduce((sum, job) => sum + job.orcamento, 0); // Ajuste conforme necessário

      // Adicionando a tabela com o total
      doc.moveDown();
      doc
        .fontSize(14)
        .font("Helvetica-Bold")
        .text("Resumo do Relatório", { align: "center" });
      doc.moveDown();

      // Cabeçalhos da tabela
      doc
        .font("Helvetica-Bold")
        .fontSize(12)
        .text("Item".padEnd(20) + "Valor", { align: "left" });

      // Linha de separação
      doc
        .font("Helvetica")
        .fontSize(12)
        .text("-".repeat(120), { align: "left" });

      // Adicionando o total
      doc
        .font("Helvetica")
        .fontSize(12)
        .text(`Total Geral:`.padEnd(20) + `R$ ${total.toFixed(2)}`, {
          align: "left",
        });

      
      doc.pipe(res);
      doc.end();
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Erro ao gerar relatório" });
    }
  },
};
