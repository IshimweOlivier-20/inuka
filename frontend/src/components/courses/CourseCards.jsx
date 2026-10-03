import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, BookOpenText, Laptop } from 'lucide-react';
import { coursePhoto } from '../../config/photos';
import { ProgressBar } from '../ui';
import { plainText } from '../../utils/sanitize';

// Course cards for the public Courses page (style idea from the reference theme):
// white card, rounded photo with a yellow "Free" badge, a round subject icon on the photo's edge,
// title, and a footer with the number of lessons and a "View details" link.
const SUBJECT = {
  english: { label: 'English', Icon: BookOpen, band: 'bg-brand' },
  computer: { label: 'Computer skills', Icon: Laptop, band: 'bg-green' },
};

function Photo({ c, className }) {
  const [broken, setBroken] = useState(false);
  const src = broken ? null : coursePhoto(c);
  const sub = SUBJECT[c.category] || SUBJECT.english;
  return (
    <div className={`relative rounded-lg overflow-hidden ${src ? 'bg-brand-soft' : sub.band} ${className}`}>
      {src
        ? <img src={src} alt="" loading="lazy" onError={() => setBroken(true)} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
        : <span className="absolute inset-0 flex items-center justify-center"><sub.Icon size={56} strokeWidth={1.4} className="text-white" aria-hidden="true" /></span>}
      <span className="absolute top-3 left-3 rounded-full bg-accent text-night text-sm font-semibold px-3.5 py-1">Free</span>
      <span className="absolute top-3 right-3 rounded-full bg-white/95 text-night text-xs font-semibold px-3 py-1">Course {c.track}</span>
    </div>
  );
}

function SubjectBadge({ c }) {
  const sub = SUBJECT[c.category] || SUBJECT.english;
  return (
    <span className="absolute -top-7 right-5 w-14 h-14 rounded-full bg-white ring-4 ring-white shadow-[0_6px_16px_-6px_rgba(7,41,77,0.45)] flex items-center justify-center text-brand"
      title={sub.label}>
      <sub.Icon size={24} strokeWidth={1.8} aria-hidden="true" />
    </span>
  );
}

// What the card's link does: signed-in students go to the course; visitors open the details window.
function Action({ c, signedIn, onDetails }) {
  const label = !signedIn ? 'View details' : { in_progress: 'Continue', completed: 'Review' }[c._status] || 'View details';
  const cls = 'inline-flex items-center gap-1 font-semibold text-[15px] text-accent-dark hover:text-brand group/btn';
  const icon = <ArrowRight size={16} className="text-accent-hover transition-transform group-hover/btn:translate-x-0.5" aria-hidden="true" />;
  if (!signedIn) return <button type="button" onClick={() => onDetails(c)} className={cls} aria-label={`View details: ${c.title}`}>{label}{icon}</button>;
  const to = c._status === 'in_progress' && c._nextLessonId ? `/lessons/${c._nextLessonId}` : `/courses/${c.slug}`;
  return <Link to={to} className={cls}>{label}{icon}</Link>;
}

function Footer({ c, signedIn, onDetails }) {
  return (
    <div className="mt-auto border-t border-line px-5 py-4 flex items-center justify-between gap-2 whitespace-nowrap">
      <span className="inline-flex items-center gap-2 text-[15px] text-ink-soft">
        <BookOpenText size={18} className="text-accent-hover" aria-hidden="true" />{c.lessons.length} lessons
      </span>
      <Action c={c} signedIn={signedIn} onDetails={onDetails} />
    </div>
  );
}

function Meta({ c }) {
  const sub = SUBJECT[c.category] || SUBJECT.english;
  return <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">{sub.label} · {c.level}</p>;
}

function Extras({ c, signedIn }) {
  return (
    <>
      {c._matchedLesson && (
        <p className="mt-3 text-sm rounded-md bg-brand-soft px-3 py-2">Includes the lesson <strong>{c._matchedLesson}</strong></p>
      )}
      {signedIn && c._status !== 'not_started' && (
        <div className="mt-4"><ProgressBar value={c._percent} label={c._status === 'completed' ? 'Completed' : 'Your progress'} /></div>
      )}
    </>
  );
}

export function CourseGridCard({ c, signedIn, onDetails }) {
  return (
    <li className="group bg-surface rounded-xl border border-line flex flex-col hover:shadow-[0_22px_40px_-26px_rgba(7,41,77,0.45)] transition-shadow duration-300">
      <div className="p-3 pb-0"><Photo c={c} className="h-48" /></div>
      <div className="relative px-5 pt-6 pb-5">
        <SubjectBadge c={c} />
        <Meta c={c} />
        <h3 className="mt-1.5 text-lg font-semibold text-brand leading-snug pr-2">{c.title}</h3>
        <Extras c={c} signedIn={signedIn} />
      </div>
      <Footer c={c} signedIn={signedIn} onDetails={onDetails} />
    </li>
  );
}

export function CourseListCard({ c, signedIn, onDetails }) {
  return (
    <li className="group bg-surface rounded-xl border border-line flex flex-col sm:flex-row hover:shadow-[0_22px_40px_-26px_rgba(7,41,77,0.45)] transition-shadow duration-300">
      <div className="p-3 sm:pr-0 sm:w-[280px] shrink-0"><Photo c={c} className="h-48 sm:h-full sm:min-h-[200px]" /></div>
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="px-5 pt-5 pb-4">
          <Meta c={c} />
          <h3 className="mt-1.5 text-lg font-semibold text-brand leading-snug">{c.title}</h3>
          <p className="mt-2 text-[15px] text-ink-soft line-clamp-2">{plainText(c.description)}</p>
          {c.skills?.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Skills you will build">
              {c.skills.map((s) => <li key={s} className="rounded-full bg-paper border border-line px-2.5 py-0.5 text-xs font-medium text-ink-soft">{s}</li>)}
            </ul>
          )}
          <Extras c={c} signedIn={signedIn} />
        </div>
        <Footer c={c} signedIn={signedIn} onDetails={onDetails} />
      </div>
    </li>
  );
}

export { ViewSwitch, Pagination } from '../ui/ListControls';

// Details shown to visitors (the course page itself needs an account).
export function CourseDetails({ c }) {
  return (
    <div>
      <Photo c={c} className="h-48" />
      <div className="mt-4"><Meta c={c} /></div>
      <p className="mt-2 text-[15px] text-ink-soft">{plainText(c.description)}</p>
      {c.skills?.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Skills you will build">
          {c.skills.map((s) => <li key={s} className="rounded-full bg-paper border border-line px-2.5 py-0.5 text-xs font-medium text-ink-soft">{s}</li>)}
        </ul>
      )}
      <h4 className="mt-5 font-semibold text-brand">{c.lessons.length} lessons</h4>
      <ol className="mt-2 space-y-2">
        {c.lessons.map((l, i) => (
          <li key={l.id} className="flex gap-3 text-sm">
            <span className="w-6 h-6 shrink-0 rounded-full bg-brand-soft text-brand font-semibold flex items-center justify-center text-xs">{i + 1}</span>
            <span><span className="font-medium text-ink">{l.title}</span>{l.summary && <span className="block text-ink-soft">{plainText(l.summary)}</span>}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
