// INUKA AI inside lessons (spec 13.4 + course plan):
//   • English Writing, Lesson 8 "Final Writing Task + AI Feedback"   → writing review (paragraph)
//   • Essay Composition, Lesson 10 "Full Essay Practice"              → writing review (essay)
//   • Writing for Scholarships, Lesson 8 "Full Draft Review"          → writing review (personal statement / letter)
//   • Speaking & Pronunciation, Lesson 4 "Introducing Yourself"       → spoken practice conversation (voice)
// FREE: with a free AI key the review and the conversation come from the AI; without one (or if the AI is down)
// INUKA's built-in checker and a scripted speaking partner are used instead.
import { AiError, SYSTEM_PROMPT, aiEnabled, callModel } from './aiService.js';

// Which lessons have an activity: matched by course slug and lesson title (so re-ordering lessons does not break it).
export const AI_ACTIVITIES = [
  {
    course: 'english-writing-basics', title: /final writing task|ai feedback/i, type: 'writing', kind: 'paragraph',
    task: 'Write one paragraph about yourself: who you are, where you are from, what you like to study, and your goals for the future.',
    minWords: 80, maxWords: 150,
  },
  {
    course: 'english-essays', title: /full essay practice/i, type: 'writing', kind: 'essay',
    task: 'Write an essay of about 400 words: "Why education matters for young people in my community." Use an introduction with a thesis statement, two or three body paragraphs (PEEL), and a conclusion.',
    minWords: 350, maxWords: 450,
  },
  {
    course: 'english-scholarship-writing', title: /full draft review/i, type: 'writing', kind: 'statement',
    task: 'Paste the draft of your personal statement or motivation letter. INUKA AI will review it like a scholarship reader would.',
    minWords: 250, maxWords: 800,
  },
  {
    course: 'english-speaking', title: /introducing yourself/i, type: 'voice', kind: 'introduce',
    task: 'Practise introducing yourself in a short conversation. INUKA AI asks you questions out loud; answer by speaking (or typing).',
  },
];
// The lesson's own activity (set by an admin) wins; { type: 'none' } turns it off; otherwise the built-in list.
export function activityFor(courseSlug, lessonTitle, lessonActivity) {
  if (lessonActivity && typeof lessonActivity === 'object') return lessonActivity.type === 'none' ? null : lessonActivity;
  const a = AI_ACTIVITIES.find((x) => x.course === courseSlug && x.title.test(lessonTitle || ''));
  if (!a) return null;
  const { course, title, ...rest } = a;
  return rest;
}

const KIND_LABEL = { paragraph: 'paragraph', essay: 'essay', statement: 'personal statement or motivation letter' };
const words = (t) => (t.match(/[A-Za-zÀ-ɏ']+/g) || []);

// ------------------------------------------------------------------------------------------------
// Writing review
// ------------------------------------------------------------------------------------------------
const COMMON_MISTAKES = {
  alot: 'a lot', becouse: 'because', beacause: 'because', becuase: 'because', dont: "don't", doesnt: "doesn't", didnt: "didn't", cant: "can't",
  wont: "won't", im: "I'm", ive: "I've", untill: 'until', recieve: 'receive', recieved: 'received', beleive: 'believe', goverment: 'government',
  enviroment: 'environment', wich: 'which', studing: 'studying', carrer: 'career', oportunity: 'opportunity', oppotunity: 'opportunity',
  scholaship: 'scholarship', scolarship: 'scholarship', univercity: 'university', universty: 'university', definately: 'definitely',
  sucess: 'success', succes: 'success', comunity: 'community', adress: 'address', writting: 'writing', freind: 'friend', thier: 'their',
  begining: 'beginning', tommorow: 'tomorrow', wether: 'whether', knowlege: 'knowledge', familly: 'family', responsability: 'responsibility',
  developement: 'development', experiance: 'experience', independant: 'independent', neccessary: 'necessary', occured: 'occurred',
};
const PROPER = ['english', 'french', 'africa', 'african', 'rwanda', 'kenya', 'uganda', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday', 'january', 'february', 'march', 'april', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
const STOP = new Set('the a an and or but to of in on at for with is are was were be been am i my me we our you your it this that they them their he she his her as by from so very also can will would have has had do does did not no yes there here more most some any all one two'.split(' '));
const TRANSITIONS = /\b(first(ly)?|second(ly)?|finally|however|moreover|furthermore|therefore|for example|for instance|in addition|also|because|as a result|in conclusion|to conclude|on the other hand|although)\b/gi;

export function basicReview(text, kind = 'paragraph', target = {}) {
  const clean = text.replace(/\r/g, '').trim();
  const paras = clean.split(/\n\s*\n|\n(?=\s*[A-Z])/).map((p) => p.trim()).filter(Boolean);
  const sentences = clean.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter((s) => words(s).length);
  const w = words(clean);
  const n = w.length;
  const avg = sentences.length ? Math.round(n / sentences.length) : n;
  const good = [];
  const improve = [];
  const fixes = [];
  const min = target.minWords || { paragraph: 80, essay: 350, statement: 250 }[kind];
  const max = target.maxWords || { paragraph: 150, essay: 450, statement: 800 }[kind];

  // Length
  if (n < min) improve.push(`Your ${KIND_LABEL[kind]} has **${n} words**. Aim for ${min}–${max} words: add one or two more ideas with an example.`);
  else if (n > max) improve.push(`Your ${KIND_LABEL[kind]} has **${n} words**. Try to stay under ${max}: remove sentences that repeat the same idea.`);
  else good.push(`Good length: **${n} words** (target ${min}–${max}).`);

  // Sentences
  const long = sentences.filter((s) => words(s).length > 30);
  if (long.length) improve.push(`${long.length === 1 ? 'One sentence is' : `${long.length} sentences are`} very long (more than 30 words). Split ${long.length === 1 ? 'it' : 'them'} into two shorter sentences. For example: “${long[0].slice(0, 90)}${long[0].length > 90 ? '…' : ''}”`);
  else if (sentences.length >= 3 && avg <= 22) good.push(`Your sentences are clear and not too long (about ${avg} words each).`);
  const noEnd = clean && !/[.!?]["')\]]?$/.test(clean);
  if (noEnd) fixes.push('End your last sentence with a full stop (.)');
  const lowerStarts = sentences.filter((s) => /^[a-z]/.test(s));
  if (lowerStarts.length) fixes.push(`Start every sentence with a capital letter, e.g. “${lowerStarts[0].slice(0, 40)}…” → “${lowerStarts[0][0].toUpperCase()}${lowerStarts[0].slice(1, 40)}…”`);
  if (/(^|\s)i(\s|'|’|$)/.test(clean)) fixes.push('Write “I” (me) as a capital letter: “i am” → “I am”.');

  // Spelling and capital letters
  const seen = new Set();
  for (const raw of w) {
    const lw = raw.toLowerCase().replace(/[’']/g, '');
    if (COMMON_MISTAKES[lw] && !seen.has(lw)) { seen.add(lw); fixes.push(`“${raw}” → “${COMMON_MISTAKES[lw]}”`); }
    if (PROPER.includes(raw) && !seen.has(raw)) { seen.add(raw); fixes.push(`“${raw}” → “${raw[0].toUpperCase()}${raw.slice(1)}” (names of languages, places, days and months start with a capital letter)`); }
  }
  if (/ {2,}/.test(clean)) fixes.push('Use only one space between words.');

  // Repeated words
  const freq = {};
  for (const x of w) { const k = x.toLowerCase(); if (!STOP.has(k) && k.length > 3) freq[k] = (freq[k] || 0) + 1; }
  const repeated = Object.entries(freq).filter(([, c]) => c >= Math.max(4, n / 40)).sort((a, b) => b[1] - a[1]).slice(0, 3);
  if (repeated.length) improve.push(`You repeat ${repeated.map(([k, c]) => `“${k}” (${c} times)`).join(', ')}. Use other words sometimes, or “it” / “this”.`);
  const iStarts = sentences.filter((s) => /^I\b/.test(s)).length;
  if (sentences.length >= 5 && iStarts / sentences.length > 0.5) improve.push(`${iStarts} of your ${sentences.length} sentences start with “I”. Start some sentences differently, e.g. “Since I was young, …” or “My dream is …”.`);

  // Linking words
  const links = (clean.match(TRANSITIONS) || []).length;
  if (links >= 3) good.push('You use linking words (because, however, for example…) to connect your ideas.');
  else improve.push('Use more linking words to connect ideas: **because, for example, however, also, finally**.');

  // Structure by type
  if (kind === 'essay') {
    if (paras.length >= 4) good.push(`Clear structure: ${paras.length} paragraphs (introduction, body, conclusion).`);
    else improve.push(`Your essay has ${paras.length} paragraph${paras.length === 1 ? '' : 's'}. A good essay has at least 4: an introduction, two or three body paragraphs, and a conclusion. Leave an empty line between paragraphs.`);
    if (!/\b(in conclusion|to conclude|to sum up|in summary|finally|overall)\b/i.test(paras[paras.length - 1] || '')) improve.push('Start your last paragraph with “In conclusion,” and repeat your main idea in new words.');
    if (!/\b(believe|think|argue|important|should|because|this essay)\b/i.test(paras[0] || '')) improve.push('End your introduction with a clear thesis: one sentence that says your main opinion, e.g. “Education matters because …”.');
    if (/\bfor example|for instance|such as\b/i.test(clean)) good.push('You support your points with examples. Well done!');
    else improve.push('Add an example in each body paragraph (PEEL: Point, Evidence, Explain, Link): “For example, …”.');
  } else if (kind === 'statement') {
    const has = (re) => re.test(clean);
    if (has(/\b(goal|dream|plan|hope|want to|would like to|aspire|future)\b/i)) good.push('You explain your goals for the future.'); else improve.push('Say clearly what you want to study and what you want to do after your studies (your goals).');
    if (has(/\b(scholarship|programme|program|university|college|this course)\b/i)) good.push('You connect your story to the scholarship or university.'); else improve.push('Explain **why this scholarship or university** — name it and say what it will help you do.');
    if (has(/\b(community|country|people|village|camp|help others|give back|family)\b/i)) good.push('You show how you will help your community — readers love this.'); else improve.push('Add how your studies will help your community or country.');
    if (has(/\b(when i|i remember|in 20\d\d|for example|one day|last year)\b/i)) good.push('You include a real example from your life.'); else improve.push('Add one short true story from your life (a challenge you faced and what you learned).');
    if (paras.length < 3) improve.push('Split your text into 3–5 paragraphs: who you are, your story, your goals, why this scholarship, closing.');
  } else {
    if (paras.length === 1) good.push('One clear paragraph, as asked.');
    if (/\b(my name is|i am from|i come from|i live in)\b/i.test(clean)) good.push('You introduce yourself clearly.'); else improve.push('Start with a topic sentence that introduces you, e.g. “My name is …, and I am from …”.');
    if (/\b(goal|dream|want to|would like to|plan|future)\b/i.test(clean)) good.push('You talk about your goals.'); else improve.push('Finish with one sentence about your goals: “In the future, I want to …”.');
  }

  if (!good.length) good.push('You finished a full piece of writing — that is the hardest step. Well done!');
  const score = Math.max(1, Math.min(5, Math.round(5 - improve.length * 0.6 - Math.min(fixes.length, 5) * 0.25)));
  const list = (xs) => xs.map((x) => `- ${x}`).join('\n');
  const markdown = [
    `**Overall:** ${'★'.repeat(score)}${'☆'.repeat(5 - score)} (${score}/5). ${score >= 4 ? 'Very good work!' : score >= 3 ? 'Good start — a few changes will make it stronger.' : 'Keep going — follow the tips below and check again.'}`,
    `**What you did well**\n\n${list(good)}`,
    improve.length && `**What to improve**\n\n${list(improve)}`,
    fixes.length && `**Small fixes**\n\n${list(fixes.slice(0, 8))}`,
    '**Next step:** make the changes, then press “Check again”. You can also ask a mentor to read it on the [Mentorship page](/mentorship).',
  ].filter(Boolean).join('\n\n');
  return { markdown, score, stats: { words: n, sentences: sentences.length, paragraphs: paras.length } };
}

const REVIEW_PROMPT = (kind, task) => `You are reviewing a student's ${KIND_LABEL[kind]} for an INUKA lesson.
The task was: ${task}
Give kind, specific feedback in simple English, in this exact format (markdown):
**Overall:** a score out of 5 written as stars (e.g. ★★★★☆ (4/5)) and one encouraging sentence.
**What you did well**
- 2 or 3 points
**What to improve**
- 2 to 4 points, the most important first${kind === 'essay' ? ' (check: thesis, paragraphs, PEEL, examples, conclusion)' : kind === 'statement' ? ' (check: goals, why this scholarship, community impact, a real story, a strong opening and closing)' : ''}
**Small fixes**
- up to 5 grammar or spelling corrections as: "wrong" → "right"
**Improved example:** rewrite ONE of their sentences to show a better version.
**Next step:** one sentence.
Do not rewrite the whole text for them. Never invent facts about them.`;

export async function reviewWriting({ text, kind = 'paragraph', task = '', target = {}, user }) {
  const basic = basicReview(text, kind, target);
  if (!aiEnabled()) return { feedback: basic.markdown, mode: 'basic', stats: basic.stats };
  try {
    const system = `${SYSTEM_PROMPT}\n\n${REVIEW_PROMPT(kind, task)}${user?.firstName ? `\nThe student's first name is ${user.firstName}.` : ''}`;
    const { text: out } = await callModel({ system, messages: [{ role: 'user', content: `Here is my ${KIND_LABEL[kind]}:\n\n${text}` }] });
    if (out) return { feedback: out, mode: 'ai', stats: basic.stats };
  } catch (e) {
    console.error('Writing review AI error, using basic checker:', e instanceof AiError ? e.message : e);
  }
  return { feedback: basic.markdown, mode: 'basic', stats: basic.stats };
}

// ------------------------------------------------------------------------------------------------
// Speaking practice: "Introducing Yourself"
// ------------------------------------------------------------------------------------------------
const QUESTIONS = [
  "Hello! I'm your INUKA speaking partner. Let's practise introducing yourself. First question: what is your name?",
  'Nice to meet you! Where are you from, and where do you live now?',
  'Great. Tell me about your family. Who do you live with?',
  'What did you study at school, or what do you like to study?',
  'What do you like to do in your free time?',
  'Last question: what is your dream for the future?',
];
const PRACTICE_PROMPT = `You are INUKA AI, a friendly English speaking partner. The student is practising the lesson "Introducing Yourself" by speaking.
Rules:
- Ask ONE short question at a time, in this order: name; where they are from and live; family; studies; free time; dream for the future.
- After each answer: one short, warm sentence; then, only if needed, ONE gentle correction as "You can also say: ..."; then the next question.
- Use very simple words. At most 3 short sentences per turn. No lists, no markdown, no emojis (your words are read aloud).
- After their answer to the 6th question, give final feedback in at most 6 short sentences: two things they did well, one tip, and a model introduction of 4 sentences built from THEIR answers. End that final message with the word [DONE].`;

function scriptedTurn(messages) {
  const answers = messages.filter((m) => m.role === 'user').map((m) => m.content.trim());
  const last = answers[answers.length - 1] || '';
  const count = words(last).length;
  let tip = '';
  if (answers.length > 0) {
    if (count < 4) tip = `Try to answer in a full sentence. For example: "${[
      'My name is Aline.', 'I am from Burundi, and I live in Kigali.', 'I live with my mother and two brothers.',
      'I studied mathematics and physics.', 'In my free time, I like to read and play football.', 'My dream is to become a doctor.',
    ][Math.min(answers.length - 1, 5)]}" `;
    else tip = ['Good answer!', 'Well said!', 'Very good!', 'Nice, clear sentence!', 'Great!', 'Excellent!'][(answers.length - 1) % 6] + ' ';
  }
  if (answers.length < QUESTIONS.length) {
    return { reply: answers.length === 0 ? QUESTIONS[0] : `${tip}${QUESTIONS[answers.length]}`, done: false };
  }
  const full = answers.filter((a) => words(a).length >= 4).length;
  const model = answers.map((a) => a.replace(/\s+/g, ' ').replace(/^[a-z]/, (c) => c.toUpperCase()).replace(/([^.!?])$/, '$1.')).join(' ');
  return {
    reply: `${tip}Well done, you finished the practice! You answered ${full} of 6 questions in full sentences. ${full >= 5 ? 'Your answers were clear and complete.' : 'Next time, try to answer every question with a full sentence.'} Here is your introduction, all together: ${model} Practise saying it out loud three times. [DONE]`,
    done: true,
  };
}

export async function practiceTurn({ messages, user }) {
  const userTurns = messages.filter((m) => m.role === 'user').length;
  if (aiEnabled()) {
    try {
      const history = messages.length ? messages : [{ role: 'user', content: 'Hello, I am ready to practise.' }];
      const system = `${SYSTEM_PROMPT}\n\n${PRACTICE_PROMPT}${user?.firstName ? `\nThe student's first name may be ${user.firstName}, but let them say it.` : ''}`;
      const { text } = await callModel({ system, messages: history });
      if (text) {
        const done = /\[DONE\]/i.test(text) || userTurns >= 8;
        return { reply: text.replace(/\[DONE\]/gi, '').trim(), done, mode: 'ai' };
      }
    } catch (e) {
      console.error('Speaking practice AI error, using scripted partner:', e instanceof AiError ? e.message : e);
    }
  }
  const out = scriptedTurn(messages);
  return { reply: out.reply.replace(/\s*\[DONE\]/, ''), done: out.done, mode: 'basic' };
}
