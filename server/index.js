import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { generalLimiter } from './src/middleware/rateLimiter.js';
import { errorHandler, notFound } from './src/middleware/errorHandler.js';
import authRoutes from './src/routes/auth.js';
import learningRoutes from './src/routes/learning.js';
import scholarshipRoutes, { applications } from './src/routes/scholarships.js';
import documentRoutes from './src/routes/documents.js';
import accountRoutes from './src/routes/account.js';
import publicRoutes from './src/routes/public.js';

for (const key of ['DATABASE_URL', 'JWT_SECRET']) {
  if (!process.env[key]) {
    console.error(`✗ Missing ${key} in server/.env — copy .env.example to .env and fill it in.`);
    process.exit(1);
  }
}

const app = express();
app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use('/api', generalLimiter);

app.get('/api/health', (req, res) => res.json({ ok: true, service: 'inuka-api' }));
app.use('/api/public', publicRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/scholarships', scholarshipRoutes);
app.use('/api/applications', applications);
app.use('/api/documents', documentRoutes);
app.use('/api', learningRoutes);
app.use('/api', accountRoutes);

app.use('/api', notFound);
app.use(errorHandler);

const port = Number(process.env.PORT || 3000);
app.listen(port, () => console.log(`✓ INUKA API running on http://localhost:${port}`));
