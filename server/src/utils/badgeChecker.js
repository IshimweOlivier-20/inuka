import { prisma } from '../lib/prisma.js';
import { notify } from './notify.js';
import { getStreak } from './streakUpdater.js';

async function award(userId, key) {
  const badge = await prisma.badge.findUnique({ where: { key } });
  if (!badge) return null;
  const existing = await prisma.userBadge.findUnique({ where: { userId_badgeId: { userId, badgeId: badge.id } } });
  if (existing) return null;
  await prisma.userBadge.create({ data: { userId, badgeId: badge.id } });
  await notify(userId, 'badge', `You earned the ${badge.name} badge! ${badge.icon}`, '/my-learning');
  return badge;
}

// Checks every learning badge; returns newly earned badges.
export async function checkLearningBadges(userId) {
  const earned = [];
  const push = (b) => b && earned.push(b);

  const completedCount = await prisma.progress.count({ where: { userId, isCompleted: true } });
  if (completedCount >= 1) push(await award(userId, 'first_step'));

  const { current } = await getStreak(userId);
  if (current >= 7) push(await award(userId, 'streak_7'));
  if (current >= 30) push(await award(userId, 'streak_30'));

  const courses = await prisma.course.findMany({ where: { isPublished: true } });
  const certs = await prisma.certificate.findMany({ where: { userId } });
  const done = new Set(certs.map((c) => c.courseId));
  const badgeBySlug = Object.fromEntries(
    (await prisma.badge.findMany({ where: { triggerEvent: { startsWith: 'course_completed:' } } }))
      .map((b) => [b.triggerEvent.split(':')[1], b.key]),
  );
  for (const c of courses) if (done.has(c.id) && badgeBySlug[c.slug]) push(await award(userId, badgeBySlug[c.slug]));

  const trackDone = (cat) => courses.filter((c) => c.category === cat).every((c) => done.has(c.id));
  const eng = trackDone('english');
  const comp = trackDone('computer');
  if (eng) push(await award(userId, 'full_english'));
  if (comp) push(await award(userId, 'full_computer'));
  if (eng && comp) push(await award(userId, 'inuka_graduate'));

  return earned;
}

export const awardBadge = award;
