import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import Cookie from "../models/Cookie.js";
import verifyToken from "../middleware/authMiddleware.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PICKLE_SCRIPT = path.join(__dirname, "../scripts/cookiesToPickle.py");
const UPLOADS_DIR = path.join(__dirname, "../../uploads");
const ML_COOKIES_PKL = "ml_cookies.pkl";

function mapSameSite(sameSite) {
  if (sameSite === "no_restriction") return "None";
  if (!sameSite) return null;
  return sameSite;
}

function convertCookies(cookies) {
  return cookies.map((cookie) => {
    const c = {
      name: cookie.name,
      value: cookie.value,
      domain: cookie.domain,
      path: cookie.path,
      httpOnly: cookie.httpOnly,
      secure: cookie.secure,
      sameSite: mapSameSite(cookie.sameSite),
    };
    if (cookie.expirationDate) {
      c.expiry = Math.floor(cookie.expirationDate);
    }
    return c;
  });
}

/**
 * Chama o script Python passando os cookies via stdin e retorna
 * uma Promise com o Buffer binário do .pkl.
 */
function generatePickle(rawCookies) {
  return new Promise((resolve, reject) => {
    const py = spawn("python3", [PICKLE_SCRIPT]);
    const chunks = [];

    py.stdout.on("data", (chunk) => chunks.push(chunk));
    py.stderr.on("data", (data) =>
      console.error("[CookieController] python stderr:", data.toString())
    );

    py.on("close", (code) => {
      if (code !== 0) return reject(new Error(`python3 saiu com código ${code}`));
      resolve(Buffer.concat(chunks));
    });

    py.on("error", (err) => {
      reject(new Error(`Falha ao iniciar python3: ${err.message}`));
    });

    py.stdin.write(JSON.stringify(rawCookies));
    py.stdin.end();
  });
}

const CookieController = {
  /**
   * POST /cookies
   * Body: { cookies: [...] }
   *
   * Substitui todos os cookies no MongoDB pelos novos.
   * Retorna um resumo JSON.
   */
  async update(req, res) {
    try {
      await verifyToken.recoverAuth(req, res);

      const { cookies } = req.body;
      if (!Array.isArray(cookies) || cookies.length === 0) {
        return res.status(400).json({ error: "cookies deve ser um array não vazio" });
      }

      const converted = convertCookies(cookies);
      const valid = converted.filter((c) => c.value && c.value.trim() !== "");
      const skipped = converted.length - valid.length;

      await Cookie.deleteMany({});
      const inserted = await Cookie.insertMany(valid);

      // Gera e salva ml_cookies.pkl na pasta uploads (mesmo arquivo usado no download)
      const rawCookies = valid.map((c) => ({
        name: c.name,
        value: c.value,
        domain: c.domain,
        path: c.path,
        secure: c.secure,
        httpOnly: c.httpOnly,
        ...(c.expiry != null ? { expirationDate: c.expiry } : {}),
      }));
      try {
        const buffer = await generatePickle(rawCookies);
        if (!fs.existsSync(UPLOADS_DIR)) {
          fs.mkdirSync(UPLOADS_DIR, { recursive: true });
        }
        fs.writeFileSync(path.join(UPLOADS_DIR, ML_COOKIES_PKL), buffer);
      } catch (pklErr) {
        // Não falha o update; apenas ignora erro ao salvar pkl
      }

      return res.json({ ok: true, inserted: inserted.length, skipped });
    } catch (err) {
      console.error("[CookieController] update error:", err);
      return res.status(500).json({ error: "Erro ao atualizar cookies" });
    }
  },

  /**
   * GET /cookies/pkl
   *
   * Lê os cookies do banco, chama o script Python para gerar o pickle
   * e retorna o arquivo ml_cookies.pkl para download.
   */
  async downloadPkl(req, res) {
    try {
      await verifyToken.recoverAuth(req, res);

      const dbCookies = await Cookie.find({}).lean();
      if (dbCookies.length === 0) {
        return res.status(404).json({ error: "Nenhum cookie cadastrado no banco" });
      }

      // Reconstrói o formato original esperado pelo script Python
      const rawCookies = dbCookies.map((c) => ({
        name: c.name,
        value: c.value,
        domain: c.domain,
        path: c.path,
        secure: c.secure,
        httpOnly: c.httpOnly,
        ...(c.expiry != null ? { expirationDate: c.expiry } : {}),
      }));

      const buffer = await generatePickle(rawCookies);

      res.setHeader("Content-Type", "application/octet-stream");
      res.setHeader("Content-Disposition", 'attachment; filename="ml_cookies.pkl"');
      return res.send(buffer);
    } catch (err) {
      console.error("[CookieController] downloadPkl error:", err);
      return res.status(500).json({ error: err.message || "Erro ao gerar pkl" });
    }
  },

  /**
   * GET /cookies/pkl/public (desprotegido)
   *
   * Serve o arquivo ml_cookies.pkl salvo em uploads/ (gerado no update de cookies).
   */
  getPklPublic(req, res) {
    const filePath = path.join(UPLOADS_DIR, ML_COOKIES_PKL);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "Arquivo ml_cookies.pkl não encontrado. Execute o update de cookies primeiro." });
    }
    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader("Content-Disposition", 'attachment; filename="ml_cookies.pkl"');
    return res.sendFile(path.resolve(filePath));
  },
};

export default CookieController;
