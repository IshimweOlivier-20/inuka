// "Type your S6 results, see your options": programmes the student qualifies for (or almost), scholarships,
// and second-chance paths (TVET, short courses, re-sitting the exam) when marks are low.
import { prisma } from '../lib/prisma.js';
import { GRADES, MAX_POINTS, checkRequirements, gradeOf, pointsOf } from '../lib/grading.js';
import { scoreScholarship } from './scholarshipMatch.js';

const isProd = () => process.env.NODE_ENV === 'production';
const UNI_SELECT = { id: true, slug: true, name: true, shortName: true, kind: true, city: true, website: true, accessibility: true, isSample: true, verifiedAt: true };
const LOW_POINTS = 9; // below this, second-chance paths come first

export async function computeOptions(result, user = null) {
  const subjects = (result.subjects || []).map((s) => ({ subject: s.subject, grade: gradeOf(s), percent: s.percent ?? null }));
  const points = pointsOf(subjects);
  const [programmes, scholarships, courses] = await Promise.all([
    prisma.programme.findMany({
      where: { isPublished: true, university: { isPublished: true, ...(isProd() && { isSample: false }) } },
      include: { university: { select: UNI_SELECT } }, orderBy: [{ university: { name: 'asc' } }, { name: 'asc' }],
    }),
    prisma.scholarship.findMany({ where: { isActive: true }, orderBy: [{ deadline: { sort: 'asc', nulls: 'last' } }] }),
    prisma.course.findMany({ where: { isPublished: true }, select: { slug: true, title: true, category: true, level: true }, orderBy: { orderIndex: 'asc' } }),
  ]);

  const checked = programmes.map((p) => {
    const c = checkRequirements(p, { ...result, subjects });
    return {
      id: p.id, name: p.name, field: p.field, award: p.award, durationYears: p.durationYears, minPoints: p.minPoints,
      required: p.required, combinations: p.combinations, notes: p.notes, applyUrl: p.applyUrl,
      university: p.university, status: c.status, gaps: c.gaps,
    };
  });
  const byStatus = (st, awards) => checked.filter((p) => p.status === st && awards.includes(p.award));

  // Scholarships: the student's profile rules (study level, refugee-only…) + a published minimum grade, if any.
  const now = new Date();
  const sch = scholarships
    .filter((s) => !s.deadline || s.deadline >= now)
    .map((s) => {
      // Someone typing S6 results is finishing secondary school: postgraduate-only scholarships are left out.
      if (!user && s.level === 'postgraduate') return null;
      const profile = user ? scoreScholarship(s, { ...user, educationLevel: user.educationLevel || 'S6' }) : { score: null, reasons: [] };
      if (user && !profile) return null; // the student cannot apply (e.g. postgraduate only)
      const gradeOk = s.minPoints == null || points >= s.minPoints;
      return {
        id: s.id, slug: s.slug, name: s.name, orgName: s.orgName, hostCountry: s.hostCountry, fundingType: s.fundingType,
        deadline: s.deadline, openToRefugees: s.openToRefugees, disabilityFriendly: s.disabilityFriendly, minPoints: s.minPoints,
        gradeBased: s.minPoints != null, gradeOk, match: profile?.score ?? null,
      };
    })
    .filter(Boolean)
    .sort((a, b) => Number(b.gradeOk) - Number(a.gradeOk) || (b.match ?? 0) - (a.match ?? 0));

  const weak = subjects.filter((s) => GRADES.indexOf(s.grade) >= GRADES.indexOf('D'));
  const bachelors = byStatus('qualify', ['bachelor']).length;
  const low = points < LOW_POINTS || bachelors === 0;

  return {
    summary: {
      points, maxPoints: MAX_POINTS, subjects,
      strongest: [...subjects].sort((a, b) => GRADES.indexOf(a.grade) - GRADES.indexOf(b.grade))[0] || null,
      weak, estimated: result.system === 'other',
      counts: { qualify: byStatus('qualify', ['bachelor', 'diploma', 'certificate']).length, almost: byStatus('almost', ['bachelor', 'diploma', 'certificate']).length },
    },
    degrees: { qualify: byStatus('qualify', ['bachelor']), almost: byStatus('almost', ['bachelor']) },
    diplomas: { qualify: byStatus('qualify', ['diploma', 'certificate']), almost: byStatus('almost', ['diploma', 'certificate']) },
    scholarships: sch,
    secondChance: {
      recommended: low, // show it first when marks are low
      resit: weak.length ? {
        subjects: weak.map((s) => s.subject),
        plan: weak.map((s) => ({ subject: s.subject, grade: s.grade, hoursPerWeek: s.grade === 'F' || s.grade === 'S' ? 6 : 4 })),
      } : null,
      skills: courses.filter((c) => c.category === 'english' || c.category === 'computer').slice(0, 6),
      noGradeScholarships: sch.filter((s) => !s.gradeBased).length,
    },
    disclaimer: 'Requirements change every year. Always confirm on the university or scholarship website before you apply.',
  };
}
