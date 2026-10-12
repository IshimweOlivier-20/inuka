// INUKA Assistant for everyone (visitors, students, mentors, admins): the chat bubble on every page.
// Free to use. Visitors get public answers (scholarships, deadlines, courses); signed-in students get their own data too.
// The conversation is not stored here: the browser sends the last few messages each time.
// (Students' saved conversations on the INUKA AI page use /api/ai/... instead.)
import { Router } from 'express';
import { z } from 'zod';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { optionalAuth } from '../middleware/auth.js';
import { aiProviderName } from '../services/aiService.js';
import { agentMode, runAgent } from '../services/agent.js';

const router = Router();

// Generous but safe: 40 messages per hour per person (or per internet address for visitors).
const limiter = rateLimit({
  windowMs: 60 * 60 * 1000, limit: 40, standardHeaders: 'draft-7', legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || ipKeyGenerator(req.ip),
  handler: (req, res) => res.status(429).json({ error: 'You have sent many messages this hour. Please take a short break and try again later.' }),
});

// GET /api/assistant/status
router.get('/status', (req, res) => {
  const mode = agentMode();
  res.json({ enabled: true, free: true, mode, provider: mode === 'ai' ? aiProviderName() : null });
});

const schema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string().trim().min(1).max(4000, 'Your message is too long. Please send a shorter part (4000 characters at most).'),
  })).min(1).max(12),
  page: z.string().max(200).optional(),
});

// POST /api/assistant/chat { messages: [...last 12], page? }
router.post('/chat', optionalAuth, limiter, async (req, res) => {
  const { messages, page } = schema.parse(req.body);
  if (messages[messages.length - 1].role !== 'user') return res.status(400).json({ error: 'Please type a message.' });
  const out = await runAgent(messages, { user: req.user, page });
  res.json({ reply: out.reply, mode: out.mode, actions: out.actions });
});

export default router;
