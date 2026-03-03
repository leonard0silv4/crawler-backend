/**
 * Seed do catálogo a partir de um arquivo .xlsx
 *
 * Uso:
 *   node src/scripts/seedCatalog.js "/caminho/para/arquivo.xlsx"
 */
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

import mongoose from "mongoose";
import xlsx from "xlsx";
import CatalogProduct from "../models/CatalogProduct.js";

function parseBrNumber(value) {
  if (value == null) return 0;
  if (typeof value === "number") return value;
  return Number(String(value).replace(/\./g, "").replace(",", ".")) || 0;
}

const filePath = process.argv[2];
if (!filePath) {
  console.error("Informe o caminho do arquivo xlsx como argumento.");
  process.exit(1);
}

const MONGO_URI = `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@${process.env.MONGO_STRING}?retryWrites=true&w=majority`;

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log("MongoDB conectado.");

  const workbook = xlsx.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = xlsx.utils.sheet_to_json(sheet);

  const allSku1 = rows
    .map((r) => (r["SKU-1"] || "").toString().trim())
    .filter(Boolean);

  const existing = await CatalogProduct.find({ sku1: { $in: allSku1 } }).select("sku1");
  const existingSet = new Set(existing.map((p) => p.sku1));

  const toInsert = [];
  let skipped = 0;

  for (const row of rows) {
    const sku1 = (row["SKU-1"] || "").toString().trim();
    if (!sku1 || existingSet.has(sku1)) {
      skipped++;
      continue;
    }

    const largura = parseBrNumber(row["LARG"]);
    const comprimento = parseBrNumber(row["COMP"]);
    const altura = parseBrNumber(row["ALTURA"]);
    const pesoCubico =
      largura > 0 && comprimento > 0 && altura > 0
        ? Math.round(((largura * comprimento * altura) / 6000) * 1000) / 1000
        : 0;

    toInsert.push({
      sku1,
      sku2: (row["SKU-2"] || "").toString().trim(),
      sku3: (row["SKU-3"] || "").toString().trim(),
      produto: (row["PRODUTO"] || "").toString().trim(),
      medidas: (row["MEDIDAS"] || "").toString().trim(),
      largura,
      comprimento,
      altura,
      peso: parseBrNumber(row["KG"]),
      pesoCubico,
    });
  }

  if (toInsert.length > 0) {
    const result = await CatalogProduct.insertMany(toInsert, { ordered: false });
    console.log(`Importados: ${result.length} | Ignorados (duplicados): ${skipped}`);
  } else {
    console.log("Nenhum produto novo para importar.");
  }

  await mongoose.disconnect();
  console.log("Finalizado.");
}

run().catch((err) => {
  console.error("Erro no seed:", err);
  process.exit(1);
});
