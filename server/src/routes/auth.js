import { Router } from 'express';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { HttpError } from '../middleware/errorHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { loginLimiter } from '../middleware/rateLimiter.js';
import { sendEmail } from '../services/emailService.js';
import { signAccessToken, issueRefreshToken, issueAuthToken, hashToken, publicUser } from '../utils/tokens.js';

const router = Router();
const COOKIE = 'inuka_refresh';
const cookieOpts = (maxAge) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/api/auth',
  maxAge,
});
const requireVerification = () => process.env.REQUIRE_EMAIL_VERIFICATION !== 'false';

const password = z.string()
  .min(8, 'Your password must be at least 8 characters long.')
  .regex(/\d/, 'Your password must include at least one number.');

const registerSchema = z.object({
  firstName: z.string().trim().min(1, 'Please enter your first name.'),
  lastName: z.string().trim().min(1, 'Please enter your last name.'),
  email: z.email('Please enter a valid email address.').transform((e) => e.toLowerCase()),
  password,
  role: z.enum(['student', 'mentor']).default('student'),
  countryOrigin: z.string().min(1, 'Please choose your country of origin.'),
  countryResidence: z.string().min(1, 'Please choose the country where you live now.'),
  refugeeStatus: z.enum(['yes', 'no', 'prefer_not_to_say']).optional(),
  educationLevel: z.enum(['S4', 'S5', 'S6', 'Other']).optional(),
  language: z.string().optional(),
  age: z.coerce.number().int().min(13).max(100).optional(),
  acceptTerms: z.literal(true, { error: 'Please accept the Terms of Use and Privacy Policy.' }),
  mentor: z.object({
    title: z.string().min(2, 'Please enter your professional title.'),
    org: z.string().optional(),
    bio: z.string().min(20, 'Please write a short bio (at least 20 characters).')
      .refine((b) => b.trim().split(/\s+/).length <= 300, 'Your bio must be 300 words or fewer.'),
    expertise: z.array(z.string()).min(1, 'Please choose at least one area of expertise.'),
    languages: z.array(z.string()).min(1, 'Please choose at least one language.'),
    linkedinUrl: z.url('Please enter a valid LinkedIn URL.').optional().or(z.literal('')),
  }).optional(),
});

async function startSession(res, user) {
  const { token, maxAge } = await issueRefreshToken(user.id);
  res.cookie(COOKIE, token, cookieOpts(maxAge));
  return { accessToken: signAccessToken(user), user: publicUser(user) };
}

async function sendVerification(user) {
  const token = await issueAuthToken(user.id, 'email_verify', 48);
  const url = `${process.env.CLIENT_URL}/verify-email?token=${token}`;
  await sendEmail({
    to: user.email,
    subject: 'Welcome to INUKA — please confirm your email',
    text: `Hi ${user.firstName},\n\nWelcome to INUKA! Confirm your email address to start learning:\n${url}\n\nThis link works for 48 hours.\n\nRise. Learn. Succeed.\nThe INUKA team`,
  });
  return url;
}

router.post('/register', async (req, res) => {
  const data = registerSchema.parse(req.body);
  if (data.role === 'mentor' && !data.mentor) throw new HttpError(400, 'Please complete your mentor profile.');
  const exists = await prisma.user.findUnique({ where: { email: data.email } });
  if (exists) throw new HttpError(409, 'An account with this email already exists. Try signing in instead.');

  const user = await prisma.user.create({
    data: {
      firstName: data.firstName, lastName: data.lastName, email: data.email, role: data.role,
      passwordHash: await bcrypt.hash(data.password, 12),
      countryOrigin: data.countryOrigin, countryResidence: data.countryResidence,
      refugeeStatus: data.refugeeStatus, educationLevel: data.educationLevel,
      language: data.language, age: data.age,
      isVerified: !requireVerification(),
      ...(data.mentor && {
        mentor: { create: { ...data.mentor, linkedinUrl: data.mentor.linkedinUrl || null } },
      }),
    },
  });

  const verifyUrl = await sendVerification(user);
  const devHint = process.env.NODE_ENV !== 'production' && !process.env.SENDGRID_API_KEY ? { devVerifyUrl: verifyUrl } : {};

  if (!user.isVerified) {
    return res.status(201).json({ needsVerification: true, email: user.email, ...devHint });
  }
  res.status(201).json(await startSession(res, user));
});

router.post('/verify-email', async (req, res) => {
  const { token } = z.object({ token: z.string().min(10) }).parse(req.body);
  const record = await prisma.authToken.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!record || record.type !== 'email_verify' || record.usedAt || record.expiresAt < new Date()) {
    throw new HttpError(400, 'This link has expired or was already used. Sign in to get a new one.');
  }
  const user = await prisma.user.update({ where: { id: record.userId }, data: { isVerified: true } });
  await prisma.authToken.update({ where: { id: record.id }, data: { usedAt: new Date() } });
  res.json(await startSession(res, user));
});

router.post('/resend-verification', async (req, res) => {
  const { email } = z.object({ email: z.email() }).parse(req.body);
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  let devHint = {};
  if (user && !user.isVerified) {
    const url = await sendVerification(user);
    if (process.env.NODE_ENV !== 'production' && !process.env.SENDGRID_API_KEY) devHint = { devVerifyUrl: url };
  }
  res.json({ ok: true, ...devHint });
});

router.post('/login', loginLimiter, async (req, res) => {
  const { email, password: pw } = z.object({
    email: z.email('Please enter a valid email address.'),
    password: z.string().min(1, 'Please enter your password.'),
  }).parse(req.body);
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() }, include: { mentor: true } });
  const ok = user?.passwordHash && (await bcrypt.compare(pw, user.passwordHash));
  if (!ok) throw new HttpError(401, 'That email and password do not match. Please check and try again.');
  if (!user.isActive) throw new HttpError(403, 'This account has been suspended. Contact the INUKA team for help.');
  if (!user.isVerified) throw new HttpError(403, 'Please confirm your email first. Check your inbox for the link we sent.', { code: 'unverified' });
  res.json(await startSession(res, user));
});

router.post('/refresh', async (req, res) => {
  const token = req.cookies?.[COOKIE];
  if (!token) throw new HttpError(401, 'Please sign in to continue.');
  const record = await prisma.refreshToken.findUnique({ where: { tokenHash: hashToken(token) }, include: { user: true } });
  if (!record || record.expiresAt < new Date() || !record.user.isActive) {
    res.clearCookie(COOKIE, cookieOpts(0));
    throw new HttpError(401, 'Your session has ended. Please sign in again.');
  }
  await prisma.refreshToken.delete({ where: { id: record.id } }); // rotate
  res.json(await startSession(res, record.user));
});

router.post('/logout', async (req, res) => {
  const token = req.cookies?.[COOKIE];
  if (token) await prisma.refreshToken.deleteMany({ where: { tokenHash: hashToken(token) } });
  res.clearCookie(COOKIE, cookieOpts(0));
  res.json({ ok: true });
});

router.post('/forgot-password', async (req, res) => {
  const { email } = z.object({ email: z.email('Please enter a valid email address.') }).parse(req.body);
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (user) {
    const token = await issueAuthToken(user.id, 'password_reset', 1);
    await sendEmail({
      to: user.email,
      subject: 'Reset your INUKA password',
      text: `Hi ${user.firstName},\n\nClick this link to choose a new password:\n${process.env.CLIENT_URL}/reset-password?token=${token}\n\nThe link works for 1 hour. If you did not ask for this, you can ignore this email.`,
    });
  }
  // Same answer either way, so nobody can check which emails have accounts.
  res.json({ ok: true });
});

router.post('/reset-password', async (req, res) => {
  const { token, password: pw } = z.object({ token: z.string().min(10), password }).parse(req.body);
  const record = await prisma.authToken.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!record || record.type !== 'password_reset' || record.usedAt || record.expiresAt < new Date()) {
    throw new HttpError(400, 'This reset link has expired. Please ask for a new one.');
  }
  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash: await bcrypt.hash(pw, 12), isVerified: true } }),
    prisma.authToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    prisma.refreshToken.deleteMany({ where: { userId: record.userId } }),
  ]);
  res.json({ ok: true });
});

router.get('/me', requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.id }, include: { mentor: true } });
  res.json({ user: publicUser(user) });
});

export default router;
