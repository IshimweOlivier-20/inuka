// Messages between students and mentors (both dashboards). A student can message a mentor once they have
// asked that mentor for a session; the mentor can then reply. Pictures, PDF/Word files and voice notes can be sent.
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { HttpError } from '../middleware/errorHandler.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { chatUpload, CHAT_FILE_TYPES } from '../middleware/upload.js';
import { readStoredFile, saveChatFile, contentTypeOf } from '../services/storageService.js';
import { canChat, conversationFor } from '../services/chat.js';
import { notify } from '../utils/notify.js';

const router = Router();
router.use(['/conversations', '/messages'], requireAuth, requireRole('student', 'mentor'));

const person = { select: { id: true, firstName: true, lastName: true, profilePhotoUrl: true, role: true, mentor: { select: { id: true, title: true, org: true } } } };
const side = (c, userId) => (c.studentId === userId ? 'student' : 'mentor');

async function myConversation(req) {
  const c = await prisma.conversation.findUnique({ where: { id: req.params.id }, include: { student: person, mentorUser: person } });
  if (!c || (c.studentId !== req.user.id && c.mentorUserId !== req.user.id)) throw new HttpError(404, 'We could not find this conversation.');
  return c;
}
const other = (c, userId) => (side(c, userId) === 'student' ? c.mentorUser : c.student);
const clearedAt = (c, userId) => (side(c, userId) === 'student' ? c.studentClearedAt : c.mentorClearedAt);
const readAtOf = (c, who) => (who === 'student' ? c.studentReadAt : c.mentorReadAt);

const publicMessage = (m) => ({
  id: m.id, kind: m.kind, text: m.text, senderId: m.senderId, createdAt: m.createdAt,
  file: m.fileKey ? { name: m.fileName, type: m.fileType, size: m.fileSize } : null,
});

// Unread = messages from the other person (not INUKA's lines) after my last read and after I cleared the chat.
async function unreadCount(c, userId) {
  const mine = side(c, userId);
  const since = [readAtOf(c, mine), clearedAt(c, userId)].filter(Boolean).sort((a, b) => b - a)[0];
  return prisma.message.count({ where: { conversationId: c.id, senderId: { not: userId }, ...(since && { createdAt: { gt: since } }) } });
}

// GET /api/conversations — my conversations, newest first
router.get('/conversations', async (req, res) => {
  const me = req.user.id;
  const list = await prisma.conversation.findMany({
    where: { OR: [{ studentId: me }, { mentorUserId: me }] }, orderBy: { lastMessageAt: 'desc' },
    include: { student: person, mentorUser: person },
  });
  const out = [];
  for (const c of list) {
    const cleared = clearedAt(c, me);
    const last = await prisma.message.findFirst({ where: { conversationId: c.id, ...(cleared && { createdAt: { gt: cleared } }) }, orderBy: { createdAt: 'desc' } });
    out.push({
      id: c.id, with: other(c, me), lastMessageAt: c.lastMessageAt,
      last: last ? publicMessage(last) : null, unread: await unreadCount(c, me),
    });
  }
  res.json({ conversations: out });
});

// GET /api/messages/unread — number for the menu badge
router.get('/messages/unread', async (req, res) => {
  const me = req.user.id;
  const list = await prisma.conversation.findMany({ where: { OR: [{ studentId: me }, { mentorUserId: me }] } });
  let total = 0;
  for (const c of list) total += await unreadCount(c, me);
  res.json({ unread: total });
});

// POST /api/conversations { mentorId } (student) or { studentId } (mentor) — open the conversation
router.post('/conversations', async (req, res) => {
  const { mentorId, studentId } = z.object({ mentorId: z.string().uuid().optional(), studentId: z.string().uuid().optional() }).parse(req.body);
  let pair;
  if (req.user.role === 'student') {
    const m = mentorId && await prisma.mentor.findUnique({ where: { id: mentorId }, select: { userId: true } });
    if (!m) throw new HttpError(404, 'We could not find this mentor.');
    pair = [req.user.id, m.userId];
  } else {
    if (!studentId) throw new HttpError(400, 'Please choose a student.');
    pair = [studentId, req.user.id];
  }
  if (!(await canChat(...pair))) throw new HttpError(403, 'You can send messages after booking a session with this mentor.');
  const c = await conversationFor(...pair);
  res.json({ conversation: { id: c.id } });
});

// GET /api/conversations/:id/messages?after=<ISO date> — messages (only newer ones with ?after, for live updates)
router.get('/conversations/:id/messages', async (req, res) => {
  const c = await myConversation(req);
  const me = req.user.id;
  const cleared = clearedAt(c, me);
  const after = req.query.after ? new Date(String(req.query.after)) : null;
  const floor = [cleared, after && !Number.isNaN(after.getTime()) ? after : null].filter(Boolean).sort((a, b) => b - a)[0];
  const messages = await prisma.message.findMany({
    where: { conversationId: c.id, ...(floor && { createdAt: { gt: floor } }) },
    orderBy: { createdAt: 'asc' }, take: after ? 200 : 500,
  });
  // Opening the chat marks it as read.
  const mine = side(c, me);
  const now = new Date();
  await prisma.conversation.update({ where: { id: c.id }, data: mine === 'student' ? { studentReadAt: now } : { mentorReadAt: now } });
  const sessions = await prisma.booking.findMany({
    where: { studentId: c.studentId, mentor: { userId: c.mentorUserId } }, orderBy: { scheduledAt: 'desc' }, take: 5,
    select: { id: true, topic: true, scheduledAt: true, status: true, sessionType: true },
  });
  res.json({
    conversation: { id: c.id, with: other(c, me), me: mine, otherReadAt: readAtOf(c, mine === 'student' ? 'mentor' : 'student'), sessions },
    messages: messages.map(publicMessage), serverTime: now,
  });
});

// POST /api/conversations/:id/messages (JSON { text } or multipart: text + file)
router.post('/conversations/:id/messages', chatUpload.single('file'), async (req, res) => {
  const text = z.string().trim().max(4000, 'Please keep a message under 4000 characters.').default('').parse(req.body?.text ?? '');
  if (!text && !req.file) throw new HttpError(400, 'Please write a message.');
  const c = await myConversation(req);
  let file = {};
  if (req.file) {
    const ext = CHAT_FILE_TYPES[req.file.mimetype];
    file = { fileKey: await saveChatFile(c.id, req.file, ext), fileName: (req.file.originalname || `file.${ext}`).slice(0, 120), fileType: req.file.mimetype, fileSize: req.file.size };
  }
  const now = new Date();
  const mine = side(c, req.user.id);
  const otherSide = mine === 'student' ? 'mentor' : 'student';
  const caughtUp = !c.lastMessageAt || (readAtOf(c, otherSide) && readAtOf(c, otherSide) >= c.lastMessageAt);
  const [m] = await prisma.$transaction([
    prisma.message.create({ data: { conversationId: c.id, senderId: req.user.id, text, ...file, createdAt: now } }),
    prisma.conversation.update({ where: { id: c.id }, data: { lastMessageAt: now, ...(mine === 'student' ? { studentReadAt: now } : { mentorReadAt: now }) } }),
  ]);
  // One bell notification per "burst": only when the other person had read everything before.
  if (caughtUp) {
    const to = other(c, req.user.id);
    await notify(to.id, 'new_message', `New message from ${req.user.firstName}: ${text ? (text.length > 80 ? `${text.slice(0, 80)}…` : text) : 'sent a file'}`, `/messages/${c.id}`, { email: false });
  }
  res.status(201).json({ message: publicMessage(m) });
});

// POST /api/conversations/:id/read
router.post('/conversations/:id/read', async (req, res) => {
  const c = await myConversation(req);
  const now = new Date();
  await prisma.conversation.update({ where: { id: c.id }, data: side(c, req.user.id) === 'student' ? { studentReadAt: now } : { mentorReadAt: now } });
  res.json({ ok: true });
});

// POST /api/conversations/:id/clear — hides the messages so far, for me only
router.post('/conversations/:id/clear', async (req, res) => {
  const c = await myConversation(req);
  const now = new Date();
  await prisma.conversation.update({ where: { id: c.id }, data: side(c, req.user.id) === 'student' ? { studentClearedAt: now, studentReadAt: now } : { mentorClearedAt: now, mentorReadAt: now } });
  res.json({ ok: true });
});

// GET /api/conversations/:id/export — the conversation as a text file
router.get('/conversations/:id/export', async (req, res) => {
  const c = await myConversation(req);
  const cleared = clearedAt(c, req.user.id);
  const messages = await prisma.message.findMany({ where: { conversationId: c.id, ...(cleared && { createdAt: { gt: cleared } }) }, orderBy: { createdAt: 'asc' } });
  const names = { [c.studentId]: `${c.student.firstName} ${c.student.lastName}`, [c.mentorUserId]: `${c.mentorUser.firstName} ${c.mentorUser.lastName}` };
  const tz = process.env.APP_TIMEZONE || 'Africa/Kigali';
  const fmt = (d) => new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: tz }).format(d);
  const lines = messages.map((m) => (m.kind === 'system'
    ? `[${fmt(m.createdAt)}] — ${m.text} —`
    : `[${fmt(m.createdAt)}] ${names[m.senderId] || 'Someone'}: ${m.text}${m.fileName ? `${m.text ? ' ' : ''}(file: ${m.fileName})` : ''}`));
  const title = `INUKA messages: ${names[c.studentId]} and ${names[c.mentorUserId]}\nExported ${fmt(new Date())} (${tz} time)\n\n`;
  const slug = names[side(c, req.user.id) === 'student' ? c.mentorUserId : c.studentId].toLowerCase().replace(/[^a-z0-9]+/g, '-');
  res.set('Content-Type', 'text/plain; charset=utf-8');
  res.set('Content-Disposition', `attachment; filename="inuka-chat-${slug}.txt"`);
  res.send(title + lines.join('\n') + '\n');
});

// GET /api/conversations/:id/files/:messageId — a picture, document or voice note from the chat
router.get('/conversations/:id/files/:messageId', async (req, res) => {
  const c = await myConversation(req);
  const m = await prisma.message.findFirst({ where: { id: req.params.messageId, conversationId: c.id } });
  if (!m?.fileKey) throw new HttpError(404, 'This file could not be found.');
  const buf = await readStoredFile(m.fileKey);
  res.set('Content-Type', m.fileType || contentTypeOf(m.fileKey));
  res.set('Cache-Control', 'private, max-age=86400');
  res.set('Content-Disposition', `${m.fileType?.startsWith('image/') || m.fileType?.startsWith('audio/') ? 'inline' : 'attachment'}; filename="${encodeURIComponent(m.fileName || 'file')}"`);
  res.send(buf);
});

export default router;
