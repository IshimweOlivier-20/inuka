// Reminder emails (+ in-app notifications), checked every 15 minutes while the backend runs:
//   • Saved scholarships: 7 days and 1 day before the deadline (only if the student has not applied yet).
//   • Mentor sessions (confirmed): 24 hours and 1 hour before, to the student and the mentor.
// Each reminder is recorded in sent_reminders, so it goes out only once even after a restart.
// Turn off with REMINDERS=off in backend/.env.
import { prisma } from '../lib/prisma.js';
import { notify } from '../utils/notify.js';
import { formatWhen } from '../utils/slots.js';

const EVERY = 15 * 60 * 1000;
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

// Records the key; returns false if it was already sent.
async function claim(key) {
  try { await prisma.sentReminder.create({ data: { key } }); return true; } catch { return false; }
}

async function deadlineReminders(now) {
  for (const days of [1, 7]) {
    // Deadlines that fall within the next `days` days but not yet within the next (days - 1) — catch-up safe.
    const until = new Date(now.getTime() + days * DAY);
    const saved = await prisma.savedScholarship.findMany({
      where: { scholarship: { isActive: true, deadline: { gt: now, lte: until } }, user: { isActive: true } },
      include: { scholarship: true },
    });
    for (const s of saved) {
      const applied = await prisma.application.findUnique({ where: { userId_scholarshipId: { userId: s.userId, scholarshipId: s.scholarshipId } } });
      if (applied && applied.status !== 'not_started') continue;
      const left = Math.max(1, Math.ceil((new Date(s.scholarship.deadline) - now) / DAY));
      if (days === 7 && left <= 1) continue; // the 1-day reminder covers it
      if (!(await claim(`deadline:${days}:${s.userId}:${s.scholarshipId}`))) continue;
      await notify(
        s.userId, 'deadline_reminder',
        `${s.scholarship.name} closes in ${left === 1 ? '1 day' : `${left} days`}. Check your documents and apply in time.`,
        `/opportunities/${s.scholarship.slug}`,
        { subject: `${left === 1 ? 'Tomorrow' : `In ${left} days`}: ${s.scholarship.name} closes` },
      );
    }
  }
}

async function sessionReminders(now) {
  for (const [label, ms] of [['24h', DAY], ['1h', HOUR]]) {
    const bookings = await prisma.booking.findMany({
      where: { status: 'confirmed', scheduledAt: { gt: now, lte: new Date(now.getTime() + ms) } },
      include: { student: true, mentor: { include: { user: true } } },
    });
    for (const b of bookings) {
      if (label === '24h' && b.scheduledAt - now <= HOUR) continue; // too late for the 24h one, the 1h one will go
      const when = formatWhen(b.scheduledAt);
      const soon = label === '1h' ? 'in about 1 hour' : 'tomorrow';
      if (await claim(`session:${label}:${b.id}:student`)) {
        await notify(b.studentId, 'session_reminder',
          `Your session "${b.topic}" with ${b.mentor.user.firstName} ${b.mentor.user.lastName} starts ${soon} (${when}). The Join button opens 15 minutes before.${b.videoLink ? '' : ' Your mentor will share the video link.'}`,
          '/mentorship', { subject: `Reminder: your session starts ${soon}` });
      }
      if (await claim(`session:${label}:${b.id}:mentor`)) {
        await notify(b.mentor.userId, 'session_reminder',
          `Your session "${b.topic}" with ${b.student.firstName} ${b.student.lastName} starts ${soon} (${when}).${b.videoLink ? '' : ' Please add the video link in your dashboard.'}`,
          '/mentor', { subject: `Reminder: session with ${b.student.firstName} ${soon}` });
      }
    }
  }
}

export async function runReminders(now = new Date()) {
  try {
    await deadlineReminders(now);
    await sessionReminders(now);
  } catch (e) {
    console.error('Reminders failed:', e.message);
  }
}

let timer = null;
export function startReminders() {
  if (process.env.REMINDERS === 'off' || timer) return;
  setTimeout(() => runReminders(), 30 * 1000); // first check shortly after start
  timer = setInterval(() => runReminders(), EVERY);
  timer.unref?.();
}
