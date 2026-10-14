// Mentorship for students (spec 12): mentor directory, booking, cancelling, session history and reviews.
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { HttpError } from '../../middleware/errorHandler.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { notify } from '../../utils/notify.js';
import { sendEmail } from '../../services/emailService.js';
import { openTimes, formatWhen, expandSlots, MIN_NOTICE_MS, BOOK_AHEAD_DAYS } from '../../utils/slots.js';
import { systemMessage } from '../../services/chat.js';

const router = Router();
router.use('/mentors', requireAuth, requireRole('student'));
router.use('/bookings', requireAuth, requireRole('student'));

export const SESSION_TYPES = { video: 'Video call', voice: 'Voice call', message: 'Messages' };
const MAX_RESCHEDULES = 3;
export const TOPICS = ['Scholarship Guidance', 'Personal Statement Review', 'English Writing Help', 'Computer Skills', 'University Application', 'Interview Preparation', 'Other'];
const list = (v) => (Array.isArray(v) ? v : []);
const words = (t) => t.trim().split(/\s+/).filter(Boolean).length;
const mail = (args) => sendEmail(args).catch((e) => console.error('Email failed', e.message));

const mentorCard = (m) => ({
  id: m.id, firstName: m.user.firstName, lastName: m.user.lastName, profilePhotoUrl: m.user.profilePhotoUrl,
  title: m.title, org: m.org, expertise: list(m.expertise), languages: list(m.languages),
  sessionsCount: m.sessionsCount, ratingAvg: m.ratingAvg, reviewsCount: m._count?.reviews ?? 0,
});
const mentorInclude = {
  user: { select: { firstName: true, lastName: true, profilePhotoUrl: true, countryResidence: true } },
  slots: true, _count: { select: { reviews: true } },
};
const liveMentor = { isApproved: true, user: { isActive: true } };

// GET /api/mentors?q=&expertise=&language= — approved mentors (spec 12.1)
router.get('/mentors', async (req, res) => {
  const { q = '', expertise = '', language = '' } = req.query;
  const mentors = await prisma.mentor.findMany({ where: liveMentor, include: mentorInclude, orderBy: [{ sessionsCount: 'desc' }, { ratingAvg: 'desc' }] });
  const fold = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const words_ = fold(q).split(/\s+/).filter(Boolean);
  const out = [];
  for (const m of mentors) {
    const text = fold([m.user.firstName, m.user.lastName, m.title, m.org, m.bio, ...list(m.expertise), ...list(m.languages)].join(' '));
    if (words_.length && !words_.every((w) => text.includes(w))) continue;
    if (expertise && !list(m.expertise).includes(expertise)) continue;
    if (language && !list(m.languages).includes(language)) continue;
    const week = await openTimes(m, 7);
    out.push({ ...mentorCard(m), availableThisWeek: week.length > 0 });
  }
  const all = mentors.flatMap((m) => list(m.expertise));
  res.json({
    mentors: out,
    filters: {
      expertise: [...new Set(all)].sort(),
      languages: [...new Set(mentors.flatMap((m) => list(m.languages)))].sort(),
    },
    topics: TOPICS,
  });
});

// GET /api/mentors/:id — full profile, reviews and bookable times for the next 14 days (spec 12.2)
router.get('/mentors/:id', async (req, res) => {
  const m = await prisma.mentor.findFirst({ where: { id: req.params.id, ...liveMentor }, include: mentorInclude });
  if (!m) throw new HttpError(404, 'We could not find this mentor.');
  const ignore = typeof req.query.moving === 'string' ? await prisma.booking.findFirst({ where: { id: req.query.moving, studentId: req.user.id }, select: { id: true } }) : null;
  const [times, reviews] = await Promise.all([
    openTimes(m, undefined, { ignoreBookingId: ignore?.id }),
    prisma.review.findMany({
      where: { mentorId: m.id }, orderBy: { createdAt: 'desc' }, take: 10,
      select: { id: true, rating: true, comment: true, createdAt: true, student: { select: { firstName: true } } },
    }),
  ]);
  // Every hour the mentor works (free or already booked), so the page can show booked hours greyed out.
  const now = Date.now();
  const allTimes = expandSlots(m.slots, new Date(now)).filter((t) => t.getTime() >= now + MIN_NOTICE_MS && t.getTime() <= now + BOOK_AHEAD_DAYS * 864e5);
  res.json({ mentor: { ...mentorCard(m), bio: m.bio, linkedinUrl: m.linkedinUrl, country: m.user.countryResidence }, times, allTimes, reviews, topics: TOPICS, sessionTypes: SESSION_TYPES });
});

// POST /api/bookings — request a session. The mentor accepts or declines it.
router.post('/bookings', async (req, res) => {
  const data = z.object({
    mentorId: z.string().uuid(),
    topic: z.enum(TOPICS, { error: 'Please choose a topic.' }),
    sessionType: z.enum(Object.keys(SESSION_TYPES), { error: 'Please choose how you want to meet.' }).default('video'),
    scheduledAt: z.coerce.date({ error: 'Please choose a time.' }),
    message: z.string().trim().min(10, 'Please tell the mentor what you need help with (at least 10 characters).')
      .refine((t) => words(t) <= 200, 'Please keep your message to 200 words or fewer.'),
  }).parse(req.body);

  const m = await prisma.mentor.findFirst({ where: { id: data.mentorId, ...liveMentor }, include: { slots: true, user: true } });
  if (!m) throw new HttpError(404, 'We could not find this mentor.');
  const times = await openTimes(m);
  if (!times.some((t) => t.getTime() === data.scheduledAt.getTime())) {
    throw new HttpError(409, 'This time is no longer free. Please choose another time.');
  }
  const clash = await prisma.booking.findFirst({
    where: { studentId: req.user.id, status: { in: ['pending', 'confirmed'] }, scheduledAt: data.scheduledAt },
  });
  if (clash) throw new HttpError(409, 'You already have a session at this time.');

  const booking = await prisma.booking.create({
    data: { studentId: req.user.id, mentorId: m.id, topic: data.topic, message: data.message, scheduledAt: data.scheduledAt, sessionType: data.sessionType },
  });
  await systemMessage({ ...booking, mentor: { userId: m.userId } }, `Session requested: ${data.topic} (${SESSION_TYPES[data.sessionType]}), ${formatWhen(data.scheduledAt)}`);
  const when = formatWhen(data.scheduledAt);
  const student = req.user;
  await notify(m.userId, 'booking_request', `${student.firstName} ${student.lastName} asked for a session: ${data.topic}, ${when}.`, '/mentor');
  mail({
    to: m.user.email, subject: `New session request from ${student.firstName}`,
    text: `Hi ${m.user.firstName},\n\n${student.firstName} ${student.lastName} would like a mentorship session with you.\n\nTopic: ${data.topic}\nHow: ${SESSION_TYPES[data.sessionType]}\nWhen: ${when}\nMessage: ${data.message}\n\nPlease accept or decline it in your INUKA mentor dashboard.\n\nThank you for guiding students,\nThe INUKA team`,
  });
  mail({
    to: student.email, subject: `Your session request to ${m.user.firstName} ${m.user.lastName}`,
    text: `Hi ${student.firstName},\n\nYour request has been sent to ${m.user.firstName} ${m.user.lastName}.\n\nTopic: ${data.topic}\nWhen: ${when}\n\nWe will email you when the mentor confirms it.\n\nRise. Learn. Succeed.\nThe INUKA team`,
  });
  res.status(201).json({ booking });
});

// GET /api/bookings — the student's sessions, with mentor, notes and review
router.get('/bookings', async (req, res) => {
  const bookings = await prisma.booking.findMany({
    where: { studentId: req.user.id },
    orderBy: { scheduledAt: 'desc' },
    include: {
      mentor: { select: { id: true, title: true, user: { select: { firstName: true, lastName: true, profilePhotoUrl: true } } } },
      notes: { orderBy: { createdAt: 'desc' }, select: { notes: true, createdAt: true } },
      review: { select: { rating: true, comment: true } },
    },
  });
  res.json({ bookings, topics: TOPICS, sessionTypes: SESSION_TYPES, cancelReasons: CANCEL_REASONS, rescheduleReasons: RESCHEDULE_REASONS });
});

// GET /api/bookings/:id — one session with everything (session details page)
router.get('/bookings/:id', async (req, res) => {
  const booking = await prisma.booking.findFirst({
    where: { id: req.params.id, studentId: req.user.id },
    include: {
      mentor: { select: { id: true, title: true, org: true, ratingAvg: true, user: { select: { firstName: true, lastName: true, profilePhotoUrl: true, countryResidence: true } } } },
      notes: { orderBy: { createdAt: 'desc' }, select: { notes: true, createdAt: true } },
      review: { select: { rating: true, comment: true } },
    },
  });
  if (!booking) throw new HttpError(404, 'We could not find this session.');
  const me = await prisma.user.findUnique({ where: { id: req.user.id }, select: { firstName: true, lastName: true, countryResidence: true, countryOrigin: true, educationLevel: true, age: true, refugeeStatus: true } });
  res.json({ booking, student: me, sessionTypes: SESSION_TYPES, maxReschedules: MAX_RESCHEDULES });
});

export const CANCEL_REASONS = ['I want to choose another mentor', 'I found the help I needed', 'I have a schedule clash', 'I am not available any more', 'I prefer not to say', 'Other'];
export const RESCHEDULE_REASONS = ['I have a schedule clash', 'I am not available at that time', 'I have an activity I cannot miss', 'I prefer not to say', 'Other'];
const reasonSchema = (list) => z.object({
  reason: z.enum(list, { error: 'Please choose a reason.' }),
  details: z.string().trim().max(500, 'Please keep it under 500 characters.').optional(),
}).refine((r) => r.reason !== 'Other' || (r.details || '').length >= 3, { message: 'Please tell us the reason.', path: ['details'] });
const reasonText = (r) => (r.reason === 'Other' ? r.details : r.details ? `${r.reason} — ${r.details}` : r.reason);

// POST /api/bookings/:id/cancel { reason, details? }
router.post('/bookings/:id/cancel', async (req, res) => {
  const r = reasonSchema(CANCEL_REASONS).parse({ reason: 'I prefer not to say', ...req.body });
  const b = await prisma.booking.findFirst({ where: { id: req.params.id, studentId: req.user.id }, include: { mentor: { include: { user: true } } } });
  if (!b) throw new HttpError(404, 'We could not find this session.');
  if (!['pending', 'confirmed'].includes(b.status) || b.scheduledAt < new Date()) throw new HttpError(400, 'This session can no longer be cancelled.');
  const why = reasonText(r);
  await prisma.booking.update({ where: { id: b.id }, data: { status: 'cancelled', cancelReason: why, cancelledBy: 'student' } });
  const when = formatWhen(b.scheduledAt);
  await notify(b.mentor.userId, 'booking_cancelled', `${req.user.firstName} cancelled the session on ${when}.`, '/mentor/sessions');
  await systemMessage(b, `${req.user.firstName} cancelled the session of ${when}. Reason: ${why}`);
  mail({ to: b.mentor.user.email, subject: 'A session was cancelled', text: `Hi ${b.mentor.user.firstName},\n\n${req.user.firstName} ${req.user.lastName} cancelled the session "${b.topic}" on ${when}.\nReason: ${why}\n\nThat time is free again.\n\nThe INUKA team` });
  res.json({ ok: true });
});

// POST /api/bookings/:id/reschedule { scheduledAt, reason, details? } — a new time; the mentor confirms it again
router.post('/bookings/:id/reschedule', async (req, res) => {
  const r = reasonSchema(RESCHEDULE_REASONS).parse(req.body);
  const { scheduledAt } = z.object({ scheduledAt: z.coerce.date({ error: 'Please choose a new time.' }) }).parse(req.body);
  const b = await prisma.booking.findFirst({ where: { id: req.params.id, studentId: req.user.id }, include: { mentor: { include: { user: true, slots: true } } } });
  if (!b) throw new HttpError(404, 'We could not find this session.');
  if (!['pending', 'confirmed'].includes(b.status) || b.scheduledAt < new Date()) throw new HttpError(400, 'This session can no longer be moved.');
  if (b.rescheduleCount >= MAX_RESCHEDULES) throw new HttpError(400, `A session can be moved ${MAX_RESCHEDULES} times. Please cancel it and book a new one.`);
  if (scheduledAt.getTime() === b.scheduledAt.getTime()) throw new HttpError(400, 'Please choose a different time.');
  const times = await openTimes(b.mentor, undefined, { ignoreBookingId: b.id }); // its own old time does not block the new one
  if (!times.some((t) => t.getTime() === scheduledAt.getTime())) throw new HttpError(409, 'This time is no longer free. Please choose another time.');
  const clash = await prisma.booking.findFirst({ where: { id: { not: b.id }, studentId: req.user.id, status: { in: ['pending', 'confirmed'] }, scheduledAt } });
  if (clash) throw new HttpError(409, 'You already have a session at this time.');
  const why = reasonText(r);
  await prisma.booking.update({
    where: { id: b.id },
    data: { scheduledAt, previousTime: b.scheduledAt, rescheduleReason: why, rescheduleCount: { increment: 1 }, status: 'pending' },
  });
  const from = formatWhen(b.scheduledAt); const to = formatWhen(scheduledAt);
  await notify(b.mentor.userId, 'booking_request', `${req.user.firstName} moved the session "${b.topic}" to ${to}. Please confirm the new time.`, '/mentor/sessions');
  await systemMessage(b, `${req.user.firstName} moved the session from ${from} to ${to}. Reason: ${why}`);
  mail({
    to: b.mentor.user.email, subject: `${req.user.firstName} asked to move your session`,
    text: `Hi ${b.mentor.user.firstName},\n\n${req.user.firstName} ${req.user.lastName} would like to move the session "${b.topic}".\n\nBefore: ${from}\nNew time: ${to}\nReason: ${why}\n\nPlease accept or decline the new time in your INUKA mentor dashboard.\n\nThe INUKA team`,
  });
  res.json({ ok: true, status: 'pending' });
});

// POST /api/bookings/:id/review — 1 to 5 stars after a completed session (spec 12.4)
router.post('/bookings/:id/review', async (req, res) => {
  const { rating, comment } = z.object({
    rating: z.coerce.number().int().min(1, 'Please choose 1 to 5 stars.').max(5),
    comment: z.string().trim().max(1000, 'Please keep your review short (1000 characters at most).').optional(),
  }).parse(req.body);
  const b = await prisma.booking.findFirst({ where: { id: req.params.id, studentId: req.user.id }, include: { review: true } });
  if (!b) throw new HttpError(404, 'We could not find this session.');
  if (b.status !== 'completed') throw new HttpError(400, 'You can rate a session after it has taken place.');
  if (b.review) throw new HttpError(409, 'You have already rated this session.');
  await prisma.review.create({ data: { bookingId: b.id, studentId: req.user.id, mentorId: b.mentorId, rating, comment: comment || null } });
  const agg = await prisma.review.aggregate({ where: { mentorId: b.mentorId }, _avg: { rating: true } });
  await prisma.mentor.update({ where: { id: b.mentorId }, data: { ratingAvg: Math.round((agg._avg.rating || 0) * 10) / 10 } });
  res.status(201).json({ ok: true });
});

export default router;
