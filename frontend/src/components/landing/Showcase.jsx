import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Award, BookOpen, CalendarClock, Check, Headphones, Laptop, ListChecks } from 'lucide-react';
import { FUNDING_LABEL, LEVEL_LABEL, deadlineTone, formatDate } from '../../utils/format';
import { plainText } from '../../utils/sanitize';

const INTERVAL = 5500; // ms per card

/*
  Hero slider of real items (courses or scholarships) taken from the same data as the list below it.
  items: array; getKey(item); getLabel(item) for screen readers; renderItem(item, isActive).
  It moves on by itself and pauses while the mouse or keyboard focus is on a card; swipe on phones.
  All cards sit in one grid cell, so the slider is as tall as the tallest card and nothing jumps.
*/
export default function Showcase({ items, getKey, getLabel, renderItem, label }) {
  const [index, setIndex] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [hidden, setHidden] = useState(false);
  const touchX = useRef(null);
  const count = items?.length || 0;
  const running = count > 1 && !hovered && !hidden;
  const go = useCallback((i) => setIndex(((i % count) + count) % count), [count]);

  useEffect(() => { if (index >= count && count) setIndex(0); }, [count, index]);
  useEffect(() => {
    if (!running) return undefined;
    const t = setTimeout(() => go(index + 1), INTERVAL);
    return () => clearTimeout(t);
  }, [index, running, go]);
  useEffect(() => {
    const onVis = () => setHidden(document.hidden);
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  if (!items) return <ShowcaseSkeleton />;
  if (!count) return null;

  const onTouchStart = (e) => { touchX.current = e.touches[0].clientX; };
  const onTouchEnd = (e) => {
    if (touchX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    if (Math.abs(dx) > 40) go(index + (dx < 0 ? 1 : -1));
    touchX.current = null;
  };

  return (
    <section
      className="w-full max-w-[440px]"
      aria-roledescription="carousel"
      aria-label={label}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setHovered(false); }}
    >
      <div className="relative" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <div className="relative grid grid-cols-1">
          {items.map((item, i) => (
            <div
              key={getKey(item)}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${count}: ${getLabel(item)}`}
              aria-hidden={i !== index}
              inert={i !== index ? '' : undefined}
              className={`[grid-area:1/1] min-w-0 transition-[opacity,transform] duration-700 ease-out motion-reduce:transition-none ${
                i === index ? 'opacity-100 translate-x-0 scale-100' : 'opacity-0 translate-x-6 scale-[0.97] pointer-events-none'}`}
            >
              {renderItem(item, i === index)}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ShowcaseSkeleton() {
  return (
    <div className="w-full max-w-[440px] rounded-xl bg-surface/95 p-6 animate-pulse" aria-label="Loading" role="status">
      <div className="flex gap-3 items-center"><div className="w-12 h-12 rounded-xl bg-brand-soft" /><div className="h-4 w-32 rounded bg-brand-soft" /></div>
      <div className="h-6 w-4/5 rounded bg-brand-soft mt-5" />
      <div className="h-4 w-1/2 rounded bg-brand-soft mt-3" />
      <div className="h-16 rounded-xl bg-paper mt-5" />
      <div className="h-12 rounded-xl bg-brand-soft mt-5" />
    </div>
  );
}

const cardClass = 'rounded-xl bg-surface text-ink ring-1 ring-white/25 shadow-[0_12px_30px_-18px_rgba(3,20,60,0.35)] overflow-hidden';

/* ---------- Course card ---------- */
const SUBJECT = {
  english: { name: 'English', Icon: BookOpen, band: 'bg-brand' },
  computer: { name: 'Computer skills', Icon: Laptop, band: 'bg-cyan' },
};

export function CourseShowcaseCard({ c, to }) {
  const s = SUBJECT[c.category] || SUBJECT.english;
  return (
    <article className={cardClass}>
      <div className={`${s.band} px-6 py-5 text-white`}>
        <div className="flex items-center gap-3">
          <span className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center"><s.Icon size={22} aria-hidden="true" /></span>
          <span className="text-sm font-semibold">{s.name} · Course {c.track}</span>
          <span className="ml-auto rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap">{c.level}</span>
        </div>
        <h3 className="text-white font-bold text-2xl leading-snug mt-4 line-clamp-2">{c.title}</h3>
      </div>
      <div className="px-6 py-5">
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-soft">
          <li className="inline-flex items-center gap-1.5"><ListChecks size={16} className="text-brand" aria-hidden="true" />{c.lessons.length} lessons</li>
          <li className="inline-flex items-center gap-1.5"><Headphones size={16} className="text-brand" aria-hidden="true" />Audio</li>
          <li className="inline-flex items-center gap-1.5"><Award size={16} className="text-brand" aria-hidden="true" />Certificate</li>
        </ul>
        <ol className="mt-4 space-y-2">
          {c.lessons.slice(0, 3).map((l, i) => (
            <li key={l.id} className="flex items-center gap-3 text-[15px]">
              <span className="w-6 h-6 shrink-0 rounded-full bg-brand-soft text-brand font-semibold flex items-center justify-center text-xs">{i + 1}</span>
              <span className="truncate">{l.title}</span>
            </li>
          ))}
          {c.lessons.length > 3 && <li className="pl-9 text-sm text-ink-soft">and {c.lessons.length - 3} more lessons</li>}
        </ol>
        <div className="mt-5 flex items-center gap-3">
          <span className="rounded-full bg-brand-soft text-brand-deep text-sm font-bold px-3 py-1">Free</span>
          <Link to={to} className="ml-auto inline-flex items-center gap-2 min-h-11 px-5 rounded-xl bg-brand text-white font-display font-semibold hover:bg-brand-dark">
            Start course<ArrowRight size={18} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </article>
  );
}

/* ---------- Scholarship card ---------- */
const initials = (name) => name.replace(/[^A-Za-z ]/g, '').split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('');

export function ScholarshipShowcaseCard({ s, onOpen }) {
  const d = deadlineTone(s.deadline);
  return (
    <article className={cardClass}>
      <div className="px-6 pt-6">
        <div className="flex items-start gap-3">
          <span className="w-14 h-14 shrink-0 rounded-lg bg-brand text-white font-display font-bold text-lg flex items-center justify-center" aria-hidden="true">
            {initials(s.orgName)}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink-soft truncate">{s.orgName}</p>
            <h3 className="font-bold text-xl leading-snug line-clamp-2">{s.name}</h3>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${s.fundingType === 'fully_funded' ? 'bg-brand text-white' : 'bg-brand-soft text-brand-deep'}`}>{FUNDING_LABEL[s.fundingType]}</span>
          {s.openToRefugees && (
            <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft text-brand px-3 py-1 text-xs font-semibold">
              <Check size={13} strokeWidth={3} aria-hidden="true" />{s.refugeesOnly ? 'For refugees' : 'Open to refugees'}
            </span>
          )}
          <span className="rounded-full bg-paper border border-line px-3 py-1 text-xs font-semibold text-ink-soft">{LEVEL_LABEL[s.level]}</span>
        </div>
        <p className="mt-4 text-[15px] text-ink-soft line-clamp-3">{plainText(s.description)}</p>
      </div>
      <div className="mt-5 mx-6 rounded-lg bg-paper border border-line px-4 py-3 flex items-center gap-3">
        <CalendarClock size={20} className="text-brand shrink-0" aria-hidden="true" />
        <div className="min-w-0 text-sm">
          <p className="font-semibold">{s.hostUniversity || s.hostCountry}</p>
          <p className="text-ink-soft">{s.deadline ? `Deadline ${formatDate(s.deadline)}` : 'Rolling deadline'}</p>
        </div>
        <span className={`ml-auto shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${d.tone === 'red' ? 'bg-red-100 text-red-800' : 'bg-brand-soft text-brand-deep'}`}>{d.text}</span>
      </div>
      <div className="px-6 py-5">
        <button type="button" onClick={() => onOpen(s)}
          className="w-full inline-flex items-center justify-center gap-2 min-h-12 rounded-xl bg-brand text-white font-display font-semibold hover:bg-brand-dark">
          See details and how to apply<ArrowRight size={18} aria-hidden="true" />
        </button>
      </div>
    </article>
  );
}
