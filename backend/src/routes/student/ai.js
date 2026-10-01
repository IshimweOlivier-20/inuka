// INUKA AI chat for students (spec 13): conversations are saved per student.
import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { prisma } from '../../lib/prisma.js';
import { HttpError } from '../../middleware/errorHandler.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { AiError, aiEnabled, aiProviderName, askAi } from '../../services/aiService.js';

const router = Router();
router.use('/ai', requireAuth, requireRole('student'));

// 30 messages per student per hour keeps costs predictable.
const chatLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, limit: 30, standardHeaders: 'draft-7', legacyHeaders: false,
  keyGenerator: (req) => req.user.id,
  handler: (req, res) => res.status(429).json({ error: 'You have sent many messages this hour. Please take a short break and try again later.' }),
});

const HISTORY = 20; // messages sent to the AI for context

// GET /api/ai/status — is the assistant switched on?
router.get('/ai/status', (req, res) => res.json({ enabled: aiEnabled(), provider: aiEnabled() ? aiProviderName() : null }));

// GET /api/ai/conversations — the student's conversations, newest first
router.get('/ai/conversations', async (req, res) => {
  const rows = await prisma.chatMessage.findMany({
    where: { userId: req.user.id }, orderBy: { createdAt: 'asc' },
    select: { conversationId: true, role: true, content: true, createdAt: true },
  });
  const map = new Map();
  for (const r of rows) {
    const c = map.get(r.conversationId) || { id: r.conversationId, title: null, updatedAt: r.createdAt, count: 0 };
    if (!c.title && r.role === 'user') c.title = r.content.slice(0, 80);
    c.updatedAt = r.createdAt; c.count += 1;
    map.set(r.conversationId, c);
  }
  res.json({ conversations: [...map.values()].sort((a, b) => b.updatedAt - a.updatedAt) });
});

// GET /api/ai/conversations/:id
router.get('/ai/conversations/:id', async (req, res) => {
  const messages = await prisma.chatMessage.findMany({
    where: { userId: req.user.id, conversationId: req.params.id }, orderBy: { createdAt: 'asc' },
    select: { id: true, role: true, content: true, createdAt: true },
  });
  if (!messages.length) throw new HttpError(404, 'We could not find this conversation.');
  res.json({ messages });
});

// DELETE /api/ai/conversations/:id
router.delete('/ai/conversations/:id', async (req, res) => {
  await prisma.chatMessage.deleteMany({ where: { userId: req.user.id, conversationId: req.params.id } });
  res.json({ ok: true });
});

// POST /api/ai/chat { message, conversationId? }
router.post('/ai/chat', chatLimiter, async (req, res) => {
  const { message, conversationId } = z.object({
    message: z.string().trim().min(1, 'Please type a message.').max(6000, 'Your message is too long. Please send a shorter part (6000 characters at most).'),
    conversationId: z.string().uuid().optional(),
  }).parse(req.body);
  if (!aiEnabled()) throw new HttpError(503, 'INUKA AI is not switched on yet. Please ask a mentor in the meantime.');

  const id = conversationId || randomUUID();
  const previous = conversationId ? await prisma.chatMessage.findMany({
    where: { userId: req.user.id, conversationId: id }, orderBy: { createdAt: 'desc' }, take: HISTORY,
    select: { role: true, content: true },
  }) : [];
  const history = [...previous.reverse(), { role: 'user', content: message }];

  // Facts that help the AI give useful, personal answers (name, situation, INUKA courses).
  const u = req.user;
  const courses = await prisma.course.findMany({ where: { isPublished: true }, orderBy: { orderIndex: 'asc' }, select: { title: true, category: true, level: true } });
  const context = [
    `The student's first name is ${u.firstName}.`,
    u.countryResidence && `They live in ${u.countryResidence}${u.countryOrigin && u.countryOrigin !== u.countryResidence ? ` and come from ${u.countryOrigin}` : ''}.`,
    u.educationLevel && `Highest level completed: ${u.educationLevel}.`,
    u.refugeeStatus === 'yes' && 'They told INUKA they are a refugee or displaced person.',
    `INUKA courses you can recommend: ${courses.map((c) => `${c.title} (${c.category === 'english' ? 'English' : 'Computer skills'}, ${c.level})`).join('; ')}.`,
    'Students can search scholarships on the INUKA Scholarships page and book a free mentor session on the Mentorship page.',
  ].filter(Boolean).join(' ');

  let reply;
  try {
    reply = await askAi(history, context);
  } catch (e) {
    console.error('INUKA AI error:', e.message);
    throw new HttpError(502, e instanceof AiError && e.message === 'timeout'
      ? 'INUKA AI is taking too long to answer. Please try again.'
      : 'INUKA AI could not answer right now. Please try again in a moment.');
  }
  if (!reply) throw new HttpError(502, 'INUKA AI could not answer right now. Please try again in a moment.');

  await prisma.chatMessage.createMany({
    data: [
      { userId: u.id, conversationId: id, role: 'user', content: message, createdAt: new Date(Date.now() - 1) },
      { userId: u.id, conversationId: id, role: 'assistant', content: reply, createdAt: new Date() },
    ],
  });
  res.json({ conversationId: id, reply });
});

export default router;
