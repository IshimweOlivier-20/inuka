// Scholarship readiness: "You are 62% ready", with each missing item and the link that fixes it.
// Uses what INUKA already knows: the profile, S6 results, English course progress and certificates,
// the document vault and recommendation letters received.
import { prisma } from '../lib/prisma.js';
import { ALWAYS_REQUIRED_DOCS, CONDITIONAL_DOCS } from '../lib/constants.js';
import { pointsOf } from '../lib/grading.js';
import { scoreScholarship } from './scholarshipMatch.js';

const ENGLISH_GOOD = 60; // % of English lesson quizzes passed counts as "Intermediate"

// Everything about the student that every scholarship check needs, loaded once.
export async function readinessContext(user) {
  const [docs, result, englishCert, englishLessons] = await Promise.all([
    prisma.document.findMany({ where: { userId: user.id }, select: { docType: true } }),
    prisma.s6Result.findUnique({ where: { userId: user.id } }),
    prisma.certificate.findFirst({ where: { userId: user.id, course: { category: 'english' } }, include: { course: { select: { title: true } } } }),
    prisma.lesson.findMany({ where: { isPublished: true, course: { isPublished: true, category: 'english' }, quizzes: { some: {} } }, select: { id: true } }),
  ]);
  const best = englishLessons.length
    ? await prisma.progress.findMany({ where: { userId: user.id, lessonId: { in: englishLessons.map((l) => l.id) }, bestScore: { not: null } }, select: { bestScore: true } })
    : [];
  const englishPercent = englishLessons.length ? Math.round(best.reduce((s, p) => s + p.bestScore, 0) / englishLessons.length) : 0;
  return { have: new Set(docs.map((d) => d.docType)), result, englishCert, englishPercent };
}

export function readinessFor(s, user, ctx) {
  const profile = scoreScholarship(s, user);
  if (!profile) {
    return { eligible: false, percent: 0, items: [], note: s.refugeesOnly ? 'This scholarship is only for refugees.' : 'This scholarship is not open to your study level.' };
  }
  const items = [];
  const add = (key, label, weight, done, fix, partial = null) => items.push({ key, label, weight, done: !!done, partial, fix: done ? null : fix });

  // 1. Profile
  const missingProfile = ['educationLevel', 'countryResidence', 'refugeeStatus'].filter((k) => !user[k]);
  add('profile', 'Profile complete (level, country, refugee status)', 10, !missingProfile.length, { label: 'Complete your profile', to: '/profile' });

  // 2. Grades
  if (!ctx.result) add('results', 'S6 results added', 15, false, { label: 'Add your S6 results', to: '/options' });
  else if (s.minPoints != null) {
    const pts = pointsOf(ctx.result.subjects);
    add('grades', `Grades: ${s.minPoints} points or more (you have ${pts})`, 15, pts >= s.minPoints, { label: 'See second-chance options', to: '/options' });
  } else add('results', 'S6 results added', 15, true, null);

  // 3. English
  if (s.languageOfStudy !== 'French') {
    const done = !!ctx.englishCert || ctx.englishPercent >= ENGLISH_GOOD;
    add('english', ctx.englishCert ? `English certificate (${ctx.englishCert.course.title})` : `English level: ${ctx.englishPercent}% of lesson quizzes passed`, 20, done,
      { label: 'Continue the English course', to: '/courses' }, done ? null : Math.min(1, ctx.englishPercent / ENGLISH_GOOD));
  }

  // 4. Documents (letters and the English certificate are checked on their own lines)
  const isRefugee = user.refugeeStatus === 'yes';
  const docs = ALWAYS_REQUIRED_DOCS
    .filter((d) => d.key !== 'personal_statement' && (!d.refugeeOnly || isRefugee || s.refugeesOnly))
    .map((d) => ({ label: d.label, ok: d.vault.some((v) => ctx.have.has(v)), type: d.vault[0] }))
    .concat((s.documentsRequired || [])
      .filter((k) => CONDITIONAL_DOCS[k] && !['recommendation_letters', 'english_proficiency'].includes(k) && CONDITIONAL_DOCS[k].vault.length)
      .map((k) => ({ label: CONDITIONAL_DOCS[k].label, ok: CONDITIONAL_DOCS[k].vault.some((v) => ctx.have.has(v)), type: CONDITIONAL_DOCS[k].vault[0] })));
  const okDocs = docs.filter((d) => d.ok).length;
  const firstMissing = docs.find((d) => !d.ok);
  add('documents', `Documents uploaded: ${okDocs} of ${docs.length}`, 30, okDocs === docs.length,
    firstMissing && { label: `Upload: ${firstMissing.label.split('(')[0].trim()}`, to: `/profile?tab=documents&type=${firstMissing.type}` },
    docs.length ? okDocs / docs.length : 1);

  // 5. Personal statement
  add('statement', 'Personal statement written', 15, ctx.have.has('personal_statement'),
    { label: 'Write it with INUKA AI feedback, then upload it', to: '/profile?tab=documents&type=personal_statement' });

  // 6. Recommendation letters (when the scholarship asks for them)
  if ((s.documentsRequired || []).includes('recommendation_letters')) {
    const n = ['recommendation_1', 'recommendation_2'].filter((t) => ctx.have.has(t)).length; // letters received land here
    add('letters', `Recommendation letters: ${n} of 2`, 10, n >= 2, { label: 'Ask a teacher for a letter', to: '/profile?tab=letters' }, n / 2);
  }

  const total = items.reduce((t, i) => t + i.weight, 0);
  const earned = items.reduce((t, i) => t + (i.done ? i.weight : i.weight * (i.partial || 0)), 0);
  return { eligible: true, percent: Math.round((earned / total) * 100), items, match: profile.score };
}
