import { useEffect, useState } from 'react';
import { Star, Video } from 'lucide-react';
import { Button, Pill } from '../ui';

// Session date and time in the viewer's own time zone.
export const sessionDate = (d) => new Date(d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
export const sessionTime = (d) => new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
export const sessionWhen = (d) => `${sessionDate(d)}, ${sessionTime(d)}`;
export const countWords = (t) => t.trim().split(/\s+/).filter(Boolean).length;

export const STATUS = {
  pending: ['Waiting for mentor', 'grey'],
  confirmed: ['Confirmed', 'brand'],
  completed: ['Completed', 'sky'],
  declined: ['Declined', 'red'],
  cancelled: ['Cancelled', 'grey'],
};
export const StatusPill = ({ status, past }) => {
  const [label, tone] = status === 'pending' && past ? ['Expired', 'grey'] : STATUS[status] || [status, 'grey'];
  return <Pill tone={tone}>{label}</Pill>;
};

// Read-only stars, e.g. a mentor's average rating.
export function Stars({ value, size = 16, label }) {
  const v = Math.round((value || 0) * 2) / 2;
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={label || `${v} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={size} aria-hidden="true" className={i <= v ? 'text-brand' : 'text-line'} fill="currentColor" />
      ))}
    </span>
  );
}

// Tap to choose 1–5 stars.
export function StarInput({ value, onChange }) {
  return (
    <div role="radiogroup" aria-label="Your rating" className="flex gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <button key={i} type="button" role="radio" aria-checked={value === i} aria-label={`${i} star${i > 1 ? 's' : ''}`}
          onClick={() => onChange(i)} className="w-11 h-11 rounded-lg flex items-center justify-center hover:bg-brand-soft">
          <Star size={28} aria-hidden="true" className={i <= value ? 'text-brand' : 'text-line'} fill="currentColor" />
        </button>
      ))}
    </div>
  );
}

// Join button: active from 15 minutes before the session until it ends (spec 6.2).
export const JOIN_EARLY_MIN = 15;
export const SESSION_MIN = 60;
export function JoinSessionButton({ session, className = '' }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);
  const start = new Date(session.scheduledAt).getTime();
  const open = now >= start - JOIN_EARLY_MIN * 60000 && now <= start + SESSION_MIN * 60000;
  if (open && session.videoLink) {
    return <Button href={session.videoLink} target="_blank" rel="noreferrer" className={className}><Video size={18} aria-hidden="true" />Join session</Button>;
  }
  return (
    <div className={className}>
      <Button disabled className="w-full"><Video size={18} aria-hidden="true" />Join session</Button>
      <p className="mt-1.5 text-xs text-ink-soft text-center">
        {session.videoLink ? `Opens ${JOIN_EARLY_MIN} minutes before the session.` : 'The mentor will add the video link before the session.'}
      </p>
    </div>
  );
}
