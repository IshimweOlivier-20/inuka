import { Link } from 'react-router-dom';
import { Button, Modal } from '../ui';

// Spec 10.2 — shown every time a student clicks Apply, before leaving INUKA.
export default function DocumentChecklist({ open, scholarship, checklist, onClose, onContinue, onSave }) {
  if (!scholarship || !checklist) return null;
  const all = [...checklist.always, ...checklist.conditional];
  const ready = all.filter((d) => d.uploaded).length;
  return (
    <Modal open={open} onClose={onClose} wide title="Before you apply — make sure you have everything ready!"
      footer={<>
        <Button variant="ghost" onClick={onClose}>Close</Button>
        {!scholarship.saved && <Button variant="outline" onClick={onSave}>Save this scholarship for later</Button>}
        <Button onClick={onContinue}>I have all my documents — continue to apply ↗</Button>
      </>}>
      <p className="text-ink-soft">
        <strong className="text-ink">{scholarship.name}</strong>. You have <strong className="text-ink">{ready} of {all.length}</strong> documents in your vault.
      </p>
      <Group title="Needed for every application" items={checklist.always} />
      {checklist.conditional.length > 0 && <Group title="Also needed for this scholarship" items={checklist.conditional} />}
      <p className="mt-5 text-sm text-ink-soft">
        Every scholarship has its own rules. Always read the official page carefully. The Apply button opens it in a new tab.
      </p>
    </Modal>
  );
}

function Group({ title, items }) {
  return (
    <section className="mt-5">
      <h3 className="font-semibold mb-2">{title}</h3>
      <ul className="divide-y divide-line rounded-lg border border-line">
        {items.map((d) => (
          <li key={d.key} className="flex items-center gap-3 px-3 py-2.5">
            <span className={`w-6 h-6 shrink-0 rounded flex items-center justify-center text-sm ${d.uploaded ? 'bg-success text-white' : 'border-2 border-line'}`} aria-label={d.uploaded ? 'In your vault' : 'Not uploaded'}>
              {d.uploaded ? '✓' : ''}
            </span>
            <span className="flex-1 text-[15px]">{d.label}</span>
            {!d.uploaded && (
              <Link to={`/profile?tab=documents&type=${d.vaultType}`} className="text-sm text-forest font-semibold hover:underline whitespace-nowrap">Upload to vault</Link>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
