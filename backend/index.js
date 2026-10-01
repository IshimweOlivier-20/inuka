import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { generalLimiter } from './src/middleware/rateLimiter.js';
import { errorHandler, notFound } from './src/middleware/errorHandler.js';
// Shared (everyone)
import publicRoutes from './src/routes/public.js';
import authRoutes from './src/routes/auth.js';
import accountRoutes from './src/routes/account.js';
import searchRoutes from './src/routes/search.js';
// Student dashboard
import learningRoutes from './src/routes/student/learning.js';
import scholarshipRoutes, { applications } from './src/routes/student/scholarships.js';
import documentRoutes from './src/routes/student/documents.js';
import mentorshipRoutes from './src/routes/student/mentorship.js';
import aiRoutes from './src/routes/student/ai.js';
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
app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || process.env.CLIENT_URL, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use('/api', generalLimiter);

app.get('/api/health', (req, res) => res.json({ ok: true, service: 'inuka-api' }));
app.use('/api/public', publicRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/search', searchRoutes); // dashboard search bar (every role)
app.use('/api/scholarships', scholarshipRoutes);
app.use('/api/applications', applications);
app.use('/api/documents', documentRoutes);
app.use('/api', mentorshipRoutes); // /api/mentors, /api/bookings
app.use('/api', aiRoutes); // /api/ai/...
app.use('/api/mentor', mentorRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', learningRoutes);
app.use('/api', accountRoutes);

app.use('/api', notFound);
app.use(errorHandler);

const port = Number(process.env.PORT || 3000);
app.listen(port, () => console.log(`✓ INUKA API running on http://localhost:${port}`));
