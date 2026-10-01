import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { HttpError } from './errorHandler.js';

async function userFromHeader(req) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return null;
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    return user && user.isActive ? user : null;
  } catch {
    return null;
  }
}

export async function requireAuth(req, res, next) {
  const user = await userFromHeader(req);
  if (!user) throw new HttpError(401, 'Please sign in to continue.');
  req.user = user;
  next();
}

export async function optionalAuth(req, res, next) {
  req.user = await userFromHeader(req);
  next();
}

export const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) throw new HttpError(403, 'You do not have permission to do this.');
  next();
};
