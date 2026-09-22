import { ZodError } from 'zod';
import multer from 'multer';

export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export function notFound(req, res) {
  res.status(404).json({ error: `No API route for ${req.method} ${req.originalUrl}` });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof ZodError) {
    // Turn schema errors into specific, human messages (spec 19.3)
    const fields = {};
    for (const issue of err.issues) fields[issue.path.join('.')] ??= issue.message;
    return res.status(400).json({ error: Object.values(fields)[0], fields });
  }
  if (err instanceof multer.MulterError) {
    const msg = err.code === 'LIMIT_FILE_SIZE' ? 'This file is larger than 5 MB. Please choose a smaller file.' : err.message;
    return res.status(400).json({ error: msg });
  }
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message, ...(err.details && { details: err.details }) });
  }
  if (err?.code === 'P1001') {
    console.error('✗ Cannot reach PostgreSQL. Is the PostgreSQL service running, and is DATABASE_URL in server/.env correct?');
    return res.status(503).json({ error: 'INUKA is having trouble right now. Please try again in a few minutes.' });
  }
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on our side. Please try again in a moment.' });
}
