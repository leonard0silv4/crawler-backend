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

      const doc = new PDFDocument({ margin: 50 });
      doc.pipe(res);

      // Header: Relatório: {user} DATA {currentDate}
      const currentDate = format(new Date(), "dd MMM yyyy HH:mm", { locale: ptBR });
      const headerY = doc.y;
      doc
        .fontSize(16)
        .font("Helvetica-Bold")
        .text(`Relatório: ${user}`, 50, headerY, { align: "left" })
        .text(` ${currentDate}`, 50, headerY, { width: 500, align: "right" });
      doc.moveDown();

      // Chave Pix para Pagamento
      doc
        .fontSize(12)
        .font("Helvetica")
        .text(`Chave Pix para Pagamento: ${pixKey || ""}`, { align: "left" });
      doc.moveDown(2);

      // Table header - better column spacing
      const tableTop = doc.y;
      const colLote = 50;
      const colData = 120;
      const colQtd = 280;
      const colMedidas = 320;
      const colMetros = 390;
      const colPreco = 470;

      doc
        .font("Helvetica-Bold")
        .fontSize(11)
        .text("Lote", colLote, tableTop, { width: 60 })
        .text("Data de entrada", colData, tableTop, { width: 150 })
        .text("QTD", colQtd, tableTop, { width: 35 })
        .text("Medidas", colMedidas, tableTop, { width: 65 })
        .text("Metros", colMetros, tableTop, { width: 70, align: "right" })
        .text("Preço", colPreco, tableTop, { width: 80, align: "right" });

      doc.moveDown(0.8);

      // Draw line under header
      doc
        .moveTo(50, doc.y)
        .lineTo(550, doc.y)
        .stroke();
      doc.moveDown(0.5);

      // Table rows
      let currentY = doc.y;
      jobs.forEach((job) => {
        const entryDate = format(new Date(job.data), "dd MMM yyyy HH:mm", {
          locale: ptBR,
        });
        const medidas = `${job.larg}x${job.compr}`;
        const metros = job.totMetros.toFixed(0);
        const preco = `R$${job.orcamento.toFixed(2)}`;

        doc
          .font("Helvetica")
          .fontSize(10)
          .text(job.lote.toString(), colLote, currentY, { width: 60 })
          .text(entryDate, colData, currentY, { width: 150 })
          .text(job.qtd.toString(), colQtd, currentY, { width: 35 })
          .text(medidas, colMedidas, currentY, { width: 65 })
          .text(metros, colMetros, currentY, { width: 70, align: "right" })
          .text(preco, colPreco, currentY, { width: 80, align: "right" });

        currentY += 18;
        doc.y = currentY;

        // Check if we need a new page
        if (doc.y > 700) {
          doc.addPage();
          currentY = doc.y;
        }
      });

      doc.moveDown(1);

      // Totals section
      const totalMetros = jobs.reduce((sum, job) => sum + job.totMetros, 0);
      const totalValor = jobs.reduce((sum, job) => sum + job.orcamento, 0);

      // Draw top line
      const footerStartY = doc.y;
      doc
        .moveTo(50, footerStartY)
        .lineTo(550, footerStartY)
        .stroke();
      doc.moveDown(0.5);

      // Total metros line
      const totalMetrosText = `| Total metros : ${totalMetros.toFixed(0)}`;
      doc
        .font("Helvetica")
        .fontSize(11)
        .text(totalMetrosText, 50, doc.y, { align: "left" });
      doc.moveDown(0.4);

      // Valor total line
      const valorTotalText = `| Valor total : R$${totalValor.toFixed(2)}`;
      doc
        .font("Helvetica")
        .fontSize(11)
        .text(valorTotalText, 50, doc.y, { align: "left" });
      doc.moveDown(0.5);

      // Draw bottom line
      doc
        .moveTo(50, doc.y)
        .lineTo(550, doc.y)
        .stroke();
      doc.moveDown(1.5);

      // Footer notes
      doc
        .fontSize(10)
        .font("Helvetica")
        .text("*CONFERIR OS LOTES. METRAGEM E VALORES PAGOS", {
          align: "left",
        });
      doc.moveDown(0.3);
      doc
        .fontSize(10)
        .font("Helvetica")
        .text(
          "** REALIZAR AS BAIXAR DE PAGAMENTO NO SEU CONTROLE DE COSTURAS.",
          { align: "left" }
        );

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

      if (!invoice) {
        return res.status(404).json({ error: "Nota não encontrada" });
      }

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

      // Fornecedor
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

      // Verificar se é novo layout
      const isNovoModelo =
        invoice.produtos?.[0]?.box !== undefined &&
        invoice.produtos?.[0]?.boxValue !== undefined &&
        invoice.produtos?.[0]?.qtdBox !== undefined;

      // Cabeçalho
      const tableTop = doc.y;
      doc.font("Helvetica-Bold").fontSize(10).text("Nº", 40, tableTop, { width: 30 })
        .text("Produto", 75, tableTop, { width: 150 })
        .text("SKU", 225, tableTop, { width: 50 });

      if (isNovoModelo) {
        doc
          .text("Caixas", 280, tableTop, { width: 40, align: "right" })
          .text("Qtd/Caixa", 325, tableTop, { width: 50, align: "right" })
          .text("Valor/Caixa", 380, tableTop, { width: 60, align: "right" })
          .text("Total", 445, tableTop, { width: 80, align: "right" });
      } else {
        doc
          .text("Qtd", 280, tableTop, { width: 40, align: "right" })
          .text("Unitário", 325, tableTop, { width: 70, align: "right" })
          .text("Total", 400, tableTop, { width: 80, align: "right" });
      }

      doc.moveDown(1);

      // Produtos
      invoice.produtos.forEach((produto, idx) => {
        const y = doc.y;

        if (
          produto.box !== undefined &&
          produto.boxValue !== undefined &&
          produto.qtdBox !== undefined
        ) {
          const box = produto.box ?? 0;
          const boxValue = produto.boxValue ?? 0;
          const qtdBox = produto.qtdBox ?? 0;
          const total = produto.totalValue ?? box * boxValue;

          doc
            .font("Helvetica")
            .fontSize(9)
            .text(`${idx + 1}`, 40, y, { width: 30 })
            .text(produto.name.substring(0, 30), 75, y, { width: 150 })
            .text(produto.code, 225, y, { width: 50 })
            .text(box.toString(), 280, y, { width: 40, align: "right" })
            .text(qtdBox.toString(), 325, y, { width: 50, align: "right" })
            .text(`R$ ${boxValue.toFixed(2)}`, 380, y, {
              width: 60,
              align: "right",
            })
            .text(`R$ ${total.toFixed(2)}`, 445, y, { width: 80, align: "right" });
        } else {
          const quantity = produto.quantity ?? 0;
          const unitValue = produto.unitValue ?? 0;
          const total = produto.totalValue ?? quantity * unitValue;

          doc
            .font("Helvetica")
            .fontSize(9)
            .text(`${idx + 1}`, 40, y, { width: 30 })
            .text(produto.name.substring(0, 30), 75, y, { width: 150 })
            .text(produto.code, 225, y, { width: 50 })
            .text(quantity.toString(), 280, y, { width: 40, align: "right" })
            .text(`R$ ${unitValue.toFixed(2)}`, 325, y, {
              width: 70,
              align: "right",
            })
            .text(`R$ ${total.toFixed(2)}`, 400, y, { width: 80, align: "right" });
        }

        doc.moveDown(0.5);
        if (doc.y > 720) doc.addPage();
      });

      doc.moveDown(1.5);

      // Totais
      const labelX = 40;
      const valueX = 250;

      doc
        .font("Helvetica")
        .fontSize(10)
        .text("Valor dos Produtos:", labelX, doc.y)
        .text(`R$ ${invoice.valores.vProd.toFixed(2)}`, valueX, doc.y, {
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
  },
};
