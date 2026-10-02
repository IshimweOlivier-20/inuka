// Admin: scholarship listings (spec 16.2) — add, edit, remove expired, flag refugee-friendly.
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { HttpError } from '../../middleware/errorHandler.js';
import { CONDITIONAL_DOCS } from '../../lib/constants.js';
import { REGIONS } from '../../services/scholarshipSearch.js';

const router = Router();
const PAGE = 25;

const slugify = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70);
const lines = z.array(z.string().trim().min(1)).max(30);

const schema = z.object({
  name: z.string().trim().min(3, 'Please enter the scholarship name.'),
  orgName: z.string().trim().min(2, 'Please enter the organisation.'),
  description: z.string().trim().max(30000).refine((v) => v.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim().length >= 20, 'Please write a description (at least 20 characters).'),
  hostCountry: z.string().trim().min(2, 'Please enter the study country.'),
  hostUniversity: z.string().trim().optional().nullable(),
  region: z.enum(REGIONS, { error: 'Please choose a region.' }),
  fundingType: z.enum(['fully_funded', 'partial', 'tuition_only']),
  level: z.enum(['undergraduate', 'postgraduate', 'both']),
  openToRefugees: z.boolean(),
  refugeesOnly: z.boolean(),
  languageOfStudy: z.string().trim().min(2).default('English'),
  deadline: z.coerce.date().nullable().optional(),
  deadlineNote: z.string().trim().max(300).optional().nullable(),
  eligibility: lines,
  coverage: lines,
  applicationSteps: lines,
  documentsRequired: z.array(z.enum(Object.keys(CONDITIONAL_DOCS))).default([]),
  applyUrl: z.url('Please enter the official application link (https://…).'),
  logoUrl: z.url().optional().nullable().or(z.literal('')),
  isFeatured: z.boolean().default(false),
  isActive: z.boolean().default(true),
}).refine((s) => !s.refugeesOnly || s.openToRefugees, { message: 'A refugees-only scholarship must also be open to refugees.', path: ['openToRefugees'] });

const clean = (d) => ({ ...d, hostUniversity: d.hostUniversity || null, deadlineNote: d.deadlineNote || null, logoUrl: d.logoUrl || null, deadline: d.deadline || null });

// GET /api/admin/scholarships/options — lists for the form
router.get('/scholarships/options', (req, res) => {
  res.json({ regions: REGIONS, documents: Object.entries(CONDITIONAL_DOCS).map(([key, v]) => ({ key, label: v.label })) });
});

// GET /api/admin/scholarships?q=&status=active|inactive|expired&page=
router.get('/scholarships', async (req, res) => {
  const { q = '', status = '', page = '1' } = req.query;
  const p = Math.max(1, Number(page) || 1);
  const now = new Date();
  const where = {
    ...(status === 'active' && { isActive: true }),
    ...(status === 'inactive' && { isActive: false }),
    ...(status === 'expired' && { deadline: { lt: now } }),
    ...(q.trim() && { OR: [{ name: { contains: q.trim(), mode: 'insensitive' } }, { orgName: { contains: q.trim(), mode: 'insensitive' } }, { hostCountry: { contains: q.trim(), mode: 'insensitive' } }] }),
  };
  const [total, scholarships, expiredActive] = await Promise.all([
    prisma.scholarship.count({ where }),
    prisma.scholarship.findMany({
      where, orderBy: [{ isActive: 'desc' }, { deadline: { sort: 'asc', nulls: 'last' } }], skip: (p - 1) * PAGE, take: PAGE,
      select: { id: true, name: true, orgName: true, hostCountry: true, fundingType: true, level: true, openToRefugees: true, refugeesOnly: true, deadline: true, isActive: true, isFeatured: true, _count: { select: { saves: true, applications: true } } },
    }),
    prisma.scholarship.count({ where: { isActive: true, deadline: { lt: now } } }),
  ]);
  res.json({ scholarships, total, page: p, pageSize: PAGE, expiredActive });
});

router.get('/scholarships/:id', async (req, res) => {
  const s = await prisma.scholarship.findUnique({ where: { id: req.params.id } });
  if (!s) throw new HttpError(404, 'We could not find this scholarship.');
  res.json({ scholarship: s });
});

router.post('/scholarships', async (req, res) => {
  const data = clean(schema.parse(req.body));
  let slug = slugify(data.name) || 'scholarship';
  if (await prisma.scholarship.findUnique({ where: { slug } })) slug = `${slug}-${Date.now().toString(36)}`;
  const s = await prisma.scholarship.create({ data: { ...data, slug } });
  res.status(201).json({ scholarship: s });
});

router.put('/scholarships/:id', async (req, res) => {
  const data = clean(schema.parse(req.body));
  const s = await prisma.scholarship.update({ where: { id: req.params.id }, data });
  res.json({ scholarship: s });
});

// PATCH /api/admin/scholarships/:id { isActive?, isFeatured?, openToRefugees? } — quick toggles
router.patch('/scholarships/:id', async (req, res) => {
  const data = z.object({ isActive: z.boolean().optional(), isFeatured: z.boolean().optional(), openToRefugees: z.boolean().optional() }).parse(req.body);
  if (data.openToRefugees === false) data.refugeesOnly = false;
  const s = await prisma.scholarship.update({ where: { id: req.params.id }, data });
  res.json({ scholarship: s });
});

// POST /api/admin/scholarships/remove-expired — hides every listing whose deadline has passed
router.post('/scholarships/remove-expired', async (req, res) => {
  const { count } = await prisma.scholarship.updateMany({ where: { isActive: true, deadline: { lt: new Date() } }, data: { isActive: false } });
  res.json({ count });
});

// DELETE /api/admin/scholarships/:id — removes it everywhere, including students' saved lists
router.delete('/scholarships/:id', async (req, res) => {
  await prisma.scholarship.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

export default router;
