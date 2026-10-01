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

// Profile photos: JPG, PNG or WebP, up to 3 MB. Also checks the file really starts like an image.
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
export const photoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!IMAGE_TYPES.has(file.mimetype)) return cb(new HttpError(400, 'Please choose a JPG, PNG or WebP photo.'));
    cb(null, true);
  },
});

// Images for lessons and articles (admin text editor): JPG, PNG, WebP or GIF, up to 5 MB.
const MEDIA_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
export const mediaUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!MEDIA_TYPES.has(file.mimetype)) return cb(new HttpError(400, 'Please choose a JPG, PNG, WebP or GIF image.'));
    cb(null, true);
  },
});

const MAGIC = {
  'image/jpeg': (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  'image/png': (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
  'image/webp': (b) => b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP',
  'image/gif': (b) => b.toString('ascii', 0, 4) === 'GIF8',
};
export function assertImage(file) {
  if (file && !MAGIC[file.mimetype]?.(file.buffer)) throw new HttpError(400, 'This file is not a valid photo. Please choose a JPG, PNG or WebP image.');
}
