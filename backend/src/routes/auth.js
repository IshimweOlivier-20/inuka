import { Router } from 'express';
import { randomBytes } from 'node:crypto';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { HttpError } from '../middleware/errorHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { loginLimiter } from '../middleware/rateLimiter.js';
import { sendEmail } from '../services/emailService.js';
import { assertImage, photoUpload } from '../middleware/upload.js';
import { savePhoto } from '../services/storageService.js';
import { OAuth2Client } from 'google-auth-library';
import { signAccessToken, issueRefreshToken, issueAuthToken, hashToken, publicUser } from '../utils/tokens.js';

const router = Router();
const COOKIE = 'inuka_refresh';
const FRONTEND_URL = process.env.FRONTEND_URL || process.env.CLIENT_URL; // CLIENT_URL: older .env files
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

const time = z.string().regex(/^(([01]\d|2[0-3]):[0-5]\d|24:00)$/, 'Please choose a valid time.'); // "24:00" = end of day
const slot = z.object({ dayOfWeek: z.number().int().min(0).max(6), startTime: time, endTime: time })
  .refine((s) => s.startTime < s.endTime, 'Each time slot must end after it starts.');

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
    // Weekly availability (spec 4.3), e.g. { dayOfWeek: 2, startTime: '14:00', endTime: '15:00' } in UTC
    slots: z.array(slot).min(1, 'Please choose at least one time when you are available.').max(150),
  }).optional(),
});

async function startSession(res, user) {
  const { token, maxAge } = await issueRefreshToken(user.id);
  res.cookie(COOKIE, token, cookieOpts(maxAge));
  return { accessToken: signAccessToken(user), user: publicUser(user) };
}

async function sendVerification(user) {
  const token = await issueAuthToken(user.id, 'email_verify', 48);
  const url = `${FRONTEND_URL}/verify-email?token=${token}`;
  await sendEmail({
    to: user.email,
    subject: 'Welcome to INUKA — please confirm your email',
    text: `Hi ${user.firstName},\n\nWelcome to INUKA! Confirm your email address to start learning:\n${url}\n\nThis link works for 48 hours.\n\nRise. Learn. Succeed.\nThe INUKA team`,
  });
  return url;
}

// Accepts JSON, or multipart/form-data with the form as JSON in "data" plus an optional "photo" file.
router.post('/register', photoUpload.single('photo'), async (req, res) => {
  let body = req.body;
  if (typeof req.body?.data === 'string') { // form upload: the fields arrive as JSON text in "data"
    try { body = JSON.parse(req.body.data || '{}'); } catch { throw new HttpError(400, 'The form could not be read. Please try again.'); }
  }
  const data = registerSchema.parse(body);
  if (data.role === 'mentor' && !data.mentor) throw new HttpError(400, 'Please complete your mentor profile.');
  if (data.role === 'mentor' && !req.file) throw new HttpError(400, 'Mentors need a profile photo, so students can see who they are booking.');
  assertImage(req.file);
  const exists = await prisma.user.findUnique({ where: { email: data.email } });
  if (exists) throw new HttpError(409, 'An account with this email already exists. Try signing in instead.');

  const profilePhotoUrl = req.file ? await savePhoto(req.file) : null;
  const user = await prisma.user.create({
    data: {
      firstName: data.firstName, lastName: data.lastName, email: data.email, role: data.role, profilePhotoUrl,
      passwordHash: await bcrypt.hash(data.password, 12),
      countryOrigin: data.countryOrigin, countryResidence: data.countryResidence,
      refugeeStatus: data.refugeeStatus, educationLevel: data.educationLevel,
      language: data.language, age: data.age,
      isVerified: !requireVerification(),
      ...(data.mentor && {
        mentor: {
          create: {
            ...data.mentor, slots: { create: data.mentor.slots }, linkedinUrl: data.mentor.linkedinUrl || null,
            isApproved: false, // an admin must approve every mentor before students can see them (spec 4.3)
          },
        },
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

// ---------- Google sign-in / sign-up (spec 4.2 and 4.4) ----------
// Our own "Continue with Google" button sends people to /api/auth/google/start. Google sends them back to
// /api/auth/google/callback, where we sign them in (or create a student account) and return them to the website.
// Needs GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in backend/.env (README section 12).
const googleReady = () => !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
const googleRedirectUri = () => process.env.GOOGLE_REDIRECT_URI || `${FRONTEND_URL}/api/auth/google/callback`;
const STATE_COOKIE = 'inuka_google_state';

router.get('/config', (req, res) => {
  res.json({ google: googleReady(), showGoogleSetupHint: !googleReady() && process.env.NODE_ENV !== 'production' });
});

// Finds the account for a Google profile, links it, or creates a new student.
async function googleUser(p) {
  const email = p.email.toLowerCase();
  let user = await prisma.user.findFirst({ where: { OR: [{ googleId: p.sub }, { email }] } });
  if (user) {
    if (!user.isActive) throw new HttpError(403, 'This account has been suspended. Contact the INUKA team for help.');
    if (!user.googleId || !user.isVerified) {
      user = await prisma.user.update({ where: { id: user.id }, data: { googleId: user.googleId || p.sub, isVerified: true } });
    }
    return { user, isNew: false };
  }
  user = await prisma.user.create({
    data: {
      firstName: p.given_name || p.name?.split(' ')[0] || 'Student',
      lastName: p.family_name || p.name?.split(' ').slice(1).join(' ') || '',
      email, googleId: p.sub, role: 'student', isVerified: true, profilePhotoUrl: p.picture || null,
    },
  });
  return { user, isNew: true };
}

// GET /api/auth/google/start?from=/scholarships — goes to Google's account chooser
router.get('/google/start', loginLimiter, (req, res) => {
  if (!googleReady()) return res.redirect(`${FRONTEND_URL}/login?google=off`);
  const from = typeof req.query.from === 'string' && req.query.from.startsWith('/') && !req.query.from.startsWith('//') ? req.query.from : '';
  const state = randomBytes(24).toString('hex');
  res.cookie(STATE_COOKIE, JSON.stringify({ state, from }), { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 10 * 60 * 1000, path: '/api/auth/google' });
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.search = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID, redirect_uri: googleRedirectUri(), response_type: 'code',
    scope: 'openid email profile', state, prompt: 'select_account',
  }).toString();
  res.redirect(url.toString());
});

// GET /api/auth/google/callback?code=…&state=…
router.get('/google/callback', async (req, res) => {
  const back = (q) => res.redirect(`${FRONTEND_URL}/login?${q}`);
  let saved = {};
  try { saved = JSON.parse(req.cookies?.[STATE_COOKIE] || '{}'); } catch { /* ignore */ }
  res.clearCookie(STATE_COOKIE, { path: '/api/auth/google' });
  if (!googleReady()) return back('google=off');
  if (req.query.error) return back('google=cancelled');
  if (!req.query.code || !saved.state || saved.state !== req.query.state) return back('google=failed');
  try {
    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, googleRedirectUri());
    const { tokens } = await client.getToken(String(req.query.code));
    const p = (await client.verifyIdToken({ idToken: tokens.id_token, audience: process.env.GOOGLE_CLIENT_ID })).getPayload();
    if (!p?.email || !p.email_verified) return back('google=unverified');
    const { user, isNew } = await googleUser(p);
    const { token, maxAge } = await issueRefreshToken(user.id);
    res.cookie(COOKIE, token, cookieOpts(maxAge));
    const next = isNew ? '/dashboard?welcome=1' : (saved.from || '');
    res.redirect(`${FRONTEND_URL}/auth/google${next ? `?next=${encodeURIComponent(next)}` : ''}`);
  } catch (e) {
    if (e instanceof HttpError && e.status === 403) return back('google=suspended');
    console.error('Google sign-in failed:', e.message);
    back('google=failed');
  }
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
      text: `Hi ${user.firstName},\n\nClick this link to choose a new password:\n${FRONTEND_URL}/reset-password?token=${token}\n\nThe link works for 1 hour. If you did not ask for this, you can ignore this email.`,
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
