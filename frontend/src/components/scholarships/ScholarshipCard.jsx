import { useState } from 'react';
import { Bookmark, BookmarkCheck, CalendarDays, GraduationCap, MapPin } from 'lucide-react';
import { Button } from '../ui';
import { deadlineTone, formatDate } from '../../utils/format';
import { plainText } from '../../utils/sanitize';
import { scholarshipPhoto } from '../../config/photos';

// Scholarship card: photo with a Save button (top right), country, name and organisation,
// then "Learn more" and "Apply now" side by side, then the deadline and the days left.
// Funding, refugee and level details are shown in the full details window ("Learn more").
// `view="list"` puts the photo on the left and adds a short description.
const DAYS_TONE = { red: 'text-danger', brand: 'text-brand', sky: 'text-success', grey: 'text-ink-soft' };

function Photo({ s, onSave, className }) {
  const [broken, setBroken] = useState(false);
  const photo = scholarshipPhoto(s);
  return (
    <div className={`relative rounded-lg overflow-hidden bg-brand ${className}`}>
      {!broken
        ? <img src={photo.src} alt={photo.alt} loading="lazy" onError={() => setBroken(true)}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
        : <span className="absolute inset-0 flex items-center justify-center"><GraduationCap size={56} strokeWidth={1.4} className="text-white" aria-hidden="true" /></span>}
      <button type="button" onClick={() => onSave(s)} aria-pressed={!!s.saved}
        aria-label={s.saved ? `Saved: ${s.name}` : `Save ${s.name}`} title={s.saved ? 'Saved' : 'Save'}
        className={`absolute top-3 right-3 w-10 h-10 rounded-full flex items-center justify-center shadow-[0_6px_16px_-6px_rgba(0,0,0,0.45)] transition-colors ${
          s.saved ? 'bg-accent text-night' : 'bg-white text-brand hover:bg-accent hover:text-night'}`}>
        {s.saved ? <BookmarkCheck size={19} fill="currentColor" fillOpacity={0.2} aria-hidden="true" /> : <Bookmark size={19} aria-hidden="true" />}
      </button>
    </div>
  );
}

function Deadline({ s }) {
  const d = deadlineTone(s.deadline);
  return (
    <div className="mt-auto border-t border-line px-4 py-3.5 flex items-center justify-between gap-2 text-sm">
      <span className="inline-flex items-center gap-1.5 text-ink-soft min-w-0">
        <CalendarDays size={16} className="text-accent-hover shrink-0" aria-hidden="true" />
        <span className="truncate">{s.deadline ? formatDate(s.deadline) : 'Deadline varies'}</span>
      </span>
      {s.deadline && <span className={`shrink-0 text-sm font-semibold ${DAYS_TONE[d.tone] || DAYS_TONE.grey}`}>{d.text}</span>}
    </div>
  );
}

function Heading({ s, onOpen }) {
  return (
    <>
      <p className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-ink-soft">
        <MapPin size={13} aria-hidden="true" />{s.hostCountry}
      </p>
      <h3 className="mt-1 text-lg font-semibold text-brand leading-snug">
        <button type="button" onClick={() => onOpen(s)} className="text-left hover:underline">{s.name}</button>
      </h3>
      <p className="mt-0.5 text-sm text-ink-soft">{s.hostUniversity || s.orgName}</p>
    </>
  );
}

function Actions({ s, onOpen, onApply }) {
  return (
    <div className="grid grid-cols-2 gap-2 mt-4">
      <Button variant="outline" onClick={() => onOpen(s)} className="px-2 whitespace-nowrap">Learn more</Button>
      <Button onClick={() => onApply(s)} className="px-2 whitespace-nowrap">Apply now</Button>
    </div>
  );
}

export default function ScholarshipCard({ s, onOpen, onSave, onApply, view = 'grid' }) {
  if (view === 'list') {
    return (
      <li className="group bg-surface rounded-xl border border-line flex flex-col sm:flex-row hover:shadow-[0_22px_40px_-26px_rgba(7,41,77,0.45)] transition-shadow duration-300">
        <div className="p-3 sm:pr-0 sm:w-[260px] shrink-0"><Photo s={s} onSave={onSave} className="h-48 sm:h-full sm:min-h-[210px]" /></div>
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="px-4 pt-4 pb-4">
            <Heading s={s} onOpen={onOpen} />
            <p className="mt-2 text-[15px] text-ink-soft line-clamp-2">{plainText(s.description)}</p>
            <div className="max-w-sm"><Actions s={s} onOpen={onOpen} onApply={onApply} /></div>
          </div>
          <Deadline s={s} />
        </div>
      </li>
    );
  }
  return (
    <li className="group bg-surface rounded-xl border border-line flex flex-col hover:shadow-[0_22px_40px_-26px_rgba(7,41,77,0.45)] transition-shadow duration-300">
      <div className="p-3 pb-0"><Photo s={s} onSave={onSave} className="h-44" /></div>
      <div className="px-4 pt-4 pb-4 flex-1 flex flex-col">
        <Heading s={s} onOpen={onOpen} />
        <div className="mt-auto"><Actions s={s} onOpen={onOpen} onApply={onApply} /></div>
      </div>
      <Deadline s={s} />
    </li>
  );
}
