import { Button, Pill } from '../ui';
import { FUNDING_LABEL, LEVEL_LABEL, deadlineTone, formatDate } from '../../utils/format';
import { Bookmark, BookmarkCheck, Check } from 'lucide-react';

export default function ScholarshipCard({ s, onOpen, onSave, onApply }) {
  const d = deadlineTone(s.deadline);
  return (
    <li className="bg-surface rounded-xl border border-line p-5 flex flex-col">
      <div className="flex items-start gap-3">
        <span className="w-12 h-12 shrink-0 rounded-lg bg-brand-soft text-brand font-display font-bold text-lg flex items-center justify-center" aria-hidden>
          {s.orgName.replace(/[^A-Za-z ]/g, '').split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('')}
        </span>
        <div className="min-w-0">
          <h3 className="font-semibold text-lg leading-snug"><button onClick={() => onOpen(s)} className="text-left hover:underline">{s.name}</button></h3>
          <p className="text-sm text-ink-soft">{s.hostUniversity || s.orgName}, {s.hostCountry}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 mt-3">
        <Pill tone={s.fundingType === 'fully_funded' ? 'sky' : 'brand'}>{FUNDING_LABEL[s.fundingType]}</Pill>
        {s.openToRefugees && <Pill tone="cyan"><Check size={13} strokeWidth={3} aria-hidden="true" />{s.refugeesOnly ? 'For refugees' : 'Open to refugees'}</Pill>}
        <Pill tone="grey">{LEVEL_LABEL[s.level]}</Pill>
      </div>
      <p className="text-sm text-ink-soft mt-3 line-clamp-3 flex-1">{s.description}</p>
      <p className="mt-3 text-sm">
        <Pill tone={d.tone}>{d.text}</Pill>
        {s.deadline && <span className="ml-2 text-ink-soft">{formatDate(s.deadline)}</span>}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="ghost" onClick={() => onSave(s)} aria-pressed={s.saved} className="px-3">{s.saved ? <BookmarkCheck size={18} className="text-brand" fill="currentColor" fillOpacity={0.15} aria-hidden="true" /> : <Bookmark size={18} aria-hidden="true" />}{s.saved ? 'Saved' : 'Save'}</Button>
        <Button variant="outline" onClick={() => onOpen(s)} className="px-4 whitespace-nowrap">Learn more</Button>
        <Button onClick={() => onApply(s)} className="px-4 flex-1 min-w-[8.5rem] whitespace-nowrap">Apply now</Button>
      </div>
    </li>
  );
}
