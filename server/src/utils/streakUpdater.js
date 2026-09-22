import { prisma } from '../lib/prisma.js';

const dayUTC = (d = new Date()) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));

export async function logStudyToday(userId) {
  const date = dayUTC();
  await prisma.streakLog.upsert({
    where: { userId_date: { userId, date } },
    update: { lessonsCompleted: { increment: 1 } },
    create: { userId, date, lessonsCompleted: 1 },
  });
}

// Current streak = consecutive days with activity ending today (or yesterday, so it is "at risk" not lost).
export async function getStreak(userId) {
  const logs = await prisma.streakLog.findMany({
    where: { userId, date: { gte: new Date(Date.now() - 400 * 864e5) } },
    orderBy: { date: 'desc' },
  });
  const days = new Set(logs.map((l) => l.date.toISOString().slice(0, 10)));
  const today = dayUTC();
  const key = (offset) => new Date(today.getTime() - offset * 864e5).toISOString().slice(0, 10);
  const studiedToday = days.has(key(0));
  let offset = studiedToday ? 0 : 1;
  let current = 0;
  while (days.has(key(offset))) { current++; offset++; }
  return {
    current,
    studiedToday,
    atRisk: !studiedToday && current > 0,
    calendar: logs.map((l) => ({ date: l.date.toISOString().slice(0, 10), count: l.lessonsCompleted })),
  };
}
