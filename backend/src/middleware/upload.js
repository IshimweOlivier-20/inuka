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

// Course files uploaded by admins: lesson audio, worksheets (PDF, Word, PowerPoint, Excel) and images, up to 25 MB.
export const COURSE_FILE_TYPES = {
  'audio/mpeg': 'mp3', 'audio/mp3': 'mp3', 'audio/mp4': 'm4a', 'audio/x-m4a': 'm4a', 'audio/aac': 'aac', 'audio/ogg': 'ogg', 'audio/wav': 'wav', 'audio/x-wav': 'wav', 'audio/webm': 'webm',
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif',
};
export const courseFileUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!COURSE_FILE_TYPES[file.mimetype]) return cb(new HttpError(400, 'Please choose an audio file (MP3, M4A, OGG, WAV), a PDF, Word, PowerPoint or Excel file, or an image.'));
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

// Files in student–mentor messages: pictures, PDF, Word, and voice notes, up to 10 MB.
export const CHAT_FILE_TYPES = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif',
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'audio/webm': 'webm', 'audio/ogg': 'ogg', 'audio/mp4': 'm4a', 'audio/mpeg': 'mp3', 'audio/x-m4a': 'm4a',
};
export const chatUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const type = file.mimetype.split(';')[0];
    if (!CHAT_FILE_TYPES[type]) return cb(new HttpError(400, 'You can send pictures, PDF or Word files, and voice notes.'));
    file.mimetype = type;
    cb(null, true);
  },
});
