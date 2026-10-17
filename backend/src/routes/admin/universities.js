// Admin: universities, Rwanda Polytechnic / TVET colleges and their programmes (entry requirements).
// The team types these in from each institution's official page and ticks "Checked" with the date.
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { HttpError } from '../../middleware/errorHandler.js';
import { COMBINATIONS, GRADES, SUBJECTS } from '../../lib/grading.js';

const router = Router();
const slugify = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
const url = z.string().trim().max(300).regex(/^https?:\/\//, 'Please enter a full link starting with https://').optional().nullable().or(z.literal('')).transform((v) => v || null);

const uniSchema = z.object({
  name: z.string().trim().min(3, 'Please enter the name.').max(150),
  shortName: z.string().trim().max(30).optional().nullable().transform((v) => v || null),
  kind: z.enum(['public', 'private', 'tvet'], { error: 'Please choose the type.' }),
  city: z.string().trim().max(60).optional().nullable().transform((v) => v || null),
  website: url,
  about: z.string().trim().max(3000).optional().nullable().transform((v) => v || null),
  accessibility: z.object({
    supportOffice: z.boolean().default(false), accessibleCampus: z.boolean().default(false), assistiveTech: z.boolean().default(false),
    notes: z.string().trim().max(500).optional().nullable(),
  }).optional().nullable(),
  isPublished: z.boolean().default(true),
  verified: z.boolean().optional(), // true = "I checked the official page today"
});

const programmeSchema = z.object({
  name: z.string().trim().min(3, 'Please enter the programme name.').max(150),
  field: z.string().trim().min(2, 'Please choose a field.').max(40),
  award: z.enum(['bachelor', 'diploma', 'certificate']),
  durationYears: z.coerce.number().min(0.25).max(7).optional().nullable(),
  combinations: z.array(z.string().trim().max(12)).max(20).default([]),
  required: z.array(z.object({ subject: z.string().trim().min(2).max(60), minGrade: z.enum(GRADES) })).max(5).default([]),
  minPoints: z.coerce.number().int().min(0).max(18).optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable().transform((v) => v || null),
  applyUrl: url,
  isPublished: z.boolean().default(true),
});

router.get('/universities/meta', (req, res) => res.json({ grades: GRADES, combinations: Object.keys(COMBINATIONS), subjects: SUBJECTS }));

router.get('/universities', async (req, res) => {
  const list = await prisma.university.findMany({ orderBy: { name: 'asc' }, include: { _count: { select: { programmes: true } } } });
  res.json({ universities: list });
});

router.get('/universities/:id', async (req, res) => {
  const u = await prisma.university.findUnique({ where: { id: req.params.id }, include: { programmes: { orderBy: [{ award: 'asc' }, { name: 'asc' }] } } });
  if (!u) throw new HttpError(404, 'We could not find this university.');
  res.json({ university: u });
});

const uniData = (d) => {
  const { verified, ...rest } = d;
  // Checking a sample entry against the official page makes it real data (shown in production too).
  return { ...rest, ...(verified === true && { verifiedAt: new Date(), isSample: false }), ...(verified === false && { verifiedAt: null }) };
};

router.post('/universities', async (req, res) => {
  const d = uniSchema.parse(req.body);
  let slug = slugify(d.shortName || d.name);
  if (await prisma.university.findUnique({ where: { slug } })) slug = `${slug}-${Date.now().toString(36)}`;
  const university = await prisma.university.create({ data: { ...uniData(d), slug } });
  res.status(201).json({ university });
});

router.patch('/universities/:id', async (req, res) => {
  const d = uniSchema.partial().parse(req.body);
  const university = await prisma.university.update({ where: { id: req.params.id }, data: uniData(d) });
  res.json({ university });
});

router.delete('/universities/:id', async (req, res) => {
  await prisma.university.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

router.post('/universities/:id/programmes', async (req, res) => {
  const d = programmeSchema.parse(req.body);
  const programme = await prisma.programme.create({ data: { ...d, universityId: req.params.id } });
  res.status(201).json({ programme });
});

router.patch('/programmes/:id', async (req, res) => {
  const d = programmeSchema.partial().parse(req.body);
  const programme = await prisma.programme.update({ where: { id: req.params.id }, data: d });
  res.json({ programme });
});

router.delete('/programmes/:id', async (req, res) => {
  await prisma.programme.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

export default router;
