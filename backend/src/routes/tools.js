// Public tools: scam checker, certificate verification (QR) and the teacher's recommendation-letter page.
// Signed-in students also manage their letter requests here (/api/letters).
import { Router } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { randomBytes } from 'node:crypto';
import { prisma } from '../lib/prisma.js';
import { HttpError } from '../middleware/errorHandler.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { MIME_BY_EXT } from '../lib/constants.js';
import { saveFile } from '../services/storageService.js';
import { sendEmailSafe } from '../services/emailService.js';
import { checkScam } from '../services/scamCheck.js';
import { hashToken } from '../utils/tokens.js';
import { notify } from '../utils/notify.js';

const router = Router();
const site = () => (process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/$/, '');
const limiter = (limit, minutes = 10) => rateLimit({ windowMs: minutes * 60 * 1000, limit, standardHeaders: 'draft-7', legacyHeaders: false });

// ---------- Scam checker ----------
router.post('/public/scam-check', limiter(30), async (req, res) => {
  const { text } = z.object({ text: z.string().trim().min(10, 'Please paste the message or link (at least a few words).').max(6000, 'Please paste at most 6000 characters.') }).parse(req.body);
  res.json(await checkScam(text));
});

// ---------- Certificate verification (QR code) ----------
router.get('/public/certificates/:code', limiter(120), async (req, res) => {
  const code = String(req.params.code).toUpperCase().replace(/[^A-Z0-9]/g, '');
  const c = await prisma.certificate.findUnique({
    where: { code },
    include: { user: { select: { firstName: true, lastName: true } }, course: { select: { id: true, title: true, category: true, level: true, track: true } } },
  });
  if (!c) return res.json({ valid: false });
  const exam = await prisma.examAttempt.findFirst({
    where: { userId: c.userId, passed: true, exam: { courseId: c.course.id } }, orderBy: { score: 'desc' }, select: { score: true, submittedAt: true },
  });
  res.json({
    valid: true, code: c.code, issuedAt: c.issuedAt,
    holder: `${c.user.firstName} ${c.user.lastName}`,
    course: { title: c.course.title, subject: c.course.category === 'english' ? 'English' : 'Computer skills', level: c.course.level, track: c.course.track },
    finalExam: exam ? { score: exam.score, date: exam.submittedAt } : null,
  });
});

// ---------- Recommendation letters ----------
const LETTER_DAYS = 60; // a request link works for 60 days
const letterView = (r) => ({
  id: r.id, teacherName: r.teacherName, teacherEmail: r.teacherEmail, relationship: r.relationship, purpose: r.purpose, message: r.message,
  dueDate: r.dueDate, status: r.status, declineNote: r.declineNote, documentId: r.documentId, remindedAt: r.remindedAt, receivedAt: r.receivedAt, createdAt: r.createdAt,
});
const fmtDate = (d) => new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(d);

function emailTeacher(r, student, token, reminder = false) {
  const link = `${site()}/letters/${token}`;
  return sendEmailSafe({
    to: r.teacherEmail,
    subject: `${reminder ? 'Reminder: ' : ''}${student.firstName} ${student.lastName} asks you for a recommendation letter`,
    text: `Dear ${r.teacherName},\n\n${student.firstName} ${student.lastName} (${r.relationship}) is asking you for a recommendation letter for: ${r.purpose}.${r.dueDate ? `\nIt is needed by ${fmtDate(r.dueDate)}.` : ''}${r.message ? `\n\nMessage from ${student.firstName}:\n"${r.message}"` : ''}\n\nYou can upload the letter (PDF or Word) from the link below. You do not need an INUKA account. If you cannot write it, you can say so from the same page.\n\nThank you for supporting a young person's future.\nThe INUKA team`,
    action: { label: 'Upload the letter', url: link },
  });
}

const letterSchema = z.object({
  teacherName: z.string().trim().min(3, "Please enter the teacher's name.").max(80),
  teacherEmail: z.email("Please enter the teacher's email address.").transform((e) => e.toLowerCase()),
  relationship: z.string().trim().min(3, 'Please say how the teacher knows you (e.g. "My Maths teacher in S6").').max(120),
  purpose: z.string().trim().min(3, 'Please say what the letter is for.').max(150),
  message: z.string().trim().max(800).optional().nullable().transform((v) => v || null),
  dueDate: z.coerce.date().optional().nullable(),
});

router.use('/letters', requireAuth, requireRole('student'));

router.get('/letters', async (req, res) => {
  const rows = await prisma.recommendationRequest.findMany({ where: { studentId: req.user.id }, orderBy: { createdAt: 'desc' } });
  res.json({ letters: rows.map(letterView) });
});

router.post('/letters', limiter(10, 60), async (req, res) => {
  const d = letterSchema.parse(req.body);
  if (d.teacherEmail === req.user.email.toLowerCase()) throw new HttpError(400, "Please enter your teacher's email address, not yours.");
  const open = await prisma.recommendationRequest.count({ where: { studentId: req.user.id, status: 'requested' } });
  if (open >= 6) throw new HttpError(400, 'You already have 6 letters waiting. Please wait for answers or cancel one.');
  const token = randomBytes(24).toString('base64url');
  const r = await prisma.recommendationRequest.create({ data: { ...d, studentId: req.user.id, tokenHash: hashToken(token) } });
  await emailTeacher(r, req.user, token);
  res.status(201).json({ letter: letterView(r) });
});

// A reminder sends a NEW link (the old one stops working) — at most once every 3 days.
router.post('/letters/:id/remind', async (req, res) => {
  const r = await prisma.recommendationRequest.findFirst({ where: { id: req.params.id, studentId: req.user.id } });
  if (!r) throw new HttpError(404, 'We could not find this request.');
  if (r.status !== 'requested') throw new HttpError(400, 'This request is already answered.');
  const last = r.remindedAt || r.createdAt;
  if (Date.now() - last.getTime() < 3 * 864e5) throw new HttpError(400, 'You can send a reminder 3 days after the last email. Give your teacher a little time.');
  const token = randomBytes(24).toString('base64url');
  const updated = await prisma.recommendationRequest.update({ where: { id: r.id }, data: { tokenHash: hashToken(token), remindedAt: new Date() } });
  await emailTeacher(updated, req.user, token, true);
  res.json({ letter: letterView(updated) });
});

router.post('/letters/:id/cancel', async (req, res) => {
  const r = await prisma.recommendationRequest.findFirst({ where: { id: req.params.id, studentId: req.user.id } });
  if (!r) throw new HttpError(404, 'We could not find this request.');
  if (r.status !== 'requested') throw new HttpError(400, 'Only waiting requests can be cancelled.');
  const updated = await prisma.recommendationRequest.update({ where: { id: r.id }, data: { status: 'cancelled' } });
  res.json({ letter: letterView(updated) });
});

// Teacher side (no account): the link in the email
async function byToken(token) {
  const r = await prisma.recommendationRequest.findUnique({
    where: { tokenHash: hashToken(String(token)) }, include: { student: { select: { id: true, firstName: true, lastName: true, email: true } } },
  });
  if (!r) throw new HttpError(404, 'This link is not valid. It may have been replaced by a newer email from INUKA.');
  if (Date.now() - r.createdAt.getTime() > LETTER_DAYS * 864e5 && r.status === 'requested') throw new HttpError(410, 'This link has expired. The student can send you a new request.');
  return r;
}

router.get('/public/letters/:token', limiter(60), async (req, res) => {
  const r = await byToken(req.params.token);
  res.json({
    request: {
      student: `${r.student.firstName} ${r.student.lastName}`, teacherName: r.teacherName, relationship: r.relationship,
      purpose: r.purpose, message: r.message, dueDate: r.dueDate, status: r.status, createdAt: r.createdAt,
    },
  });
});

router.post('/public/letters/:token/upload', limiter(10), upload.single('file'), async (req, res) => {
  const r = await byToken(req.params.token);
  if (r.status !== 'requested') throw new HttpError(400, r.status === 'received' ? 'Thank you, the letter was already received.' : 'This request is closed.');
  if (!req.file) throw new HttpError(400, 'Please choose the letter file.');
  const ext = req.file.originalname.split('.').pop().toLowerCase();
  if (!['pdf', 'docx'].includes(ext) || MIME_BY_EXT[ext] !== req.file.mimetype) throw new HttpError(400, 'Please upload the letter as a PDF or Word (.docx) file.');
  // Saved in the student's document vault: first free letter slot, else "Other documents".
  const used = new Set((await prisma.document.findMany({ where: { userId: r.studentId, docType: { in: ['recommendation_1', 'recommendation_2'] } }, select: { docType: true } })).map((d) => d.docType));
  const docType = ['recommendation_1', 'recommendation_2'].find((t) => !used.has(t)) || 'other';
  const key = await saveFile(r.studentId, req.file);
  const doc = await prisma.document.create({
    data: { userId: r.studentId, docType, fileName: `Letter from ${r.teacherName}.${ext}`, fileUrl: key, mimeType: req.file.mimetype, fileSize: req.file.size },
  });
  await prisma.recommendationRequest.update({ where: { id: r.id }, data: { status: 'received', receivedAt: new Date(), documentId: doc.id } });
  await notify(r.studentId, 'letter_received', `${r.teacherName} uploaded your recommendation letter for ${r.purpose}. It is in your document vault.`, '/profile?tab=letters', { email: false });
  sendEmailSafe({
    to: r.student.email, subject: `${r.teacherName} sent your recommendation letter`,
    text: `Hi ${r.student.firstName},\n\nGood news: ${r.teacherName} uploaded your recommendation letter for ${r.purpose}. It is saved in your INUKA document vault.\n\nRemember to thank your teacher!\n\nThe INUKA team`,
    action: { label: 'See my letters', url: `${site()}/profile?tab=letters` },
  });
  res.json({ ok: true });
});

router.post('/public/letters/:token/decline', limiter(10), async (req, res) => {
  const { note } = z.object({ note: z.string().trim().max(500).optional() }).parse(req.body || {});
  const r = await byToken(req.params.token);
  if (r.status !== 'requested') throw new HttpError(400, 'This request is already closed.');
  await prisma.recommendationRequest.update({ where: { id: r.id }, data: { status: 'declined', declineNote: note || null } });
  await notify(r.studentId, 'letter_declined', `${r.teacherName} cannot write your letter for ${r.purpose}. You can ask another teacher.`, '/profile?tab=letters', { email: false });
  res.json({ ok: true });
});

export default router;
