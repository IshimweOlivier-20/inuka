// In-app notification (the bell) + an email for the important ones.
// Types that already send their own, more detailed email where they happen (mentorship bookings, mentor approval)
// are NOT emailed again here. Badges stay in the app only (too many emails otherwise).
import { prisma } from '../lib/prisma.js';
import { sendEmailSafe } from '../services/emailService.js';

const EMAIL = {
  course_completed: 'You completed a course on INUKA!',
  booking_link: 'Video link for your INUKA session',
  session_completed: 'How was your INUKA mentor session?',
  session_notes: 'Notes from your mentor session',
  deadline_reminder: 'Scholarship deadline reminder',
  session_reminder: 'Reminder: your mentor session',
};
const site = () => (process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/$/, '');

export async function notify(userId, type, message, link, { email = true, subject } = {}) {
  const n = await prisma.notification.create({ data: { userId, type, message, link } });
  if (email && EMAIL[type]) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, firstName: true, isActive: true } });
    if (user?.isActive) {
      sendEmailSafe({
        to: user.email, subject: subject || EMAIL[type],
        text: `Hi ${user.firstName},\n\n${message}\n\nRise. Learn. Succeed.\nThe INUKA team`,
        ...(link && { action: { label: 'Open INUKA', url: link.startsWith('http') ? link : `${site()}${link}` } }),
      });
    }
  }
  return n;
}
