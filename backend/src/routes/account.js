import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { prisma } from '../lib/prisma.js';
import { HttpError } from '../middleware/errorHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { publicUser } from '../utils/tokens.js';
import { assertImage, photoUpload } from '../middleware/upload.js';
import { deletePhoto, savePhoto } from '../services/storageService.js';

const router = Router();
router.use(requireAuth);

// PATCH /api/profile
router.patch('/profile', async (req, res) => {
  const data = z.object({
    firstName: z.string().trim().min(1, 'Please enter your first name.').optional(),
    lastName: z.string().trim().min(1, 'Please enter your last name.').optional(),
    countryOrigin: z.string().optional(),
    countryResidence: z.string().optional(),
    refugeeStatus: z.enum(['yes', 'no', 'prefer_not_to_say']).nullable().optional(),
    educationLevel: z.enum(['S4', 'S5', 'S6', 'Other']).nullable().optional(),
    language: z.string().nullable().optional(),
    age: z.coerce.number().int().min(13).max(100).nullable().optional(),
    weeklyGoal: z.coerce.number().int().min(1).max(50).optional(),
  }).parse(req.body);
  const user = await prisma.user.update({ where: { id: req.user.id }, data });
  res.json({ user: publicUser(user) });
});

// PUT /api/profile/photo — upload or replace the profile photo (multipart field "photo")
router.put('/profile/photo', photoUpload.single('photo'), async (req, res) => {
  if (!req.file) throw new HttpError(400, 'Please choose a photo.');
  assertImage(req.file);
  const url = await savePhoto(req.file);
  await deletePhoto(req.user.profilePhotoUrl);
  const user = await prisma.user.update({ where: { id: req.user.id }, data: { profilePhotoUrl: url } });
  res.json({ user: publicUser(user) });
});

// DELETE /api/profile/photo — mentors must keep a photo (spec 4.3)
router.delete('/profile/photo', async (req, res) => {
  if (req.user.role === 'mentor') throw new HttpError(400, 'Mentors need a profile photo. Upload a new one to replace it.');
  await deletePhoto(req.user.profilePhotoUrl);
  const user = await prisma.user.update({ where: { id: req.user.id }, data: { profilePhotoUrl: null } });
  res.json({ user: publicUser(user) });
});

router.post('/profile/password', async (req, res) => {
  const { currentPassword, newPassword } = z.object({
    currentPassword: z.string().min(1, 'Please enter your current password.'),
    newPassword: z.string().min(8, 'Your new password must be at least 8 characters long.').regex(/\d/, 'Your new password must include at least one number.'),
  }).parse(req.body);
  if (!req.user.passwordHash || !(await bcrypt.compare(currentPassword, req.user.passwordHash))) {
    throw new HttpError(400, 'Your current password is not correct.');
  }
  await prisma.user.update({ where: { id: req.user.id }, data: { passwordHash: await bcrypt.hash(newPassword, 12) } });
  res.json({ ok: true });
});

router.delete('/profile', async (req, res) => {
  await deletePhoto(req.user.profilePhotoUrl);
  await prisma.user.delete({ where: { id: req.user.id } });
  res.clearCookie('inuka_refresh', { path: '/api/auth' });
  res.json({ ok: true });
});

// Notifications (spec 15.1)
router.get('/notifications', async (req, res) => {
  const [notifications, unread] = await Promise.all([
    prisma.notification.findMany({ where: { userId: req.user.id }, orderBy: { createdAt: 'desc' }, take: 30 }),
    prisma.notification.count({ where: { userId: req.user.id, isRead: false } }),
  ]);
  res.json({ notifications, unread });
});

router.patch('/notifications/read-all', async (req, res) => {
  await prisma.notification.updateMany({ where: { userId: req.user.id, isRead: false }, data: { isRead: true } });
  res.json({ ok: true });
});

router.patch('/notifications/:id/read', async (req, res) => {
  await prisma.notification.updateMany({ where: { id: req.params.id, userId: req.user.id }, data: { isRead: true } });
  res.json({ ok: true });
});

export default router;
