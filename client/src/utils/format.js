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

// Deadline colour rule (spec 10.1): red < 30 days, amber 30–90, green > 90
export function deadlineTone(deadline) {
  const d = daysUntil(deadline);
  if (d === null) return { tone: 'grey', text: 'Deadline varies' };
  if (d < 0) return { tone: 'grey', text: 'Deadline passed' };
  const text = d === 0 ? 'Closes today' : d === 1 ? '1 day left' : `${d} days left`;
  return { tone: d < 30 ? 'red' : d <= 90 ? 'amber' : 'green', text };
}

export const QUOTES = [
  'Education is the most powerful weapon which you can use to change the world. — Nelson Mandela',
  'If you want to go fast, go alone. If you want to go far, go together. — African proverb',
  'However long the night, the dawn will break. — African proverb',
  'Little by little, a little becomes a lot. — Tanzanian proverb',
  'The best time to plant a tree was 20 years ago. The second best time is now. — Proverb',
  'Knowledge is like a garden: if it is not cultivated, it cannot be harvested. — Guinean proverb',
  'It always seems impossible until it is done. — Nelson Mandela',
  'Where you will sit when you are old shows where you stood in youth. — Yoruba proverb',
  'Smooth seas do not make skillful sailors. — African proverb',
];
export const quoteOfTheDay = () => QUOTES[Math.floor(Date.now() / 864e5) % QUOTES.length];
