// Admin dashboard API (spec 16). Every route here needs a signed-in user with the "admin" role.
import { Router } from 'express';
import { prisma } from '../../lib/prisma.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import peopleRoutes from './people.js';
import courseRoutes from './courses.js';
import scholarshipRoutes from './scholarships.js';
import insightRoutes from './insights.js';
import contentRoutes from './content.js';

const router = Router();
router.use(requireAuth, requireRole('admin'));

const DAY = 24 * 60 * 60 * 1000;
const WEEKS = 12;

// GET /api/admin/overview — spec 16.1
router.get('/overview', async (req, res) => {
  const now = new Date();
  const weekAgo = new Date(now - 7 * DAY);
  const in30Days = new Date(now.getTime() + 30 * DAY);
  const since = new Date(now - WEEKS * 7 * DAY);

  const [
    usersByRole, newThisWeek, refugees, studentDates,
    courses, lessons, enrollments, completed, certificates,
    scholarships, closingSoon, applicationsByStatus, saved,
    mentorsApproved, mentorsPending, pendingMentors, bookingsUpcoming, sessionsCompleted,
    subscribers, recentUsers, popularCourses, bookmarked, activeStreak, activeProgress,
  ] = await Promise.all([
    prisma.user.groupBy({ by: ['role'], _count: { _all: true } }),
    prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.user.count({ where: { role: 'student', refugeeStatus: 'yes' } }),
    prisma.user.findMany({ where: { role: 'student', createdAt: { gte: since } }, select: { createdAt: true } }),
    prisma.course.count({ where: { isPublished: true } }),
    prisma.lesson.count({ where: { isPublished: true } }),
    prisma.enrollment.count(),
    prisma.enrollment.count({ where: { completedAt: { not: null } } }),
    prisma.certificate.count(),
    prisma.scholarship.count({ where: { isActive: true } }),
    prisma.scholarship.count({ where: { isActive: true, deadline: { gte: now, lte: in30Days } } }),
    prisma.application.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.savedScholarship.count(),
    prisma.mentor.count({ where: { isApproved: true, user: { isActive: true } } }),
    prisma.mentor.count({ where: { isApproved: false, rejectionNote: null } }),
    prisma.mentor.findMany({
      where: { isApproved: false, rejectionNote: null }, take: 5, orderBy: { user: { createdAt: 'desc' } },
      select: { id: true, title: true, org: true, user: { select: { firstName: true, lastName: true, email: true, createdAt: true, profilePhotoUrl: true } } },
    }),
    prisma.booking.count({ where: { scheduledAt: { gte: now }, status: { in: ['pending', 'confirmed'] } } }),
    prisma.booking.count({ where: { status: 'completed' } }),
    prisma.subscriber.count(),
    prisma.user.findMany({
      take: 6, orderBy: { createdAt: 'desc' },
      select: { id: true, firstName: true, lastName: true, email: true, role: true, countryResidence: true, refugeeStatus: true, createdAt: true, profilePhotoUrl: true },
    }),
    prisma.course.findMany({ orderBy: { enrollments: { _count: 'desc' } }, take: 5, select: { id: true, title: true, _count: { select: { enrollments: true, certificates: true } } } }),
    prisma.scholarship.findMany({ orderBy: { saves: { _count: 'desc' } }, take: 5, select: { id: true, name: true, _count: { select: { saves: true, applications: true } } } }),
    prisma.streakLog.findMany({ where: { date: { gte: weekAgo } }, distinct: ['userId'], select: { userId: true } }),
    prisma.progress.findMany({ where: { completedAt: { gte: weekAgo } }, distinct: ['userId'], select: { userId: true } }),
  ]);

  // Students who joined each week, oldest first (growth chart)
  const weekStart = (d) => { const x = new Date(d); x.setUTCHours(0, 0, 0, 0); x.setUTCDate(x.getUTCDate() - ((x.getUTCDay() + 6) % 7)); return x.getTime(); };
  const thisWeek = weekStart(now);
  const growth = Array.from({ length: WEEKS }, (_, i) => ({ week: new Date(thisWeek - (WEEKS - 1 - i) * 7 * DAY).toISOString(), count: 0 }));
  for (const s of studentDates) {
    const idx = WEEKS - 1 - Math.round((thisWeek - weekStart(s.createdAt)) / (7 * DAY));
    if (growth[idx]) growth[idx].count += 1;
  }

  const roles = Object.fromEntries(usersByRole.map((r) => [r.role, r._count._all]));
  res.json({
    users: {
      total: Object.values(roles).reduce((a, b) => a + b, 0),
      students: roles.student || 0, mentors: roles.mentor || 0, admins: roles.admin || 0,
      newThisWeek, refugees,
      activeThisWeek: new Set([...activeStreak, ...activeProgress].map((x) => x.userId)).size,
      growth,
    },
    learning: { courses, lessons, enrollments, completed, certificates, popularCourses },
    scholarships: {
      active: scholarships, closingSoon, saved, bookmarked,
      applications: Object.fromEntries(applicationsByStatus.map((a) => [a.status, a._count._all])),
    },
    mentorship: { approved: mentorsApproved, pending: mentorsPending, pendingMentors, bookingsUpcoming, sessionsCompleted },
    subscribers,
    recentUsers,
  });
});

router.use(peopleRoutes);
router.use(courseRoutes);
router.use(scholarshipRoutes);
router.use(insightRoutes);
router.use(contentRoutes);

export default router;
