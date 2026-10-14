// Turns a mentor's weekly availability (UTC, e.g. Tuesday 14:00–16:00) into real bookable times.
// Sessions last 1 hour. A time can be booked from 2 hours ahead up to 14 days ahead,
// and not when the mentor already has a pending or confirmed session then.
import { prisma } from '../lib/prisma.js';

export const SESSION_MINUTES = 60;
export const BOOK_AHEAD_DAYS = 14;
export const MIN_NOTICE_MS = 2 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;
const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };

export const STEP_MINUTES = 30; // a session can start every half hour (09:00, 09:30, 10:00…)

// Joins touching slots of the same day (09:00–10:00 + 10:00–11:00 → 09:00–11:00), so 09:30 can be offered too.
function mergeSlots(slots) {
  const byDay = {};
  for (const s of slots) (byDay[s.dayOfWeek] ??= []).push([toMin(s.startTime), toMin(s.endTime)]);
  const out = [];
  for (const [day, list] of Object.entries(byDay)) {
    list.sort((a, b) => a[0] - b[0]);
    let [start, end] = list[0];
    for (const [a, b] of list.slice(1)) {
      if (a <= end) end = Math.max(end, b);
      else { out.push({ dayOfWeek: Number(day), start, end }); [start, end] = [a, b]; }
    }
    out.push({ dayOfWeek: Number(day), start, end });
  }
  return out;
}

// All start times (Date objects, every 30 minutes, for 1-hour sessions) from the weekly slots, between `from` and `days` later.
export function expandSlots(slots, from = new Date(), days = BOOK_AHEAD_DAYS) {
  const out = [];
  const ranges = mergeSlots(slots);
  const start = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  for (let d = 0; d <= days; d++) {
    const day = new Date(start.getTime() + d * 24 * HOUR);
    for (const r of ranges) {
      if (r.dayOfWeek !== day.getUTCDay()) continue;
      for (let m = r.start; m + SESSION_MINUTES <= r.end; m += STEP_MINUTES) out.push(new Date(day.getTime() + m * 60000));
    }
  }
  return out.sort((a, b) => a - b);
}

// Open times for one mentor: weekly slots minus times already taken, from 2 hours ahead.
export async function openTimes(mentor, days = BOOK_AHEAD_DAYS, { ignoreBookingId } = {}) {
  const now = Date.now();
  const taken = await prisma.booking.findMany({
    where: { mentorId: mentor.id, status: { in: ['pending', 'confirmed'] }, scheduledAt: { gte: new Date(now - HOUR) }, ...(ignoreBookingId && { id: { not: ignoreBookingId } }) },
    select: { scheduledAt: true },
  });
  const busy = taken.map((b) => b.scheduledAt.getTime());
  return expandSlots(mentor.slots, new Date(now), days)
    .filter((t) => t.getTime() >= now + MIN_NOTICE_MS && t.getTime() <= now + days * 24 * HOUR)
    .filter((t) => !busy.some((b) => Math.abs(b - t.getTime()) < SESSION_MINUTES * 60000));
}

// Date and time for emails, in the platform's main time zone (default Kigali, UTC+2).
export function formatWhen(date) {
  const tz = process.env.APP_TIMEZONE || 'Africa/Kigali';
  const text = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: tz }).format(date);
  return `${text} (${tz.split('/').pop().replace('_', ' ')} time)`;
}
