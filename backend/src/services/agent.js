// INUKA Assistant — an AI agent that looks things up and acts on INUKA for the user.
//
// It is FREE to use:
//   • AI mode: uses the free AI service set in backend/.env (Gemini or Groq free tier, or Ollama on your own server).
//     The AI can call "tools" (below) to search real INUKA data: scholarships, deadlines, courses, mentors,
//     and — for signed-in students — their progress, saved scholarships and document checklist. It can also save a
//     scholarship for the student when they ask.
//   • Basic mode: with no AI key (or if the AI service is down) the assistant still answers, using the same tools with
//     simple keyword rules. No outside service, no cost.
// Visitors (not signed in) get the public tools only.
import { prisma } from '../lib/prisma.js';
import { searchScholarships } from './scholarshipSearch.js';
import { buildChecklist } from '../routes/student/scholarships.js';
import { ALWAYS_REQUIRED_DOCS } from '../lib/constants.js';
import { AiError, SYSTEM_PROMPT, aiEnabled, callModel } from './aiService.js';
import { matchScholarships } from './scholarshipMatch.js';

const MAX_STEPS = 4; // tool rounds per answer
const FUNDING = { fully_funded: 'Fully funded', partial: 'Partial funding', tuition_only: 'Tuition only' };
const LEVEL = { undergraduate: 'Undergraduate', postgraduate: 'Postgraduate', both: 'Undergraduate and postgraduate' };
const fold = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const strip = (html) => String(html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const daysLeft = (d) => (d ? Math.ceil((new Date(d) - new Date()) / 864e5) : null);
const fmtDate = (d) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: process.env.APP_TIMEZONE || 'Africa/Kigali' });
const scholarshipLink = (s) => `/opportunities/${s.slug}`;

// Short facts about one scholarship, for the AI and for basic-mode lists.
function brief(s) {
  const d = daysLeft(s.deadline);
  return {
    name: s.name, link: scholarshipLink(s), country: s.hostCountry, organisation: s.hostUniversity || s.orgName,
    funding: FUNDING[s.fundingType], level: LEVEL[s.level], openToRefugees: !!s.openToRefugees, refugeesOnly: !!s.refugeesOnly,
    deadline: s.deadline ? fmtDate(s.deadline) : 'varies', daysLeft: d,
  };
}

// Find one scholarship by slug or (part of) its name.
async function findScholarship(ref) {
  const r = String(ref || '').trim();
  if (!r) return null;
  const bySlug = await prisma.scholarship.findFirst({ where: { isActive: true, slug: r.toLowerCase() } });
  if (bySlug) return bySlug;
  const all = await prisma.scholarship.findMany({ where: { isActive: true } });
  const q = fold(r.replace(/^\/?opportunities\//, ''));
  return all.find((s) => fold(s.name) === q) || all.find((s) => fold(s.name).includes(q) || q.includes(fold(s.name)))
    || all.find((s) => fold(s.slug) === q) || null;
}

// ---------------------------------------------------------------------------------------------------
// Tools. Each has a JSON-schema for the AI and a run(args, ctx) that returns plain data.
// ctx = { user } (user is null for visitors). Student-only tools are hidden from visitors.
// ---------------------------------------------------------------------------------------------------
const TOOLS = [
  {
    name: 'search_scholarships',
    description: 'Search scholarships listed on INUKA. Use for any question about scholarships, funding or studying somewhere. Returns up to 6 open scholarships, soonest deadline first.',
    parameters: {
      type: 'object',
      properties: {
        keywords: { type: 'string', description: 'Words to search, e.g. "engineering", "Mastercard", "masters". Leave empty for all.' },
        country: { type: 'string', description: 'Country where the student would study, e.g. "Germany", "Rwanda".' },
        level: { type: 'string', enum: ['undergraduate', 'postgraduate'] },
        fully_funded: { type: 'boolean' },
        open_to_refugees: { type: 'boolean' },
        closing_within_days: { type: 'integer', description: 'Only scholarships whose deadline is within this many days.' },
      },
    },
    async run(a) {
      const base = {
        q: [a.keywords, a.country].filter(Boolean).join(' ').slice(0, 100),
        level: a.level || '', funding: a.fully_funded ? 'fully_funded' : '', refugees: a.open_to_refugees ? 'open' : undefined,
        sort: 'deadline', pageSize: 48,
      };
      let res = await searchScholarships(base);
      // Too narrow with keywords? Try again with the country only.
      if (!res.total && a.keywords && a.country) res = await searchScholarships({ ...base, q: a.country });
      let rows = res.results;
      if (a.closing_within_days) rows = rows.filter((s) => { const d = daysLeft(s.deadline); return d !== null && d >= 0 && d <= a.closing_within_days; });
      return { total: rows.length, scholarships: rows.slice(0, 6).map(brief), allResultsLink: '/opportunities' };
    },
  },
  {
    name: 'scholarship_details',
    description: 'Full details of one scholarship (eligibility, what it covers, how to apply, deadline). Give its name or slug.',
    parameters: { type: 'object', properties: { scholarship: { type: 'string' } }, required: ['scholarship'] },
    async run(a) {
      const s = await findScholarship(a.scholarship);
      if (!s) return { error: 'No scholarship with that name on INUKA.' };
      return {
        ...brief(s), language: s.languageOfStudy, about: strip(s.description).slice(0, 700),
        whoCanApply: s.eligibility, covers: s.coverage, howToApply: s.applicationSteps, deadlineNote: s.deadlineNote,
        officialWebsite: s.applyUrl,
      };
    },
  },
  {
    name: 'upcoming_deadlines',
    description: 'Scholarships closing soon, soonest first.',
    parameters: { type: 'object', properties: { within_days: { type: 'integer', description: 'Default 60.' } } },
    async run(a) {
      const days = Math.min(Math.max(a.within_days || 60, 1), 365);
      const res = await searchScholarships({ sort: 'deadline', pageSize: 48 });
      const rows = res.results.filter((s) => { const d = daysLeft(s.deadline); return d !== null && d >= 0 && d <= days; });
      return { withinDays: days, scholarships: rows.slice(0, 8).map(brief) };
    },
  },
  {
    name: 'list_courses',
    description: 'Free INUKA courses (English and computer skills). Use to recommend what to learn.',
    parameters: { type: 'object', properties: { subject: { type: 'string', enum: ['english', 'computer'] } } },
    async run(a, ctx) {
      const courses = await prisma.course.findMany({
        where: { isPublished: true, ...(a.subject && { category: a.subject }) }, orderBy: { orderIndex: 'asc' },
        include: { _count: { select: { lessons: { where: { isPublished: true } } } } },
      });
      return {
        courses: courses.map((c) => ({
          title: c.title, subject: c.category === 'english' ? 'English' : 'Computer skills', track: c.track, level: c.level,
          lessons: c._count.lessons, about: strip(c.description).slice(0, 160), link: ctx.user ? `/courses/${c.slug}` : '/learn',
        })),
      };
    },
  },
  {
    name: 'find_mentors',
    description: 'Approved INUKA mentors a student can book for free, optionally matching a topic (e.g. "essays", "engineering").',
    student: true,
    parameters: { type: 'object', properties: { topic: { type: 'string' } } },
    async run(a) {
      const mentors = await prisma.mentor.findMany({ where: { isApproved: true }, include: { user: { select: { firstName: true, lastName: true } } }, take: 50 });
      const t = fold(a.topic);
      const rows = mentors.filter((m) => !t || fold([m.title, m.org, (m.expertise || []).join(' '), m.bio].join(' ')).includes(t));
      return {
        mentors: (rows.length ? rows : mentors).slice(0, 5).map((m) => ({
          name: `${m.user.firstName} ${m.user.lastName}`, title: m.title, expertise: m.expertise, languages: m.languages,
        })),
        bookLink: '/mentorship',
      };
    },
  },
  {
    name: 'recommend_scholarships',
    description: "Best scholarships for the signed-in student's profile (study level, refugee status, country, language), with the reasons each one fits. Use when they ask what they could apply for, what fits them, or for recommendations.",
    student: true,
    parameters: { type: 'object', properties: { limit: { type: 'integer', description: 'Default 5.' } } },
    async run(a, { user }) {
      const { matches, profileComplete, missing } = await matchScholarships(user, { limit: Math.min(a.limit || 5, 8) });
      return {
        recommendations: matches.map((s) => ({ ...brief(s), matchPercent: s.match, whyItFits: s.reasons })),
        profileComplete, missingProfileFields: missing, completeProfileLink: '/profile',
      };
    },
  },
  {
    name: 'my_progress',
    description: "The signed-in student's course progress and the next lesson to do.",
    student: true,
    parameters: { type: 'object', properties: {} },
    async run(a, { user }) {
      const [courses, done, enrollments] = await Promise.all([
        prisma.course.findMany({ where: { isPublished: true }, orderBy: { orderIndex: 'asc' }, include: { lessons: { where: { isPublished: true }, select: { id: true, title: true }, orderBy: { orderIndex: 'asc' } } } }),
        prisma.progress.findMany({ where: { userId: user.id, isCompleted: true }, select: { lessonId: true } }),
        prisma.enrollment.findMany({ where: { userId: user.id } }),
      ]);
      const doneIds = new Set(done.map((d) => d.lessonId));
      const started = new Set(enrollments.map((e) => e.courseId));
      const rows = courses.filter((c) => started.has(c.id)).map((c) => {
        const completed = c.lessons.filter((l) => doneIds.has(l.id)).length;
        const next = c.lessons.find((l) => !doneIds.has(l.id));
        return {
          course: c.title, completedLessons: completed, totalLessons: c.lessons.length,
          percent: c.lessons.length ? Math.round((completed / c.lessons.length) * 100) : 0,
          nextLesson: next ? { title: next.title, link: `/lessons/${next.id}` } : null,
        };
      });
      return { coursesStarted: rows, browseCourses: '/courses' };
    },
  },
  {
    name: 'my_saved_scholarships',
    description: "Scholarships the signed-in student has saved, with deadlines.",
    student: true,
    parameters: { type: 'object', properties: {} },
    async run(a, { user }) {
      const saved = await prisma.savedScholarship.findMany({ where: { userId: user.id }, include: { scholarship: true } });
      return { saved: saved.map((x) => brief(x.scholarship)).sort((p, q) => (p.daysLeft ?? 9999) - (q.daysLeft ?? 9999)), page: '/scholarships?tab=saved' };
    },
  },
  {
    name: 'save_scholarship',
    description: 'Save a scholarship to the signed-in student\'s list. Only use when the student clearly asks to save it.',
    student: true,
    parameters: { type: 'object', properties: { scholarship: { type: 'string' } }, required: ['scholarship'] },
    async run(a, { user, actions }) {
      const s = await findScholarship(a.scholarship);
      if (!s) return { error: 'No scholarship with that name on INUKA.' };
      await prisma.savedScholarship.upsert({
        where: { userId_scholarshipId: { userId: user.id, scholarshipId: s.id } }, update: {}, create: { userId: user.id, scholarshipId: s.id },
      });
      actions?.push({ type: 'saved', name: s.name, link: scholarshipLink(s) });
      return { saved: true, name: s.name, link: scholarshipLink(s), savedListLink: '/scholarships?tab=saved' };
    },
  },
  {
    name: 'my_document_checklist',
    description: 'Which documents the signed-in student still needs to upload for one scholarship.',
    student: true,
    parameters: { type: 'object', properties: { scholarship: { type: 'string' } }, required: ['scholarship'] },
    async run(a, { user }) {
      const s = await findScholarship(a.scholarship);
      if (!s) return { error: 'No scholarship with that name on INUKA.' };
      const docs = await prisma.document.findMany({ where: { userId: user.id }, select: { docType: true } });
      const c = buildChecklist(s, user, docs);
      const all = [...c.always, ...c.conditional];
      return {
        scholarship: s.name, link: scholarshipLink(s), ready: all.filter((d) => d.uploaded).map((d) => d.label),
        missing: all.filter((d) => !d.uploaded).map((d) => d.label), uploadPage: '/profile',
      };
    },
  },
];

const toolsFor = (user) => TOOLS.filter((t) => !t.student || user?.role === 'student');

// ---------------------------------------------------------------------------------------------------
// AI mode
// ---------------------------------------------------------------------------------------------------
function agentPrompt(user, page) {
  const today = fmtDate(new Date());
  return `${SYSTEM_PROMPT}

You are also an assistant on the INUKA website that can look things up with tools. Today is ${today}.
- ALWAYS use the tools for scholarships, deadlines, courses and mentors. Never guess names, dates or rules.
- When you mention a scholarship or course from a tool result, link it in markdown with the link the tool gave you, e.g. [Chevening Scholarship](/opportunities/chevening).
- Keep answers short: 2 to 6 sentences or a short list. Use simple English.
- If nothing matches, say so kindly and suggest a broader search or the [Scholarships page](/opportunities).
${user?.role === 'student'
    ? `- You are talking to ${user.firstName}, a signed-in student${user.refugeeStatus === 'yes' ? ' who is a refugee or displaced person' : ''}${user.countryResidence ? ` living in ${user.countryResidence}` : ''}. You can check their progress, saved scholarships and documents, and save a scholarship ONLY when they ask you to.`
    : user ? `- You are talking to ${user.firstName}, an INUKA ${user.role}.`
      : '- The person is a visitor who is not signed in. To save scholarships, track applications, take courses or book a mentor they need a free account: [Create a free account](/register).'}
${page ? `- They are looking at this page: ${page}.` : ''}`;
}

async function runAi(history, ctx) {
  const tools = toolsFor(ctx.user);
  const byName = Object.fromEntries(tools.map((t) => [t.name, t]));
  const messages = history.map((m) => ({ role: m.role, content: m.content }));
  const system = agentPrompt(ctx.user, ctx.page);
  for (let step = 0; step < MAX_STEPS; step += 1) {
    const last = step === MAX_STEPS - 1;
    const { text, toolCalls } = await callModel({ system, messages, tools: last ? [] : tools });
    if (!toolCalls?.length) return text;
    const calls = toolCalls.map((c, i) => ({ ...c, id: c.id || `call_${step}_${i}` }));
    messages.push({ role: 'assistant', content: text || '', tool_calls: calls.map((c) => ({ id: c.id, type: 'function', function: { name: c.name, arguments: JSON.stringify(c.args || {}) } })) });
    for (const c of calls) {
      let result;
      try { result = byName[c.name] ? await byName[c.name].run(c.args || {}, ctx) : { error: `Unknown tool ${c.name}` }; }
      catch (e) { result = { error: 'This lookup failed.' }; console.error('Agent tool error', c.name, e.message); }
      ctx.used.push(c.name);
      messages.push({ role: 'tool', tool_call_id: c.id, name: c.name, content: JSON.stringify(result).slice(0, 12000) });
    }
  }
  return '';
}

// ---------------------------------------------------------------------------------------------------
// Basic mode: keyword rules + the same tools. Works with no AI service at all.
// ---------------------------------------------------------------------------------------------------
const COUNTRY_ALIASES = { uk: 'United Kingdom', england: 'United Kingdom', britain: 'United Kingdom', usa: 'United States', america: 'United States', us: 'United States', korea: 'South Korea', turkey: 'Türkiye', turkiye: 'Türkiye' };

function line(b) {
  const left = b.daysLeft == null ? 'deadline varies' : b.daysLeft < 0 ? 'closed' : `${b.deadline}, ${b.daysLeft} days left`;
  return `- [${b.name}](${b.link}) — ${b.country}, ${b.funding}${b.openToRefugees ? ', open to refugees' : ''} (${left})`;
}

async function basicAnswer(text, ctx) {
  const t = fold(text);
  const student = ctx.user?.role === 'student';
  const run = (name, args = {}) => { ctx.used.push(name); return TOOLS.find((x) => x.name === name).run(args, ctx); };
  const signUp = ctx.user ? '' : '\n\nWant to save these and track your applications? [Create a free account](/register).';

  // A scholarship named in the message?
  const all = await prisma.scholarship.findMany({ where: { isActive: true }, select: { slug: true, name: true } });
  // Match the full name, or a distinctive word of it ("Chevening", "DAAD", "Mastercard", "Fulbright").
  const COMMON = new Set(['scholarship', 'scholarships', 'scholars', 'program', 'programme', 'government', 'international', 'university', 'foundation',
    'african', 'africa', 'student', 'students', 'global', 'development', 'tertiary', 'courses', 'related', 'postgraduate', 'excellence', 'masters', 'master',
    'mobility', 'academic', 'scheme', 'union', 'bank', 'japan', 'korea', 'china', 'chinese', 'rwanda', 'kenya', 'uganda', 'south', 'town', 'cape', 'nairobi']);
  const words = new Set(t.split(/[^a-z0-9]+/).filter(Boolean));
  const named = all.find((s) => t.includes(fold(s.name).replace(/\(.*?\)/g, '').trim()))
    || all.find((s) => fold(s.name).split(/[^a-z0-9]+/).some((w) => w.length >= 4 && !COMMON.has(w) && words.has(w)));

  if (/^(hi|hello|hey|good (morning|afternoon|evening)|bonjour|muraho|habari)\b/.test(t) || /what can you do|help me|who are you/.test(t)) {
    return `Hello${ctx.user ? ` ${ctx.user.firstName}` : ''}! I'm the INUKA Assistant. I can:\n\n- find scholarships (for example: "fully funded scholarships in Germany" or "scholarships for refugees")\n- show deadlines closing soon\n- suggest free English and computer courses\n- tell you which documents you need${student ? '\n- show your progress and saved scholarships, and save a scholarship for you' : ''}\n\nWhat would you like to do?`;
  }
  if (student && /\bsave\b/.test(t) && named) {
    const r = await run('save_scholarship', { scholarship: named.slug });
    return `Done! I saved [${r.name}](${r.link}) to your list. You can see all your saved scholarships [here](/scholarships?tab=saved).`;
  }
  if (student && /(for me|my profile|match|recommend|suggest|could i apply|can i apply|which scholarships? (should|can|could)|fit me|suit)/.test(t) && /scholar|apply|match|recommend|suggest|fit|suit/.test(t)) {
    const r = await run('recommend_scholarships', { limit: 5 });
    if (!r.recommendations.length) return 'I could not find an open scholarship that fits your profile right now. See [all scholarships](/opportunities).';
    const note = r.profileComplete ? '' : '\n\nTip: complete your [profile](/profile) (education level, refugee status, country) so I can match you better.';
    return `Best scholarships for your profile:\n\n${r.recommendations.map((b) => `- **${b.matchPercent}% match:** [${b.name}](${b.link}) — ${b.whyItFits.join(', ') || 'open to apply'}`).join('\n')}\n\nOpen a scholarship to see who can apply and how. You can also say "save" and the name.${note}`;
  }
  if (student && /(my )?(progress|next lesson|where (was|am) i|my courses|my learning)/.test(t)) {
    const r = await run('my_progress');
    if (!r.coursesStarted.length) return 'You have not started a course yet. A good first step is [Reading & Comprehension](/courses/english-reading) or [Introduction to Computers](/courses/computer-intro). All courses are free!';
    return `Here is your progress:\n\n${r.coursesStarted.map((c) => `- **${c.course}**: ${c.completedLessons} of ${c.totalLessons} lessons (${c.percent}%)${c.nextLesson ? ` — next: [${c.nextLesson.title}](${c.nextLesson.link})` : ' — finished!'}`).join('\n')}`;
  }
  if (student && /saved/.test(t)) {
    const r = await run('my_saved_scholarships');
    if (!r.saved.length) return 'You have not saved any scholarships yet. Tap the bookmark on any scholarship to keep it, or ask me "save Chevening".';
    return `Your saved scholarships, soonest deadline first:\n\n${r.saved.map(line).join('\n')}`;
  }
  if (/document|papers|checklist|what do i need|requirements/.test(t)) {
    if (student && named) {
      const r = await run('my_document_checklist', { scholarship: named.slug });
      return `For [${r.scholarship}](${r.link}):\n\n${r.missing.length ? `**Still needed:**\n\n${r.missing.map((d) => `- ${d}`).join('\n')}` : 'You have uploaded everything on the checklist. Well done!'}\n\nUpload documents on your [Profile](/profile).`;
    }
    return `Most scholarships and universities ask for:\n\n${ALWAYS_REQUIRED_DOCS.map((d) => `- ${d.label}`).join('\n')}\n- Letters of recommendation\n\nAlways check the exact list on the scholarship's official website.${ctx.user ? '' : '\n\nWith a free account, INUKA keeps your documents safe and shows what is missing for each scholarship: [Create a free account](/register).'}`;
  }
  if (named && !/scholarships (in|for)|list|all /.test(t)) {
    const r = await run('scholarship_details', { scholarship: named.slug });
    const left = r.daysLeft == null ? 'The deadline varies.' : r.daysLeft < 0 ? 'The deadline has passed.' : `Deadline: **${r.deadline}** (${r.daysLeft} days left).`;
    return `**[${r.name}](${r.link})** — ${r.organisation}, ${r.country}.\n\n${r.funding}, ${r.level}${r.openToRefugees ? ', open to refugees' : ''}. ${left}\n\n${r.about.slice(0, 260)}${r.about.length > 260 ? '…' : ''}\n\nSee who can apply and how to apply on the [scholarship page](${r.link}).`;
  }
  if (/deadline|closing|close soon|due|this month|soon/.test(t) && !/course/.test(t)) {
    const days = /this month|30 days/.test(t) ? 30 : /week/.test(t) ? 7 : 60;
    const r = await run('upcoming_deadlines', { within_days: days });
    if (!r.scholarships.length) return `No scholarships close in the next ${days} days. See [all scholarships](/opportunities).`;
    return `Closing in the next ${days} days:\n\n${r.scholarships.map(line).join('\n')}${signUp}`;
  }
  if (/scholar|fund|bursar|grant|study (in|abroad)|master|bachelor|degree|phd|undergrad|postgrad|universit|opportunit/.test(t)) {
    const countries = [...new Set((await prisma.scholarship.findMany({ where: { isActive: true }, select: { hostCountry: true } })).map((s) => s.hostCountry))];
    let country = countries.find((c) => t.includes(fold(c)));
    if (!country) {
      const alias = Object.keys(COUNTRY_ALIASES).find((a) => new RegExp(`\\b${a}\\b`).test(t));
      if (alias) country = COUNTRY_ALIASES[alias];
    }
    const level = /master|phd|postgrad|doctor/.test(t) ? 'postgraduate' : /bachelor|undergrad|first degree/.test(t) ? 'undergraduate' : undefined;
    const r = await run('search_scholarships', { country, level, fully_funded: /full(y)?[ -]?fund/.test(t), open_to_refugees: /refugee|displaced|asylum/.test(t) });
    if (!r.scholarships.length) return `I could not find an open scholarship that matches${country ? ` in ${country}` : ''}. Try [all scholarships](/opportunities) and use the filters.`;
    const what = [level && LEVEL[level].toLowerCase(), country && `in ${country}`].filter(Boolean).join(' ');
    return `I found ${r.total} scholarship${r.total === 1 ? '' : 's'}${what ? ` (${what})` : ''}. Here are the first ones, soonest deadline first:\n\n${r.scholarships.map(line).join('\n')}\n\nSee them all with filters on the [Scholarships page](/opportunities).${signUp}`;
  }
  if (/course|learn|english|grammar|computer|lesson|typing|email|study/.test(t)) {
    const subject = /computer|email|typing|internet|digital/.test(t) ? 'computer' : /english|grammar|writ|speak|read|essay/.test(t) ? 'english' : undefined;
    const r = await run('list_courses', { subject });
    return `Free INUKA courses${subject ? ` for ${subject === 'english' ? 'English' : 'computer skills'}` : ''}:\n\n${r.courses.map((c) => `- [${c.title}](${c.link}) — ${c.level}, ${c.lessons} lessons`).join('\n')}\n\nEvery lesson has audio and a quiz, and you get a free certificate.${ctx.user ? '' : ' [Create a free account](/register) to start.'}`;
  }
  if (/mentor|advice|talk to|someone to help|coach/.test(t)) {
    if (student) {
      const r = await run('find_mentors', {});
      return r.mentors.length
        ? `These mentors can help you for free:\n\n${r.mentors.map((m) => `- **${m.name}** — ${m.title}`).join('\n')}\n\nBook a session on the [Mentorship page](/mentorship).`
        : 'Mentors will be listed soon on the [Mentorship page](/mentorship).';
    }
    return 'INUKA mentors are university students and professionals who help with essays, applications and choosing a course, for free. [Create a free account](/register) to book a session.';
  }
  if (/free|cost|price|pay|money/.test(t)) return 'INUKA is completely free: courses, certificates, scholarship search, mentors and this assistant. No payment and no card, ever.';
  return `I'm the INUKA Assistant${aiEnabled() ? '' : ' (basic mode)'}. I can find scholarships, deadlines, courses and documents. Try:\n\n- "Fully funded scholarships for refugees"\n- "Deadlines this month"\n- "Which English course should I start with?"\n- "What documents do I need?"`;
}

// ---------------------------------------------------------------------------------------------------
// Entry point. history: [{ role: 'user'|'assistant', content }], the last one is the new user message.
// Returns { reply, mode: 'ai'|'basic', actions }.
// ---------------------------------------------------------------------------------------------------
export async function runAgent(history, { user = null, page = '' } = {}) {
  const ctx = { user, page, used: [], actions: [] };
  const lastUser = [...history].reverse().find((m) => m.role === 'user')?.content || '';
  if (aiEnabled()) {
    try {
      const reply = await runAi(history, ctx);
      if (reply) return { reply, mode: 'ai', actions: ctx.actions, tools: ctx.used };
    } catch (e) {
      console.error('INUKA Assistant AI error, using basic mode:', e instanceof AiError ? e.message : e);
    }
  }
  const reply = await basicAnswer(lastUser, ctx);
  return { reply, mode: 'basic', actions: ctx.actions, tools: ctx.used };
}

export const agentMode = () => (aiEnabled() ? 'ai' : 'basic');
