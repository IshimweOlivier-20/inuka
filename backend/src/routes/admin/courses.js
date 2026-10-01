// Admin: course, lesson and quiz management (spec 16.2 — update content without code changes).
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { HttpError } from '../../middleware/errorHandler.js';

const router = Router();

// GET /api/admin/courses — all courses with lesson and student counts
router.get('/courses', async (req, res) => {
  const courses = await prisma.course.findMany({
    orderBy: { orderIndex: 'asc' },
    include: { _count: { select: { lessons: true, enrollments: true, certificates: true } } },
  });
  res.json({ courses });
});

// GET /api/admin/courses/:id — course with its lessons (and quiz counts)
router.get('/courses/:id', async (req, res) => {
  const course = await prisma.course.findUnique({
    where: { id: req.params.id },
    include: { lessons: { orderBy: { orderIndex: 'asc' }, select: { id: true, title: true, summary: true, orderIndex: true, isPublished: true, _count: { select: { quizzes: true, progress: true } } } } },
  });
  if (!course) throw new HttpError(404, 'We could not find this course.');
  res.json({ course });
});

// POST /api/admin/courses — a new course (hidden until it has lessons and you publish it)
router.post('/courses', async (req, res) => {
  const data = z.object({
    title: z.string().trim().min(3, 'Please enter a title.'),
    category: z.enum(['english', 'computer'], { error: 'Please choose English or Computer skills.' }),
    level: z.string().trim().min(2, 'Please enter the level, e.g. Beginner.'),
    description: z.string().trim().min(10, 'Please write a short description.'),
    skills: z.array(z.string().trim().min(1)).max(12).default([]),
  }).parse(req.body);
  const same = await prisma.course.findMany({ where: { category: data.category }, select: { track: true } });
  const letters = same.map((c) => c.track.charCodeAt(0)).filter((n) => n >= 65 && n <= 90);
  const track = String.fromCharCode(letters.length ? Math.max(...letters) + 1 : 65); // next letter: A, B, C…
  const last = await prisma.course.findFirst({ orderBy: { orderIndex: 'desc' } });
  const base = `${data.category}-${data.title}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
  const slug = (await prisma.course.findUnique({ where: { slug: base } })) ? `${base}-${Date.now().toString(36)}` : base;
  const course = await prisma.course.create({ data: { ...data, track, slug, orderIndex: (last?.orderIndex ?? 0) + 1, isPublished: false } });
  res.status(201).json({ course });
});

// DELETE /api/admin/courses/:id — removes the course with its lessons, quizzes, progress and certificates
router.delete('/courses/:id', async (req, res) => {
  await prisma.course.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

// PATCH /api/admin/courses/:id
router.patch('/courses/:id', async (req, res) => {
  const data = z.object({
    title: z.string().trim().min(3, 'Please enter a title.').optional(),
    description: z.string().trim().min(10, 'Please write a short description.').optional(),
    level: z.string().trim().min(2).optional(),
    thumbnailUrl: z.url('Please enter a full image link.').nullable().optional().or(z.literal('')),
    skills: z.array(z.string().trim().min(1)).max(12).optional(),
    isPublished: z.boolean().optional(),
  }).parse(req.body);
  if (data.thumbnailUrl === '') data.thumbnailUrl = null;
  const course = await prisma.course.update({ where: { id: req.params.id }, data });
  res.json({ course });
});

const lessonSchema = z.object({
  title: z.string().trim().min(3, 'Please enter a lesson title.'),
  summary: z.string().trim().max(300).optional().nullable(),
  contentHtml: z.string().max(200000).default(''),
  audioUrl: z.url('Please enter a full audio link.').optional().nullable().or(z.literal('')),
  isPublished: z.boolean().optional(),
});

// POST /api/admin/courses/:id/lessons — add a lesson at the end
router.post('/courses/:id/lessons', async (req, res) => {
  const data = lessonSchema.parse(req.body);
  const last = await prisma.lesson.findFirst({ where: { courseId: req.params.id }, orderBy: { orderIndex: 'desc' } });
  const lesson = await prisma.lesson.create({
    data: { ...data, audioUrl: data.audioUrl || null, courseId: req.params.id, orderIndex: (last?.orderIndex ?? 0) + 1 },
  });
  res.status(201).json({ lesson });
});

// GET /api/admin/lessons/:id — lesson with quizzes
router.get('/lessons/:id', async (req, res) => {
  const lesson = await prisma.lesson.findUnique({
    where: { id: req.params.id },
    include: { quizzes: { orderBy: { orderIndex: 'asc' } }, course: { select: { id: true, title: true } } },
  });
  if (!lesson) throw new HttpError(404, 'We could not find this lesson.');
  res.json({ lesson });
});

// PATCH /api/admin/lessons/:id
router.patch('/lessons/:id', async (req, res) => {
  const data = lessonSchema.partial().parse(req.body);
  if (data.audioUrl === '') data.audioUrl = null;
  const lesson = await prisma.lesson.update({ where: { id: req.params.id }, data });
  res.json({ lesson });
});

// POST /api/admin/lessons/:id/move { direction: 'up' | 'down' }
router.post('/lessons/:id/move', async (req, res) => {
  const { direction } = z.object({ direction: z.enum(['up', 'down']) }).parse(req.body);
  const lesson = await prisma.lesson.findUnique({ where: { id: req.params.id } });
  if (!lesson) throw new HttpError(404, 'We could not find this lesson.');
  const other = await prisma.lesson.findFirst({
    where: { courseId: lesson.courseId, orderIndex: direction === 'up' ? { lt: lesson.orderIndex } : { gt: lesson.orderIndex } },
    orderBy: { orderIndex: direction === 'up' ? 'desc' : 'asc' },
  });
  if (!other) return res.json({ ok: true });
  // Swap through a temporary number because (course, order) must stay unique.
  await prisma.$transaction([
    prisma.lesson.update({ where: { id: lesson.id }, data: { orderIndex: -1 } }),
    prisma.lesson.update({ where: { id: other.id }, data: { orderIndex: lesson.orderIndex } }),
    prisma.lesson.update({ where: { id: lesson.id }, data: { orderIndex: other.orderIndex } }),
  ]);
  res.json({ ok: true });
});

// DELETE /api/admin/lessons/:id — also removes its quizzes and progress records
router.delete('/lessons/:id', async (req, res) => {
  await prisma.lesson.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

// ---------- Quizzes ----------
const quizSchema = z.object({
  question: z.string().trim().min(3, 'Please write the question.'),
  options: z.array(z.string().trim().min(1, 'Answer options cannot be empty.')).min(2, 'Please give at least 2 answer options.').max(6),
  correctAnswer: z.string().trim().min(1, 'Please choose the correct answer.'),
  explanation: z.string().trim().max(1000).optional().nullable(),
}).refine((q) => q.options.includes(q.correctAnswer), { message: 'The correct answer must be one of the options.', path: ['correctAnswer'] });

router.post('/lessons/:id/quizzes', async (req, res) => {
  const data = quizSchema.parse(req.body);
  const count = await prisma.quiz.count({ where: { lessonId: req.params.id } });
  const quiz = await prisma.quiz.create({ data: { ...data, lessonId: req.params.id, orderIndex: count } });
  res.status(201).json({ quiz });
});

router.patch('/quizzes/:id', async (req, res) => {
  const data = quizSchema.parse(req.body);
  const quiz = await prisma.quiz.update({ where: { id: req.params.id }, data });
  res.json({ quiz });
});

router.delete('/quizzes/:id', async (req, res) => {
  await prisma.quiz.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

export default router;
