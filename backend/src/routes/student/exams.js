// Final course exams for students: see the rules, start (timed), save answers as you go, submit, see the result.
// The exam opens when every lesson of the course is completed. Passing it (if the admin made it required)
// is what issues the course certificate.
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { HttpError } from '../../middleware/errorHandler.js';
import { requireAuth } from '../../middleware/auth.js';
import { activeExam, checkCertificate, lessonsState } from '../../services/certificates.js';
import { correctText, isCorrect, optionsOf, publicQuestion, shuffled } from '../../utils/questions.js';
import { notify } from '../../utils/notify.js';

const router = Router();
const GRACE_MS = 60 * 1000; // slow connections: a submit up to 1 minute after the time is up still counts
const answerValue = z.union([z.string().max(2000), z.array(z.string().max(500)).max(10)]);
const answersSchema = z.record(z.string(), answerValue);

const examPublic = (exam, totalQuestions) => ({
  id: exam.id, title: exam.title, instructions: exam.instructions, passMark: exam.passMark,
  timeLimitMinutes: exam.timeLimitMinutes, maxAttempts: exam.maxAttempts, retryAfterHours: exam.retryAfterHours,
  showAnswers: exam.showAnswers, requiredForCertificate: exam.requiredForCertificate,
  questionCount: exam.questionCount > 0 ? Math.min(exam.questionCount, totalQuestions) : totalQuestions,
});

// Grades an attempt with the answers given and saves the result.
async function grade(attempt, answers) {
  const ids = attempt.questions.map((q) => q.id);
  const rows = await prisma.examQuestion.findMany({ where: { id: { in: ids } } });
  const byId = new Map(rows.map((q) => [q.id, q]));
  let earned = 0; let total = 0;
  for (const { id } of attempt.questions) {
    const q = byId.get(id);
    if (!q) continue; // question deleted by an admin after the attempt started
    total += q.points;
    if (isCorrect(q, answers[id])) earned += q.points;
  }
  const exam = await prisma.exam.findUnique({ where: { id: attempt.examId } });
  const score = total ? Math.round((earned / total) * 100) : 0;
  const passed = score >= exam.passMark;
  // Only grade once, even if two submits arrive together.
  const { count } = await prisma.examAttempt.updateMany({
    where: { id: attempt.id, submittedAt: null },
    data: { answers, score, passed, submittedAt: new Date() },
  });
  if (count && passed) {
    const { created } = await checkCertificate(attempt.userId, exam.courseId);
    if (!created) {
      const course = await prisma.course.findUnique({ where: { id: exam.courseId }, select: { title: true, slug: true } });
      await notify(attempt.userId, 'exam_passed', `You passed the final exam of ${course.title} with ${score}%.`, `/courses/${course.slug}`, { email: false });
    }
  }
  return prisma.examAttempt.findUnique({ where: { id: attempt.id } });
}

// Attempts whose time ran out without a submit are graded with the answers saved so far.
async function finishExpired(userId, examId) {
  const late = await prisma.examAttempt.findMany({
    where: { userId, examId, submittedAt: null, expiresAt: { lt: new Date(Date.now() - GRACE_MS) } },
  });
  for (const a of late) await grade(a, a.answers || {});
}

// Everything the course page and the exam page need to know.
export async function examStatus(userId, course) {
  const exam = await activeExam(course.id);
  if (!exam) return null;
  await finishExpired(userId, exam.id);
  const [lessons, attempts, certificate] = await Promise.all([
    lessonsState(userId, course.id),
    prisma.examAttempt.findMany({ where: { userId, examId: exam.id }, orderBy: { startedAt: 'desc' }, select: { id: true, score: true, passed: true, startedAt: true, submittedAt: true, expiresAt: true } }),
    prisma.certificate.findUnique({ where: { userId_courseId: { userId, courseId: course.id } } }),
  ]);
  const submitted = attempts.filter((a) => a.submittedAt);
  const inProgress = attempts.find((a) => !a.submittedAt) || null;
  const passed = submitted.some((a) => a.passed);
  const bestScore = submitted.length ? Math.max(...submitted.map((a) => a.score)) : null;
  const attemptsLeft = exam.maxAttempts > 0 ? Math.max(0, exam.maxAttempts - submitted.length) : null;
  const lastFail = submitted.find((a) => !a.passed);
  const waitUntil = !passed && lastFail && exam.retryAfterHours > 0 && submitted[0]?.id === lastFail.id
    ? new Date(lastFail.submittedAt.getTime() + exam.retryAfterHours * 3600e3) : null;
  let reason = null;
  if (!lessons.allDone) reason = 'lessons';
  else if (passed) reason = 'passed';
  else if (attemptsLeft === 0) reason = 'no_attempts';
  else if (waitUntil && waitUntil > new Date()) reason = 'wait';
  return {
    exam: examPublic(exam, exam._count.questions),
    lessons, attempts: submitted, inProgress: inProgress && { id: inProgress.id, expiresAt: inProgress.expiresAt },
    passed, bestScore, attemptsLeft, nextTryAt: reason === 'wait' ? waitUntil : null,
    canStart: !inProgress && !reason, reason, certificate,
  };
}

async function ownAttempt(req) {
  const attempt = await prisma.examAttempt.findUnique({ where: { id: req.params.id }, include: { exam: { include: { course: { select: { id: true, slug: true, title: true } } } } } });
  if (!attempt || attempt.userId !== req.user.id) throw new HttpError(404, 'We could not find this exam attempt.');
  return attempt;
}

// What the student sees for an attempt: questions (answers hidden while running), or the result after submitting.
async function attemptView(attempt) {
  const exam = attempt.exam;
  const rows = await prisma.examQuestion.findMany({ where: { id: { in: attempt.questions.map((q) => q.id) } } });
  const byId = new Map(rows.map((q) => [q.id, q]));
  const list = attempt.questions.filter((q) => byId.has(q.id)).map(({ id, options }) => ({ q: byId.get(id), options }));
  const base = {
    id: attempt.id, startedAt: attempt.startedAt, expiresAt: attempt.expiresAt, submittedAt: attempt.submittedAt,
    exam: { id: exam.id, title: exam.title, instructions: exam.instructions, passMark: exam.passMark, timeLimitMinutes: exam.timeLimitMinutes, showAnswers: exam.showAnswers },
    course: exam.course, serverTime: new Date(),
  };
  if (!attempt.submittedAt) {
    return { ...base, answers: attempt.answers || {}, questions: list.map(({ q, options }) => publicQuestion(q, options)) };
  }
  const answers = attempt.answers || {};
  const results = list.map(({ q, options }) => ({
    ...publicQuestion(q, options), answer: answers[q.id] ?? null, correct: isCorrect(q, answers[q.id]),
    ...(exam.showAnswers && { correctAnswer: correctText(q), correctAnswers: q.type === 'short' ? [] : q.correctAnswers, explanation: q.explanation }),
  }));
  const certificate = attempt.passed
    ? await prisma.certificate.findUnique({ where: { userId_courseId: { userId: attempt.userId, courseId: exam.courseId } } }) : null;
  return {
    ...base, score: attempt.score, passed: attempt.passed,
    correctCount: results.filter((r) => r.correct).length, total: results.length,
    // Without "show answers", students only see which questions they got right.
    results: exam.showAnswers ? results : results.map(({ id, type, question, imageUrl, options, points, answer, correct }) => ({ id, type, question, imageUrl, options, points, answer, correct })),
    certificate,
  };
}

// GET /api/courses/:slug/exam
router.get('/courses/:slug/exam', requireAuth, async (req, res) => {
  const course = await prisma.course.findFirst({ where: { OR: [{ slug: req.params.slug }, { id: req.params.slug }], isPublished: true }, select: { id: true, slug: true, title: true } });
  if (!course) throw new HttpError(404, 'We could not find that course.');
  const status = await examStatus(req.user.id, course);
  if (!status) throw new HttpError(404, 'This course has no final exam.');
  res.json({ course, ...status });
});

// POST /api/courses/:slug/exam/start — starts a new attempt (or returns the one already running)
router.post('/courses/:slug/exam/start', requireAuth, async (req, res) => {
  const course = await prisma.course.findFirst({ where: { OR: [{ slug: req.params.slug }, { id: req.params.slug }], isPublished: true }, select: { id: true, slug: true, title: true } });
  if (!course) throw new HttpError(404, 'We could not find that course.');
  const status = await examStatus(req.user.id, course);
  if (!status) throw new HttpError(404, 'This course has no final exam.');
  if (status.inProgress) return res.json({ attemptId: status.inProgress.id, resumed: true });
  const messages = {
    lessons: 'Finish every lesson of this course first. Then the final exam opens.',
    passed: 'You already passed this exam.',
    no_attempts: 'You have used all your tries for this exam. Please contact INUKA if you need another try.',
    wait: `You can try again after ${status.nextTryAt?.toUTCString()}. Use the time to review the lessons.`,
  };
  if (!status.canStart) throw new HttpError(400, messages[status.reason] || 'You cannot start this exam now.');

  const exam = await prisma.exam.findUnique({ where: { id: status.exam.id }, include: { questions: { orderBy: { orderIndex: 'asc' } } } });
  let questions = exam.shuffle ? shuffled(exam.questions) : exam.questions;
  if (exam.questionCount > 0 && exam.questionCount < questions.length) {
    questions = (exam.shuffle ? questions : shuffled(questions)).slice(0, exam.questionCount);
    if (!exam.shuffle) questions.sort((a, b) => a.orderIndex - b.orderIndex);
  }
  const set = questions.map((q) => ({ id: q.id, options: exam.shuffle && q.type !== 'true_false' ? shuffled(optionsOf(q)) : optionsOf(q) }));
  const attempt = await prisma.examAttempt.create({
    data: {
      userId: req.user.id, examId: exam.id, questions: set,
      expiresAt: exam.timeLimitMinutes > 0 ? new Date(Date.now() + exam.timeLimitMinutes * 60e3) : null,
    },
  });
  res.status(201).json({ attemptId: attempt.id, resumed: false });
});

// GET /api/exam-attempts/:id — resume a running attempt, or see the result
router.get('/exam-attempts/:id', requireAuth, async (req, res) => {
  let attempt = await ownAttempt(req);
  if (!attempt.submittedAt && attempt.expiresAt && attempt.expiresAt.getTime() + GRACE_MS < Date.now()) {
    await grade(attempt, attempt.answers || {});
    attempt = await ownAttempt(req);
  }
  res.json({ attempt: await attemptView(attempt) });
});

// PUT /api/exam-attempts/:id/answers { answers } — saved as the student goes (so a lost connection loses nothing)
router.put('/exam-attempts/:id/answers', requireAuth, async (req, res) => {
  const { answers } = z.object({ answers: answersSchema }).parse(req.body);
  const attempt = await ownAttempt(req);
  if (attempt.submittedAt) throw new HttpError(400, 'This exam is already submitted.');
  if (attempt.expiresAt && attempt.expiresAt.getTime() + GRACE_MS < Date.now()) throw new HttpError(400, 'The time for this exam is up.');
  const allowed = new Set(attempt.questions.map((q) => q.id));
  const clean = Object.fromEntries(Object.entries(answers).filter(([k]) => allowed.has(k)));
  await prisma.examAttempt.update({ where: { id: attempt.id }, data: { answers: clean } });
  res.json({ ok: true, savedAt: new Date() });
});

// POST /api/exam-attempts/:id/submit { answers }
router.post('/exam-attempts/:id/submit', requireAuth, async (req, res) => {
  const { answers } = z.object({ answers: answersSchema.default({}) }).parse(req.body);
  let attempt = await ownAttempt(req);
  if (!attempt.submittedAt) {
    const late = attempt.expiresAt && attempt.expiresAt.getTime() + GRACE_MS < Date.now();
    const allowed = new Set(attempt.questions.map((q) => q.id));
    const given = Object.fromEntries(Object.entries(answers).filter(([k]) => allowed.has(k)));
    // After the time is up, only the answers saved in time count.
    await grade(attempt, late ? (attempt.answers || {}) : { ...(attempt.answers || {}), ...given });
    attempt = await ownAttempt(req);
  }
  res.json({ attempt: await attemptView(attempt) });
});

export default router;
