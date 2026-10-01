import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { HttpError } from '../../middleware/errorHandler.js';
import { requireAuth } from '../../middleware/auth.js';
import { QUIZ_PASS_MARK } from '../../lib/constants.js';
import { logStudyToday, getStreak } from '../../utils/streakUpdater.js';
import { checkLearningBadges } from '../../utils/badgeChecker.js';
import { notify } from '../../utils/notify.js';

const router = Router();
router.use(requireAuth);

async function completedLessonIds(userId) {
  const rows = await prisma.progress.findMany({ where: { userId, isCompleted: true }, select: { lessonId: true } });
  return new Set(rows.map((r) => r.lessonId));
}

// Level labels (spec 6.2), auto-calculated from quiz scores.
// For each track: the average of the student's best quiz score on every lesson that has a quiz
// (a lesson not tried yet counts as 0). Tracks without any quiz yet fall back to lessons completed.
export function levelLabels(courses, done, bestScoreByLesson = new Map()) {
  const pct = (cat) => {
    const lessons = courses.filter((c) => c.category === cat).flatMap((c) => c.lessons);
    const quizzed = lessons.filter((l) => l._count?.quizzes > 0);
    if (quizzed.length) return Math.round(quizzed.reduce((sum, l) => sum + (bestScoreByLesson.get(l.id) || 0), 0) / quizzed.length);
    return lessons.length ? Math.round((lessons.filter((l) => done.has(l.id)).length / lessons.length) * 100) : 0;
  };
  const eng = pct('english');
  const comp = pct('computer');
  return {
    english: { percent: eng, level: eng >= 60 ? 'Intermediate' : eng >= 25 ? 'Elementary' : 'Beginner' },
    computer: { percent: comp, level: comp >= 60 ? 'Confident' : comp >= 25 ? 'Basic' : 'Starter' },
  };
}

// Best quiz score (0–100) per lesson for one student.
async function bestQuizScores(userId) {
  const rows = await prisma.progress.findMany({ where: { userId, bestScore: { not: null } }, select: { lessonId: true, bestScore: true } });
  return new Map(rows.map((r) => [r.lessonId, r.bestScore]));
}

// GET /api/courses — all published courses with the student's progress
router.get('/courses', async (req, res) => {
  const [courses, done, enrollments] = await Promise.all([
    prisma.course.findMany({
      where: { isPublished: true },
      orderBy: { orderIndex: 'asc' },
      include: { lessons: { where: { isPublished: true }, select: { id: true }, orderBy: { orderIndex: 'asc' } } },
    }),
    completedLessonIds(req.user.id),
    prisma.enrollment.findMany({ where: { userId: req.user.id } }),
  ]);
  const byCourse = Object.fromEntries(enrollments.map((e) => [e.courseId, e]));
  res.json({
    courses: courses.map(({ lessons, ...c }) => {
      const completed = lessons.filter((l) => done.has(l.id)).length;
      const nextLesson = lessons.find((l) => !done.has(l.id));
      const e = byCourse[c.id];
      return {
        ...c,
        lessonCount: lessons.length,
        completedCount: completed,
        percent: lessons.length ? Math.round((completed / lessons.length) * 100) : 0,
        status: !e ? 'not_started' : e.completedAt ? 'completed' : 'in_progress',
        lastActiveAt: e?.lastActiveAt ?? null,
        nextLessonId: nextLesson?.id ?? lessons[0]?.id ?? null,
      };
    }),
  });
});

// GET /api/courses/:slug — course with its lessons, each marked completed/locked
router.get('/courses/:slug', async (req, res) => {
  const course = await prisma.course.findFirst({
    where: { OR: [{ slug: req.params.slug }, { id: req.params.slug }], isPublished: true },
    include: { lessons: { where: { isPublished: true }, orderBy: { orderIndex: 'asc' }, select: { id: true, title: true, summary: true, orderIndex: true } } },
  });
  if (!course) throw new HttpError(404, 'We could not find that course.');
  const progress = await prisma.progress.findMany({ where: { userId: req.user.id, lessonId: { in: course.lessons.map((l) => l.id) } } });
  const map = Object.fromEntries(progress.map((p) => [p.lessonId, p]));
  let prevDone = true;
  const lessons = course.lessons.map((l) => {
    const p = map[l.id];
    const item = { ...l, completed: !!p?.isCompleted, bestScore: p?.bestScore ?? null, locked: !prevDone };
    prevDone = item.completed;
    return item;
  });
  const certificate = await prisma.certificate.findUnique({ where: { userId_courseId: { userId: req.user.id, courseId: course.id } } });
  res.json({ course: { ...course, lessons }, certificate });
});

// GET /api/lessons/:id — lesson content and quiz questions (answers hidden)
router.get('/lessons/:id', async (req, res) => {
  const lesson = await prisma.lesson.findUnique({
    where: { id: req.params.id },
    include: {
      course: { include: { lessons: { where: { isPublished: true }, orderBy: { orderIndex: 'asc' }, select: { id: true, title: true, orderIndex: true } } } },
      quizzes: { orderBy: { orderIndex: 'asc' }, select: { id: true, question: true, options: true } },
    },
  });
  if (!lesson || !lesson.isPublished) throw new HttpError(404, 'We could not find that lesson.');
  const siblings = lesson.course.lessons;
  const idx = siblings.findIndex((l) => l.id === lesson.id);
  const done = await completedLessonIds(req.user.id);
  if (idx > 0 && !done.has(siblings[idx - 1].id)) {
    throw new HttpError(403, 'Finish the lesson before this one to unlock it.', { previousLessonId: siblings[idx - 1].id });
  }

  await prisma.enrollment.upsert({
    where: { userId_courseId: { userId: req.user.id, courseId: lesson.courseId } },
    update: { lastActiveAt: new Date() },
    create: { userId: req.user.id, courseId: lesson.courseId },
  });
  const progress = await prisma.progress.findUnique({ where: { userId_lessonId: { userId: req.user.id, lessonId: lesson.id } } });

  const { course, ...rest } = lesson;
  res.json({
    lesson: rest,
    course: { id: course.id, slug: course.slug, title: course.title, category: course.category, track: course.track },
    position: { index: idx, total: siblings.length, percent: Math.round((siblings.filter((l) => done.has(l.id)).length / siblings.length) * 100) },
    prevLessonId: siblings[idx - 1]?.id ?? null,
    nextLessonId: siblings[idx + 1]?.id ?? null,
    progress: { completed: !!progress?.isCompleted, bestScore: progress?.bestScore ?? null },
    passMark: QUIZ_PASS_MARK,
  });
});

// POST /api/quizzes/:lessonId/attempt — submit all answers for a lesson quiz
router.post('/quizzes/:lessonId/attempt', async (req, res) => {
  const { answers } = z.object({ answers: z.record(z.string(), z.string()) }).parse(req.body);
  const quizzes = await prisma.quiz.findMany({ where: { lessonId: req.params.lessonId }, orderBy: { orderIndex: 'asc' } });
  if (!quizzes.length) throw new HttpError(404, 'This lesson has no quiz.');
  if (quizzes.some((q) => !answers[q.id])) throw new HttpError(400, 'Please answer every question before you submit.');

  const results = quizzes.map((q) => ({
    quizId: q.id, selected: answers[q.id], correct: answers[q.id] === q.correctAnswer,
    correctAnswer: q.correctAnswer, explanation: q.explanation,
  }));
  const score = Math.round((results.filter((r) => r.correct).length / quizzes.length) * 100);

  await prisma.quizAttempt.createMany({
    data: results.map((r) => ({ userId: req.user.id, quizId: r.quizId, selectedAnswer: r.selected, isCorrect: r.correct, score })),
  });
  const existing = await prisma.progress.findUnique({ where: { userId_lessonId: { userId: req.user.id, lessonId: req.params.lessonId } } });
  await prisma.progress.upsert({
    where: { userId_lessonId: { userId: req.user.id, lessonId: req.params.lessonId } },
    update: { bestScore: Math.max(score, existing?.bestScore ?? 0) },
    create: { userId: req.user.id, lessonId: req.params.lessonId, bestScore: score },
  });
  res.json({ score, passed: score >= QUIZ_PASS_MARK, passMark: QUIZ_PASS_MARK, results });
});

// POST /api/progress/complete — mark a lesson complete (quiz must be passed first, if the lesson has one)
router.post('/progress/complete', async (req, res) => {
  const { lessonId, timeSpentSeconds } = z.object({
    lessonId: z.string(), timeSpentSeconds: z.number().int().min(0).max(6 * 3600).default(0),
  }).parse(req.body);
  const userId = req.user.id;
  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId }, include: { _count: { select: { quizzes: true } } } });
  if (!lesson) throw new HttpError(404, 'We could not find that lesson.');

  const existing = await prisma.progress.findUnique({ where: { userId_lessonId: { userId, lessonId } } });
  if (lesson._count.quizzes > 0 && (existing?.bestScore ?? 0) < QUIZ_PASS_MARK) {
    throw new HttpError(400, `Score at least ${QUIZ_PASS_MARK}% on the quiz to complete this lesson.`);
  }
  const firstTime = !existing?.isCompleted;
  await prisma.progress.upsert({
    where: { userId_lessonId: { userId, lessonId } },
    update: { isCompleted: true, completedAt: existing?.completedAt ?? new Date(), timeSpentSeconds: { increment: timeSpentSeconds } },
    create: { userId, lessonId, isCompleted: true, completedAt: new Date(), timeSpentSeconds },
  });

  let certificate = null;
  if (firstTime) {
    await logStudyToday(userId);
    const lessons = await prisma.lesson.findMany({ where: { courseId: lesson.courseId, isPublished: true }, select: { id: true } });
    const done = await completedLessonIds(userId);
    const completed = lessons.filter((l) => done.has(l.id)).length;
    const percent = Math.round((completed / lessons.length) * 100);
    const course = await prisma.course.findUnique({ where: { id: lesson.courseId } });
    await prisma.enrollment.upsert({
      where: { userId_courseId: { userId, courseId: lesson.courseId } },
      update: { completionPercentage: percent, lastActiveAt: new Date(), ...(percent === 100 && { completedAt: new Date() }) },
      create: { userId, courseId: lesson.courseId, completionPercentage: percent, ...(percent === 100 && { completedAt: new Date() }) },
    });
    if (percent === 100) {
      certificate = await prisma.certificate.upsert({
        where: { userId_courseId: { userId, courseId: course.id } },
        update: {},
        create: { userId, courseId: course.id },
      });
      await notify(userId, 'course_completed', `Congratulations! You completed ${course.title}. Download your certificate!`, '/my-learning');
    }
  }
  const newBadges = firstTime ? await checkLearningBadges(userId) : [];
  res.json({ ok: true, newBadges, certificate });
});

router.get('/streak', async (req, res) => res.json(await getStreak(req.user.id)));

router.get('/badges', async (req, res) => {
  const [badges, mine] = await Promise.all([
    prisma.badge.findMany(),
    prisma.userBadge.findMany({ where: { userId: req.user.id } }),
  ]);
  const earned = Object.fromEntries(mine.map((b) => [b.badgeId, b.earnedAt]));
  res.json({ badges: badges.map((b) => ({ ...b, earnedAt: earned[b.id] ?? null })) });
});

router.get('/certificates', async (req, res) => {
  const certificates = await prisma.certificate.findMany({
    where: { userId: req.user.id }, include: { course: { select: { title: true, category: true, slug: true } } }, orderBy: { issuedAt: 'desc' },
  });
  res.json({ certificates });
});

// GET /api/dashboard — everything the dashboard needs in one request (fewer round-trips on slow networks)
router.get('/dashboard', async (req, res) => {
  const userId = req.user.id;
  const now = new Date();
  const [courses, done, lastEnrollment, savedCount, appliedCount, nextSaved, streak, latestBadge, bestScores, nextSession] = await Promise.all([
    prisma.course.findMany({
      where: { isPublished: true }, orderBy: { orderIndex: 'asc' },
      include: { lessons: { where: { isPublished: true }, select: { id: true, title: true, _count: { select: { quizzes: true } } }, orderBy: { orderIndex: 'asc' } } },
    }),
    completedLessonIds(userId),
    prisma.enrollment.findFirst({ where: { userId, completedAt: null }, orderBy: { lastActiveAt: 'desc' }, include: { course: true } }),
    prisma.savedScholarship.count({ where: { userId } }),
    prisma.application.count({ where: { userId, status: { in: ['submitted', 'awaiting_response', 'accepted', 'rejected'] } } }),
    prisma.savedScholarship.findFirst({
      where: { userId, scholarship: { deadline: { gte: now } } },
      orderBy: { scholarship: { deadline: 'asc' } },
      include: { scholarship: { select: { id: true, slug: true, name: true, deadline: true } } },
    }),
    getStreak(userId),
    prisma.userBadge.findFirst({ where: { userId }, orderBy: { earnedAt: 'desc' }, include: { badge: true } }),
    bestQuizScores(userId),
    // Next confirmed mentor session (spec 6.2). Sessions last 1 hour, so one that started less than an hour ago still shows.
    prisma.booking.findFirst({
      where: { studentId: userId, status: 'confirmed', scheduledAt: { gte: new Date(now - 60 * 60 * 1000) } },
      orderBy: { scheduledAt: 'asc' },
      select: {
        id: true, topic: true, scheduledAt: true, videoLink: true,
        mentor: { select: { title: true, user: { select: { firstName: true, lastName: true, profilePhotoUrl: true } } } },
      },
    }),
  ]);

  const allLessons = courses.flatMap((c) => c.lessons);
  let continueLearning = null;
  if (lastEnrollment) {
    const c = courses.find((x) => x.id === lastEnrollment.courseId);
    const next = c.lessons.find((l) => !done.has(l.id));
    if (next) {
      continueLearning = {
        courseSlug: c.slug, courseTitle: c.title, category: c.category, track: c.track, thumbnailUrl: c.thumbnailUrl,
        lessonId: next.id, lessonTitle: next.title,
        percent: Math.round((c.lessons.filter((l) => done.has(l.id)).length / c.lessons.length) * 100),
      };
    }
  }

  res.json({
    overall: { completed: done.size, total: allLessons.length, percent: allLessons.length ? Math.round((done.size / allLessons.length) * 100) : 0 },
    levels: levelLabels(courses, done, bestScores),
    continueLearning,
    scholarships: {
      saved: savedCount,
      applied: appliedCount,
      nextDeadline: nextSaved && {
        ...nextSaved.scholarship,
        daysLeft: Math.ceil((new Date(nextSaved.scholarship.deadline) - now) / 864e5),
      },
    },
    streak: { current: streak.current, atRisk: streak.atRisk, studiedToday: streak.studiedToday },
    latestBadge: latestBadge && { ...latestBadge.badge, earnedAt: latestBadge.earnedAt },
    nextSession: nextSession && {
      id: nextSession.id, topic: nextSession.topic, scheduledAt: nextSession.scheduledAt, videoLink: nextSession.videoLink,
      mentor: { ...nextSession.mentor.user, title: nextSession.mentor.title },
    },
  });
});

export default router;
