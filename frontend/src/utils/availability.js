// Mentor weekly availability.
// Mentors pick hours in their own local time; the database stores slots in UTC so students anywhere
// see the right time. Days: 0 = Sunday … 6 = Saturday (same as JavaScript's getDay()).

export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0]; // Monday first
export const GRID_HOURS = Array.from({ length: 16 }, (_, i) => i + 6); // 06:00 to 21:00 (last slot ends 22:00)

const WEEK = 7 * 1440;
const mod = (n, m) => ((n % m) + m) % m;
const hhmm = (min) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
// Minutes to add to local time to get UTC (Rwanda, UTC+2: -120). Uses today's offset.
const offset = () => new Date().getTimezoneOffset();

// Selected cells ("day-hour" keys in local time) -> UTC slots for the API.
export function cellsToUtcSlots(cells) {
  const slots = [];
  for (const key of cells) {
    const [day, hour] = key.split('-').map(Number);
    const start = mod(day * 1440 + hour * 60 + offset(), WEEK);
    let d = Math.floor(start / 1440);
    let s = start % 1440;
    let left = 60;
    while (left > 0) { // a slot can cross midnight in half-hour time zones: split it
      const len = Math.min(left, 1440 - s);
      slots.push({ dayOfWeek: d, startTime: hhmm(s), endTime: hhmm(s + len) });
      left -= len; d = (d + 1) % 7; s = 0;
    }
  }
  return slots;
}

// UTC slots from the API -> local, merged into readable ranges: [{ day, start: '14:00', end: '16:00' }]
export function utcSlotsToLocalRanges(slots) {
  const pieces = slots.map((s) => {
    const start = mod(s.dayOfWeek * 1440 + toMin(s.startTime) - offset(), WEEK);
    return { start, end: start + (toMin(s.endTime) - toMin(s.startTime)) };
  }).sort((a, b) => a.start - b.start);
  const merged = [];
  for (const p of pieces) {
    const last = merged[merged.length - 1];
    if (last && p.start <= last.end) last.end = Math.max(last.end, p.end);
    else merged.push({ ...p });
  }
  return merged.map((r) => ({
    day: Math.floor(r.start / 1440) % 7,
    start: hhmm(r.start % 1440),
    end: hhmm(((r.end - 1) % 1440) + 1),
  })).sort((a, b) => WEEK_ORDER.indexOf(a.day) - WEEK_ORDER.indexOf(b.day) || a.start.localeCompare(b.start));
}

export const timeZoneName = () => {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return 'your local time'; }
};

// UTC slots from the API -> grid cells ("day-hour" in local time), to edit availability.
export function utcSlotsToCells(slots) {
  const cells = new Set();
  for (const s of slots) {
    for (let m = toMin(s.startTime); m + 60 <= toMin(s.endTime); m += 60) {
      const local = mod(s.dayOfWeek * 1440 + m - offset(), WEEK);
      if (local % 60 === 0) cells.add(`${Math.floor(local / 1440)}-${(local % 1440) / 60}`);
    }
  }
  return [...cells];
}
