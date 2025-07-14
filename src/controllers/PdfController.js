import Job from "../models/Job.js";
import PDFDocument from "pdfkit";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import NfeEntry from "../models/Nf.js";

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

        if (job.advancedMoneyPayment) {
          doc
            .font("Helvetica")
            .fontSize(12)
            .text(`Desconto de adiantamento:`, { continued: true })
            .fillColor("red");
          doc
            .font("Helvetica-Bold")
            .text(`R$${job.advancedMoneyPayment.toFixed(2)}`)
            .fillColor("black");
        }

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

        doc
          .font("Helvetica")
          .fontSize(12)
          .text("-".repeat(100), { align: "left" });
        doc.moveDown();
      });

      // Cálculo do valor total
      const total = jobs.reduce((sum, job) => sum + job.orcamento, 0); // Ajuste conforme necessário

      // Linha de separação
      doc
        .font("Helvetica")
        .fontSize(12)
        .text("_".repeat(60), { align: "left" });

      // Adicionando a tabela com o total
      doc.moveDown();
      doc
        .fontSize(14)
        .font("Helvetica-Bold")
        .text("Resumo do Relatório", { align: "left" });
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
        .text("-".repeat(100), { align: "left" });

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
 async generatePdfNf(req, res) {
  try {
    const { id } = req.body;

    const invoice = await NfeEntry.findById(id);

    if (!invoice)
      return res.status(404).json({ error: "Nota não encontrada" });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=nota-${invoice.numeroNota}.pdf`
    );

    const doc = new PDFDocument({ margin: 40 });
    doc.pipe(res);

    // Título
    doc
      .fontSize(16)
      .font("Helvetica-Bold")
      .text(`Nota Fiscal nº ${invoice.numeroNota}`, { align: "center" });
    doc.moveDown();

    // Dados do fornecedor
    doc
      .fontSize(12)
      .font("Helvetica")
      .text(`Fornecedor: ${invoice.fornecedor.nome}`)
      .text(`CNPJ: ${invoice.fornecedor.cnpj}`)
      .text(`Telefone: ${invoice.fornecedor.telefone || "Não informado"}`)
      .text(
        `Data de Emissão: ${format(
          new Date(invoice.dataEmissao),
          "dd/MM/yyyy",
          { locale: ptBR }
        )}`
      );
    doc.moveDown();

    // Cabeçalho da tabela
    const tableTop = doc.y;
    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .text("Nº", 40, tableTop, { width: 30 })
      .text("Produto", 75, tableTop, { width: 180 })
      .text("SKU", 260, tableTop, { width: 60 })
      .text("Qtd", 325, tableTop, { width: 40, align: "right" })
      .text("Unitário", 370, tableTop, { width: 70, align: "right" })
      .text("Total", 445, tableTop, { width: 80, align: "right" });

    doc.moveDown(1);

    // Produtos
    invoice.produtos.forEach((produto, idx) => {
      const y = doc.y;
      const total = produto.quantity * produto.unitValue;

      doc
        .font("Helvetica")
        .fontSize(9)
        .text(`${idx + 1}`, 40, y, { width: 30 })
        .text(produto.name.substring(0, 30), 75, y, {
          width: 180,
          align: "left",
          lineBreak: true,
        })
        .text(produto.code, 260, y, { width: 60 })
        .text(produto.quantity.toString(), 325, y, {
          width: 40,
          align: "right",
        })
        .text(`R$ ${produto.unitValue.toFixed(2)}`, 370, y, {
          width: 70,
          align: "right",
        })
        .text(`R$ ${total.toFixed(2)}`, 445, y, {
          width: 80,
          align: "right",
        });

      doc.moveDown(0.5);

      // Adiciona nova página se necessário
      if (doc.y > 720) doc.addPage();
    });

    doc.moveDown(1.5);

    // Rodapé com totais
    const yTotal = doc.y;
    const labelX = 40;
    const valueX = 250;

    doc
      .font("Helvetica")
      .fontSize(10)
      .text("Valor dos Produtos:", labelX, yTotal)
      .text(`R$ ${invoice.valores.vProd.toFixed(2)}`, valueX, yTotal, {
        align: "right",
      });

    doc
      .text("Frete:", labelX, doc.y + 5)
      .text(`R$ ${invoice.valores.vFrete.toFixed(2)}`, valueX, doc.y, {
        align: "right",
      });

    doc
      .text("ICMS:", labelX, doc.y + 5)
      .text(`R$ ${invoice.valores.vICMS.toFixed(2)}`, valueX, doc.y, {
        align: "right",
      });

    doc
      .text("IPI:", labelX, doc.y + 5)
      .text(`R$ ${invoice.valores.vIPI.toFixed(2)}`, valueX, doc.y, {
        align: "right",
      });

    doc
      .font("Helvetica-Bold")
      .fontSize(12)
      .text("Total da Nota:", labelX, doc.y + 5)
      .text(`R$ ${invoice.valores.vNF.toFixed(2)}`, valueX, doc.y, {
        align: "right",
      });

    // Observações
    if (invoice.observations) {
      doc.moveDown();
      doc
        .font("Helvetica")
        .fontSize(11)
        .text("Observações:", { underline: true })
        .fontSize(10)
        .text(invoice.observations);
    }

    doc.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao gerar PDF da nota fiscal" });
  }
}

};
