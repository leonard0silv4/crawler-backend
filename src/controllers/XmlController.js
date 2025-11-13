import multer from "multer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Diretório onde os arquivos serão salvos (dentro do projeto)
const uploadsDir = path.join(__dirname, "../../uploads");

// Criar diretório se não existir
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configurar multer para salvar o arquivo com o nome fixo
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        // Sempre usar o mesmo nome, sobrescrevendo o arquivo anterior
        cb(null, "produtos_mercadolivre.xml");
    },
});

const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        // Aceitar apenas arquivos XML
        if (file.mimetype === "application/xml" || file.mimetype === "text/xml" || file.originalname.endsWith(".xml")) {
            cb(null, true);
        } else {
            cb(new Error("Apenas arquivos XML são permitidos"), false);
        }
    },
});

export default {
    // Rota para upload do arquivo XML
    async upload(req, res) {
        upload.single("file")(req, res, (err) => {
            if (err) {
                if (err.message === "Apenas arquivos XML são permitidos") {
                    return res.status(400).json({ error: err.message });
                }
                return res.status(400).json({ error: "Erro no upload do arquivo." });
            }

            if (!req.file) {
                return res.status(400).json({ error: "Nenhum arquivo foi enviado." });
            }

            return res.json({
                success: true,
                message: "Arquivo XML enviado com sucesso.",
                filename: req.file.filename,
            });
        });
    },

    // Rota para download/visualização do arquivo XML
    async download(req, res) {
        try {
            const filePath = path.join(uploadsDir, "produtos_mercadolivre.xml");

            // Verificar se o arquivo existe
            if (!fs.existsSync(filePath)) {
                return res.status(404).json({ error: "Arquivo não encontrado." });
            }

            // Enviar o arquivo
            res.setHeader("Content-Type", "application/xml");
            res.setHeader(
                "Content-Disposition",
                'inline; filename="produtos_mercadolivre.xml"'
            );

            const fileStream = fs.createReadStream(filePath);
            fileStream.pipe(res);
        } catch (err) {
            console.error("Erro ao fazer download do arquivo:", err);
            return res.status(500).json({ error: "Erro ao fazer download do arquivo." });
        }
    },
};

