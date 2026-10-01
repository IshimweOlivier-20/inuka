// Mentor dashboard API (spec 12.5). Every route here needs a signed-in user with the "mentor" role.
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { HttpError } from '../../middleware/errorHandler.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { notify } from '../../utils/notify.js';
import { awardBadge } from '../../utils/badgeChecker.js';
import { sendEmail } from '../../services/emailService.js';
import { formatWhen, SESSION_MINUTES } from '../../utils/slots.js';

const router = Router();
router.use(requireAuth, requireRole('mentor'));

const mail = (args) => sendEmail(args).catch((e) => console.error('Email failed', e.message));
const EXPERTISE = ['Scholarship Guidance', 'University Admissions', 'English Language', 'Computer Skills', 'Career Counselling', 'Refugee Rights & Education'];
const words = (t) => t.trim().split(/\s+/).filter(Boolean).length;
const time = z.string().regex(/^(([01]\d|2[0-3]):[0-5]\d|24:00)$/, 'Please choose a valid time.');
const slot = z.object({ dayOfWeek: z.number().int().min(0).max(6), startTime: time, endTime: time })
  .refine((s) => s.startTime < s.endTime, 'Each time slot must end after it starts.');

async function myMentor(req) {
  const m = await prisma.mentor.findUnique({ where: { userId: req.user.id } });
  if (!m) throw new HttpError(404, 'Your mentor profile is not set up yet. Please contact the INUKA team.');
  return m;
}
async function myBooking(req, mentor) {
  const b = await prisma.booking.findFirst({ where: { id: req.params.id, mentorId: mentor.id }, include: { student: true } });
  if (!b) throw new HttpError(404, 'We could not find this session.');
  return b;
}

// Student preview (spec 12.5): name, country, message, current course progress.
async function withStudentPreview(bookings) {
  const ids = [...new Set(bookings.map((b) => b.studentId))];
  if (!ids.length) return bookings;
  const [totalLessons, done, recent] = await Promise.all([
    prisma.lesson.count({ where: { isPublished: true, course: { isPublished: true } } }),
    prisma.progress.groupBy({ by: ['userId'], where: { userId: { in: ids }, isCompleted: true }, _count: { _all: true } }),
    prisma.enrollment.findMany({ where: { userId: { in: ids } }, orderBy: { lastActiveAt: 'desc' }, include: { course: { select: { title: true } } } }),
  ]);
  const doneBy = Object.fromEntries(done.map((d) => [d.userId, d._count._all]));
  const courseBy = {};
  for (const e of recent) courseBy[e.userId] ??= { title: e.course.title, percent: e.completionPercentage };
  return bookings.map((b) => ({
    ...b,
    progress: {
      lessonsCompleted: doneBy[b.studentId] || 0,
      percent: totalLessons ? Math.round(((doneBy[b.studentId] || 0) / totalLessons) * 100) : 0,
      currentCourse: courseBy[b.studentId] || null,
    },
  }));
}

const studentSelect = { select: { firstName: true, lastName: true, countryResidence: true, countryOrigin: true, profilePhotoUrl: true } };

// GET /api/mentor/overview — profile status, new requests, upcoming sessions and numbers.
router.get('/overview', async (req, res) => {
  const mentor = await prisma.mentor.findUnique({
    where: { userId: req.user.id },
    select: {
      id: true, title: true, org: true, bio: true, linkedinUrl: true, isApproved: true, rejectionNote: true,
      ratingAvg: true, sessionsCount: true, expertise: true, languages: true,
      slots: { orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }], select: { id: true, dayOfWeek: true, startTime: true, endTime: true } },
    },
  });
  if (!mentor) return res.json({ mentor: null, requests: [], upcoming: [], stats: { pending: 0, upcoming: 0, completed: 0, students: 0 } });

  const now = new Date();
  const [requests, upcoming, completed, students] = await Promise.all([
    prisma.booking.findMany({
      where: { mentorId: mentor.id, status: 'pending', scheduledAt: { gte: now } },
      orderBy: { scheduledAt: 'asc' }, take: 20, include: { student: studentSelect },
    }),
    prisma.booking.findMany({
      where: { mentorId: mentor.id, status: 'confirmed', scheduledAt: { gte: new Date(now - SESSION_MINUTES * 60000) } },
      orderBy: { scheduledAt: 'asc' }, take: 20, include: { student: studentSelect },
    }),
    prisma.booking.count({ where: { mentorId: mentor.id, status: 'completed' } }),
    prisma.booking.groupBy({ by: ['studentId'], where: { mentorId: mentor.id, status: { in: ['confirmed', 'completed'] } } }),
  ]);
  res.json({
    mentor,
    requests: await withStudentPreview(requests),
    upcoming: await withStudentPreview(upcoming),
    stats: { pending: requests.length, upcoming: upcoming.length, completed, students: students.length },
  });
});

// GET /api/mentor/sessions — every session (calendar + history), with notes and ratings.
router.get('/sessions', async (req, res) => {
  const m = await myMentor(req);
  const sessions = await prisma.booking.findMany({
    where: { mentorId: m.id },
    orderBy: { scheduledAt: 'desc' },
    include: {
      student: studentSelect,
      notes: { where: { mentorId: m.id }, orderBy: { createdAt: 'desc' }, take: 1, select: { notes: true, createdAt: true } },
      review: { select: { rating: true, comment: true } },
    },
  });
  res.json({ sessions: await withStudentPreview(sessions) });
});

// POST /api/mentor/bookings/:id/accept { videoLink?, message? }
router.post('/bookings/:id/accept', async (req, res) => {
  const { videoLink, message } = z.object({
    videoLink: z.url('Please enter a full link, starting with https://').optional().or(z.literal('')),
    message: z.string().trim().max(1000).optional(),
  }).parse(req.body);
  const m = await myMentor(req);
  const b = await myBooking(req, m);
  if (b.status !== 'pending') throw new HttpError(400, 'This request has already been answered.');
  if (b.scheduledAt < new Date()) throw new HttpError(400, 'This request is in the past and can no longer be accepted.');
  await prisma.booking.update({ where: { id: b.id }, data: { status: 'confirmed', videoLink: videoLink || null } });
  const when = formatWhen(b.scheduledAt);
  const name = `${req.user.firstName} ${req.user.lastName}`;
  await notify(b.studentId, 'booking_confirmed', `Your session with ${name} is confirmed for ${when}.`, '/mentorship');
  mail({
    to: b.student.email, subject: `Confirmed: your session with ${name}`,
    text: `Hi ${b.student.firstName},\n\nGood news! ${name} confirmed your session.\n\nTopic: ${b.topic}\nWhen: ${when}\n${videoLink ? `Video link: ${videoLink}\n` : 'Your mentor will share the video link before the session.\n'}${message ? `\nMessage from your mentor: ${message}\n` : ''}\nThe Join button on your INUKA dashboard opens 15 minutes before the session.\n\nRise. Learn. Succeed.\nThe INUKA team`,
  });
  mail({ to: req.user.email, subject: `You confirmed a session with ${b.student.firstName}`, text: `Hi ${req.user.firstName},\n\nYou confirmed the session "${b.topic}" with ${b.student.firstName} ${b.student.lastName} on ${when}.\n\nThank you for guiding students,\nThe INUKA team` });
  res.json({ ok: true });
});

// POST /api/mentor/bookings/:id/decline { message? }
router.post('/bookings/:id/decline', async (req, res) => {
  const { message } = z.object({ message: z.string().trim().max(1000).optional() }).parse(req.body);
  const m = await myMentor(req);
  const b = await myBooking(req, m);
  if (b.status !== 'pending') throw new HttpError(400, 'This request has already been answered.');
  await prisma.booking.update({ where: { id: b.id }, data: { status: 'declined' } });
  const when = formatWhen(b.scheduledAt);
  await notify(b.studentId, 'booking_declined', `${req.user.firstName} cannot do the session on ${when}. Please choose another time or mentor.`, '/mentorship');
  mail({
    to: b.student.email, subject: `About your session request to ${req.user.firstName}`,
    text: `Hi ${b.student.firstName},\n\n${req.user.firstName} ${req.user.lastName} cannot do the session on ${when}.${message ? `\n\nMessage from the mentor: ${message}` : ''}\n\nPlease choose another time or another mentor on INUKA.\n\nThe INUKA team`,
  });
  res.json({ ok: true });
});

// PATCH /api/mentor/bookings/:id { videoLink } — add or change the video link of a confirmed session
router.patch('/bookings/:id', async (req, res) => {
  const { videoLink } = z.object({ videoLink: z.url('Please enter a full link, starting with https://').or(z.literal('')) }).parse(req.body);
  const m = await myMentor(req);
  const b = await myBooking(req, m);
  if (b.status !== 'confirmed') throw new HttpError(400, 'You can add a link to confirmed sessions only.');
  await prisma.booking.update({ where: { id: b.id }, data: { videoLink: videoLink || null } });
  if (videoLink) await notify(b.studentId, 'booking_link', `${req.user.firstName} added the video link for your session on ${formatWhen(b.scheduledAt)}.`, '/mentorship');
  res.json({ ok: true });
});

// POST /api/mentor/bookings/:id/complete — after the session has started
router.post('/bookings/:id/complete', async (req, res) => {
  const m = await myMentor(req);
  const b = await myBooking(req, m);
  if (b.status !== 'confirmed') throw new HttpError(400, 'Only confirmed sessions can be marked as done.');
  if (b.scheduledAt > new Date()) throw new HttpError(400, 'You can mark the session as done once it has started.');
  await prisma.booking.update({ where: { id: b.id }, data: { status: 'completed' } });
  await prisma.mentor.update({ where: { id: m.id }, data: { sessionsCount: { increment: 1 } } });
  await awardBadge(b.studentId, 'first_mentor_session');
  await notify(b.studentId, 'session_completed', `How was your session with ${req.user.firstName}? Rate it to help other students.`, '/mentorship?tab=past');
  res.json({ ok: true });
});

// PUT /api/mentor/bookings/:id/notes { notes } — add or edit session notes (the student sees them)
router.put('/bookings/:id/notes', async (req, res) => {
  const { notes } = z.object({ notes: z.string().trim().min(1, 'Please write your notes.').max(5000, 'Please keep notes under 5000 characters.') }).parse(req.body);
  const m = await myMentor(req);
  const b = await myBooking(req, m);
  if (!['confirmed', 'completed'].includes(b.status)) throw new HttpError(400, 'You can add notes to confirmed or completed sessions.');
  const existing = await prisma.sessionNote.findFirst({ where: { bookingId: b.id, mentorId: m.id } });
  if (existing) await prisma.sessionNote.update({ where: { id: existing.id }, data: { notes } });
  else {
    await prisma.sessionNote.create({ data: { bookingId: b.id, mentorId: m.id, notes } });
    await notify(b.studentId, 'session_notes', `${req.user.firstName} added notes from your session "${b.topic}".`, '/my-learning');
  }
  res.json({ ok: true });
});

// PUT /api/mentor/profile — edit the mentor profile. A rejected profile is sent back for review.
router.put('/profile', async (req, res) => {
  const data = z.object({
    title: z.string().trim().min(2, 'Please enter your professional title.'),
    org: z.string().trim().optional(),
    bio: z.string().trim().min(20, 'Please write a short bio (at least 20 characters).').refine((b) => words(b) <= 300, 'Your bio must be 300 words or fewer.'),
    expertise: z.array(z.enum(EXPERTISE)).min(1, 'Please choose at least one area of expertise.'),
    languages: z.array(z.string().min(1)).min(1, 'Please choose at least one language.'),
    linkedinUrl: z.url('Please enter a valid LinkedIn URL.').optional().or(z.literal('')),
  }).parse(req.body);
  const m = await myMentor(req);
  const resubmit = !m.isApproved && m.rejectionNote;
  const mentor = await prisma.mentor.update({
    where: { id: m.id },
    data: { ...data, org: data.org || null, linkedinUrl: data.linkedinUrl || null, ...(resubmit && { rejectionNote: null }) },
  });
  res.json({ mentor, resubmitted: !!resubmit });
});

// PUT /api/mentor/slots { slots } — replace the weekly availability
router.put('/slots', async (req, res) => {
  const { slots } = z.object({ slots: z.array(slot).min(1, 'Please choose at least one hour when you are available.').max(150) }).parse(req.body);
  const m = await myMentor(req);
  await prisma.$transaction([
    prisma.mentorSlot.deleteMany({ where: { mentorId: m.id } }),
    prisma.mentorSlot.createMany({ data: slots.map((s) => ({ ...s, mentorId: m.id })) }),
  ]);
  res.json({ ok: true });
});

export default router;
