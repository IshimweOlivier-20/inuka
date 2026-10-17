import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CircleCheck, CircleDashed, Gauge } from 'lucide-react';
import { api } from '../../services/api';

// Scholarship readiness: "You are 62% ready", each missing item with the link that fixes it.
const tone = (p) => (p >= 80 ? { ring: 'var(--color-success)', text: 'text-success-ink', label: 'Ready to apply' } : p >= 50 ? { ring: 'var(--color-accent)', text: 'text-warning-ink', label: 'Getting there' } : { ring: 'var(--color-danger)', text: 'text-danger-ink', label: 'Just starting' });

export function ReadinessRing({ percent, size = 64 }) {
  const t = tone(percent);
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={`${percent}% ready`}>
      <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
        <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--color-line)" strokeWidth="3.5" />
        <circle cx="18" cy="18" r="15.5" fill="none" stroke={t.ring} strokeWidth="3.5" strokeLinecap="round" strokeDasharray={`${percent * 0.974} 100`} />
      </svg>
      <span className={`absolute inset-0 flex items-center justify-center font-bold ${size > 56 ? 'text-base' : 'text-xs'}`}>{percent}%</span>
    </div>
  );
}

// Full card on a scholarship page (signed-in students)
export function ReadinessCard({ readiness }) {
  if (!readiness) return null;
  if (!readiness.eligible) {
    return <div className="bg-surface rounded-xl border border-line p-5 text-sm"><p className="font-semibold flex items-center gap-2"><Gauge size={17} className="text-brand" aria-hidden="true" />Your readiness</p><p className="text-ink-soft mt-1">{readiness.note}</p></div>;
  }
  const t = tone(readiness.percent);
  const todo = readiness.items.filter((i) => !i.done);
  return (
    <section className="bg-surface rounded-xl border border-line overflow-hidden" aria-label="Your readiness for this scholarship">
      <div className="p-5 flex items-center gap-4 border-b border-line">
        <ReadinessRing percent={readiness.percent} />
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Your readiness</p>
          <p className={`font-semibold ${t.text}`}>{t.label}</p>
          <p className="text-xs text-ink-soft">{todo.length ? `${todo.length} thing${todo.length === 1 ? '' : 's'} left to do` : 'Everything INUKA can check is done.'}</p>
        </div>
      </div>
      <ul className="divide-y divide-line">
        {readiness.items.map((i) => (
          <li key={i.key} className="px-5 py-2.5 text-sm">
            <div className="flex items-start gap-2">
              {i.done ? <CircleCheck size={16} className="text-success shrink-0 mt-0.5" aria-label="Done" /> : <CircleDashed size={16} className="text-ink-soft shrink-0 mt-0.5" aria-label="To do" />}
              <span className={`flex-1 ${i.done ? 'text-ink-soft' : ''}`}>{i.label}</span>
            </div>
            {!i.done && i.fix && <Link to={i.fix.to} className="ml-6 mt-0.5 inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline">{i.fix.label}<ArrowRight size={12} aria-hidden="true" /></Link>}
          </li>
        ))}
      </ul>
      <p className="px-5 py-3 text-[11px] text-ink-soft border-t border-line bg-paper">Based on what INUKA knows. The scholarship decides who is selected.</p>
    </section>
  );
}

// Dashboard widget: readiness for saved scholarships (or the best matches)
export function ReadinessWidget() {
  const [rows, setRows] = useState(null);
  useEffect(() => { api.get('/scholarships/readiness').then((r) => setRows(r.data.scholarships || [])).catch(() => setRows([])); }, []);
  if (!rows || !rows.length) return null;
  return (
    <section className="bg-surface border border-line rounded-md p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold flex items-center gap-2"><Gauge size={17} className="text-brand" aria-hidden="true" />Scholarship readiness</h2>
        <Link to="/scholarships?tab=saved" className="text-sm font-semibold text-brand hover:underline">My saved</Link>
      </div>
      <ul className="mt-3 space-y-3">
        {rows.slice(0, 3).map((s) => {
          const next = s.readiness.items.find((i) => !i.done && i.fix);
          return (
            <li key={s.id} className="flex items-center gap-3">
              <ReadinessRing percent={s.readiness.percent} size={44} />
              <div className="min-w-0 flex-1">
                <Link to={`/opportunities/${s.slug || s.id}`} className="block text-sm font-semibold truncate hover:text-brand">{s.name}</Link>
                {next ? <Link to={next.fix.to} className="text-xs text-brand hover:underline inline-flex items-center gap-1">Next: {next.fix.label}<ArrowRight size={11} aria-hidden="true" /></Link>
                  : <span className="text-xs text-success-ink">Ready: apply before the deadline</span>}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
