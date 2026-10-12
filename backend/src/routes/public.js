// Public (no sign-in) data for the home page and the News & Guides pages.
import { Router } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { prisma } from '../lib/prisma.js';
import { HttpError } from '../middleware/errorHandler.js';
import { searchScholarships } from '../services/scholarshipSearch.js';
import { COURSE_FILE_NAME, MEDIA_NAME, PHOTO_NAME, contentTypeOf, readPublicImage } from '../services/storageService.js';
import { sendEmail } from '../services/emailService.js';

const router = Router();
const isProd = () => process.env.NODE_ENV === 'production';
// Sample (placeholder) rows are never shown in production.
const visible = () => ({ isPublished: true, ...(isProd() && { isSample: false }) });

let cache = { at: 0, data: null };

// ---------- Profile photos ----------
// Works with local disk and S3 storage (see services/storageService.js).
async function sendImage(res, folder, name, label) {
  const buf = await readPublicImage(folder, name);
  if (!buf) throw new HttpError(404, `${label} not found.`);
  res.set('Cache-Control', 'public, max-age=604800, immutable'); // names are random and never reused
  res.type(contentTypeOf(name)).send(buf);
}
router.get('/photos/:name', async (req, res) => {
  if (!PHOTO_NAME.test(req.params.name)) throw new HttpError(404, 'Photo not found.');
  await sendImage(res, 'photos', req.params.name, 'Photo');
});
// Course files (lesson audio, worksheets). Supports "Range" so audio players can jump to any point.
router.get('/files/:name', async (req, res) => {
  if (!COURSE_FILE_NAME.test(req.params.name)) throw new HttpError(404, 'File not found.');
  const buf = await readPublicImage('files', req.params.name);
  if (!buf) throw new HttpError(404, 'File not found.');
  res.set('Cache-Control', 'public, max-age=604800, immutable');
  res.set('Accept-Ranges', 'bytes');
  res.type(contentTypeOf(req.params.name));
  const m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
  if (m) {
    const start = m[1] ? Number(m[1]) : Math.max(0, buf.length - Number(m[2]));
    const end = m[1] && m[2] ? Math.min(Number(m[2]), buf.length - 1) : buf.length - 1;
    if (start >= buf.length || start > end) { res.status(416).set('Content-Range', `bytes */${buf.length}`).end(); return; }
    res.status(206).set('Content-Range', `bytes ${start}-${end}/${buf.length}`).send(buf.subarray(start, end + 1));
    return;
  }
  res.send(buf);
});

router.get('/media/:name', async (req, res) => {
  if (!MEDIA_NAME.test(req.params.name)) throw new HttpError(404, 'Image not found.');
  await sendImage(res, 'media', req.params.name, 'Image');
});

router.get('/landing', async (req, res) => {
  // Cache for 1 hour in production (spec 21.2). No cache in development, so edits show immediately.
  if (isProd() && cache.data && Date.now() - cache.at < 3600_000) return res.json(cache.data);

  const [scholarshipCount, refugeeScholarshipCount, courseCount, lessonCount, studentCount, mentorCount, testimonials, team, partners, faq] =
    await Promise.all([
      prisma.scholarship.count({ where: { isActive: true } }),
      prisma.scholarship.count({ where: { isActive: true, openToRefugees: true } }),
      prisma.course.count({ where: { isPublished: true } }),
      prisma.lesson.count({ where: { isPublished: true } }),
      prisma.user.count({ where: { role: 'student', isVerified: true, isActive: true } }),
      prisma.mentor.count({ where: { isApproved: true, user: { isActive: true } } }),
      prisma.testimonial.findMany({ where: visible(), orderBy: { orderIndex: 'asc' } }),
      prisma.teamMember.findMany({ where: visible(), orderBy: { orderIndex: 'asc' } }),
      // Partners: on the live site only published ones; while developing, also unpublished ones so you can preview logos.
      prisma.partner.findMany({ where: isProd() ? visible() : {}, orderBy: { orderIndex: 'asc' } }),
      prisma.faqItem.findMany({ where: { isPublished: true }, orderBy: { orderIndex: 'asc' } }),
    ]);

  cache = {
    at: Date.now(),
    data: {
      stats: { scholarshipCount, refugeeScholarshipCount, courseCount, lessonCount, studentCount, mentorCount },
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
      id: true, slug: true, title: true, category: true, track: true, level: true, description: true, skills: true, thumbnailUrl: true,
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

// GET /api/public/unsubscribe?token=… — stop scholarship alert emails (link in every alert email)
router.get('/unsubscribe', async (req, res) => {
  const token = String(req.query.token || '');
  const sub = token && await prisma.subscriber.findUnique({ where: { token } });
  if (sub) await prisma.subscriber.delete({ where: { id: sub.id } });
  res.json({ ok: true, email: sub?.email || null });
});

// "Submit your query" form on the home page. Saved for the admin (Website content → Messages) and emailed to
// CONTACT_EMAIL if set. Ticking "send me scholarship alerts" also adds the email to the subscribers list.
const contactLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 5, message: { error: 'You have sent several messages already. Please try again in an hour.' } });

router.post('/contact', contactLimiter, async (req, res) => {
  const data = z.object({
    name: z.string().trim().max(100).optional().or(z.literal('')),
    email: z.email('Please enter a valid email address.'),
    message: z.string().trim().max(3000, 'Please keep your message under 3000 characters.').optional().or(z.literal('')),
    alerts: z.boolean().optional(),
    website: z.string().max(0).optional().or(z.literal('')), // hidden field: bots fill it, people do not
  }).parse(req.body);
  if (data.website) return res.status(201).json({ ok: true });
  const message = data.message || '';
  if (!data.alerts && message.length < 10) {
    throw new HttpError(400, message ? 'Please write your question (at least 10 characters).' : 'Please write a message, or tick the box to get scholarship alerts.');
  }
  if (message && message.length < 10) throw new HttpError(400, 'Please write your question (at least 10 characters).');
  const email = data.email.toLowerCase();
  const name = data.name || email.split('@')[0];
  if (data.alerts) await prisma.subscriber.upsert({ where: { email }, update: {}, create: { email, source: 'contact' } });
  if (message) {
    await prisma.contactMessage.create({ data: { name, email, message } });
    const to = process.env.CONTACT_EMAIL || process.env.SMTP_USER; // INUKA's own inbox if no separate address is set
    if (to) {
      sendEmail({ to, subject: `New question on INUKA from ${name}`, headers: { 'Reply-To': email }, text: `${name} (${email}) wrote:\n\n${message}\n\nPress Reply to answer them directly. You can also see all messages in the admin dashboard: Website content → Messages.` })
        .catch((e) => console.error('Contact email failed', e));
    }
  }
  res.status(201).json({ ok: true, subscribed: !!data.alerts, messageSaved: !!message });
});

export default router;
