// GET /api/search?q= — the search bar at the top of every dashboard. Results depend on the role.
import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);
const TAKE = 5;
const has = (q) => ({ contains: q, mode: 'insensitive' });

router.get('/', async (req, res) => {
  const q = String(req.query.q || '').trim().slice(0, 80);
  if (q.length < 2) return res.json({ groups: [] });
  const role = req.user.role;
  const groups = [];
  const add = (label, items) => { if (items.length) groups.push({ label, items }); };

  const [courses, lessons, scholarships] = await Promise.all([
    prisma.course.findMany({
      where: { ...(role !== 'admin' && { isPublished: true }), OR: [{ title: has(q) }, { description: has(q) }] },
      orderBy: { orderIndex: 'asc' }, take: TAKE, select: { id: true, slug: true, title: true, category: true, level: true },
    }),
    role === 'mentor' ? [] : prisma.lesson.findMany({
      where: { ...(role !== 'admin' && { isPublished: true, course: { isPublished: true } }), OR: [{ title: has(q) }, { summary: has(q) }] },
      take: TAKE, select: { id: true, title: true, course: { select: { title: true } } },
    }),
    prisma.scholarship.findMany({
      where: { ...(role !== 'admin' && { isActive: true }), OR: [{ name: has(q) }, { orgName: has(q) }, { hostCountry: has(q) }, { hostUniversity: has(q) }] },
      orderBy: [{ isFeatured: 'desc' }, { name: 'asc' }], take: TAKE, select: { id: true, name: true, orgName: true, hostCountry: true, isActive: true },
    }),
  ]);

  const courseTo = (c) => (role === 'admin' ? `/admin/courses/${c.id}` : role === 'mentor' ? `/learn?q=${encodeURIComponent(c.title)}` : `/courses/${c.slug}`);
  const scholarshipTo = (s) => (role === 'admin' ? `/admin/scholarships/${s.id}` : role === 'mentor' ? `/opportunities?q=${encodeURIComponent(s.name)}` : `/scholarships?open=${s.id}`);

  if (role === 'admin') {
    const users = await prisma.user.findMany({
      where: { OR: [{ firstName: has(q) }, { lastName: has(q) }, { email: has(q) }] },
      take: TAKE, orderBy: { createdAt: 'desc' }, select: { id: true, firstName: true, lastName: true, email: true, role: true },
    });
    add('People', users.map((u) => ({ id: u.id, title: `${u.firstName} ${u.lastName}`, subtitle: `${u.role} · ${u.email}`, to: `/admin/users?q=${encodeURIComponent(u.email)}` })));
  }
  if (role === 'student') {
    const mentors = await prisma.mentor.findMany({
      where: { isApproved: true, user: { isActive: true }, OR: [{ title: has(q) }, { org: has(q) }, { user: { firstName: has(q) } }, { user: { lastName: has(q) } }] },
      take: TAKE, select: { id: true, title: true, user: { select: { firstName: true, lastName: true } } },
    });
    add('Mentors', mentors.map((m) => ({ id: m.id, title: `${m.user.firstName} ${m.user.lastName}`, subtitle: m.title, to: `/mentorship?book=${m.id}` })));
  }
  if (role === 'mentor') {
    const mentor = await prisma.mentor.findUnique({ where: { userId: req.user.id }, select: { id: true } });
    if (mentor) {
      const sessions = await prisma.booking.findMany({
        where: { mentorId: mentor.id, OR: [{ topic: has(q) }, { student: { firstName: has(q) } }, { student: { lastName: has(q) } }] },
        orderBy: { scheduledAt: 'desc' }, take: TAKE, select: { id: true, topic: true, scheduledAt: true, student: { select: { firstName: true, lastName: true } } },
      });
      add('Your sessions', sessions.map((b) => ({ id: b.id, title: `${b.student.firstName} ${b.student.lastName}`, subtitle: b.topic, date: b.scheduledAt, to: '/mentor/sessions' })));
    }
  }
  add('Courses', courses.map((c) => ({ id: c.id, title: c.title, subtitle: `${c.category === 'english' ? 'English' : 'Computer skills'} · ${c.level}`, to: courseTo(c) })));
  add('Lessons', lessons.map((l) => ({ id: l.id, title: l.title, subtitle: l.course.title, to: role === 'admin' ? `/admin/lessons/${l.id}` : `/lessons/${l.id}` })));
  add('Scholarships', scholarships.map((s) => ({ id: s.id, title: s.name, subtitle: `${s.orgName} · ${s.hostCountry}${s.isActive ? '' : ' · hidden'}`, to: scholarshipTo(s) })));
  res.json({ groups });
});

export default router;
