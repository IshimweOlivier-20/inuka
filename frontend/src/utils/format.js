export const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

export const daysUntil = (d) => (d ? Math.ceil((new Date(d) - new Date()) / 864e5) : null);

export function timeAgo(d) {
  const s = Math.floor((Date.now() - new Date(d)) / 1000);
  if (s < 60) return 'Just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return formatDate(d);
}

export const formatSize = (b) => (b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

export const FUNDING_LABEL = { fully_funded: 'Fully Funded', partial: 'Partial', tuition_only: 'Tuition Only' };
export const LEVEL_LABEL = { undergraduate: 'Undergraduate', postgraduate: 'Postgraduate', both: 'Undergraduate + Postgraduate' };
export const APP_STATUS = {
  not_started: 'Not Started', in_progress: 'In Progress', submitted: 'Submitted',
  awaiting_response: 'Awaiting Response', accepted: 'Accepted', rejected: 'Rejected',
};

// Deadline colour (status colours): under 14 days = urgent (red), under 30 days = warning (amber),
// more time = success (green); unknown or passed = grey.
export function deadlineTone(deadline) {
  const d = daysUntil(deadline);
  if (d === null) return { tone: 'grey', text: 'Deadline varies' };
  if (d < 0) return { tone: 'grey', text: 'Deadline passed' };
  const text = d === 0 ? 'Closes today' : d === 1 ? '1 day left' : `${d} days left`;
  return { tone: d < 14 ? 'danger' : d < 30 ? 'warning' : 'success', text };
}
// Application status colours, used for the badges on "My applications".
export const APP_STATUS_TONE = {
  not_started: 'grey', in_progress: 'info', submitted: 'info', awaiting_response: 'warning', accepted: 'success', rejected: 'danger',
};

export { QUOTES, quoteOfTheDay } from './quotes';
