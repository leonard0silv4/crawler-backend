import multer from 'multer';
import { parseStringPromise } from 'xml2js';

const upload = multer({ storage: multer.memoryStorage() });


export default {
 async index(req, res) {
    upload.single('file')(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ success: false, error: 'Erro no upload do arquivo.' });
      }

      try {
        const xmlContent = req.file.buffer.toString('utf-8');

        const parsed = await parseStringPromise(xmlContent, {
          explicitArray: false,
          mergeAttrs: true,
          trim: true,
        });

        res.json({ success: true, data: parsed });
      } catch (error) {
        console.error('Erro ao processar XML:', error);
        res.status(500).json({ success: false, error: 'Erro ao processar o XML.' });
      }
    });
  }
}