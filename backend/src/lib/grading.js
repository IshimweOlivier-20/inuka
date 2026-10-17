// S6 (A-level) grades and combinations used by "Type your S6 results, see your options".
//
// IMPORTANT: check this scale against NESA's official grading rules before launch and change it here if needed.
// Principal subjects are graded A (best) to F. Points: A 6, B 5, C 4, D 3, E 2, S 1, F 0 (so 3 subjects = up to 18).
export const GRADES = ['A', 'B', 'C', 'D', 'E', 'S', 'F'];
export const POINTS = { A: 6, B: 5, C: 4, D: 3, E: 2, S: 1, F: 0 };
export const MAX_POINTS = 18;
export const PASS_GRADE = 'E'; // a "principal pass"

// Common combinations and their three principal subjects. Students can also pick "Other" and choose subjects.
export const COMBINATIONS = {
  MPC: ['Mathematics', 'Physics', 'Computer Science'],
  MPG: ['Mathematics', 'Physics', 'Geography'],
  MCE: ['Mathematics', 'Computer Science', 'Economics'],
  MEG: ['Mathematics', 'Economics', 'Geography'],
  PCB: ['Physics', 'Chemistry', 'Biology'],
  PCM: ['Physics', 'Chemistry', 'Mathematics'],
  MCB: ['Mathematics', 'Chemistry', 'Biology'],
  BCG: ['Biology', 'Chemistry', 'Geography'],
  HEG: ['History', 'Economics', 'Geography'],
  HGL: ['History', 'Geography', 'Literature in English'],
  HEL: ['History', 'Economics', 'Literature in English'],
  LKF: ['Literature in English', 'Kinyarwanda', 'French'],
  LFK: ['Literature in English', 'French', 'Kiswahili'],
};
export const SUBJECTS = [...new Set(Object.values(COMBINATIONS).flat())].sort();

// Students from another school system (e.g. Burundi, DR Congo) type a percentage; INUKA estimates a letter.
// This is an ESTIMATE shown as such: universities do their own official conversion.
export function percentToGrade(p) {
  const n = Number(p);
  if (n >= 80) return 'A';
  if (n >= 70) return 'B';
  if (n >= 60) return 'C';
  if (n >= 50) return 'D';
  if (n >= 40) return 'E';
  if (n >= 35) return 'S';
  return 'F';
}

export const gradeOf = (s) => (s.grade ? String(s.grade).toUpperCase() : percentToGrade(s.percent));
export const pointsOf = (subjects) => subjects.reduce((t, s) => t + (POINTS[gradeOf(s)] ?? 0), 0);
// How many grade steps below the minimum (0 = meets it).
export const stepsBelow = (grade, min) => Math.max(0, GRADES.indexOf(grade) - GRADES.indexOf(min));
const norm = (s) => String(s || '').trim().toLowerCase();

// Checks one programme (or scholarship) against the student's results.
// Returns { status: 'qualify' | 'almost' | 'no', gaps: [plain-English reasons], points }.
export function checkRequirements(req, result) {
  const subjects = (result.subjects || []).map((s) => ({ subject: s.subject, grade: gradeOf(s) }));
  const points = pointsOf(subjects);
  const gaps = [];
  let missingSubject = false;
  let steps = 0;

  const combos = Array.isArray(req.combinations) ? req.combinations : [];
  const required = Array.isArray(req.required) ? req.required : [];
  if (combos.length && result.combination && !combos.includes(result.combination)
    && !required.length) {
    // A combination list with no subject list: the combination itself must match.
    gaps.push(`Accepts ${combos.join(', ')}`);
    missingSubject = true;
  }
  for (const r of required) {
    const mine = subjects.find((s) => norm(s.subject) === norm(r.subject));
    if (!mine) { gaps.push(`Needs ${r.subject}`); missingSubject = true; continue; }
    const below = stepsBelow(mine.grade, r.minGrade || PASS_GRADE);
    if (below > 0) { steps += below; gaps.push(`${r.subject}: ${r.minGrade || PASS_GRADE} or better (you have ${mine.grade})`); }
  }
  const pointGap = req.minPoints ? Math.max(0, req.minPoints - points) : 0;
  if (pointGap > 0) gaps.push(`${req.minPoints} points or more (you have ${points})`);

  let status = 'no';
  if (!missingSubject && steps === 0 && pointGap === 0) status = 'qualify';
  else if (!missingSubject && steps <= 1 && pointGap <= 2) status = 'almost';
  return { status, gaps, points };
}
