// Public (no sign-in) data for the home page and the News & Guides pages.
import { Router } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { prisma } from '../lib/prisma.js';
import { HttpError } from '../middleware/errorHandler.js';
import { searchScholarships } from '../services/scholarshipSearch.js';

const router = Router();
const isProd = () => process.env.NODE_ENV === 'production';
// Sample (placeholder) rows are never shown in production.
const visible = () => ({ isPublished: true, ...(isProd() && { isSample: false }) });

let cache = { at: 0, data: null };

router.get('/landing', async (req, res) => {
  // Cache for 1 hour in production (spec 21.2). No cache in development, so edits show immediately.
  if (isProd() && cache.data && Date.now() - cache.at < 3600_000) return res.json(cache.data);

  const [scholarshipCount, courseCount, lessonCount, studentCount, testimonials, team, partners, faq] =
    await Promise.all([
      prisma.scholarship.count({ where: { isActive: true } }),
      prisma.course.count({ where: { isPublished: true } }),
      prisma.lesson.count({ where: { isPublished: true } }),
      prisma.user.count({ where: { role: 'student', isVerified: true, isActive: true } }),
      prisma.testimonial.findMany({ where: visible(), orderBy: { orderIndex: 'asc' } }),
      prisma.teamMember.findMany({ where: visible(), orderBy: { orderIndex: 'asc' } }),
      prisma.partner.findMany({ where: visible(), orderBy: { orderIndex: 'asc' } }),
      prisma.faqItem.findMany({ where: { isPublished: true }, orderBy: { orderIndex: 'asc' } }),
    ]);

  cache = {
    at: Date.now(),
    data: {
      stats: { scholarshipCount, courseCount, lessonCount, studentCount },
      testimonials, team, partners, faq,
    },
  };
  res.json(cache.data);
});

// News & Guides
router.get('/posts', async (req, res) => {
  const { category } = z.object({ category: z.enum(['news', 'guide', 'story']).optional() }).parse(req.query);
  const posts = await prisma.post.findMany({
    where: { ...visible(), publishedAt: { lte: new Date() }, ...(category && { category }) },
    orderBy: { publishedAt: 'desc' },
    select: { id: true, slug: true, title: true, category: true, excerpt: true, coverEmoji: true, readMinutes: true, publishedAt: true, authorName: true, isSample: true },
  });
  res.json({ posts });
});

router.get('/posts/:slug', async (req, res) => {
  const post = await prisma.post.findFirst({ where: { slug: req.params.slug, ...visible() } });
  if (!post) throw new HttpError(404, 'We could not find this article.');
  const more = await prisma.post.findMany({
    where: { ...visible(), id: { not: post.id }, publishedAt: { lte: new Date() } },
    orderBy: { publishedAt: 'desc' },
    take: 3,
    select: { slug: true, title: true, category: true, coverEmoji: true, readMinutes: true },
  });
  res.json({ post, more });
});

// ---------- Public course catalogue (/learn) ----------
router.get('/courses', async (req, res) => {
  const courses = await prisma.course.findMany({
    where: { isPublished: true },
    orderBy: { orderIndex: 'asc' },
    select: {
      id: true, slug: true, title: true, category: true, track: true, level: true, description: true, skills: true,
      lessons: { where: { isPublished: true }, orderBy: { orderIndex: 'asc' }, select: { id: true, title: true, summary: true } },
    },
  });
  res.json({ courses });
});

// ---------- Public scholarship search (/opportunities) ----------
router.get('/scholarships', async (req, res) => {
  res.json(await searchScholarships(req.query));
});

router.get('/scholarships/:id', async (req, res) => {
  const s = await prisma.scholarship.findFirst({ where: { isActive: true, OR: [{ id: req.params.id }, { slug: req.params.id }] } });
  if (!s) throw new HttpError(404, 'We could not find that scholarship.');
  const related = await prisma.scholarship.findMany({
    where: { id: { not: s.id }, isActive: true, OR: [{ region: s.region }, { level: s.level }, { fundingType: s.fundingType }] },
    take: 3, orderBy: { isFeatured: 'desc' },
  });
  res.json({ scholarship: s, related });
});

// Email alerts sign-up
const subscribeLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 10, message: { error: 'Too many attempts. Please try again later.' } });

router.post('/subscribe', subscribeLimiter, async (req, res) => {
  const { email } = z.object({ email: z.email('Please enter a valid email address.') }).parse(req.body);
  await prisma.subscriber.upsert({
    where: { email: email.toLowerCase() },
    update: {},
    create: { email: email.toLowerCase() },
  });
  res.status(201).json({ ok: true });
});

export default router;
