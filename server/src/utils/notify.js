import { prisma } from '../lib/prisma.js';

export const notify = (userId, type, message, link) =>
  prisma.notification.create({ data: { userId, type, message, link } });
