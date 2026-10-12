// Admin: course, lesson and quiz management (spec 16.2 — update content without code changes).
import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { activityFor } from '../../services/lessonAi.js';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { HttpError } from '../../middleware/errorHandler.js';
import { COURSE_FILE_TYPES, courseFileUpload } from '../../middleware/upload.js';
import { saveCourseFile } from '../../services/storageService.js';
import { QUIZ_PASS_MARK } from '../../lib/constants.js';
import { correctOf, isCorrect, parseQuestions, questionData, questionSchema } from '../../utils/questions.js';

const router = Router();
const htmlText = (v) => v.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
const slugify = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
async function uniqueSlug(base) {
  return (await prisma.course.findUnique({ where: { slug: base } })) ? `${base}-${Date.now().toString(36)}` : base;
}
async function nextTrack(category) {
  const same = await prisma.course.findMany({ where: { category }, select: { track: true } });
  const letters = same.map((c) => c.track.charCodeAt(0)).filter((n) => n >= 65 && n <= 90);
  return String.fromCharCode(letters.length ? Math.max(...letters) + 1 : 65); // next letter: A, B, C…
}

// ---------- Files (lesson audio, worksheets, images for questions or thumbnails) ----------
// POST /api/admin/files (multipart "file") → { url, name, type }
router.post('/files', courseFileUpload.single('file'), async (req, res) => {
  if (!req.file) throw new HttpError(400, 'Please choose a file.');
  const ext = COURSE_FILE_TYPES[req.file.mimetype];
  const url = await saveCourseFile(req.file, ext);
  res.status(201).json({ url, name: req.file.originalname, type: req.file.mimetype, size: req.file.size });
});

// ---------- Courses ----------
// GET /api/admin/courses — all courses with lesson and student counts
router.get('/courses', async (req, res) => {
  const courses = await prisma.course.findMany({
    orderBy: { orderIndex: 'asc' },
    include: { _count: { select: { lessons: true, enrollments: true, certificates: true } }, exam: { select: { isPublished: true, _count: { select: { questions: true } } } } },
  });
  res.json({ courses });
});

// GET /api/admin/courses/:id — course with its lessons (and quiz counts) and exam summary
router.get('/courses/:id', async (req, res) => {
  const course = await prisma.course.findUnique({
    where: { id: req.params.id },
    include: {
      lessons: { orderBy: { orderIndex: 'asc' }, select: { id: true, title: true, summary: true, orderIndex: true, isPublished: true, estimatedMinutes: true, aiActivity: true, _count: { select: { quizzes: true, progress: true } } } },
      exam: { select: { id: true, isPublished: true, passMark: true, timeLimitMinutes: true, requiredForCertificate: true, _count: { select: { questions: true, attempts: true } } } },
    },
  });
  if (!course) throw new HttpError(404, 'We could not find this course.');
  res.json({ course });
});

const courseFields = {
  title: z.string().trim().min(3, 'Please enter a title.'),
  category: z.enum(['english', 'computer'], { error: 'Please choose English or Computer skills.' }),
  level: z.string().trim().min(2, 'Please enter the level, e.g. Beginner.'),
  description: z.string().trim().max(20000).refine((v) => htmlText(v).length >= 10, 'Please write a short description.'),
  skills: z.array(z.string().trim().min(1)).max(12),
  thumbnailUrl: z.string().trim().max(500).nullable().or(z.literal('')),
  track: z.string().trim().regex(/^[A-Z]$/, 'The course letter must be one capital letter (A–Z).'),
  isPublished: z.boolean(),
};

// POST /api/admin/courses — a new course (hidden until it has lessons and you publish it)
router.post('/courses', async (req, res) => {
  const data = z.object({
    title: courseFields.title, category: courseFields.category, level: courseFields.level,
    description: courseFields.description, skills: courseFields.skills.default([]),
  }).parse(req.body);
  const last = await prisma.course.findFirst({ orderBy: { orderIndex: 'desc' } });
  const course = await prisma.course.create({
    data: { ...data, track: await nextTrack(data.category), slug: await uniqueSlug(slugify(`${data.category}-${data.title}`)), orderIndex: (last?.orderIndex ?? 0) + 1, isPublished: false },
  });
  res.status(201).json({ course });
});

// DELETE /api/admin/courses/:id — removes the course with its lessons, quizzes, exam, progress and certificates
router.delete('/courses/:id', async (req, res) => {
  await prisma.course.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

// PATCH /api/admin/courses/:id — any course detail, incl. subject and course letter
router.patch('/courses/:id', async (req, res) => {
  const data = z.object(Object.fromEntries(Object.entries(courseFields).map(([k, v]) => [k, v.optional()]))).parse(req.body);
  if (data.thumbnailUrl === '') data.thumbnailUrl = null;
  if (data.thumbnailUrl && !/^(https?:\/\/|\/api\/public\/)/.test(data.thumbnailUrl)) throw new HttpError(400, 'Please upload an image or enter a full image link.');
  const course = await prisma.course.update({ where: { id: req.params.id }, data });
  res.json({ course });
});

// POST /api/admin/courses/:id/move { direction } — order of courses on the website
router.post('/courses/:id/move', async (req, res) => {
  const { direction } = z.object({ direction: z.enum(['up', 'down']) }).parse(req.body);
  const course = await prisma.course.findUnique({ where: { id: req.params.id } });
  if (!course) throw new HttpError(404, 'We could not find this course.');
  const other = await prisma.course.findFirst({
    where: { orderIndex: direction === 'up' ? { lt: course.orderIndex } : { gt: course.orderIndex } },
    orderBy: { orderIndex: direction === 'up' ? 'desc' : 'asc' },
  });
  if (other) {
    await prisma.$transaction([
      prisma.course.update({ where: { id: course.id }, data: { orderIndex: other.orderIndex } }),
      prisma.course.update({ where: { id: other.id }, data: { orderIndex: course.orderIndex } }),
    ]);
  }
  res.json({ ok: true });
});

// POST /api/admin/courses/:id/duplicate — a hidden copy with all lessons, quiz questions and the exam
router.post('/courses/:id/duplicate', async (req, res) => {
  const src = await prisma.course.findUnique({
    where: { id: req.params.id },
    include: { lessons: { orderBy: { orderIndex: 'asc' }, include: { quizzes: { orderBy: { orderIndex: 'asc' } } } }, exam: { include: { questions: { orderBy: { orderIndex: 'asc' } } } } },
  });
  if (!src) throw new HttpError(404, 'We could not find this course.');
  const last = await prisma.course.findFirst({ orderBy: { orderIndex: 'desc' } });
  const title = `${src.title} (copy)`;
  const copy = await prisma.course.create({
    data: {
      title, category: src.category, level: src.level, description: src.description, skills: src.skills, thumbnailUrl: src.thumbnailUrl,
      track: await nextTrack(src.category), slug: await uniqueSlug(slugify(`${src.category}-${title}`)), orderIndex: (last?.orderIndex ?? 0) + 1, isPublished: false,
      lessons: {
        create: src.lessons.map((l) => ({
          title: l.title, summary: l.summary, contentHtml: l.contentHtml, audioUrl: l.audioUrl, orderIndex: l.orderIndex, isPublished: l.isPublished,
          estimatedMinutes: l.estimatedMinutes, passMark: l.passMark, aiActivity: l.aiActivity ?? Prisma.DbNull, resources: l.resources,
          quizzes: { create: l.quizzes.map(({ id, lessonId, ...q }) => q) },
        })),
      },
      ...(src.exam && {
        exam: {
          create: {
            title: src.exam.title, instructions: src.exam.instructions, passMark: src.exam.passMark, timeLimitMinutes: src.exam.timeLimitMinutes,
            questionCount: src.exam.questionCount, shuffle: src.exam.shuffle, maxAttempts: src.exam.maxAttempts, retryAfterHours: src.exam.retryAfterHours,
            showAnswers: src.exam.showAnswers, requiredForCertificate: src.exam.requiredForCertificate, isPublished: false,
            questions: { create: src.exam.questions.map(({ id, examId, ...q }) => q) },
          },
        },
      }),
    },
  });
  res.status(201).json({ course: copy });
});

// GET /api/admin/courses/:id/stats — how students are doing: per lesson completion and quiz scores, exam results
router.get('/courses/:id/stats', async (req, res) => {
  const course = await prisma.course.findUnique({
    where: { id: req.params.id },
    include: { lessons: { orderBy: { orderIndex: 'asc' }, select: { id: true, title: true, isPublished: true } }, exam: { select: { id: true, passMark: true } } },
  });
  if (!course) throw new HttpError(404, 'We could not find this course.');
  const ids = course.lessons.map((l) => l.id);
  const [enrolled, completed, certificates, progress, examAttempts] = await Promise.all([
    prisma.enrollment.count({ where: { courseId: course.id } }),
    prisma.enrollment.count({ where: { courseId: course.id, completedAt: { not: null } } }),
    prisma.certificate.count({ where: { courseId: course.id } }),
    prisma.progress.findMany({ where: { lessonId: { in: ids } }, select: { lessonId: true, isCompleted: true, bestScore: true } }),
    course.exam ? prisma.examAttempt.findMany({ where: { examId: course.exam.id, submittedAt: { not: null } }, select: { userId: true, score: true, passed: true } }) : [],
  ]);
  const lessons = course.lessons.map((l) => {
    const rows = progress.filter((p) => p.lessonId === l.id);
    const scores = rows.map((p) => p.bestScore).filter((s) => s != null);
    return {
      id: l.id, title: l.title, isPublished: l.isPublished, completed: rows.filter((p) => p.isCompleted).length,
      averageQuizScore: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null,
    };
  });
  const examStudents = new Set(examAttempts.map((a) => a.userId));
  res.json({
    enrolled, completed, certificates, lessons,
    exam: course.exam ? {
      attempts: examAttempts.length, students: examStudents.size,
      passedStudents: new Set(examAttempts.filter((a) => a.passed).map((a) => a.userId)).size,
      averageScore: examAttempts.length ? Math.round(examAttempts.reduce((a, b) => a + b.score, 0) / examAttempts.length) : null,
    } : null,
  });
});

// ---------- Lessons ----------
const resource = z.object({ name: z.string().trim().min(1).max(120), url: z.string().trim().regex(/^(https?:\/\/|\/api\/public\/)/, 'Please upload the file or enter a full link.') });
// aiActivity: null = use INUKA's built-in activity for this lesson (if any); { type: 'none' } = no AI activity.
const aiActivity = z.union([z.object({ type: z.literal('none') }), z.object({
  type: z.enum(['writing', 'voice']),
  kind: z.enum(['paragraph', 'essay', 'statement', 'introduce']).default('paragraph'),
  task: z.string().trim().min(10, 'Please write the task for students (at least 10 characters).').max(1500),
  minWords: z.coerce.number().int().min(10).max(3000).optional(),
  maxWords: z.coerce.number().int().min(20).max(5000).optional(),
})]).nullable();
const lessonSchema = z.object({
  title: z.string().trim().min(3, 'Please enter a lesson title.'),
  summary: z.string().trim().max(8000).optional().nullable(),
  contentHtml: z.string().max(200000).default(''),
  audioUrl: z.string().trim().max(500).optional().nullable().or(z.literal('')),
  isPublished: z.boolean().optional(),
  estimatedMinutes: z.coerce.number().int().min(1).max(600).nullable().optional(),
  passMark: z.coerce.number().int().min(10).max(100).nullable().optional(),
  aiActivity: aiActivity.optional(),
  resources: z.array(resource).max(20).optional(),
});
const cleanLesson = (d) => {
  if (d.audioUrl === '') d.audioUrl = null;
  if (d.audioUrl && !/^(https?:\/\/|\/api\/public\/)/.test(d.audioUrl)) throw new HttpError(400, 'Please upload the audio or enter a full link.');
  if (d.aiActivity?.type === 'writing' && d.aiActivity.minWords && d.aiActivity.maxWords && d.aiActivity.minWords > d.aiActivity.maxWords) throw new HttpError(400, 'The smallest number of words must be lower than the largest.');
  if (d.aiActivity === null) d.aiActivity = Prisma.DbNull; // a JSON column is cleared with DbNull, not null
  return d;
};

// POST /api/admin/courses/:id/lessons — add a lesson at the end
router.post('/courses/:id/lessons', async (req, res) => {
  const data = cleanLesson(lessonSchema.parse(req.body));
  const last = await prisma.lesson.findFirst({ where: { courseId: req.params.id }, orderBy: { orderIndex: 'desc' } });
  const lesson = await prisma.lesson.create({
    data: { ...data, aiActivity: data.aiActivity === Prisma.DbNull ? undefined : data.aiActivity, courseId: req.params.id, orderIndex: (last?.orderIndex ?? 0) + 1 },
  });
  res.status(201).json({ lesson });
});

// GET /api/admin/lessons/:id — lesson with quizzes, and how students answered each question
router.get('/lessons/:id', async (req, res) => {
  const lesson = await prisma.lesson.findUnique({
    where: { id: req.params.id },
    include: { quizzes: { orderBy: { orderIndex: 'asc' } }, course: { select: { id: true, title: true, slug: true } } },
  });
  if (!lesson) throw new HttpError(404, 'We could not find this lesson.');
  const attempts = await prisma.quizAttempt.groupBy({ by: ['quizId', 'isCorrect'], where: { quizId: { in: lesson.quizzes.map((q) => q.id) } }, _count: { _all: true } });
  const stats = {};
  for (const a of attempts) {
    stats[a.quizId] ||= { answers: 0, correct: 0 };
    stats[a.quizId].answers += a._count._all;
    if (a.isCorrect) stats[a.quizId].correct += a._count._all;
  }
  res.json({
    lesson: { ...lesson, quizzes: lesson.quizzes.map((q) => ({ ...q, correctAnswers: correctOf(q), stats: stats[q.id] || { answers: 0, correct: 0 } })) },
    defaultPassMark: QUIZ_PASS_MARK,
    builtInActivity: activityFor(lesson.course.slug, lesson.title, null), // INUKA's default activity, used when aiActivity is empty
  });
});

// PATCH /api/admin/lessons/:id
router.patch('/lessons/:id', async (req, res) => {
  const data = cleanLesson(lessonSchema.partial().parse(req.body));
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

// POST /api/admin/lessons/:id/duplicate — a hidden copy at the end of the same course
router.post('/lessons/:id/duplicate', async (req, res) => {
  const src = await prisma.lesson.findUnique({ where: { id: req.params.id }, include: { quizzes: { orderBy: { orderIndex: 'asc' } } } });
  if (!src) throw new HttpError(404, 'We could not find this lesson.');
  const last = await prisma.lesson.findFirst({ where: { courseId: src.courseId }, orderBy: { orderIndex: 'desc' } });
  const lesson = await prisma.lesson.create({
    data: {
      courseId: src.courseId, title: `${src.title} (copy)`, summary: src.summary, contentHtml: src.contentHtml, audioUrl: src.audioUrl,
      orderIndex: (last?.orderIndex ?? 0) + 1, isPublished: false, estimatedMinutes: src.estimatedMinutes, passMark: src.passMark,
      aiActivity: src.aiActivity ?? Prisma.DbNull, resources: src.resources,
      quizzes: { create: src.quizzes.map(({ id, lessonId, ...q }) => q) },
    },
  });
  res.status(201).json({ lesson });
});

// DELETE /api/admin/lessons/:id — also removes its quizzes and progress records
router.delete('/lessons/:id', async (req, res) => {
  await prisma.lesson.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

// ---------- Lesson quiz questions ----------
router.post('/lessons/:id/quizzes', async (req, res) => {
  const q = questionSchema.parse(req.body);
  const count = await prisma.quiz.count({ where: { lessonId: req.params.id } });
  const quiz = await prisma.quiz.create({ data: { ...questionData(q, { forQuiz: true }), lessonId: req.params.id, orderIndex: count } });
  res.status(201).json({ quiz });
});

// POST /api/admin/lessons/:id/quizzes/import { text, preview? } — paste many questions at once
router.post('/lessons/:id/quizzes/import', async (req, res) => {
  const { text, preview } = z.object({ text: z.string().max(100000), preview: z.boolean().default(false) }).parse(req.body);
  const { questions, errors } = parseQuestions(text);
  if (preview || errors.length) return res.json({ questions, errors, added: 0 });
  const count = await prisma.quiz.count({ where: { lessonId: req.params.id } });
  await prisma.quiz.createMany({ data: questions.map((q, i) => ({ ...questionData(q, { forQuiz: true }), lessonId: req.params.id, orderIndex: count + i })) });
  res.status(201).json({ questions, errors, added: questions.length });
});

router.patch('/quizzes/:id', async (req, res) => {
  const q = questionSchema.parse(req.body);
  const quiz = await prisma.quiz.update({ where: { id: req.params.id }, data: questionData(q, { forQuiz: true }) });
  res.json({ quiz });
});

// POST /api/admin/quizzes/:id/move { direction }
router.post('/quizzes/:id/move', async (req, res) => {
  const { direction } = z.object({ direction: z.enum(['up', 'down']) }).parse(req.body);
  const quiz = await prisma.quiz.findUnique({ where: { id: req.params.id } });
  if (!quiz) throw new HttpError(404, 'We could not find this question.');
  const list = await prisma.quiz.findMany({ where: { lessonId: quiz.lessonId }, orderBy: { orderIndex: 'asc' } });
  const i = list.findIndex((q) => q.id === quiz.id);
  const j = direction === 'up' ? i - 1 : i + 1;
  if (j < 0 || j >= list.length) return res.json({ ok: true });
  [list[i], list[j]] = [list[j], list[i]];
  await prisma.$transaction(list.map((q, k) => prisma.quiz.update({ where: { id: q.id }, data: { orderIndex: k } })));
  res.json({ ok: true });
});

router.delete('/quizzes/:id', async (req, res) => {
  await prisma.quiz.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

export { isCorrect };
export default router;
