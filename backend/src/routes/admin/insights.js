// Admin: analytics, anonymised AI query themes and announcements (spec 16.2).
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { HttpError } from '../../middleware/errorHandler.js';
import { THEMES, themeOf } from '../../services/aiService.js';

const router = Router();
const DAY = 24 * 60 * 60 * 1000;

// GET /api/admin/analytics — learning funnel, drop-off points, popular content, AI themes
router.get('/analytics', async (req, res) => {
  const [courses, lessonCompletions, enrollments, certificates, attempts, aiMessages, applications] = await Promise.all([
    prisma.course.findMany({
      orderBy: { orderIndex: 'asc' },
      select: { id: true, title: true, category: true, track: true, lessons: { where: { isPublished: true }, orderBy: { orderIndex: 'asc' }, select: { id: true, title: true } } },
    }),
    prisma.progress.groupBy({ by: ['lessonId'], where: { isCompleted: true }, _count: { _all: true } }),
    prisma.enrollment.groupBy({ by: ['courseId'], _count: { _all: true } }),
    prisma.certificate.groupBy({ by: ['courseId'], _count: { _all: true } }),
    prisma.progress.groupBy({ by: ['lessonId'], where: { bestScore: { not: null } }, _avg: { bestScore: true } }),
    prisma.chatMessage.findMany({ where: { role: 'user', createdAt: { gte: new Date(Date.now() - 90 * DAY) } }, select: { content: true, conversationId: true } }),
    prisma.application.groupBy({ by: ['status'], _count: { _all: true } }),
  ]);
  const done = Object.fromEntries(lessonCompletions.map((l) => [l.lessonId, l._count._all]));
  const avgScore = Object.fromEntries(attempts.map((a) => [a.lessonId, Math.round(a._avg.bestScore)]));
  const enrolled = Object.fromEntries(enrollments.map((e) => [e.courseId, e._count._all]));
  const certified = Object.fromEntries(certificates.map((c) => [c.courseId, c._count._all]));

  const funnel = courses.map((c) => {
    const start = enrolled[c.id] || 0;
    const lessons = c.lessons.map((l, i) => ({ id: l.id, number: i + 1, title: l.title, completed: done[l.id] || 0, avgScore: avgScore[l.id] ?? null }));
    // Drop-off point: the lesson after which the most students stop
    let worst = null;
    for (let i = 1; i < lessons.length; i++) {
      const lost = lessons[i - 1].completed - lessons[i].completed;
      if (lost > 0 && (!worst || lost > worst.lost)) worst = { afterLesson: lessons[i - 1].number, title: lessons[i - 1].title, lost };
    }
    return { id: c.id, title: c.title, category: c.category, track: c.track, enrolled: start, completed: certified[c.id] || 0, lessons, dropOff: worst };
  });

  const themeCounts = Object.fromEntries([...THEMES.map(([n]) => [n, 0]), ['Other', 0]]);
  for (const m of aiMessages) themeCounts[themeOf(m.content)] += 1;
  res.json({
    funnel,
    popularLessons: funnel.flatMap((c) => c.lessons.map((l) => ({ ...l, course: c.title }))).sort((a, b) => b.completed - a.completed).slice(0, 8),
    ai: {
      questions: aiMessages.length,
      conversations: new Set(aiMessages.map((m) => m.conversationId)).size,
      themes: Object.entries(themeCounts).map(([theme, count]) => ({ theme, count })).sort((a, b) => b.count - a.count),
    },
    applications: Object.fromEntries(applications.map((a) => [a.status, a._count._all])),
  });
});

// ---------- Announcements ----------
const AUDIENCES = { all_students: 'All students', refugees: 'Refugee students', mentors: 'All mentors', everyone: 'Everyone' };

async function audienceWhere(audience, country) {
  if (audience === 'country') return { role: 'student', isActive: true, countryResidence: country };
  if (audience === 'refugees') return { role: 'student', isActive: true, refugeeStatus: 'yes' };
  if (audience === 'mentors') return { role: 'mentor', isActive: true };
  if (audience === 'everyone') return { isActive: true, role: { in: ['student', 'mentor'] } };
  return { role: 'student', isActive: true };
}

// POST /api/admin/announcements { message, link?, audience, country? } — in-app notification to a group
router.post('/announcements', async (req, res) => {
  const { message, link, audience, country } = z.object({
    message: z.string().trim().min(5, 'Please write the announcement.').max(5000)
      .refine((m) => m.replace(/<[^>]+>/g, '').trim().length <= 400, 'Please keep announcements under 400 characters of text.'),
    link: z.string().trim().regex(/^(\/|https:\/\/)/, 'Links must start with / (a page on INUKA) or https://').optional().or(z.literal('')),
    audience: z.enum(['all_students', 'refugees', 'mentors', 'everyone', 'country']),
    country: z.string().trim().optional(),
  }).parse(req.body);
  if (audience === 'country' && !country) throw new HttpError(400, 'Please choose a country.');
  const users = await prisma.user.findMany({ where: await audienceWhere(audience, country), select: { id: true } });
  if (!users.length) throw new HttpError(400, 'Nobody is in this group yet.');
  await prisma.notification.createMany({ data: users.map((u) => ({ userId: u.id, type: 'announcement', message, link: link || null })) });
  res.status(201).json({ sent: users.length, audience: audience === 'country' ? `Students in ${country}` : AUDIENCES[audience] });
});

// GET /api/admin/announcements — recent announcements with how many people received and read them
router.get('/announcements', async (req, res) => {
  const rows = await prisma.notification.findMany({
    where: { type: 'announcement' }, orderBy: { createdAt: 'desc' }, take: 5000,
    select: { message: true, link: true, isRead: true, createdAt: true },
  });
  const groups = new Map();
  for (const r of rows) {
    const key = `${r.message}|${r.link}|${Math.floor(r.createdAt.getTime() / 60000)}`; // same message sent in the same minute
    const g = groups.get(key) || { message: r.message, link: r.link, sentAt: r.createdAt, recipients: 0, read: 0 };
    g.recipients += 1; if (r.isRead) g.read += 1;
    groups.set(key, g);
  }
  const countries = await prisma.user.groupBy({ by: ['countryResidence'], where: { role: 'student', countryResidence: { not: null } }, _count: { _all: true } });
  const audienceCounts = Object.fromEntries(await Promise.all(Object.keys(AUDIENCES).map(async (k) => [k, await prisma.user.count({ where: await audienceWhere(k) })])));
  res.json({
    announcements: [...groups.values()].slice(0, 20),
    audiences: AUDIENCES,
    audienceCounts,
    countries: countries.map((c) => ({ country: c.countryResidence, students: c._count._all })).sort((a, b) => b.students - a.students),
  });
});

export default router;
