import multer from 'multer';
import { HttpError } from './errorHandler.js';
import { MIME_BY_EXT } from '../lib/constants.js';

const allowed = new Set(Object.values(MIME_BY_EXT));

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!allowed.has(file.mimetype)) return cb(new HttpError(400, 'Please upload a PDF, JPG, PNG or DOCX file.'));
    cb(null, true);
  },
});
