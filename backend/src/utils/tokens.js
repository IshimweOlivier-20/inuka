import jwt from 'jsonwebtoken';
import { createHash, randomBytes } from 'node:crypto';
import { prisma } from '../lib/prisma.js';

export const hashToken = (t) => createHash('sha256').update(t).digest('hex');

export function signAccessToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  });
}

export async function issueRefreshToken(userId) {
  const token = randomBytes(48).toString('hex');
  const days = Number(process.env.REFRESH_EXPIRES_DAYS || 7);
  await prisma.refreshToken.create({
    data: { userId, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + days * 864e5) },
  });
  return { token, maxAge: days * 864e5 };
}

export async function issueAuthToken(userId, type, hours) {
  const token = randomBytes(32).toString('hex');
  await prisma.authToken.create({
    data: { userId, type, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + hours * 36e5) },
  });
  return token;
}

export function publicUser(u) {
  const { passwordHash, googleId, ...rest } = u;
  return rest;
}
