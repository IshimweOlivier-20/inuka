// Scholarship finder: helps the team add scholarships faster, while a person still checks every listing.
//
//   1. Import from a link: an admin pastes the official page; INUKA reads it and fills in the scholarship form
//      (INUKA AI when switched on, otherwise just the title and description). Nothing is published automatically.
//   2. News feeds: every 12 hours INUKA reads the RSS feeds listed in Admin → Scholarships → Find new, and adds new
//      scholarship posts to a "waiting for review" list. An admin imports or dismisses each one.
//
// There is no free official "scholarship API" for African and refugee scholarships, so this is the reliable way:
// automatic discovery, human-verified. Turn the 12-hour check off with SCHOLARSHIP_FEEDS=off in backend/.env.
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { prisma } from '../lib/prisma.js';
import { CONDITIONAL_DOCS } from '../lib/constants.js';
import { REGIONS } from './scholarshipSearch.js';
import { aiEnabled, callModel } from './aiService.js';
import { HttpError } from '../middleware/errorHandler.js';

const UA = 'INUKA-ScholarshipFinder/1.0 (+https://inuka-learn.vercel.app)';
const MAX_BYTES = 2 * 1024 * 1024;

// ---------- Safe fetching: public web pages only (never the server's own network) ----------
const privateV4 = (ip) => {
  const [a, b] = ip.split('.').map(Number);
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
};
const privateIp = (ip) => (isIP(ip) === 6
  ? ip === '::1' || ip === '::' || /^f[cd]/i.test(ip) || /^fe80/i.test(ip) || (ip.startsWith('::ffff:') && privateV4(ip.slice(7)))
  : privateV4(ip));

async function assertPublicUrl(raw) {
  let u;
  try { u = new URL(String(raw).trim()); } catch { throw new HttpError(400, 'Please paste a full link starting with https://'); }
  if (!['http:', 'https:'].includes(u.protocol)) throw new HttpError(400, 'Only http and https links can be read.');
  const host = u.hostname.replace(/^\[|\]$/g, '');
  if (/^localhost$|\.local$|\.internal$/i.test(host)) throw new HttpError(400, 'This link points to a private address.');
  if (process.env.FINDER_ALLOW_PRIVATE === 'true') return u; // tests only
  const addrs = isIP(host) ? [{ address: host }] : await lookup(host, { all: true }).catch(() => { throw new HttpError(400, `We could not find the website ${host}.`); });
  if (addrs.some((a) => privateIp(a.address))) throw new HttpError(400, 'This link points to a private address.');
  return u;
}

export async function safeFetch(raw, { accept = 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' } = {}) {
  let url = await assertPublicUrl(raw);
  for (let hop = 0; hop < 4; hop += 1) {
    const res = await fetch(url, { redirect: 'manual', headers: { 'user-agent': UA, accept }, signal: AbortSignal.timeout(15000) })
      .catch((e) => { throw new HttpError(502, `We could not open this page (${e.name === 'TimeoutError' ? 'it took too long' : 'connection failed'}).`); });
    if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
      url = await assertPublicUrl(new URL(res.headers.get('location'), url));
      continue;
    }
    if (!res.ok) throw new HttpError(502, `The website answered with an error (${res.status}). Check the link, or fill in the form by hand.`);
    const reader = res.body.getReader();
    const chunks = [];
    let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > MAX_BYTES) { reader.cancel(); break; }
      chunks.push(value);
    }
    return { url: url.href, text: Buffer.concat(chunks).toString('utf8'), type: res.headers.get('content-type') || '' };
  }
  throw new HttpError(502, 'This link redirects too many times.');
}

// ---------- Reading a page ----------
const decode = (s) => String(s || '')
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#0?39;|&apos;|&#8217;|&rsquo;/g, '’')
  .replace(/&#8211;|&ndash;/g, '–').replace(/&#8212;|&mdash;/g, '—').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
const meta = (html, name) => decode((html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${name}["'][^>]*content=["']([^"']*)["']`, 'i'))
  || html.match(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${name}["']`, 'i')) || [])[1]).trim();

export function readPage(html, base) {
  const title = meta(html, 'og:title') || decode((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1]).trim();
  const description = meta(html, 'og:description') || meta(html, 'description');
  const body = (html.match(/<(main|article)[\s\S]*?<\/\1>/i) || [html])[0];
  const links = [...body.matchAll(/<a[^>]+href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi)]
    .map(([, href, label]) => { try { return { href: new URL(href, base).href, label: decode(label.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim() }; } catch { return null; } })
    .filter((l) => l && /^https?:/.test(l.href) && l.label)
    .slice(0, 150);
  const text = decode(body
    .replace(/<(script|style|noscript|svg|nav|footer|header|form)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<\/(p|div|li|h[1-6]|tr|br)>|<br\s*\/?>/gi, '\n')
    .replace(/<li[^>]*>/gi, '\n• ')
    .replace(/<[^>]+>/g, ' '))
    .replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim();
  return { title, description, text, links };
}

// ---------- Import from a link ----------
const DOC_KEYS = Object.keys(CONDITIONAL_DOCS);
const SYSTEM = `You read a web page about a scholarship and fill in a form for INUKA, a scholarship platform for African students and refugees.
Reply ONLY with one JSON object, no other text, with these keys:
{"name": string, "orgName": string, "hostCountry": string, "hostUniversity": string|null,
 "region": one of ${JSON.stringify(REGIONS)} (where the studies take place; "Global" if several continents),
 "fundingType": "fully_funded"|"partial"|"tuition_only", "level": "undergraduate"|"postgraduate"|"both",
 "openToRefugees": boolean, "refugeesOnly": boolean, "disabilityFriendly": boolean, "languageOfStudy": string,
 "deadline": "YYYY-MM-DD"|null, "deadlineNote": string|null,
 "summary": string (2-4 plain sentences), "eligibility": string[], "coverage": string[], "applicationSteps": string[],
 "documentsRequired": array of zero or more of ${JSON.stringify(DOC_KEYS)},
 "officialUrl": string|null (the official application or programme page; prefer a link on the page that belongs to the provider),
 "isOfficialPage": boolean (true only if this page belongs to the scholarship provider itself, not a news or listing site),
 "warnings": string[] (anything uncertain, e.g. "deadline not stated", or signs of a scam such as fees)}
Rules: use ONLY what the page says. Never invent a deadline, amount or rule: use null or [] when the page does not say. Short, simple English. At most 8 items per list.`;

// The model's JSON, also when wrapped in ```json fences or followed by a sentence; tolerates trailing commas.
const parseJson = (s) => {
  const t = String(s || '').replace(/```(?:json)?/gi, '');
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  const body = t.slice(start, end + 1);
  for (const candidate of [body, body.replace(/,\s*([}\]])/g, '$1')]) {
    try { return JSON.parse(candidate); } catch { /* try the next form */ }
  }
  return null;
};
const list = (v) => (Array.isArray(v) ? v.map((x) => String(x).trim()).filter(Boolean).slice(0, 8) : []);
const pick = (v, allowed, fallback) => (allowed.includes(v) ? v : fallback);
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const isUrl = (s) => { try { return /^https?:$/.test(new URL(s).protocol); } catch { return false; } };

export async function importFromUrl(rawUrl) {
  const page = await safeFetch(rawUrl);
  if (!/html|xml|text/i.test(page.type)) throw new HttpError(400, 'This link is not a web page (it may be a PDF or a file). Open it and fill in the form by hand.');
  const read = readPage(page.text, page.url);
  const notes = [];
  let ai = null;
  // Form and database pages (Airtable, Google Forms, Typeform…) and pages behind a login build their content with
  // JavaScript, so a server sees almost no text. Say so plainly instead of asking the AI to guess.
  const appPage = /(^|\.)(airtable\.com|forms\.gle|docs\.google\.com|typeform\.com|jotform\.com|forms\.office\.com|notion\.site)$/i.test(new URL(page.url).hostname);
  const thin = read.text.replace(/\s+/g, ' ').length < 150 || /enable javascript|javascript is (required|disabled)/i.test(read.text);
  if (appPage || thin) {
    notes.push(appPage
      ? 'This is an application form or database page (for example Airtable or Google Forms). INUKA cannot read these. Paste the scholarship\u2019s information page instead, and use this link as the application link.'
      : 'This page shows almost no text to INUKA (it may need JavaScript or a login). Paste the scholarship\u2019s main information page instead.');
  } else if (aiEnabled()) {
    const linkList = read.links.map((l) => `- ${l.label}: ${l.href}`).join('\n').slice(0, 4000);
    const ask = (pageChars, extra = '') => callModel({
      system: SYSTEM + extra, maxTokens: 4096, json: true,
      messages: [{ role: 'user', content: `Page address: ${page.url}\nPage title: ${read.title}\n\nPage text:\n${read.text.slice(0, pageChars)}\n\nLinks on the page:\n${linkList}` }],
    });
    try {
      let { text } = await ask(14000);
      ai = parseJson(text);
      if (!ai) { // second try: shorter page and shorter lists, so the answer fits
        console.warn('Scholarship import: AI answer was not JSON, retrying. Start of answer:', String(text).slice(0, 200));
        ({ text } = await ask(8000, '\nKeep every list to at most 5 short items. Output the JSON object only.'));
        ai = parseJson(text);
      }
      if (!ai) notes.push('INUKA AI could not read this page; only the title and description were filled.');
    } catch (e) {
      console.warn('Scholarship import: AI failed:', e.message);
      const why = /quota|rate|429|exhausted/i.test(e.message) ? 'the free AI limit is reached for now; try again in a minute'
        : e.message === 'timeout' ? 'it took too long' : `the AI service said: ${String(e.message).slice(0, 120)}`;
      notes.push(`INUKA AI could not fill in the form (${why}). Only the title and description were filled.`);
    }
  } else if (!aiEnabled()) notes.push('INUKA AI is off, so only the title and description were filled. Add AI_API_KEY to fill in more fields automatically.');

  const host = new URL(page.url).hostname.replace(/^www\./, '');
  const summary = (ai?.summary || read.description || '').trim();
  const draft = {
    name: (ai?.name || read.title.replace(/\s*[|–—-]\s*[^|–—-]+$/, '') || '').trim().slice(0, 200),
    orgName: (ai?.orgName || '').trim(),
    hostCountry: (ai?.hostCountry || '').trim(),
    hostUniversity: ai?.hostUniversity || '',
    region: pick(ai?.region, REGIONS, 'Global'),
    fundingType: pick(ai?.fundingType, ['fully_funded', 'partial', 'tuition_only'], 'fully_funded'),
    level: pick(ai?.level, ['undergraduate', 'postgraduate', 'both'], 'undergraduate'),
    openToRefugees: !!ai?.openToRefugees,
    refugeesOnly: !!ai?.refugeesOnly && !!ai?.openToRefugees,
    disabilityFriendly: !!ai?.disabilityFriendly,
    languageOfStudy: ai?.languageOfStudy || 'English',
    deadline: /^\d{4}-\d{2}-\d{2}$/.test(ai?.deadline || '') ? ai.deadline : '',
    deadlineNote: ai?.deadlineNote || '',
    description: summary ? summary.split(/\n{2,}/).map((p) => `<p>${esc(p)}</p>`).join('') : '',
    eligibility: list(ai?.eligibility),
    coverage: list(ai?.coverage),
    applicationSteps: list(ai?.applicationSteps),
    documentsRequired: (Array.isArray(ai?.documentsRequired) ? ai.documentsRequired : []).filter((k) => DOC_KEYS.includes(k)),
    applyUrl: isUrl(ai?.officialUrl) ? ai.officialUrl : page.url,
  };
  const official = ai ? !!ai.isOfficialPage : null;
  if (official === false) notes.push(`This page is on ${host}, which looks like a news or listing site. Open the official link and check every detail there before publishing.`);
  for (const w of list(ai?.warnings)) notes.push(w);
  if (ai && !draft.deadline && !notes.some((n) => /deadline/i.test(n))) notes.push('No deadline was found on the page.');

  // Already on INUKA?
  const words = draft.name.toLowerCase().replace(/scholarships?|programme|program|the|for|and|of|\d{4}/g, ' ').split(/\W+/).filter((w) => w.length > 3).slice(0, 4);
  const existing = words.length
    ? await prisma.scholarship.findMany({ where: { AND: words.map((w) => ({ name: { contains: w, mode: 'insensitive' } })) }, select: { id: true, name: true, slug: true }, take: 3 })
    : [];
  return { draft, notes, aiUsed: !!ai, unreadable: appPage || thin, page: { url: page.url, title: read.title, host, official }, existing };
}

// ---------- RSS / Atom feeds ----------
const tag = (xml, name) => decode((xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, 'i')) || [])[1]).trim();
export function parseFeed(xml) {
  const items = [...xml.matchAll(/<item[\s>][\s\S]*?<\/item>/gi)].map(([it]) => ({
    title: tag(it, 'title'), url: tag(it, 'link') || tag(it, 'guid'),
    summary: tag(it, 'description').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(), date: tag(it, 'pubDate'),
  }));
  const entries = [...xml.matchAll(/<entry[\s>][\s\S]*?<\/entry>/gi)].map(([it]) => ({
    title: tag(it, 'title'), url: (it.match(/<link[^>]+href=["']([^"']+)["']/i) || [])[1] || '',
    summary: (tag(it, 'summary') || tag(it, 'content')).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(), date: tag(it, 'updated') || tag(it, 'published'),
  }));
  return [...items, ...entries].filter((i) => i.title && isUrl(i.url));
}

const LOOKS_LIKE = /scholarship|fellowship|bursar|grant|fully[- ]funded|funded|masters?|bachelor|phd|undergraduate|postgraduate|study in/i;

export async function checkSource(source) {
  try {
    const { text } = await safeFetch(source.url, { accept: 'application/rss+xml,application/atom+xml,application/xml,text/xml;q=0.9,*/*;q=0.5' });
    const items = parseFeed(text);
    if (!items.length) throw new Error('No posts found. Is this an RSS or Atom feed address?');
    let found = 0;
    for (const it of items.slice(0, 40)) {
      if (!LOOKS_LIKE.test(`${it.title} ${it.summary}`)) continue;
      if (await prisma.scholarshipLead.findUnique({ where: { url: it.url }, select: { id: true } })) continue;
      const date = it.date ? new Date(it.date) : null;
      await prisma.scholarshipLead.create({
        data: { sourceId: source.id, title: it.title.slice(0, 300), url: it.url, summary: it.summary.slice(0, 600) || null, publishedAt: date && !Number.isNaN(date.getTime()) ? date : null },
      }).then(() => { found += 1; }).catch(() => {}); // a duplicate added at the same moment is simply skipped
    }
    return prisma.leadSource.update({ where: { id: source.id }, data: { lastCheckedAt: new Date(), lastError: null, lastFound: found } });
  } catch (e) {
    return prisma.leadSource.update({ where: { id: source.id }, data: { lastCheckedAt: new Date(), lastError: String(e.message).slice(0, 300), lastFound: 0 } });
  }
}

export async function checkAllSources() {
  const sources = await prisma.leadSource.findMany({ where: { isActive: true } });
  const out = [];
  for (const s of sources) out.push(await checkSource(s)); // one at a time: polite to the websites
  return out;
}

let timer = null;
export function startFeedChecks() {
  if (process.env.SCHOLARSHIP_FEEDS === 'off' || timer) return;
  const run = () => checkAllSources().catch((e) => console.error('Scholarship feeds failed:', e.message));
  setTimeout(run, 2 * 60 * 1000);
  timer = setInterval(run, 12 * 60 * 60 * 1000);
}