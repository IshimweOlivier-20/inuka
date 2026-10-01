// Admin: user management and mentor approval (spec 16.2).
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { HttpError } from '../../middleware/errorHandler.js';
import { notify } from '../../utils/notify.js';
import { sendEmail } from '../../services/emailService.js';
import { deletePhoto } from '../../services/storageService.js';
import { publicUser } from '../../utils/tokens.js';

const router = Router();
const mail = (args) => sendEmail(args).catch((e) => console.error('Email failed', e.message));
const PAGE = 20;

// GET /api/admin/users?q=&role=&status=active|suspended|unverified&page=
router.get('/users', async (req, res) => {
  const { q = '', role = '', status = '', page = '1' } = req.query;
  const p = Math.max(1, Number(page) || 1);
  const where = {
    ...(role && ['student', 'mentor', 'admin'].includes(role) && { role }),
    ...(status === 'active' && { isActive: true }),
    ...(status === 'suspended' && { isActive: false }),
    ...(status === 'unverified' && { isVerified: false }),
    ...(q.trim() && {
      OR: q.trim().split(/\s+/).map((w) => ({
        OR: [
          { firstName: { contains: w, mode: 'insensitive' } }, { lastName: { contains: w, mode: 'insensitive' } },
          { email: { contains: w, mode: 'insensitive' } }, { countryResidence: { contains: w, mode: 'insensitive' } },
        ],
      })),
    }),
  };
  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where, orderBy: { createdAt: 'desc' }, skip: (p - 1) * PAGE, take: PAGE,
      select: {
        id: true, firstName: true, lastName: true, email: true, role: true, countryResidence: true, refugeeStatus: true,
        isActive: true, isVerified: true, createdAt: true, profilePhotoUrl: true, mentor: { select: { isApproved: true } },
      },
    }),
  ]);
  res.json({ users, total, page: p, pageSize: PAGE });
});

// GET /api/admin/users/:id — profile plus activity numbers
router.get('/users/:id', async (req, res) => {
  const u = await prisma.user.findUnique({ where: { id: req.params.id }, include: { mentor: { include: { slots: true } } } });
  if (!u) throw new HttpError(404, 'We could not find this user.');
  const [lessons, certificates, saved, applications, sessions, documents] = await Promise.all([
    prisma.progress.count({ where: { userId: u.id, isCompleted: true } }),
    prisma.certificate.count({ where: { userId: u.id } }),
    prisma.savedScholarship.count({ where: { userId: u.id } }),
    prisma.application.count({ where: { userId: u.id } }),
    prisma.booking.count({ where: { OR: [{ studentId: u.id }, { mentor: { userId: u.id } }] } }),
    prisma.document.count({ where: { userId: u.id } }),
  ]);
  res.json({ user: publicUser(u), stats: { lessons, certificates, saved, applications, sessions, documents } });
});

// PATCH /api/admin/users/:id — edit details or suspend / reactivate
router.patch('/users/:id', async (req, res) => {
  const data = z.object({
    firstName: z.string().trim().min(1).optional(),
    lastName: z.string().trim().min(1).optional(),
    countryOrigin: z.string().optional(),
    countryResidence: z.string().optional(),
    isActive: z.boolean().optional(),
    isVerified: z.boolean().optional(),
  }).parse(req.body);
  if (req.params.id === req.user.id && data.isActive === false) throw new HttpError(400, 'You cannot suspend your own account.');
  const u = await prisma.user.update({ where: { id: req.params.id }, data });
  if (data.isActive === false) await prisma.refreshToken.deleteMany({ where: { userId: u.id } }); // signs them out everywhere
  res.json({ user: publicUser(u) });
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', async (req, res) => {
  if (req.params.id === req.user.id) throw new HttpError(400, 'You cannot delete your own account here.');
  const u = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!u) throw new HttpError(404, 'We could not find this user.');
  if (u.role === 'admin') throw new HttpError(400, 'Admin accounts cannot be deleted from the dashboard.');
  await deletePhoto(u.profilePhotoUrl);
  await prisma.user.delete({ where: { id: u.id } });
  res.json({ ok: true });
});

// ---------- Mentor approval ----------
// GET /api/admin/mentors?status=pending|approved|rejected
router.get('/mentors', async (req, res) => {
  const status = ['approved', 'rejected'].includes(req.query.status) ? req.query.status : 'pending';
  const where = status === 'approved' ? { isApproved: true }
    : status === 'rejected' ? { isApproved: false, rejectionNote: { not: null } }
      : { isApproved: false, rejectionNote: null };
  const [mentors, counts] = await Promise.all([
    prisma.mentor.findMany({
      where, orderBy: { user: { createdAt: 'desc' } },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, profilePhotoUrl: true, countryResidence: true, createdAt: true, isActive: true, isVerified: true } },
        slots: true,
      },
    }),
    Promise.all([
      prisma.mentor.count({ where: { isApproved: false, rejectionNote: null } }),
      prisma.mentor.count({ where: { isApproved: true } }),
      prisma.mentor.count({ where: { isApproved: false, rejectionNote: { not: null } } }),
    ]),
  ]);
  res.json({ mentors, counts: { pending: counts[0], approved: counts[1], rejected: counts[2] } });
});

// POST /api/admin/mentors/:id/approve
router.post('/mentors/:id/approve', async (req, res) => {
  const m = await prisma.mentor.update({ where: { id: req.params.id }, data: { isApproved: true, rejectionNote: null }, include: { user: true } });
  await notify(m.userId, 'mentor_approved', 'Your mentor profile is approved. Students can now book sessions with you.', '/mentor');
  mail({ to: m.user.email, subject: 'You are now an INUKA mentor', text: `Hi ${m.user.firstName},\n\nWelcome! Your mentor profile has been approved. Students can now see you and book sessions.\n\nCheck your weekly availability in your mentor dashboard so the times are right.\n\nThank you for guiding students,\nThe INUKA team` });
  res.json({ ok: true });
});

// POST /api/admin/mentors/:id/reject { message } — with feedback (spec 16.2)
router.post('/mentors/:id/reject', async (req, res) => {
  const { message } = z.object({ message: z.string().trim().min(5, 'Please tell the mentor why, so they can improve their profile.').max(1000) }).parse(req.body);
  const m = await prisma.mentor.update({ where: { id: req.params.id }, data: { isApproved: false, rejectionNote: message }, include: { user: true } });
  await notify(m.userId, 'mentor_rejected', 'Your mentor profile needs some changes. Open your dashboard to read the feedback.', '/mentor');
  mail({ to: m.user.email, subject: 'About your INUKA mentor application', text: `Hi ${m.user.firstName},\n\nThank you for applying to mentor on INUKA. Before we can approve your profile, please look at this feedback:\n\n${message}\n\nYou can update your profile in your mentor dashboard. Saving it sends it back to us for review.\n\nThe INUKA team` });
  res.json({ ok: true });
});

export default router;
