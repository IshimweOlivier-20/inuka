import { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarCheck2, ChevronLeft, ChevronRight, MessagesSquare, Phone, Video } from 'lucide-react';
import { Button } from '../ui';

// Building blocks for booking, moving and cancelling mentor sessions (student side).

export const TYPES = {
  video: { label: 'Video call', icon: Video, about: 'Talk face to face (Google Meet, Zoom or WhatsApp video).' },
  voice: { label: 'Voice call', icon: Phone, about: 'Talk by phone or WhatsApp call, no camera needed. Good on slow internet.' },
  message: { label: 'Messages', icon: MessagesSquare, about: 'Chat in INUKA messages at the session time. Works on any connection.' },
};
export const typeOf = (t) => TYPES[t] || TYPES.video;

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const dayKey = (d) => new Date(d).toDateString();
export const timeLabel = (d) => new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
export const longDate = (d) => new Date(d).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
export const shortDate = (d) => {
  const x = new Date(d); const t = new Date();
  const diff = Math.round((new Date(x.toDateString()) - new Date(t.toDateString())) / 864e5);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  return x.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: x.getFullYear() === t.getFullYear() ? undefined : 'numeric' });
};
export const timeRange = (d, minutes = 60) => `${timeLabel(d)} – ${timeLabel(new Date(new Date(d).getTime() + minutes * 60000))} (${minutes} minutes)`;

// Group free times (ISO strings) by local day.
export function useTimesByDay(times) {
  return useMemo(() => {
    const map = new Map();
    for (const t of times || []) {
      const k = dayKey(t);
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(t);
    }
    return map;
  }, [times]);
}

// Month calendar. Days with free times can be chosen; the others are greyed out.
export function MonthCalendar({ byDay, value, onChange }) {
  const firstFree = byDay.size ? new Date([...byDay.keys()][0]) : new Date();
  const [month, setMonth] = useState(() => new Date(firstFree.getFullYear(), firstFree.getMonth(), 1));
  const lastFree = byDay.size ? new Date([...byDay.keys()].at(-1)) : new Date();
  const thisMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const canPrev = month > thisMonth;
  const canNext = new Date(month.getFullYear(), month.getMonth() + 1, 1) <= lastFree;
  const offset = (month.getDay() + 6) % 7;
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells = [...Array(offset).fill(null), ...Array.from({ length: days }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1))];
  const today = dayKey(new Date());
  return (
    <div className="rounded-2xl bg-brand-soft p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <p className="font-display font-bold text-lg text-brand" aria-live="polite">{month.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</p>
        <div className="flex gap-1">
          <button type="button" disabled={!canPrev} onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} aria-label="Previous month"
            className="w-10 h-10 rounded-full flex items-center justify-center text-brand hover:bg-surface disabled:opacity-30"><ChevronLeft size={20} /></button>
          <button type="button" disabled={!canNext} onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} aria-label="Next month"
            className="w-10 h-10 rounded-full flex items-center justify-center text-brand hover:bg-surface disabled:opacity-30"><ChevronRight size={20} /></button>
        </div>
      </div>
      <div className="grid grid-cols-7 mt-3 text-center text-xs font-bold text-ink" aria-hidden="true">
        {WEEKDAYS.map((w) => <span key={w} className="py-1">{w}</span>)}
      </div>
      <div className="grid grid-cols-7 gap-y-1 mt-1" role="radiogroup" aria-label="Day">
        {cells.map((d, i) => {
          if (!d) return <span key={`e${i}`} />;
          const k = dayKey(d);
          const free = byDay.has(k);
          const selected = value === k;
          return (
            <span key={k} className="flex justify-center">
              <button type="button" role="radio" aria-checked={selected} disabled={!free} onClick={() => onChange(k)}
                aria-label={`${d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}${free ? `, ${byDay.get(k).length} free times` : ', no free time'}`}
                className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full text-sm tabular-nums transition-colors ${selected ? 'bg-brand text-white font-bold shadow-md'
                  : free ? 'font-semibold text-ink hover:bg-surface' : 'text-ink-soft/50 cursor-default'} ${k === today && !selected ? 'ring-2 ring-accent' : ''}`}>
                {d.getDate()}
              </button>
            </span>
          );
        })}
      </div>
    </div>
  );
}

// The mentor's hours on the chosen day, as pill buttons. Hours already booked are shown but cannot be chosen.
// times: all hours of the day (ISO strings); free: Set of the free ones (all free when not given).
export function HourChips({ times, free, value, onChange }) {
  if (!times?.length) {
    return <p className="rounded-2xl border border-dashed border-line px-4 py-5 text-center text-sm text-ink-soft">Choose a day in the calendar to see the hours.</p>;
  }
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5" role="radiogroup" aria-label="Hour">
      {times.map((t) => {
        const open = !free || free.has(t);
        const on = value === t;
        return (
          <button key={t} type="button" role="radio" aria-checked={on} disabled={!open} onClick={() => onChange(t)}
            aria-label={`${timeLabel(t)}${open ? '' : ', already booked'}`} title={open ? undefined : 'Already booked'}
            className={`min-h-11 rounded-full border-[1.5px] text-[0.9rem] font-semibold tabular-nums transition-colors ${on ? 'bg-brand border-brand text-white shadow-md'
              : open ? 'border-brand text-brand bg-surface hover:bg-brand-soft' : 'border-line text-ink-soft/60 bg-paper line-through cursor-not-allowed'}`}>
            {timeLabel(t)}
          </button>
        );
      })}
    </div>
  );
}

// Reasons as radio buttons; "Other" opens a text box.
export function ReasonList({ reasons, value, onChange, details, onDetails, name }) {
  return (
    <div>
      <div className="space-y-1" role="radiogroup">
        {reasons.map((r) => (
          <label key={r} className="flex items-center gap-3 min-h-11 cursor-pointer">
            <input type="radio" name={name} checked={value === r} onChange={() => onChange(r)} className="peer sr-only" />
            <span className="w-5 h-5 shrink-0 rounded-full border-2 border-brand flex items-center justify-center peer-focus-visible:ring-2 peer-focus-visible:ring-brand/40 peer-focus-visible:ring-offset-2">
              {value === r && <span className="w-2.5 h-2.5 rounded-full bg-brand" />}
            </span>
            <span className={value === r ? 'font-semibold' : ''}>{r}</span>
          </label>
        ))}
      </div>
      {value && (
        <textarea value={details} onChange={(e) => onDetails(e.target.value)} rows={5} maxLength={500}
          aria-label={value === 'Other' ? 'Tell us the reason' : 'More details (optional)'}
          placeholder={value === 'Other' ? 'Tell us the reason…' : 'More details for your mentor (optional)'}
          className="mt-4 w-full rounded-2xl bg-paper border border-line p-4 text-[15px] focus:outline-none focus:ring-2 focus:ring-brand/30" />
      )}
    </div>
  );
}

// Big centred message after an action (booked, moved, cancelled).
export function SuccessDialog({ open, icon: Icon = CalendarCheck2, title, children, primary, secondary }) {
  const ref = useRef(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog ref={ref} onCancel={(e) => e.preventDefault()} aria-labelledby="success-title"
      className="m-auto w-[calc(100%-2.5rem)] max-w-sm rounded-[28px] p-0 bg-surface text-ink backdrop:bg-brand-deep/60">
      {open && (
        <div className="px-7 pt-8 pb-7 text-center">
          <div className="relative mx-auto w-36 h-36" aria-hidden="true">
            {[[4, 10, 14], [86, 18, 10], [92, 62, 7], [0, 70, 6], [30, 96, 6], [70, 98, 5], [56, 0, 4]].map(([x, y, s], i) => (
              <span key={i} className="absolute rounded-full bg-brand/40" style={{ left: `${x}%`, top: `${y}%`, width: s, height: s }} />
            ))}
            <span className="absolute inset-4 rounded-full bg-brand flex items-center justify-center shadow-[0_12px_30px_-10px_rgba(7,41,77,0.6)]">
              <span className="w-12 h-12 rounded-xl bg-white/95 text-brand flex items-center justify-center"><Icon size={28} /></span>
            </span>
          </div>
          <h2 id="success-title" className="mt-5 font-display text-2xl font-bold text-brand">{title}</h2>
          <div className="mt-2 text-ink-soft text-[15px]">{children}</div>
          <div className="mt-6 space-y-2.5">
            {primary && <Button variant="dark" className="w-full !rounded-full" onClick={primary.onClick}>{primary.label}</Button>}
            {secondary && <button type="button" onClick={secondary.onClick} className="w-full min-h-11 rounded-full bg-brand-soft text-brand font-semibold hover:bg-brand/15">{secondary.label}</button>}
          </div>
        </div>
      )}
    </dialog>
  );
}

// Bottom sheet on phones, centred card on bigger screens ("Are you sure…?").
export function ConfirmSheet({ open, title, children, confirmLabel, cancelLabel = 'Back', onConfirm, onClose, danger }) {
  const ref = useRef(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog ref={ref} onClose={onClose} onCancel={onClose} aria-labelledby="sheet-title"
      className="mt-auto mb-0 sm:m-auto w-full max-w-full sm:max-w-md rounded-t-[28px] sm:rounded-[28px] p-0 bg-surface text-ink backdrop:bg-brand-deep/50">
      {open && (
        <div className="px-6 pt-3 pb-6 sm:pt-6">
          <span className="block sm:hidden mx-auto w-10 h-1.5 rounded-full bg-line mb-4" aria-hidden="true" />
          <h2 id="sheet-title" className={`text-center font-display text-xl font-bold pb-4 border-b border-line ${danger ? 'text-danger' : 'text-brand'}`}>{title}</h2>
          <div className="py-5 text-center space-y-3">{children}</div>
          <div className="grid grid-cols-2 gap-3 pt-4 border-t border-line">
            <button type="button" onClick={onClose} className="min-h-12 rounded-full bg-brand-soft text-brand font-semibold hover:bg-brand/15">{cancelLabel}</button>
            <Button variant="dark" className="!rounded-full min-h-12" onClick={onConfirm}>{confirmLabel}</Button>
          </div>
        </div>
      )}
    </dialog>
  );
}

// Top bar of the full-page flows: ← Title
export function FlowHeader({ title, onBack, right }) {
  return (
    <div className="flex items-center gap-2 mb-6">
      <button type="button" onClick={onBack} aria-label="Back" className="w-11 h-11 -ml-2 rounded-full flex items-center justify-center hover:bg-brand-soft"><ChevronLeft size={24} /></button>
      <h1 className="flex-1 min-w-0 text-xl sm:text-2xl font-bold truncate">{title}</h1>
      {right}
    </div>
  );
}

// Step dots for multi-step flows.
export function Steps({ step, total }) {
  return (
    <div className="flex gap-1.5 mb-6" aria-label={`Step ${step} of ${total}`}>
      {Array.from({ length: total }, (_, i) => <span key={i} className={`h-1.5 flex-1 rounded-full ${i < step ? 'bg-brand' : 'bg-line'}`} />)}
    </div>
  );
}
