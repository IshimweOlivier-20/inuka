import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { HttpError } from '../middleware/errorHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { DOCUMENT_TYPES, MIME_BY_EXT } from '../lib/constants.js';
import { saveFile, deleteFile, readStoredFile } from '../services/storageService.js';

const router = Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const docs = await prisma.document.findMany({ where: { userId: req.user.id }, orderBy: { uploadedAt: 'desc' } });
  res.json({ types: DOCUMENT_TYPES, documents: docs });
});

router.post('/upload', upload.single('file'), async (req, res) => {
  const { docType } = z.object({ docType: z.enum(DOCUMENT_TYPES.map((t) => t.key), { error: 'Please choose which document this is.' }) }).parse(req.body);
  if (!req.file) throw new HttpError(400, 'Please choose a file to upload.');
  const type = DOCUMENT_TYPES.find((t) => t.key === docType);
  const ext = req.file.originalname.split('.').pop().toLowerCase();
  if (!type.formats.includes(ext) || MIME_BY_EXT[ext] !== req.file.mimetype) {
    throw new HttpError(400, `${type.label} must be a ${type.formats.map((f) => f.toUpperCase()).join(', ')} file.`);
  }

  // One file per document type (except "Other"): replace the old one.
  if (docType !== 'other') {
    const old = await prisma.document.findMany({ where: { userId: req.user.id, docType } });
    for (const d of old) await deleteFile(d.fileUrl);
    await prisma.document.deleteMany({ where: { userId: req.user.id, docType } });
  }
  const key = await saveFile(req.user.id, req.file);
  const doc = await prisma.document.create({
    data: { userId: req.user.id, docType, fileName: req.file.originalname, fileUrl: key, mimeType: req.file.mimetype, fileSize: req.file.size },
  });
  res.status(201).json({ document: doc });
});

router.get('/:id/file', async (req, res) => {
  const doc = await prisma.document.findFirst({ where: { id: req.params.id, userId: req.user.id } });
  if (!doc) throw new HttpError(404, 'We could not find that document.');
  res.setHeader('Content-Type', doc.mimeType);
  res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(doc.fileName)}"`);
  res.send(await readStoredFile(doc.fileUrl));
});

router.delete('/:id', async (req, res) => {
  const doc = await prisma.document.findFirst({ where: { id: req.params.id, userId: req.user.id } });
  if (!doc) throw new HttpError(404, 'We could not find that document.');
  await deleteFile(doc.fileUrl);
  await prisma.document.delete({ where: { id: doc.id } });
  res.json({ ok: true });
});

export default router;
