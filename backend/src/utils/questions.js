// Question types shared by lesson quizzes and final exams.
//   single     — one correct answer (radio buttons)
//   multiple   — several correct answers (tick boxes); all of them, and only them, must be chosen
//   true_false — True or False
//   short      — the student types a short answer; any of the accepted answers counts (not case-sensitive)
import { z } from 'zod';

export const QUESTION_TYPES = ['single', 'multiple', 'true_false', 'short'];
const TF = ['True', 'False'];

const norm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/[’']/g, "'").replace(/[.,!?;:"]/g, '').replace(/\s+/g, ' ').trim();

// Correct answers of a question (older quiz rows only have `correctAnswer`).
export function correctOf(q) {
  const list = Array.isArray(q.correctAnswers) ? q.correctAnswers.filter(Boolean) : [];
  return list.length ? list : (q.correctAnswer ? [q.correctAnswer] : []);
}

export const optionsOf = (q) => (q.type === 'true_false' ? TF : q.type === 'short' ? [] : (Array.isArray(q.options) ? q.options : []));

// Is this answer right? `answer` is a string, or an array of strings for "multiple".
export function isCorrect(q, answer) {
  const right = correctOf(q);
  if (q.type === 'multiple') {
    const got = new Set((Array.isArray(answer) ? answer : [answer]).filter(Boolean));
    return got.size === right.length && right.every((r) => got.has(r));
  }
  if (q.type === 'short') return right.some((r) => norm(r) === norm(answer)) && norm(answer) !== '';
  return typeof answer === 'string' && right.includes(answer);
}

export const answered = (q, answer) => (q.type === 'multiple' ? Array.isArray(answer) && answer.length > 0 : String(answer ?? '').trim() !== '');

// What students may see before answering (no correct answers).
export const publicQuestion = (q, options) => ({
  id: q.id, type: q.type || 'single', question: q.question, imageUrl: q.imageUrl || null,
  options: options || optionsOf(q), points: q.points ?? 1,
});

// Shown after answering.
export const correctText = (q) => correctOf(q).join(q.type === 'short' ? ' / ' : ', ');

// Admin form validation (quiz questions and exam questions).
export const questionSchema = z.object({
  type: z.enum(QUESTION_TYPES).default('single'),
  question: z.string().trim().min(3, 'Please write the question.').max(2000),
  options: z.array(z.string().trim().min(1, 'Answer options cannot be empty.')).max(8).default([]),
  correctAnswers: z.array(z.string().trim().min(1)).default([]),
  correctAnswer: z.string().trim().optional(), // older clients
  imageUrl: z.string().trim().max(500).optional().nullable().or(z.literal('')),
  explanation: z.string().trim().max(2000).optional().nullable(),
  points: z.coerce.number().int().min(1).max(20).optional(),
}).transform((q) => {
  const correctAnswers = q.correctAnswers.length ? q.correctAnswers : (q.correctAnswer ? [q.correctAnswer] : []);
  const options = q.type === 'true_false' ? TF : q.type === 'short' ? [] : q.options;
  return { ...q, options, correctAnswers, imageUrl: q.imageUrl || null };
}).superRefine((q, ctx) => {
  const add = (message, path = 'correctAnswers') => ctx.addIssue({ code: 'custom', message, path: [path] });
  if (q.type === 'short') {
    if (!q.correctAnswers.length) add('Please write at least one accepted answer.');
    return;
  }
  if ((q.type === 'single' || q.type === 'multiple') && q.options.length < 2) add('Please give at least 2 answer options.', 'options');
  if (new Set(q.options.map(norm)).size !== q.options.length) add('Two answer options are the same.', 'options');
  if (!q.correctAnswers.length) add('Please choose the correct answer.');
  if (q.correctAnswers.some((a) => !q.options.includes(a))) add('The correct answer must be one of the options.');
  if (q.type !== 'multiple' && q.correctAnswers.length > 1) add('Choose only one correct answer (or use the "Several correct answers" type).');
});

// Turns a validated question into database fields (quiz rows also keep `correctAnswer`).
export const questionData = (q, { forQuiz = false } = {}) => ({
  type: q.type, question: q.question, options: q.options, correctAnswers: q.correctAnswers, imageUrl: q.imageUrl,
  explanation: q.explanation || null,
  ...(forQuiz ? { correctAnswer: q.correctAnswers[0] || '' } : { points: q.points ?? 1 }),
});

// "Paste questions" import. Format (blank line between questions):
//   Q: What is the capital of Rwanda?
//   - Nairobi
//   * Kigali          (* = correct; several * = several correct answers)
//   - Kampala
//   E: Kigali is the capital.   (optional explanation)
// True/false:  Q: The sun is a star.   then   A: True
// Short answer: Q: Type the plural of "child".   then   A: children | Children   (accepted answers)
export function parseQuestions(text) {
  const blocks = String(text || '').replace(/\r/g, '').split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  const out = [];
  const errors = [];
  blocks.forEach((block, i) => {
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
    const qLine = lines.find((l) => /^(q|question)\s*[:.)-]/i.test(l)) || lines[0];
    const question = qLine.replace(/^(q|question)\s*[:.)-]\s*/i, '').replace(/^\d+[.)]\s*/, '');
    const opts = []; const right = []; let explanation = null; let answerLine = null;
    for (const l of lines) {
      if (l === qLine) continue;
      if (/^(e|explanation)\s*:/i.test(l)) explanation = l.replace(/^(e|explanation)\s*:\s*/i, '');
      else if (/^(a|answer)\s*:/i.test(l)) answerLine = l.replace(/^(a|answer)\s*:\s*/i, '');
      else if (/^[*✓]\s*/.test(l)) { const o = l.replace(/^[*✓]\s*/, ''); opts.push(o); right.push(o); }
      else if (/^[-•]\s*|^[a-h][.)]\s+/i.test(l)) opts.push(l.replace(/^[-•]\s*|^[a-h][.)]\s+/i, ''));
    }
    let q;
    if (!opts.length && answerLine && /^(true|false)$/i.test(answerLine)) {
      q = { type: 'true_false', question, correctAnswers: [answerLine[0].toUpperCase() + answerLine.slice(1).toLowerCase()], explanation };
    } else if (!opts.length && answerLine) {
      q = { type: 'short', question, correctAnswers: answerLine.split('|').map((s) => s.trim()).filter(Boolean), explanation };
    } else {
      q = { type: right.length > 1 ? 'multiple' : 'single', question, options: opts, correctAnswers: right, explanation };
    }
    const parsed = questionSchema.safeParse(q);
    if (parsed.success) out.push(parsed.data);
    else errors.push(`Question ${i + 1} ("${question.slice(0, 40)}"): ${parsed.error.issues[0].message}`);
  });
  return { questions: out, errors };
}

// Fisher–Yates shuffle (copy).
export function shuffled(list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i -= 1) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
