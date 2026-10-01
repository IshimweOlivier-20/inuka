import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { HttpError } from '../../middleware/errorHandler.js';
import { requireAuth } from '../../middleware/auth.js';
import { ALWAYS_REQUIRED_DOCS, CONDITIONAL_DOCS } from '../../lib/constants.js';
import { awardBadge } from '../../utils/badgeChecker.js';

const router = Router();
router.use(requireAuth);

const filtersSchema = z.object({
  q: z.string().trim().optional(),
  region: z.string().optional(),
  country: z.string().optional(),
  level: z.enum(['undergraduate', 'postgraduate', 'both']).optional(),
  funding: z.enum(['fully_funded', 'partial', 'tuition_only']).optional(),
  refugees: z.enum(['yes']).optional(),
  language: z.enum(['English', 'French', 'Both']).optional(),
  deadline: z.enum(['month', '3months']).optional(),
  sort: z.enum(['deadline', 'relevant', 'newest']).default('deadline'),
});

// Build the Apply checklist (spec 10.2) and tick documents already in the vault.
export function buildChecklist(scholarship, user, docs) {
  const have = new Set(docs.map((d) => d.docType));
  const isRefugee = user.refugeeStatus === 'yes';
  const always = ALWAYS_REQUIRED_DOCS
    .filter((d) => !d.refugeeOnly || isRefugee || scholarship.refugeesOnly)
    .map((d) => ({ key: d.key, label: d.label, uploaded: d.vault.some((v) => have.has(v)), vaultType: d.vault[0] }));
  const conditional = (scholarship.documentsRequired || [])
    .filter((k) => CONDITIONAL_DOCS[k])
    .map((k) => {
      const d = CONDITIONAL_DOCS[k];
      const uploaded = d.vault.length > 0 && (d.needsAll ? d.vault.every((v) => have.has(v)) : d.vault.some((v) => have.has(v)));
      return { key: k, label: d.label, uploaded, vaultType: d.vault[0] ?? 'other' };
    });
  return { always, conditional };
}

// Shared by the signed-in page and the public /opportunities page.
export function scholarshipQuery(query) {
  const f = filtersSchema.parse(query);
  const now = new Date();
  const where = { isActive: true, AND: [] };
  if (f.q) {
    where.AND.push({ OR: ['name', 'orgName', 'hostCountry', 'hostUniversity', 'description'].map((k) => ({ [k]: { contains: f.q, mode: 'insensitive' } })) });
  }
  if (f.region && f.region !== 'Any') where.region = f.region;
  if (f.country) where.hostCountry = { contains: f.country, mode: 'insensitive' };
  if (f.level) where.level = f.level === 'both' ? 'both' : { in: [f.level, 'both'] };
  if (f.funding) where.fundingType = f.funding;
  if (f.refugees === 'yes') where.openToRefugees = true;
  if (f.language) where.languageOfStudy = f.language === 'Both' ? 'Both' : { in: [f.language, 'Both'] };
  if (f.deadline) {
    const days = f.deadline === 'month' ? 31 : 92;
    where.deadline = { gte: now, lte: new Date(now.getTime() + days * 864e5) };
  }
  if (!where.AND.length) delete where.AND;
  const orderBy = f.sort === 'newest' ? [{ createdAt: 'desc' }]
    : f.sort === 'relevant' ? [{ isFeatured: 'desc' }, { deadline: { sort: 'asc', nulls: 'last' } }]
    : [{ deadline: { sort: 'asc', nulls: 'last' } }, { name: 'asc' }];
  // Deadline-sorted lists put passed deadlines at the end.
  const arrange = (list) => (f.sort === 'deadline'
    ? [...list.filter((s) => !s.deadline || s.deadline >= now), ...list.filter((s) => s.deadline && s.deadline < now)]
    : list);
  return { where, orderBy, arrange };
}

router.get('/', async (req, res) => {
  const { where, orderBy, arrange } = scholarshipQuery(req.query);
  const [list, saved] = await Promise.all([
    prisma.scholarship.findMany({ where, orderBy }),
    prisma.savedScholarship.findMany({ where: { userId: req.user.id }, select: { scholarshipId: true } }),
  ]);
  const savedIds = new Set(saved.map((s) => s.scholarshipId));
  // Refugee users see refugee-only programmes; others don't (they cannot apply).
  const visible = list.filter((s) => !s.refugeesOnly || req.user.refugeeStatus !== 'no');
  res.json({ scholarships: arrange(visible).map((s) => ({ ...s, saved: savedIds.has(s.id) })) });
});

router.get('/saved', async (req, res) => {
  const rows = await prisma.savedScholarship.findMany({
    where: { userId: req.user.id },
    include: { scholarship: true },
    orderBy: { scholarship: { deadline: { sort: 'asc', nulls: 'last' } } },
  });
  res.json({ scholarships: rows.map((r) => ({ ...r.scholarship, saved: true, savedAt: r.savedAt })) });
});

router.post('/save', async (req, res) => {
  const { scholarshipId } = z.object({ scholarshipId: z.string() }).parse(req.body);
  const s = await prisma.scholarship.findUnique({ where: { id: scholarshipId } });
  if (!s) throw new HttpError(404, 'We could not find that scholarship.');
  await prisma.savedScholarship.upsert({
    where: { userId_scholarshipId: { userId: req.user.id, scholarshipId } },
    update: {},
    create: { userId: req.user.id, scholarshipId },
  });
  res.status(201).json({ ok: true });
});

router.delete('/save/:id', async (req, res) => {
  await prisma.savedScholarship.deleteMany({ where: { userId: req.user.id, scholarshipId: req.params.id } });
  res.json({ ok: true });
});

router.get('/:id', async (req, res) => {
  const s = await prisma.scholarship.findFirst({ where: { OR: [{ id: req.params.id }, { slug: req.params.id }] } });
  if (!s) throw new HttpError(404, 'We could not find that scholarship.');
  const [saved, docs, related, application] = await Promise.all([
    prisma.savedScholarship.findUnique({ where: { userId_scholarshipId: { userId: req.user.id, scholarshipId: s.id } } }),
    prisma.document.findMany({ where: { userId: req.user.id }, select: { docType: true } }),
    prisma.scholarship.findMany({
      where: { id: { not: s.id }, isActive: true, OR: [{ region: s.region }, { level: s.level }, { fundingType: s.fundingType }] },
      take: 3, orderBy: { isFeatured: 'desc' },
    }),
    prisma.application.findUnique({ where: { userId_scholarshipId: { userId: req.user.id, scholarshipId: s.id } } }),
  ]);
  res.json({ scholarship: { ...s, saved: !!saved }, checklist: buildChecklist(s, req.user, docs), related, application });
});

// ---------- Applications (spec 10.4) ----------
export const applications = Router();
applications.use(requireAuth);

const STATUSES = ['not_started', 'in_progress', 'submitted', 'awaiting_response', 'accepted', 'rejected'];

applications.get('/', async (req, res) => {
  const rows = await prisma.application.findMany({
    where: { userId: req.user.id },
    include: { scholarship: { select: { id: true, slug: true, name: true, orgName: true, hostCountry: true, hostUniversity: true, deadline: true, applyUrl: true } } },
    orderBy: { updatedAt: 'desc' },
  });
  res.json({ applications: rows });
});

// Logged when a student continues from the checklist to the official site ("Application Started", spec 11.3)
applications.post('/', async (req, res) => {
  const { scholarshipId, status } = z.object({
    scholarshipId: z.string(), status: z.enum(STATUSES).default('in_progress'),
  }).parse(req.body);
  const app = await prisma.application.upsert({
    where: { userId_scholarshipId: { userId: req.user.id, scholarshipId } },
    update: {},
    create: { userId: req.user.id, scholarshipId, status },
  });
  res.status(201).json({ application: app });
});

applications.patch('/:id', async (req, res) => {
  const data = z.object({
    status: z.enum(STATUSES).optional(),
    notes: z.string().max(500, 'Notes can be at most 500 characters.').optional(),
  }).parse(req.body);
  const app = await prisma.application.findFirst({ where: { id: req.params.id, userId: req.user.id } });
  if (!app) throw new HttpError(404, 'We could not find that application.');
  const updated = await prisma.application.update({ where: { id: app.id }, data });
  let newBadge = null;
  if (['submitted', 'awaiting_response', 'accepted'].includes(updated.status)) {
    newBadge = await awardBadge(req.user.id, 'first_application');
  }
  res.json({ application: updated, newBadge });
});

applications.delete('/:id', async (req, res) => {
  await prisma.application.deleteMany({ where: { id: req.params.id, userId: req.user.id } });
  res.json({ ok: true });
});

export default router;
