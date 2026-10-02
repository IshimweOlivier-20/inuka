// Seeds courses, lessons, quizzes, badges and scholarships. Safe to run more than once.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import bcrypt from 'bcrypt';
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
const here = dirname(fileURLToPath(import.meta.url));
const load = (f) => JSON.parse(readFileSync(join(here, '..', 'seed', f), 'utf8'));

function placeholderContent(title, summary) {
  return `<p>In this lesson you will learn about <strong>${summary.charAt(0).toLowerCase() + summary.slice(1)}</strong>.</p>
<p><em>Full lesson content for “${title}” is being written. Admins can add it from the Admin Dashboard.</em></p>`;
}

async function seedCourses() {
  const courses = load('courses.json');
  for (const [ci, c] of courses.entries()) {
    const course = await prisma.course.upsert({
      where: { slug: c.slug },
      update: { title: c.title, description: c.description, level: c.level, track: c.track, category: c.category, skills: c.skills ?? [], orderIndex: ci },
      create: { slug: c.slug, title: c.title, description: c.description, level: c.level, track: c.track, category: c.category, skills: c.skills ?? [], orderIndex: ci },
    });
    for (const [li, l] of c.lessons.entries()) {
      const data = { title: l.title, summary: l.summary, contentHtml: l.content ?? placeholderContent(l.title, l.summary) };
      const lesson = await prisma.lesson.upsert({
        where: { courseId_orderIndex: { courseId: course.id, orderIndex: li } },
        update: data,
        create: { ...data, courseId: course.id, orderIndex: li },
      });
      if (l.quiz) {
        await prisma.quiz.deleteMany({ where: { lessonId: lesson.id } });
        await prisma.quiz.createMany({
          data: l.quiz.map((q, qi) => ({
            lessonId: lesson.id, question: q.question, options: q.options,
            correctAnswer: q.answer, explanation: q.explanation, orderIndex: qi,
          })),
        });
      }
    }
  }
  console.log(`✓ ${courses.length} courses, ${courses.reduce((n, c) => n + c.lessons.length, 0)} lessons`);
}

async function seedBadges() {
  const badges = load('badges.json');
  for (const b of badges) {
    await prisma.badge.upsert({ where: { key: b.key }, update: b, create: b });
  }
  console.log(`✓ ${badges.length} badges`);
}

async function seedScholarships() {
  const list = load('scholarships.json');
  for (const s of list) {
    const data = { ...s, deadline: s.deadline ? new Date(s.deadline) : null };
    await prisma.scholarship.upsert({ where: { slug: s.slug }, update: data, create: data });
  }
  console.log(`✓ ${list.length} scholarships`);
}

async function seedHomeContent() {
  const home = load('home.json');
  // Posts are updated by slug. Other content is only inserted into empty tables,
  // so anything you add or edit yourself (e.g. in Prisma Studio) is never overwritten.
  for (const p of home.posts) {
    await prisma.post.upsert({ where: { slug: p.slug }, update: p, create: p });
  }
  const fill = async (model, rows, label) => {
    if ((await prisma[model].count()) > 0) return console.log(`• ${label}: already has content, skipped`);
    await prisma[model].createMany({ data: rows.map((r, i) => ({ ...r, orderIndex: i })) });
    console.log(`✓ ${rows.length} ${label}`);
  };
  await fill('tip', home.tips, 'tips');
  await fill('faqItem', home.faq, 'FAQ items');
  await fill('teamMember', home.team, 'team members');
  // Placeholder team members get stock photos of young Africans (free Unsplash photos) until real people are added.
  // Real team members are never given a stock photo: add their own photo in Admin → Website content → Team.
  for (const t of home.team.filter((x) => x.isSample && x.photoUrl)) {
    await prisma.teamMember.updateMany({ where: { isSample: true, role: t.role, photoUrl: null }, data: { photoUrl: t.photoUrl } });
  }
  for (const t of home.testimonials.filter((x) => x.isSample && x.photoUrl)) {
    await prisma.testimonial.updateMany({ where: { isSample: true, role: t.role, photoUrl: null }, data: { photoUrl: t.photoUrl } });
  }
  await fill('testimonial', home.testimonials, 'testimonials (samples)');
  // Partners: remove old placeholder partners, then add the organisations list.
  // They are added UNPUBLISHED: publish each one (isPublished = true) only once that organisation has agreed
  // to be shown as an INUKA partner and has given you its logo file.
  const removed = await prisma.partner.deleteMany({ where: { isSample: true } });
  if (removed.count) console.log(`✓ removed ${removed.count} placeholder partners`);
  let added = 0;
  for (const [i, org] of home.partnerOrganisations.entries()) {
    const exists = await prisma.partner.findFirst({ where: { name: org.name } });
    if (exists) continue;
    await prisma.partner.create({ data: { ...org, websiteUrl: org.websiteUrl || null, orderIndex: i, isPublished: false } });
    added++;
  }
  console.log(`✓ ${added} partner organisations added (unpublished until confirmed)`);
  console.log(`✓ ${home.posts.length} news & guides`);
}

async function seedAdmin() {
  const email = process.env.SEED_ADMIN_EMAIL || 'admin@inuka.app';
  const password = process.env.SEED_ADMIN_PASSWORD || 'ChangeMe123';
  await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      firstName: 'INUKA', lastName: 'Admin', email, role: 'admin', isVerified: true,
      passwordHash: await bcrypt.hash(password, 12),
    },
  });
  console.log(`✓ admin account: ${email}`);
}

// Test student account (development only), so all three dashboards can be tried.
async function seedTestStudent() {
  if (process.env.NODE_ENV === 'production') return;
  const email = process.env.SEED_STUDENT_EMAIL || 'student@inuka.app';
  const password = process.env.SEED_STUDENT_PASSWORD || 'ChangeMe123';
  await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      firstName: 'Test', lastName: 'Student', email, role: 'student', isVerified: true,
      countryOrigin: 'Burundi', countryResidence: 'Rwanda', refugeeStatus: 'yes', educationLevel: 'S6', language: 'Kirundi', age: 19,
      passwordHash: await bcrypt.hash(password, 12),
    },
  });
  console.log(`✓ test student account: ${email} (development only)`);
}

// A test mentor account so the mentor dashboard can be tried in development.
// Skipped when NODE_ENV=production. Real mentors will apply through the website (Phase 2).
async function seedTestMentor() {
  if (process.env.NODE_ENV === 'production') return;
  const email = process.env.SEED_MENTOR_EMAIL || 'mentor@inuka.app';
  const password = process.env.SEED_MENTOR_PASSWORD || 'ChangeMe123';
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      firstName: 'Test', lastName: 'Mentor', email, role: 'mentor', isVerified: true,
      passwordHash: await bcrypt.hash(password, 12),
    },
  });
  await prisma.mentor.upsert({
    where: { userId: user.id },
    update: { expertise: ['University Admissions', 'Scholarship Guidance'] }, // fixes older test data
    create: {
      userId: user.id, title: 'University admissions mentor', bio: 'Test mentor profile for development.',
      expertise: ['University Admissions', 'Scholarship Guidance'], languages: ['English', 'Kinyarwanda'], isApproved: true,
      slots: { create: [{ dayOfWeek: 2, startTime: '14:00', endTime: '15:00' }, { dayOfWeek: 4, startTime: '16:00', endTime: '17:00' }] },
    },
  });
  console.log(`✓ test mentor account: ${email} (development only)`);
}

try {
  await seedCourses();
  await seedBadges();
  await seedScholarships();
  await seedHomeContent();
  await seedAdmin();
  await seedTestStudent();
  await seedTestMentor();
} catch (e) {
  console.error(e);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
