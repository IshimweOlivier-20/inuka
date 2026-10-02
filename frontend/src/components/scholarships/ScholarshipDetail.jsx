import { Button, Modal, Pill } from '../ui';
import { FUNDING_LABEL, LEVEL_LABEL, deadlineTone, formatDate } from '../../utils/format';
import { Bookmark, BookmarkCheck, Check, ExternalLink } from 'lucide-react';
import RichText from '../../components/ui/RichText';

export default function ScholarshipDetail({ data, onClose, onSave, onApply, onOpenRelated }) {
  if (!data) return null;
  const { scholarship: s, related } = data;
  const d = deadlineTone(s.deadline);
  return (
    <Modal open onClose={onClose} wide title={s.name}
      footer={<>
        <Button variant="ghost" onClick={() => onSave(s)}>{s.saved ? <BookmarkCheck size={18} aria-hidden="true" /> : <Bookmark size={18} aria-hidden="true" />}{s.saved ? 'Saved' : 'Save'}</Button>
        <Button onClick={() => onApply(s)}>Apply now</Button>
      </>}>
      <p className="text-ink-soft">{s.orgName}, {s.hostCountry}</p>
      <div className="flex flex-wrap gap-2 mt-3">
        <Pill tone={s.fundingType === 'fully_funded' ? 'sky' : 'brand'}>{FUNDING_LABEL[s.fundingType]}</Pill>
        {s.openToRefugees && <Pill tone="cyan"><Check size={13} strokeWidth={3} aria-hidden="true" />{s.refugeesOnly ? 'For refugees only' : 'Open to refugees'}</Pill>}
        <Pill tone="grey">{LEVEL_LABEL[s.level]}</Pill>
        <Pill tone="grey">Study in {s.languageOfStudy === 'Both' ? 'English or French' : s.languageOfStudy}</Pill>
      </div>

      <div className={`mt-5 rounded-xl p-4 ${d.tone === 'red' ? 'bg-red-50' : 'bg-paper'}`}>
        <p className="font-semibold">Deadline: {s.deadline ? formatDate(s.deadline) : 'Varies'} {s.deadline && <Pill tone={d.tone}>{d.text}</Pill>}</p>
        {s.deadlineNote && <p className="text-sm text-ink-soft mt-1">{s.deadlineNote}</p>}
      </div>

      <RichText html={s.description} className="mt-5" />
      <Section title="Who can apply" items={s.eligibility} />
      <Section title="What it covers" items={s.coverage} />
      <Section title="How to apply" items={s.applicationSteps} ordered />
      <p className="mt-5"><a href={s.applyUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-brand font-semibold underline">Official website <ExternalLink size={16} aria-hidden="true" /></a></p>

      {related?.length > 0 && (
        <section className="mt-6 pt-5 border-t border-line">
          <h3 className="font-semibold mb-2">Related scholarships</h3>
          <ul className="space-y-1">
            {related.map((r) => <li key={r.id}><button onClick={() => onOpenRelated(r)} className="text-brand hover:underline text-left">{r.name}</button></li>)}
          </ul>
        </section>
      )}
    </Modal>
  );
}

function Section({ title, items, ordered }) {
  if (!items?.length) return null;
  const List = ordered ? 'ol' : 'ul';
  return (
    <section className="mt-5">
      <h3 className="font-semibold mb-2">{title}</h3>
      <List className={`${ordered ? 'list-decimal' : 'list-disc'} pl-6 space-y-1`}>{items.map((i) => <li key={i}>{i}</li>)}</List>
    </section>
  );
}
