// Faceted scholarship search for the public Opportunities page.
// Every filter group returns counts ("facets") that take all OTHER active filters into account,
// so each option shows how many results the student would get by ticking it.
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';

export const REGIONS = ['East Africa', 'West Africa', 'Southern Africa', 'North Africa', 'Global'];
export const LEVELS = ['undergraduate', 'postgraduate'];
export const FUNDING = ['fully_funded', 'partial', 'tuition_only'];
export const LANGUAGES = ['English', 'French'];
export const DEADLINES = ['30', '90', '180', 'varies'];
export const COVERAGE = [
  { key: 'tuition', re: /tuition/i },
  { key: 'living', re: /stipend|allowance|living|subsistence/i },
  { key: 'travel', re: /travel|airfare|flight/i },
  { key: 'accommodation', re: /accommodation|housing/i },
  { key: 'health', re: /health|medical|insurance/i },
];

// "a,b,c" -> ['a','b','c'] (missing -> [])
const list = (allowed) => z.string().optional().transform((v) => {
  const items = (v || '').split(',').map((s) => s.trim()).filter(Boolean);
  return allowed ? items.filter((i) => allowed.includes(i)) : items;
});

export const searchSchema = z.object({
  q: z.string().trim().max(100).optional().default(''),
  region: list(REGIONS),
  country: list(),
  level: list(LEVELS),
  funding: list(FUNDING),
  language: list(LANGUAGES),
  covers: list(COVERAGE.map((c) => c.key)),
  refugees: z.enum(['open', 'only']).optional(),
  deadline: z.enum(DEADLINES).optional(),
  past: z.enum(['show', 'hide']).default('hide'),
  sort: z.enum(['deadline', 'relevant', 'newest', 'name']).default('deadline'),
  page: z.coerce.number().int().min(1).max(200).default(1),
  pageSize: z.coerce.number().int().min(1).max(48).default(12),
});

// Accent- and case-insensitive text ("Türkiye" matches "turkiye").
const fold = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Tidy "Multiple African countries" etc. into one option.
export const destinationOf = (s) => (/multiple|several/i.test(s.hostCountry) ? 'Several countries' : s.hostCountry);

const coverageOf = (s) => {
  const text = (Array.isArray(s.coverage) ? s.coverage : []).join(' | ');
  return new Set(COVERAGE.filter((c) => c.re.test(text)).map((c) => c.key));
};

const DAY = 864e5;
const startOfToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };

// Prepare each scholarship once: searchable text, destination, coverage tags.
function prepare(rows) {
  return rows.map((s) => ({
    ...s,
    _text: fold([s.name, s.orgName, s.hostCountry, s.hostUniversity, s.region, String(s.description || "").replace(/<[^>]+>/g, " "),
      ...(Array.isArray(s.eligibility) ? s.eligibility : [])].join(' ')),
    _dest: destinationOf(s),
    _covers: coverageOf(s),
  }));
}

// Does scholarship `s` pass filters `f`? `skip` ignores one filter group (used for facet counts).
function matches(s, f, skip, now) {
  if (f.q) {
    const words = fold(f.q).split(/\s+/).filter(Boolean);
    if (!words.every((w) => s._text.includes(w))) return false;
  }
  if (f.past === 'hide' && s.deadline && new Date(s.deadline) < now) return false;
  if (skip !== 'region' && f.region.length && !f.region.includes(s.region)) return false;
  if (skip !== 'country' && f.country.length && !f.country.includes(s._dest)) return false;
  if (skip !== 'level' && f.level.length && !f.level.some((l) => s.level === l || s.level === 'both')) return false;
  if (skip !== 'funding' && f.funding.length && !f.funding.includes(s.fundingType)) return false;
  if (skip !== 'language' && f.language.length
    && !f.language.some((l) => s.languageOfStudy === l || s.languageOfStudy === 'Both')) return false;
  if (skip !== 'refugees' && f.refugees === 'open' && !s.openToRefugees) return false;
  if (skip !== 'refugees' && f.refugees === 'only' && !s.refugeesOnly) return false;
  if (skip !== 'deadline' && f.deadline && !inDeadlineWindow(s, f.deadline, now)) return false;
  if (skip !== 'covers' && f.covers.length && !f.covers.every((c) => s._covers.has(c))) return false;
  return true;
}

function inDeadlineWindow(s, window, now) {
  if (window === 'varies') return !s.deadline;
  if (!s.deadline) return false;
  const d = new Date(s.deadline);
  return d >= now && d <= new Date(now.getTime() + Number(window) * DAY);
}

const count = (items, pick) => {
  const out = {};
  for (const s of items) for (const k of pick(s)) out[k] = (out[k] || 0) + 1;
  return out;
};

const withAll = (items, pick) => ({ ...count(items, pick), all: items.length });

const SORTERS = {
  deadline: (a, b) => (a.deadline ? 0 : 1) - (b.deadline ? 0 : 1)
    || (a.deadline && b.deadline ? new Date(a.deadline) - new Date(b.deadline) : 0)
    || a.name.localeCompare(b.name),
  relevant: (a, b) => Number(b.isFeatured) - Number(a.isFeatured) || SORTERS.deadline(a, b),
  newest: (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
  name: (a, b) => a.name.localeCompare(b.name),
};

const PUBLIC_FIELDS = ['id', 'slug', 'name', 'orgName', 'hostCountry', 'hostUniversity', 'region', 'fundingType', 'level',
  'openToRefugees', 'refugeesOnly', 'languageOfStudy', 'deadline', 'description', 'isFeatured'];

export async function searchScholarships(query) {
  const f = searchSchema.parse(query);
  const now = startOfToday();
  const all = prepare(await prisma.scholarship.findMany({ where: { isActive: true } }));

  const results = all.filter((s) => matches(s, f, null, now)).sort(SORTERS[f.sort]);
  const base = (dim) => all.filter((s) => matches(s, f, dim, now));

  const facets = {
    region: count(base('region'), (s) => [s.region]),
    country: count(base('country'), (s) => [s._dest]),
    level: count(base('level'), (s) => (s.level === 'both' ? LEVELS : [s.level])),
    funding: count(base('funding'), (s) => [s.fundingType]),
    language: count(base('language'), (s) => (s.languageOfStudy === 'Both' ? LANGUAGES : [s.languageOfStudy])),
    // Single-choice groups also report "all" (the count when that group is not filtered).
    refugees: withAll(base('refugees'), (s) => [...(s.openToRefugees ? ['open'] : []), ...(s.refugeesOnly ? ['only'] : [])]),
    deadline: withAll(base('deadline'), (s) => DEADLINES.filter((w) => inDeadlineWindow(s, w, now))),
    // Coverage is "must include ALL ticked", so each option counts results that also include it.
    covers: count(base('covers').filter((s) => f.covers.every((c) => s._covers.has(c))), (s) => [...s._covers]),
  };

  const upcoming = all.filter((s) => !s.deadline || new Date(s.deadline) >= now);
  const start = (f.page - 1) * f.pageSize;
  return {
    total: results.length,
    page: f.page,
    pageSize: f.pageSize,
    results: results.slice(start, start + f.pageSize).map((s) => Object.fromEntries(PUBLIC_FIELDS.map((k) => [k, s[k]]))),
    facets,
    // Numbers for the page hero (not affected by filters)
    summary: {
      total: upcoming.length,
      openToRefugees: upcoming.filter((s) => s.openToRefugees).length,
      fullyFunded: upcoming.filter((s) => s.fundingType === 'fully_funded').length,
      destinations: new Set(upcoming.map((s) => s._dest)).size,
    },
  };
}
