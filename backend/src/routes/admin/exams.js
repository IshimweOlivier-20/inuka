// Admin: the final exam of a course — settings, questions (add, edit, reorder, paste many), results.
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { HttpError } from '../../middleware/errorHandler.js';
import { correctText, isCorrect, parseQuestions, questionData, questionSchema } from '../../utils/questions.js';

const router = Router();

const settingsSchema = z.object({
  title: z.string().trim().min(3, 'Please give the exam a title.').max(120),
  instructions: z.string().trim().max(4000).optional().nullable(),
  passMark: z.coerce.number().int().min(10, 'The pass mark must be between 10% and 100%.').max(100, 'The pass mark must be between 10% and 100%.'),
  timeLimitMinutes: z.coerce.number().int().min(0).max(600),
  questionCount: z.coerce.number().int().min(0).max(500),
  shuffle: z.boolean(),
  maxAttempts: z.coerce.number().int().min(0).max(50),
  retryAfterHours: z.coerce.number().int().min(0).max(720),
  showAnswers: z.boolean(),
  requiredForCertificate: z.boolean(),
  isPublished: z.boolean(),
}).partial();

async function examOf(courseId) {
  const exam = await prisma.exam.findUnique({ where: { courseId }, include: { questions: { orderBy: { orderIndex: 'asc' } } } });
  if (!exam) throw new HttpError(404, 'This course has no final exam yet.');
  return exam;
}

// GET /api/admin/courses/:id/exam
router.get('/courses/:id/exam', async (req, res) => {
  const course = await prisma.course.findUnique({
    where: { id: req.params.id },
    select: { id: true, title: true, slug: true, isPublished: true, _count: { select: { lessons: true } } },
  });
  if (!course) throw new HttpError(404, 'We could not find this course.');
  const exam = await prisma.exam.findUnique({ where: { courseId: course.id }, include: { questions: { orderBy: { orderIndex: 'asc' } }, _count: { select: { attempts: true } } } });
  res.json({ course, exam });
});

// PUT /api/admin/courses/:id/exam — create the exam, or change its settings
router.put('/courses/:id/exam', async (req, res) => {
  const data = settingsSchema.parse(req.body);
  const course = await prisma.course.findUnique({ where: { id: req.params.id } });
  if (!course) throw new HttpError(404, 'We could not find this course.');
  const current = await prisma.exam.findUnique({ where: { courseId: course.id }, include: { _count: { select: { questions: true } } } });
  if (data.isPublished && !(current?._count.questions > 0)) {
    throw new HttpError(400, 'Add at least one question before you publish the exam.');
  }
  if (data.questionCount && current && data.questionCount > current._count.questions) {
    throw new HttpError(400, `The exam has only ${current._count.questions} questions. Choose ${current._count.questions} or fewer (or 0 for all).`);
  }
  const exam = await prisma.exam.upsert({ where: { courseId: course.id }, update: data, create: { ...data, courseId: course.id } });
  res.json({ exam });
});

// DELETE /api/admin/courses/:id/exam — removes the exam, its questions and every attempt
router.delete('/courses/:id/exam', async (req, res) => {
  await prisma.exam.deleteMany({ where: { courseId: req.params.id } });
  res.json({ ok: true });
});

// ---------- Questions ----------
router.post('/courses/:id/exam/questions', async (req, res) => {
  const q = questionSchema.parse(req.body);
  const exam = await examOf(req.params.id);
  const question = await prisma.examQuestion.create({ data: { ...questionData(q), examId: exam.id, orderIndex: exam.questions.length } });
  res.status(201).json({ question });
});

// POST /api/admin/courses/:id/exam/questions/import { text, preview? }
router.post('/courses/:id/exam/questions/import', async (req, res) => {
  const { text, preview } = z.object({ text: z.string().max(200000), preview: z.boolean().default(false) }).parse(req.body);
  const { questions, errors } = parseQuestions(text);
  if (preview || errors.length) return res.json({ questions, errors, added: 0 });
  const exam = await examOf(req.params.id);
  await prisma.examQuestion.createMany({ data: questions.map((q, i) => ({ ...questionData(q), examId: exam.id, orderIndex: exam.questions.length + i })) });
  res.status(201).json({ questions, errors, added: questions.length });
});

// POST /api/admin/courses/:id/exam/questions/from-quizzes — copy every lesson quiz question into the exam
router.post('/courses/:id/exam/questions/from-quizzes', async (req, res) => {
  const exam = await examOf(req.params.id);
  const quizzes = await prisma.quiz.findMany({ where: { lesson: { courseId: req.params.id } }, orderBy: [{ lesson: { orderIndex: 'asc' } }, { orderIndex: 'asc' }] });
  const have = new Set(exam.questions.map((q) => q.question.trim().toLowerCase()));
  const fresh = quizzes.filter((q) => !have.has(q.question.trim().toLowerCase()));
  await prisma.examQuestion.createMany({
    data: fresh.map((q, i) => ({
      examId: exam.id, type: q.type, question: q.question, options: q.options, imageUrl: q.imageUrl, explanation: q.explanation,
      correctAnswers: Array.isArray(q.correctAnswers) && q.correctAnswers.length ? q.correctAnswers : [q.correctAnswer],
      points: 1, orderIndex: exam.questions.length + i,
    })),
  });
  res.status(201).json({ added: fresh.length, skipped: quizzes.length - fresh.length });
});

router.patch('/exam-questions/:id', async (req, res) => {
  const q = questionSchema.parse(req.body);
  const question = await prisma.examQuestion.update({ where: { id: req.params.id }, data: questionData(q) });
  res.json({ question });
});

router.post('/exam-questions/:id/move', async (req, res) => {
  const { direction } = z.object({ direction: z.enum(['up', 'down']) }).parse(req.body);
  const q = await prisma.examQuestion.findUnique({ where: { id: req.params.id } });
  if (!q) throw new HttpError(404, 'We could not find this question.');
  const list = await prisma.examQuestion.findMany({ where: { examId: q.examId }, orderBy: { orderIndex: 'asc' } });
  const i = list.findIndex((x) => x.id === q.id);
  const j = direction === 'up' ? i - 1 : i + 1;
  if (j < 0 || j >= list.length) return res.json({ ok: true });
  [list[i], list[j]] = [list[j], list[i]];
  await prisma.$transaction(list.map((x, k) => prisma.examQuestion.update({ where: { id: x.id }, data: { orderIndex: k } })));
  res.json({ ok: true });
});

router.delete('/exam-questions/:id', async (req, res) => {
  const q = await prisma.examQuestion.delete({ where: { id: req.params.id } });
  // An exam without questions cannot stay published.
  const left = await prisma.examQuestion.count({ where: { examId: q.examId } });
  if (!left) await prisma.exam.update({ where: { id: q.examId }, data: { isPublished: false } });
  res.json({ ok: true, unpublished: !left });
});

// ---------- Results ----------
// GET /api/admin/courses/:id/exam/results — every submitted attempt, and how students did on each question
router.get('/courses/:id/exam/results', async (req, res) => {
  const exam = await examOf(req.params.id);
  const attempts = await prisma.examAttempt.findMany({
    where: { examId: exam.id }, orderBy: { startedAt: 'desc' }, take: 1000,
    include: { user: { select: { id: true, firstName: true, lastName: true, email: true, countryResidence: true } } },
  });
  const done = attempts.filter((a) => a.submittedAt);
  const byId = new Map(exam.questions.map((q) => [q.id, q]));
  const stats = Object.fromEntries(exam.questions.map((q) => [q.id, { asked: 0, correct: 0 }]));
  for (const a of done) {
    for (const { id } of a.questions) {
      const q = byId.get(id);
      if (!q) continue;
      stats[id].asked += 1;
      if (isCorrect(q, (a.answers || {})[id])) stats[id].correct += 1;
    }
  }
  const students = new Set(done.map((a) => a.userId));
  const passedStudents = new Set(done.filter((a) => a.passed).map((a) => a.userId));
  res.json({
    summary: {
      attempts: done.length, inProgress: attempts.length - done.length, students: students.size, passedStudents: passedStudents.size,
      averageScore: done.length ? Math.round(done.reduce((s, a) => s + a.score, 0) / done.length) : null,
      passRate: students.size ? Math.round((passedStudents.size / students.size) * 100) : null,
    },
    attempts: attempts.map((a) => ({
      id: a.id, user: a.user, score: a.score, passed: a.passed, startedAt: a.startedAt, submittedAt: a.submittedAt,
      minutes: a.submittedAt ? Math.max(1, Math.round((a.submittedAt - a.startedAt) / 60000)) : null,
    })),
    questions: exam.questions.map((q) => ({ id: q.id, question: q.question, type: q.type, correctAnswer: correctText(q), ...stats[q.id] })),
  });
});

// DELETE /api/admin/exam-attempts/:id — removes one attempt (gives the student another try)
router.delete('/exam-attempts/:id', async (req, res) => {
  await prisma.examAttempt.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

export default router;
