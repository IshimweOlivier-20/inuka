// Scholarship matching (spec: "auto-suggest scholarships based on student profile").
// Each open scholarship gets a score from the student's profile, with plain-English reasons:
//   study level (S4–S6 → undergraduate), refugee status, where they live / come from (same country or region),
//   language, funding and time left before the deadline. Scholarships the student cannot apply for are left out
//   (e.g. postgraduate-only for a secondary-school graduate, refugees-only for non-refugees).
// Runs on INUKA's server with no outside service, so it is free; INUKA AI (the agent) uses it to recommend
// scholarships and explain them in conversation.
import { prisma } from '../lib/prisma.js';

const REGION_OF = {};
const add = (region, list) => list.forEach((c) => { REGION_OF[c.toLowerCase()] = region; });
add('East Africa', ['Rwanda', 'Burundi', 'Kenya', 'Uganda', 'Tanzania', 'South Sudan', 'Ethiopia', 'Somalia', 'Eritrea', 'Djibouti',
  'DR Congo', 'DRC', 'Democratic Republic of the Congo', 'Congo']);
add('West Africa', ['Nigeria', 'Ghana', 'Senegal', "Côte d'Ivoire", 'Ivory Coast', 'Mali', 'Burkina Faso', 'Niger', 'Guinea',
  'Sierra Leone', 'Liberia', 'Togo', 'Benin', 'Gambia', 'Cameroon', 'Chad', 'Mauritania', 'Cabo Verde']);
add('Southern Africa', ['South Africa', 'Zimbabwe', 'Zambia', 'Malawi', 'Mozambique', 'Botswana', 'Namibia', 'Lesotho', 'Eswatini', 'Angola', 'Madagascar']);
add('North Africa', ['Egypt', 'Morocco', 'Algeria', 'Tunisia', 'Libya', 'Sudan']);
export const regionOf = (country) => REGION_OF[String(country || '').trim().toLowerCase()] || null;

const daysLeft = (d) => (d ? Math.ceil((new Date(d) - new Date()) / 864e5) : null);
const SECONDARY = ['S4', 'S5', 'S6'];

export function scoreScholarship(s, user) {
  const reasons = [];
  let score = 25;
  const secondary = SECONDARY.includes(user.educationLevel);
  const refugee = user.refugeeStatus === 'yes';
  const left = daysLeft(s.deadline);

  // Can they apply at all?
  if (left !== null && left < 0) return null;
  if (s.refugeesOnly && !refugee) return null;
  if (secondary && s.level === 'postgraduate') return null; // needs a bachelor's degree first

  // Study level
  if (secondary && (s.level === 'undergraduate' || s.level === 'both')) { score += 20; reasons.push("For a first (bachelor's) degree — right for your level"); }
  else if (!user.educationLevel && s.level !== 'postgraduate') score += 8;
  else if (user.educationLevel === 'Other' && s.level !== 'undergraduate') { score += 10; reasons.push('Includes postgraduate study'); }

  // Refugees
  if (refugee && s.refugeesOnly) { score += 25; reasons.push('Made for refugee students'); }
  else if (refugee && s.openToRefugees) { score += 15; reasons.push('Open to refugees'); }

  // Where
  const homes = [user.countryResidence, user.countryOrigin].filter(Boolean).map((c) => c.toLowerCase());
  const myRegions = new Set(homes.map(regionOf).filter(Boolean));
  if (homes.includes(String(s.hostCountry).toLowerCase())) { score += 15; reasons.push(`Study in ${s.hostCountry}, where you ${String(s.hostCountry).toLowerCase() === homes[0] ? 'live' : 'come from'}`); }
  else if (myRegions.has(s.region)) { score += 12; reasons.push(`In your region (${s.region})`); }
  else if (/africa/i.test(s.hostCountry) || /african/i.test(s.name)) { score += 6; reasons.push('Study in Africa'); }

  // Language
  if (/french|fran/i.test(user.language || '') && (s.languageOfStudy === 'French' || s.languageOfStudy === 'Both')) { score += 8; reasons.push('You can study in French'); }

  // Money and time
  if (s.fundingType === 'fully_funded') { score += 12; reasons.push('Fully funded'); }
  else if (s.fundingType === 'partial') score += 4;
  if (left === null) score += 3;
  else if (left >= 14) { score += 6; if (left <= 60) reasons.push(`${left} days left to prepare`); }
  else { score += 1; reasons.push(`Closes soon (${left} day${left === 1 ? '' : 's'} left)`); }
  if (s.isFeatured) score += 2;

  return { score: Math.min(98, score), reasons: reasons.slice(0, 4) };
}

// Best matches for a student, best first. Returns plain scholarship rows plus { match, reasons, saved }.
export async function matchScholarships(user, { limit = 6 } = {}) {
  const [rows, saved] = await Promise.all([
    prisma.scholarship.findMany({ where: { isActive: true } }),
    prisma.savedScholarship.findMany({ where: { userId: user.id }, select: { scholarshipId: true } }),
  ]);
  const savedIds = new Set(saved.map((x) => x.scholarshipId));
  const missing = ['educationLevel', 'refugeeStatus', 'countryResidence'].filter((k) => !user[k]);
  const matches = rows
    .map((s) => { const m = scoreScholarship(s, user); return m && { ...s, match: m.score, reasons: m.reasons, saved: savedIds.has(s.id) }; })
    .filter(Boolean)
    .sort((a, b) => b.match - a.match || (daysLeft(a.deadline) ?? 999) - (daysLeft(b.deadline) ?? 999))
    .slice(0, limit);
  return { matches, profileComplete: missing.length === 0, missing };
}
