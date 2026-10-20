import 'dotenv/config';
import { verifyEmail } from './src/services/emailService.js';
import { startReminders } from './src/services/reminders.js';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { generalLimiter } from './src/middleware/rateLimiter.js';
import { errorHandler, notFound } from './src/middleware/errorHandler.js';
// Shared (everyone)
import { prisma } from './src/lib/prisma.js';
import publicRoutes from './src/routes/public.js';
import authRoutes, { googleProblem } from './src/routes/auth.js';
import { watchFile } from 'node:fs';
import dotenv from 'dotenv';
import accountRoutes from './src/routes/account.js';
import searchRoutes from './src/routes/search.js';
// Student dashboard
import learningRoutes from './src/routes/student/learning.js';
import examRoutes from './src/routes/student/exams.js';
import scholarshipRoutes, { applications } from './src/routes/student/scholarships.js';
import documentRoutes from './src/routes/student/documents.js';
import mentorshipRoutes from './src/routes/student/mentorship.js';
import aiRoutes from './src/routes/student/ai.js';
import assistantRoutes from './src/routes/assistant.js';
import messageRoutes from './src/routes/messages.js';
import optionsRoutes from './src/routes/options.js';
import toolRoutes from './src/routes/tools.js';
// Mentor and admin dashboards
import mentorRoutes from './src/routes/mentor/index.js';
import adminRoutes from './src/routes/admin/index.js';

for (const key of ['DATABASE_URL', 'JWT_SECRET']) {
  if (!process.env[key]) {
    console.error(`✗ Missing ${key} in backend/.env — copy .env.example to .env and fill it in.`);
    process.exit(1);
  }
}

const app = express();
// How many proxies sit in front of the server (1 = Render alone; 2 = Vercel /api proxy -> Render). Used for real visitor IPs (rate limits).
app.set('trust proxy', Number(process.env.TRUST_PROXY || 1));
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || process.env.CLIENT_URL, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use('/api', generalLimiter);

app.get('/api/health', (req, res) => res.json({ ok: true, service: 'inuka-api' }));
app.use('/api', optionsRoutes); // /api/options…, /api/public/universities…
app.use('/api', toolRoutes); // scam check, certificate verify, recommendation letters
app.use('/api/public', publicRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/search', searchRoutes); // dashboard search bar (every role)
app.use('/api/scholarships', scholarshipRoutes);
app.use('/api/applications', applications);
app.use('/api/documents', documentRoutes);
app.use('/api', mentorshipRoutes); // /api/mentors, /api/bookings
app.use('/api', messageRoutes); // /api/conversations, /api/messages/unread
app.use('/api', aiRoutes); // /api/ai/...
app.use('/api/assistant', assistantRoutes); // chat bubble for everyone (free)
app.use('/api/mentor', mentorRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', examRoutes); // /api/courses/:slug/exam, /api/exam-attempts/...
app.use('/api', learningRoutes);
app.use('/api', accountRoutes);

app.use('/api', notFound);
app.use(errorHandler);

const port = Number(process.env.PORT || 3000);
app.listen(port, () => {
  console.log(`✓ INUKA API running on http://localhost:${port}`);
  verifyEmail().then((r) => console.log(r.ok ? `✓ Email: sending through ${r.via || process.env.SMTP_HOST}` : `• Email: ${r.reason}`));
  startReminders(); // reminder emails (scholarship deadlines, mentor sessions)
  const g = googleProblem();
  console.log(g ? `• Google sign-in: off — ${g}` : '✓ Google sign-in: on');
  checkDatabase();
});

// Explains the two most common set-up problems after an update, instead of "500" errors in the browser:
// 1) the Prisma client is older than prisma/schema.prisma (run "npx prisma generate" with the server STOPPED —
//    on Windows a running server locks the Prisma files), 2) the database is missing new tables (migrate deploy).
async function checkDatabase() {
  const fix = '\n  Stop the server (Ctrl+C), then in backend run:\n    npx prisma migrate deploy\n    npx prisma generate\n    npm run db:seed\n  and start it again with: npm run dev';
  if (!prisma.university || !prisma.recommendationRequest || !prisma.postLike) {
    console.error(`✗ Database code is out of date (Prisma client older than schema.prisma).${fix}`);
    return;
  }
  try {
    await Promise.all([prisma.university.count(), prisma.post.findFirst({ select: { coverUrl: true } }), prisma.recommendationRequest.count()]);
    console.log('✓ Database: up to date');
  } catch (e) {
    console.error(`✗ Database is missing the latest changes (${String(e.message).split('\n').filter(Boolean).pop()?.slice(0, 160)}).${fix}`);
  }
}

// While developing: when backend/.env is saved, read it again (no restart needed for keys like GOOGLE_CLIENT_ID,
// SMTP_*, AI_*). "node --watch" restarts on code changes only, not on .env changes.
if (process.env.NODE_ENV !== 'production') {
  watchFile('.env', { interval: 1500 }, () => {
    dotenv.config({ override: true, quiet: true });
    const g = googleProblem();
    console.log(`↻ backend/.env reloaded. ${g ? `Google sign-in: off — ${g}` : 'Google sign-in: on'}`);
  });
}
