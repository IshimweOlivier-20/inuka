// INUKA AI chat for students (spec 13): conversations are saved per student.
import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { prisma } from '../../lib/prisma.js';
import { HttpError } from '../../middleware/errorHandler.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { aiProviderName } from '../../services/aiService.js';
import { agentMode, runAgent } from '../../services/agent.js';
import { activityFor, practiceTurn, reviewWriting } from '../../services/lessonAi.js';

const router = Router();
router.use('/ai', requireAuth, requireRole('student'));

// 30 messages per student per hour keeps costs predictable.
const chatLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, limit: 30, standardHeaders: 'draft-7', legacyHeaders: false,
  keyGenerator: (req) => req.user.id,
  handler: (req, res) => res.status(429).json({ error: 'You have sent many messages this hour. Please take a short break and try again later.' }),
});

const HISTORY = 20; // messages sent to the AI for context

// GET /api/ai/status — always on and free: "ai" mode with a free AI service, otherwise the built-in "basic" mode.
router.get('/ai/status', (req, res) => {
  const mode = agentMode();
  res.json({ enabled: true, free: true, mode, provider: mode === 'ai' ? aiProviderName() : null });
});

// GET /api/ai/history — spec 18.5: the student's chat history (all conversations with their messages, newest first).
// Optional ?conversationId=… for one conversation.
router.get('/ai/history', async (req, res) => {
  const where = { userId: req.user.id, ...(req.query.conversationId && { conversationId: String(req.query.conversationId) }) };
  const rows = await prisma.chatMessage.findMany({
    where, orderBy: { createdAt: 'asc' }, take: 2000,
    select: { id: true, conversationId: true, role: true, content: true, createdAt: true },
  });
  const map = new Map();
  for (const r of rows) {
    const c = map.get(r.conversationId) || { id: r.conversationId, title: null, startedAt: r.createdAt, updatedAt: r.createdAt, messages: [] };
    if (!c.title && r.role === 'user') c.title = r.content.slice(0, 80);
    c.updatedAt = r.createdAt;
    c.messages.push({ id: r.id, role: r.role, content: r.content, createdAt: r.createdAt });
    map.set(r.conversationId, c);
  }
  res.json({ conversations: [...map.values()].sort((a, b) => b.updatedAt - a.updatedAt) });
});

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

  const id = conversationId || randomUUID();
  const previous = conversationId ? await prisma.chatMessage.findMany({
    where: { userId: req.user.id, conversationId: id }, orderBy: { createdAt: 'desc' }, take: HISTORY,
    select: { role: true, content: true },
  }) : [];
  const history = [...previous.reverse(), { role: 'user', content: message }];

  // The INUKA agent: answers with real INUKA data (scholarships, deadlines, courses, the student's progress and documents)
  // and can save a scholarship when asked. Works without an AI key too (basic mode).
  let out;
  try {
    out = await runAgent(history, { user: req.user, page: '/ai' });
  } catch (e) {
    console.error('INUKA AI error:', e.message);
    throw new HttpError(502, 'INUKA AI could not answer right now. Please try again in a moment.');
  }
  const reply = out.reply;
  if (!reply) throw new HttpError(502, 'INUKA AI could not answer right now. Please try again in a moment.');

  await prisma.chatMessage.createMany({
    data: [
      { userId: req.user.id, conversationId: id, role: 'user', content: message, createdAt: new Date(Date.now() - 1) },
      { userId: req.user.id, conversationId: id, role: 'assistant', content: reply, createdAt: new Date() },
    ],
  });
  res.json({ conversationId: id, reply, mode: out.mode, actions: out.actions });
});

// ---------- INUKA AI inside lessons ----------
const lessonLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, limit: 60, standardHeaders: 'draft-7', legacyHeaders: false,
  keyGenerator: (req) => req.user.id,
  handler: (req, res) => res.status(429).json({ error: 'You have used INUKA AI many times this hour. Please take a short break and try again later.' }),
});

// The lesson's AI activity (writing review or speaking practice), checked on the server.
async function lessonActivity(lessonId, type) {
  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId }, include: { course: { select: { slug: true } } } });
  const activity = lesson && activityFor(lesson.course.slug, lesson.title, lesson.aiActivity);
  if (!activity || activity.type !== type) throw new HttpError(404, 'This lesson has no INUKA AI activity.');
  return { lesson, activity };
}

// POST /api/ai/feedback { lessonId, text } — "paste your text, get INUKA AI feedback".
// The text and the feedback are also saved as a conversation, so the student can find them on the INUKA AI page.
router.post('/ai/feedback', lessonLimiter, async (req, res) => {
  const { lessonId, text } = z.object({
    lessonId: z.string().uuid(),
    text: z.string().trim().min(20, 'Please write at least a few sentences first.').max(12000, 'Your text is too long (12,000 characters at most).'),
  }).parse(req.body);
  const { lesson, activity } = await lessonActivity(lessonId, 'writing');
  const out = await reviewWriting({ text, kind: activity.kind, task: activity.task, target: activity, user: req.user });
  const conversationId = randomUUID();
  await prisma.chatMessage.createMany({
    data: [
      { userId: req.user.id, conversationId, role: 'user', content: `Please review my writing for the lesson "${lesson.title}":\n\n${text}`, createdAt: new Date(Date.now() - 1) },
      { userId: req.user.id, conversationId, role: 'assistant', content: out.feedback, createdAt: new Date() },
    ],
  });
  res.json({ ...out, conversationId });
});

// POST /api/ai/practice { lessonId, messages } — spoken conversation practice (the browser reads the replies aloud).
router.post('/ai/practice', lessonLimiter, async (req, res) => {
  const { lessonId, messages } = z.object({
    lessonId: z.string().uuid(),
    messages: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().trim().min(1).max(1500) })).max(24),
  }).parse(req.body);
  await lessonActivity(lessonId, 'voice');
  res.json(await practiceTurn({ messages, user: req.user }));
});

export default router;
