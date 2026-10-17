// Scholarship scam checker: paste a message, email or link and get red / yellow / green with plain reasons.
// Works with rules on INUKA's server (free, no outside service). When INUKA AI is switched on, it adds its own
// reading of the message; the rules always decide at least the level.
import { prisma } from '../lib/prisma.js';
import { aiEnabled, callModel } from './aiService.js';

const SHORTENERS = /\b(bit\.ly|tinyurl\.com|t\.co|goo\.gl|cutt\.ly|rb\.gy|is\.gd|shorturl\.at|ow\.ly|tiny\.cc)\b/i;
const FREE_MAIL = /@(gmail|yahoo|hotmail|outlook|live|aol|ymail|proton(mail)?|gmx|mail)\.[a-z.]+/i;
const OFFICIAL_WORDS = /\b(university|embassy|ministry|foundation|scholarship (board|committee|office)|unhcr|mastercard|government|admissions?|daad|chevening|fulbright)\b/i;
const PAY_WORDS = /\b(pay|paid|payment|fee|fees|processing|deposit|send money|mobile money|momo|m-?pesa|airtel money|western union|moneygram|bitcoin|crypto|usdt|bank transfer|transfer the|charges?)\b/i;
const AMOUNT = /(\$|usd|eur|€|£|rwf|frw|frs?\b|kes|ugx|\b\d{2,}[\s,.]?\d{0,3}\s?(k|000|dollars?|francs?)\b)/i;
const SECRETS = /\b(password|pin( code)?|otp|one[- ]time code|verification code|cvv|card number|bank (account )?(number|details)|login details)\b/i;
const TOO_GOOD = /\b(guaranteed|100 ?%|you (have been|were|are) (selected|chosen|shortlisted)|you have won|winner|no (exam|test|interview|application) (is )?(needed|required)|without applying|automatic(ally)? (admission|admitted))\b/i;
const URGENT = /\b(within (24|48) hours|today only|urgent(ly)?|immediately|last chance|expires? (today|tonight)|act now|before midnight|limited (slots|places))\b/i;
const CHAT_ONLY = /\b(whatsapp|telegram|signal)\b/i;
const AGENT = /\b(agent|agency|visa processing|processing agent|consultant)\b/i;

const domainOf = (u) => { try { return new URL(u.startsWith('http') ? u : `https://${u}`).hostname.replace(/^www\./, '').toLowerCase(); } catch { return null; } };
const sameSite = (a, b) => a && b && (a === b || a.endsWith(`.${b}`) || b.endsWith(`.${a}`));

export async function checkScam(text) {
  const t = String(text || '');
  const reasons = []; // { level: 'red' | 'yellow' | 'info', text }
  const add = (level, txt) => reasons.push({ level, text: txt });

  const urls = [...t.matchAll(/\b((https?:\/\/)?([a-z0-9-]+\.)+[a-z]{2,}(\/[^\s)>"']*)?)/gi)].map((m) => m[1])
    .filter((u) => !/@/.test(u) && /\.[a-z]{2,}/i.test(u) && !/^\d+(\.\d+)+$/.test(u));
  const domains = [...new Set(urls.map(domainOf).filter(Boolean))].filter((d) => !FREE_MAIL.test(`@${d}`));
  const emails = [...t.matchAll(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi)].map((m) => m[0]);

  // Money and secrets
  if (PAY_WORDS.test(t) && AMOUNT.test(t)) add('red', 'It asks you to pay money. Real scholarships do not ask for a "processing" or "registration" fee by message.');
  else if (PAY_WORDS.test(t)) add('yellow', 'It talks about payments or fees. Check on the official website whether any fee really exists.');
  if (SECRETS.test(t)) add('red', 'It asks for a password, PIN, code or bank details. Never share these with anyone.');

  // Too good, too fast
  if (TOO_GOOD.test(t)) add('yellow', 'It promises you are selected or guaranteed a place. Real scholarships choose people after they apply.');
  if (URGENT.test(t)) add('yellow', 'It pushes you to act very fast. Scammers use pressure so you do not stop to check.');

  // Who sends it, and where the links go
  const freeOfficial = emails.filter((e) => FREE_MAIL.test(e));
  if (freeOfficial.length && OFFICIAL_WORDS.test(t)) add('red', `It claims to be from an official organisation but uses a free email address (${freeOfficial[0]}). Universities and embassies use their own domain.`);
  else if (freeOfficial.length) add('yellow', `The contact is a free email address (${freeOfficial[0]}).`);
  if (urls.some((u) => SHORTENERS.test(u))) add('yellow', 'It uses a short link that hides the real website. Do not open it; search for the official site yourself.');
  if (urls.some((u) => /^http:\/\//i.test(u))) add('yellow', 'A link is not secure (http, not https).');
  if (CHAT_ONLY.test(t) && !domains.length) add('yellow', 'It only gives a WhatsApp or Telegram contact, with no official website.');
  if (AGENT.test(t) && PAY_WORDS.test(t)) add('yellow', 'An "agent" or "consultant" is involved with payments. You can apply for scholarships yourself, for free.');

  // Compare with scholarships INUKA knows
  const known = await prisma.scholarship.findMany({ select: { name: true, orgName: true, applyUrl: true, slug: true } });
  const lower = t.toLowerCase();
  const mentioned = known.filter((s) => {
    const words = s.name.toLowerCase().replace(/scholarships?|program(me)?|foundation|the/g, ' ').split(/\W+/).filter((w) => w.length > 4);
    return words.length && words.every((w) => lower.includes(w)) || lower.includes(s.orgName.toLowerCase());
  }).slice(0, 2);
  for (const s of mentioned) {
    const official = domainOf(s.applyUrl);
    const foreign = domains.filter((d) => !sameSite(d, official));
    if (foreign.length) add('red', `It mentions ${s.name}, but the link (${foreign[0]}) is not the official website (${official}).`);
    else add('info', `INUKA knows ${s.name}. Official website: ${official}.`);
  }

  // INUKA AI's own reading (optional)
  let ai = null;
  if (aiEnabled() && t.length >= 20) {
    try {
      const { text: out } = await callModel({
        system: 'You check messages that young African students receive about scholarships, for signs of scams. Reply ONLY with JSON: {"level":"red|yellow|green","reasons":["short plain-English reason", "..."]} with at most 3 reasons. Do not invent facts about real scholarships.',
        messages: [{ role: 'user', content: t.slice(0, 4000) }],
      });
      const json = JSON.parse(String(out).replace(/^[^{]*/, '').replace(/[^}]*$/, ''));
      if (['red', 'yellow', 'green'].includes(json.level)) ai = { level: json.level, reasons: (json.reasons || []).slice(0, 3).map(String) };
    } catch { /* the rules are enough */ }
  }

  const rank = { green: 0, yellow: 1, red: 2 };
  let level = reasons.some((r) => r.level === 'red') ? 'red' : reasons.some((r) => r.level === 'yellow') ? 'yellow' : 'green';
  if (reasons.filter((r) => r.level === 'yellow').length >= 3) level = 'red';
  if (ai && rank[ai.level] > rank[level]) level = ai.level;
  for (const r of ai?.reasons || []) if (level !== 'green') add('ai', r);

  return {
    level,
    title: { red: 'This looks like a scam', yellow: 'Be careful: check before you act', green: 'No warning signs found' }[level],
    reasons,
    advice: level === 'green'
      ? ['Still apply only on the official website.', 'Never pay anyone to "process" a scholarship.']
      : ['Do not pay, and do not send documents or passwords.', 'Find the official website yourself (search, or check on INUKA) and apply there.', 'Ask a mentor or INUKA AI if you are unsure.'],
    aiUsed: !!ai,
  };
}
