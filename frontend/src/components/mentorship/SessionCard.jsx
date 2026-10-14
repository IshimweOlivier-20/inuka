import { Link } from 'react-router-dom';
import { typeOf, shortDate, timeLabel } from './booking';

// Status label on a session card (outlined, like a stamp).
const STATUS = {
  pending: ['Waiting for mentor', 'text-warning-ink border-warning/60 bg-warning-soft/50'],
  confirmed: ['Confirmed', 'text-brand border-brand/50 bg-brand-soft/60'],
  completed: ['Completed', 'text-success-ink border-success/60 bg-success-soft/50'],
  cancelled: ['Cancelled', 'text-danger-ink border-danger/50 bg-danger-soft/40'],
  declined: ['Declined', 'text-danger-ink border-danger/50 bg-danger-soft/40'],
  expired: ['Not confirmed', 'text-ink-soft border-line bg-paper'],
};
export function SessionStatus({ status }) {
  const [label, cls] = STATUS[status] || STATUS.pending;
  return <span className={`inline-flex items-center rounded-md border px-1.5 py-px text-[11px] font-semibold whitespace-nowrap ${cls}`}>{label}</span>;
}
export const statusOf = (b) => (b.status === 'pending' && new Date(b.scheduledAt).getTime() < Date.now() ? 'expired' : b.status);

function Photo({ person, className = '' }) {
  const initials = `${person.firstName?.[0] || ''}${person.lastName?.[0] || ''}`;
  return person.profilePhotoUrl
    ? <img src={person.profilePhotoUrl} alt="" className={`object-cover bg-brand-soft ${className}`} />
    : <span className={`bg-brand text-white font-display font-bold flex items-center justify-center text-2xl ${className}`} aria-hidden="true">{initials}</span>;
}
export { Photo as PersonPhoto };

// One session in "My sessions" (student) — photo, name, type and status, date and time; actions below.
export default function SessionCard({ b, person, to, iconAction, actions }) {
  const T = typeOf(b.sessionType);
  return (
    <article className="bg-surface rounded-3xl border border-line/70 shadow-[0_6px_24px_-14px_rgba(7,41,77,0.25)] p-4">
      <div className="flex items-center gap-4">
        <Link to={to} className="flex items-center gap-4 flex-1 min-w-0 rounded-2xl focus-visible:ring-2 focus-visible:ring-brand/40">
          <Photo person={person} className="w-[84px] h-[84px] sm:w-24 sm:h-24 rounded-2xl shrink-0" />
          <div className="min-w-0">
            <h3 className="font-bold text-[17px] leading-snug truncate">{person.firstName} {person.lastName}</h3>
            <p className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-ink-soft">{T.label} <span aria-hidden="true">-</span> <SessionStatus status={statusOf(b)} /></p>
            <p className="mt-1 text-sm text-ink-soft tabular-nums">{shortDate(b.scheduledAt)} <span className="mx-1 text-line" aria-hidden="true">|</span> {timeLabel(b.scheduledAt)}</p>
            <p className="mt-0.5 text-xs text-ink-soft truncate">{b.topic}</p>
          </div>
        </Link>
        {iconAction && (
          <button type="button" onClick={iconAction.onClick} aria-label={iconAction.label} title={iconAction.label}
            className="w-12 h-12 shrink-0 rounded-full bg-brand-soft text-brand flex items-center justify-center hover:bg-brand hover:text-white transition-colors">
            <T.icon size={20} aria-hidden="true" />
          </button>
        )}
      </div>
      {actions && <div className="mt-4 pt-4 border-t border-line grid grid-cols-2 gap-3">{actions}</div>}
    </article>
  );
}

// The two buttons under a card.
export function CardButton({ filled, children, ...props }) {
  const cls = `min-h-10 rounded-full text-sm font-semibold border-2 transition-colors ${filled ? 'bg-brand border-brand text-white hover:bg-brand-dark' : 'border-brand text-brand hover:bg-brand-soft'}`;
  return props.to ? <Link className={`${cls} inline-flex items-center justify-center`} {...props}>{children}</Link> : <button type="button" className={cls} {...props}>{children}</button>;
}
