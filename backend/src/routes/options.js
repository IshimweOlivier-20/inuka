// "Type your S6 results, see your options" (anyone can try; signed-in students can save their results)
// and the public university directory.
import { Router } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { prisma } from '../lib/prisma.js';
import { HttpError } from '../middleware/errorHandler.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';
import { COMBINATIONS, GRADES, MAX_POINTS, POINTS, SUBJECTS } from '../lib/grading.js';
import { computeOptions } from '../services/options.js';

const router = Router();
const isProd = () => process.env.NODE_ENV === 'production';

export const resultSchema = z.object({
  system: z.enum(['rwanda', 'other']).default('rwanda'),
  combination: z.string().trim().max(12).optional().nullable(),
  examYear: z.coerce.number().int().min(2000).max(2100).optional().nullable(),
  subjects: z.array(z.object({
    subject: z.string().trim().min(2, 'Please choose each subject.').max(60),
    grade: z.enum(GRADES).optional(),
    percent: z.coerce.number().min(0).max(100).optional(),
  }).refine((s) => s.grade || s.percent != null, 'Please give a grade for each subject.'))
    .min(1, 'Please add at least one subject.').max(5),
}).superRefine((r, ctx) => {
  if (r.system === 'other' && r.subjects.some((s) => s.percent == null)) ctx.addIssue({ code: 'custom', path: ['subjects'], message: 'Please type the percentage for each subject.' });
  if (r.system === 'rwanda' && r.subjects.some((s) => !s.grade)) ctx.addIssue({ code: 'custom', path: ['subjects'], message: 'Please choose the grade for each subject.' });
});

const tryLimiter = rateLimit({ windowMs: 10 * 60 * 1000, limit: 60, standardHeaders: 'draft-7', legacyHeaders: false });

// GET /api/options/meta — grades, points and combinations for the form
router.get('/options/meta', (req, res) => {
  res.json({ grades: GRADES, points: POINTS, maxPoints: MAX_POINTS, combinations: COMBINATIONS, subjects: SUBJECTS });
});

// POST /api/options/check { results, save? } — anyone can try; ?save stores them for a signed-in student
router.post('/options/check', tryLimiter, optionalAuth, async (req, res) => {
  const result = resultSchema.parse(req.body);
  if (req.body.save) {
    if (!req.user) throw new HttpError(401, 'Please sign in to save your results.');
    await saveResult(req.user.id, result);
  }
  res.json({ result, options: await computeOptions(result, req.user?.role === 'student' ? req.user : null) });
});

async function saveResult(userId, r) {
  const data = { system: r.system, combination: r.combination || null, examYear: r.examYear || null, subjects: r.subjects };
  return prisma.s6Result.upsert({ where: { userId }, update: data, create: { userId, ...data } });
}

// GET /api/options — the signed-in student's saved results and options
router.get('/options', requireAuth, async (req, res) => {
  const saved = await prisma.s6Result.findUnique({ where: { userId: req.user.id } });
  if (!saved) return res.json({ result: null, options: null });
  res.json({ result: saved, options: await computeOptions(saved, req.user) });
});

// DELETE /api/options/result — forget my results
router.delete('/options/result', requireAuth, async (req, res) => {
  await prisma.s6Result.deleteMany({ where: { userId: req.user.id } });
  res.json({ ok: true });
});

// ---------- University directory (public) ----------
const uniWhere = () => ({ isPublished: true, ...(isProd() && { isSample: false }) });

router.get('/public/universities', async (req, res) => {
  const { q, kind, field, accessible } = z.object({
    q: z.string().trim().max(80).optional(), kind: z.enum(['public', 'private', 'tvet']).optional().catch(undefined),
    field: z.string().trim().max(40).optional(), accessible: z.enum(['1']).optional().catch(undefined),
  }).parse(req.query);
  const list = await prisma.university.findMany({
    where: {
      ...uniWhere(), ...(kind && { kind }),
      ...(q && { OR: [{ name: { contains: q, mode: 'insensitive' } }, { shortName: { contains: q, mode: 'insensitive' } }, { city: { contains: q, mode: 'insensitive' } }, { programmes: { some: { name: { contains: q, mode: 'insensitive' } } } }] }),
      ...(field && { programmes: { some: { field, isPublished: true } } }),
    },
    include: { programmes: { where: { isPublished: true }, select: { id: true, name: true, field: true, award: true }, orderBy: { name: 'asc' } } },
    orderBy: { name: 'asc' },
  });
  const rows = accessible ? list.filter((u) => u.accessibility && Object.values(u.accessibility).some((v) => v === true)) : list;
  const fields = await prisma.programme.findMany({ where: { isPublished: true, university: uniWhere() }, distinct: ['field'], select: { field: true }, orderBy: { field: 'asc' } });
  res.json({ universities: rows, fields: fields.map((f) => f.field) });
});

router.get('/public/universities/:slug', async (req, res) => {
  const u = await prisma.university.findFirst({
    where: { slug: req.params.slug, ...uniWhere() },
    include: { programmes: { where: { isPublished: true }, orderBy: [{ award: 'asc' }, { name: 'asc' }] } },
  });
  if (!u) throw new HttpError(404, 'We could not find this university.');
  res.json({ university: u });
});

export default router;
