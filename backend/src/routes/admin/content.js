// Admin: website content (home page sections and News & guides) and email subscribers.
// One set of routes for every content type: /api/admin/content/:type
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { HttpError } from '../../middleware/errorHandler.js';
import { assertImage, mediaUpload } from '../../middleware/upload.js';
import { saveMedia } from '../../services/storageService.js';

const router = Router();
const url = z.url('Please enter a full link starting with https://').optional().nullable().or(z.literal(''));
const text = (min, msg) => z.string().trim().min(min, msg);
const order = z.coerce.number().int().min(0).max(999).default(0);
const slugify = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70);

const TYPES = {
  posts: {
    model: 'post', orderBy: [{ publishedAt: 'desc' }],
    schema: z.object({
      title: text(3, 'Please enter a title.'),
      category: z.enum(['news', 'guide', 'story']),
      excerpt: text(10, 'Please write a short summary (at least 10 characters).').max(4000),
      contentHtml: text(20, 'Please write the article (at least 20 characters).'),
      authorName: z.string().trim().min(2).default('INUKA Team'),
      readMinutes: z.coerce.number().int().min(1).max(60).default(3),
      publishedAt: z.coerce.date().default(() => new Date()),
      isPublished: z.boolean().default(true),
    }),
  },
  testimonials: {
    model: 'testimonial', orderBy: [{ orderIndex: 'asc' }, { createdAt: 'desc' }],
    schema: z.object({
      name: text(2, 'Please enter the name.'), country: text(2, 'Please enter the country.'), role: z.string().trim().optional().nullable(),
      quote: text(10, 'Please enter their words.').max(6000), photoUrl: url, orderIndex: order, isPublished: z.boolean().default(true),
    }),
  },
  team: {
    model: 'teamMember', orderBy: [{ orderIndex: 'asc' }],
    schema: z.object({
      name: text(2, 'Please enter the name.'), role: text(2, 'Please enter the role.'), bio: z.string().trim().max(6000).optional().nullable(),
      photoUrl: url, linkedinUrl: url, facebookUrl: url, xUrl: url, instagramUrl: url, orderIndex: order, isPublished: z.boolean().default(true),
    }),
  },
  partners: {
    model: 'partner', orderBy: [{ orderIndex: 'asc' }],
    schema: z.object({
      name: text(2, 'Please enter the organisation name.'), kind: z.enum(['partner', 'sponsor']), description: z.string().trim().max(4000).optional().nullable(),
      websiteUrl: url, logoUrl: z.string().trim().optional().nullable(), orderIndex: order, isPublished: z.boolean().default(false),
    }),
  },
  faq: {
    model: 'faqItem', orderBy: [{ orderIndex: 'asc' }],
    schema: z.object({ question: text(5, 'Please write the question.'), answer: text(5, 'Please write the answer.'), orderIndex: order, isPublished: z.boolean().default(true) }),
  },
  tips: {
    model: 'tip', orderBy: [{ orderIndex: 'asc' }],
    schema: z.object({ icon: z.string().trim().min(1).max(40).default('lightbulb'), title: text(3, 'Please enter a title.'), body: text(10, 'Please write the tip.'), orderIndex: order, isPublished: z.boolean().default(true) }),
  },
};

const typeOf = (req) => {
  const t = TYPES[req.params.type];
  if (!t) throw new HttpError(404, 'Unknown content type.');
  return t;
};
const blanksToNull = (d) => Object.fromEntries(Object.entries(d).map(([k, v]) => [k, v === '' ? null : v]));
const hasSample = (model) => ['post', 'testimonial', 'teamMember', 'partner'].includes(model);

router.get('/content/:type', async (req, res) => {
  const t = typeOf(req);
  res.json({ items: await prisma[t.model].findMany({ orderBy: t.orderBy }) });
});

router.post('/content/:type', async (req, res) => {
  const t = typeOf(req);
  const data = blanksToNull(t.schema.parse(req.body));
  if (t.model === 'post') {
    let slug = slugify(data.title) || 'article';
    if (await prisma.post.findUnique({ where: { slug } })) slug = `${slug}-${Date.now().toString(36)}`;
    data.slug = slug;
  }
  const item = await prisma[t.model].create({ data: { ...data, ...(hasSample(t.model) && { isSample: false }) } });
  res.status(201).json({ item });
});

router.put('/content/:type/:id', async (req, res) => {
  const t = typeOf(req);
  const data = blanksToNull(t.schema.parse(req.body));
  // Editing a placeholder turns it into real content (placeholders are hidden in production).
  const item = await prisma[t.model].update({ where: { id: req.params.id }, data: { ...data, ...(hasSample(t.model) && { isSample: false }) } });
  res.json({ item });
});

router.delete('/content/:type/:id', async (req, res) => {
  const t = typeOf(req);
  await prisma[t.model].delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

// POST /api/admin/media — an image for a lesson or article (multipart field "file")
router.post('/media', mediaUpload.single('file'), async (req, res) => {
  if (!req.file) throw new HttpError(400, 'Please choose an image.');
  assertImage(req.file);
  res.status(201).json({ url: await saveMedia(req.file) });
});

// ---------- Email subscribers (the "Get scholarship alerts" box) ----------
router.get('/subscribers', async (req, res) => {
  const subscribers = await prisma.subscriber.findMany({ orderBy: { createdAt: 'desc' } });
  res.json({ subscribers });
});

router.get('/subscribers.csv', async (req, res) => {
  const rows = await prisma.subscriber.findMany({ orderBy: { createdAt: 'asc' } });
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = ['email,source,signed_up', ...rows.map((r) => [r.email, r.source, r.createdAt.toISOString()].map(esc).join(','))].join('\n');
  res.set({ 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="inuka-subscribers.csv"' });
  res.send(`﻿${csv}`); // BOM so Excel reads accents correctly
});

router.delete('/subscribers/:id', async (req, res) => {
  await prisma.subscriber.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

// ---------- Messages from the "Submit your query" form ----------
router.get('/messages', async (req, res) => {
  const [messages, unread] = await Promise.all([
    prisma.contactMessage.findMany({ orderBy: { createdAt: 'desc' }, take: 300 }),
    prisma.contactMessage.count({ where: { isRead: false } }),
  ]);
  res.json({ messages, unread });
});
router.patch('/messages/:id', async (req, res) => {
  const { isRead } = z.object({ isRead: z.boolean() }).parse(req.body);
  res.json({ message: await prisma.contactMessage.update({ where: { id: req.params.id }, data: { isRead } }) });
});
router.delete('/messages/:id', async (req, res) => {
  await prisma.contactMessage.delete({ where: { id: req.params.id } });
  res.status(204).end();
});

export default router;
