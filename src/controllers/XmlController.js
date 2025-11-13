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
    try {
        fs.mkdirSync(uploadsDir, { recursive: true });
        console.log(`Diretório de upload criado: ${uploadsDir}`);
    } catch (err) {
        console.error(`Erro ao criar diretório de upload: ${err.message}`);
    }
}

// Configurar multer para salvar o arquivo com o nome fixo
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Verificar se o diretório existe e tem permissão de escrita
        try {
            if (!fs.existsSync(uploadsDir)) {
                fs.mkdirSync(uploadsDir, { recursive: true });
            }

            // Verificar permissão de escrita
            fs.access(uploadsDir, fs.constants.W_OK, (err) => {
                if (err) {
                    console.error(`Sem permissão de escrita no diretório: ${uploadsDir}`, err);
                    cb(new Error(`Sem permissão de escrita no diretório de upload`));
                } else {
                    cb(null, uploadsDir);
                }
            });
        } catch (err) {
            console.error(`Erro ao verificar diretório de upload: ${err.message}`);
            cb(err);
        }
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
        // Ser mais flexível com os tipos MIME, pois alguns servidores podem enviar tipos diferentes
        const isXml =
            file.mimetype === "application/xml" ||
            file.mimetype === "text/xml" ||
            file.mimetype === "application/x-xml" ||
            file.originalname.toLowerCase().endsWith(".xml");

        if (isXml) {
            cb(null, true);
        } else {
            console.error(`Tipo de arquivo rejeitado: ${file.mimetype}, nome: ${file.originalname}`);
            cb(new Error("Apenas arquivos XML são permitidos"), false);
        }
    },
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
    },
});

export default {
    // Rota para upload do arquivo XML
    async upload(req, res) {
        console.log("Upload recebido. Content-Type:", req.headers["content-type"]);
        console.log("Método:", req.method);
        console.log("URL:", req.url);

        upload.any()(req, res, (err) => {
            if (err) {
                console.error("Erro no upload:", err);
                console.error("Detalhes do erro:", {
                    message: err.message,
                    code: err.code,
                    field: err.field,
                });

                if (err.message === "Apenas arquivos XML são permitidos") {
                    return res.status(400).json({ error: err.message });
                }

                if (err.code === "LIMIT_FILE_SIZE") {
                    return res.status(400).json({ error: "Arquivo muito grande. Tamanho máximo: 10MB" });
                }

                // Retornar mensagem de erro mais detalhada em desenvolvimento
                return res.status(400).json({
                    error: "Erro no upload do arquivo.",
                    details: process.env.NODE_ENV !== "production" ? err.message : undefined
                });
            }

            // Aceitar qualquer arquivo enviado (não apenas "file")
            const uploadedFile = req.file || (req.files && req.files.length > 0 && req.files[0]);

            if (!uploadedFile) {
                console.error("Nenhum arquivo recebido. Campos disponíveis:", Object.keys(req.body));
                console.error("Files:", req.files);
                console.error("File:", req.file);
                return res.status(400).json({ error: "Nenhum arquivo foi enviado. Certifique-se de enviar um arquivo XML." });
            }

            // Verificar se é XML (segurança adicional)
            if (!uploadedFile.originalname.toLowerCase().endsWith(".xml")) {
                return res.status(400).json({ error: "Apenas arquivos XML são permitidos." });
            }

            console.log(`Arquivo recebido: ${uploadedFile.originalname}, tamanho: ${uploadedFile.size} bytes, campo: ${uploadedFile.fieldname}`);

            return res.json({
                success: true,
                message: "Arquivo XML enviado com sucesso.",
                filename: uploadedFile.filename,
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

