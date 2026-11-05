// Admin: Scholarship finder (import from a link, news-feed leads) and YouTube search for lessons.
import { Router } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { prisma } from '../../lib/prisma.js';
import { HttpError } from '../../middleware/errorHandler.js';
import { checkAllSources, checkSource, importFromUrl } from '../../services/scholarshipFinder.js';
import { searchVideos, youtubeEnabled } from '../../services/youtube.js';

const router = Router();
const limiter = (limit) => rateLimit({ windowMs: 10 * 60 * 1000, limit, standardHeaders: 'draft-7', legacyHeaders: false, keyGenerator: (req) => req.user.id });
const url = z.string().trim().url('Please paste a full link starting with https://').max(1000);

// POST /api/admin/scholarships/import { url } — read a page and return a filled-in draft (nothing is saved)
router.post('/scholarships/import', limiter(30), async (req, res) => {
  const { url: link } = z.object({ url }).parse(req.body);
  res.json(await importFromUrl(link));
});

// ---------- Leads found in news feeds ----------
router.get('/scholarship-leads', async (req, res) => {
  const { status } = z.object({ status: z.enum(['new', 'imported', 'dismissed']).default('new') }).parse(req.query);
  const [leads, counts, sources] = await Promise.all([
    prisma.scholarshipLead.findMany({
      where: { status }, orderBy: [{ publishedAt: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }], take: 100,
      include: { source: { select: { name: true } } },
    }),
    prisma.scholarshipLead.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.leadSource.findMany({ orderBy: { createdAt: 'asc' } }),
  ]);
  res.json({ leads, counts: Object.fromEntries(counts.map((c) => [c.status, c._count._all])), sources });
});

const setStatus = (status) => async (req, res) => {
  const body = z.object({ scholarshipId: z.string().uuid().optional() }).parse(req.body || {});
  const lead = await prisma.scholarshipLead.update({ where: { id: req.params.id }, data: { status, ...(body.scholarshipId && { scholarshipId: body.scholarshipId }) } })
    .catch(() => { throw new HttpError(404, 'We could not find this lead.'); });
  res.json({ lead });
};
router.post('/scholarship-leads/:id/dismiss', setStatus('dismissed'));
router.post('/scholarship-leads/:id/restore', setStatus('new'));
router.post('/scholarship-leads/:id/imported', setStatus('imported'));

// ---------- Feeds to follow ----------
const sourceSchema = z.object({ name: z.string().trim().min(2, 'Please name the source.').max(80), url, isActive: z.boolean().default(true) });

router.post('/lead-sources', async (req, res) => {
  const d = sourceSchema.parse(req.body);
  if (await prisma.leadSource.findUnique({ where: { url: d.url } })) throw new HttpError(400, 'This feed is already in the list.');
  const created = await prisma.leadSource.create({ data: d });
  res.status(201).json({ source: await checkSource(created) }); // check it straight away so the admin sees if it works
});
router.patch('/lead-sources/:id', async (req, res) => {
  const d = sourceSchema.partial().parse(req.body);
  res.json({ source: await prisma.leadSource.update({ where: { id: req.params.id }, data: d }) });
});
router.delete('/lead-sources/:id', async (req, res) => {
  await prisma.leadSource.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});
router.post('/lead-sources/check', limiter(10), async (req, res) => {
  const sources = await checkAllSources();
  res.json({ sources, found: sources.reduce((t, s) => t + (s.lastFound || 0), 0) });
});

// ---------- YouTube (lesson editor) ----------
router.get('/youtube/status', (req, res) => res.json({ enabled: youtubeEnabled() }));
router.get('/youtube/search', limiter(60), async (req, res) => {
  const { q, lang } = z.object({ q: z.string().trim().min(2, 'Type at least 2 letters.').max(100), lang: z.enum(['en', 'fr', 'rw', 'sw']).default('en') }).parse(req.query);
  res.json({ videos: await searchVideos(q, { language: lang }) });
});

export default router;
