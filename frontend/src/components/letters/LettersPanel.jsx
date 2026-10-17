import { useEffect, useState } from 'react';
import { BellRing, CircleCheck, Clock, FileText, Mail, Plus, X, XCircle } from 'lucide-react';
import { Alert, Button, Field, Modal } from '../ui';
import { api, errorMessage } from '../../services/api';
import { formatDate } from '../../utils/format';
import { ListRowsSkeleton } from '../ui/Skeletons';

// Recommendation letters: the student asks a teacher by email; the teacher uploads the letter from the link
// (no account needed) and it lands in the student's document vault. Requested → (reminded) → received.
const STATUS = {
  requested: { label: 'Waiting', cls: 'bg-warning-soft text-warning-ink', Icon: Clock },
  received: { label: 'Received', cls: 'bg-success-soft text-success-ink', Icon: CircleCheck },
  declined: { label: 'Teacher declined', cls: 'bg-danger-soft text-danger-ink', Icon: XCircle },
  cancelled: { label: 'Cancelled', cls: 'bg-brand-soft/60 text-ink-soft', Icon: X },
};
const EMPTY = { teacherName: '', teacherEmail: '', relationship: '', purpose: '', dueDate: '', message: '' };
const canRemind = (l) => l.status === 'requested' && Date.now() - new Date(l.remindedAt || l.createdAt).getTime() >= 3 * 864e5;

function Steps({ l }) {
  const steps = [['Requested', l.createdAt], ...(l.remindedAt ? [['Reminded', l.remindedAt]] : []),
    [l.status === 'declined' ? 'Declined' : l.status === 'cancelled' ? 'Cancelled' : 'Received', l.receivedAt || (l.status !== 'requested' ? true : null)]];
  return (
    <ol className="flex items-center gap-1.5 text-[11px] text-ink-soft mt-2" aria-label="Progress">
      {steps.map(([s, d], i) => (
        <li key={s} className="flex items-center gap-1.5">
          {i > 0 && <span className={`w-5 h-px ${d ? 'bg-success' : 'bg-line'}`} aria-hidden="true" />}
          <span className={`w-2 h-2 rounded-full ${d ? (s === 'Declined' || s === 'Cancelled' ? 'bg-danger' : 'bg-success') : 'bg-line'}`} aria-hidden="true" />
          <span className={d ? 'text-ink font-medium' : ''}>{s}{d && d !== true ? ` · ${formatDate(d)}` : ''}</span>
        </li>
      ))}
    </ol>
  );
}

export default function LettersPanel() {
  const [list, setList] = useState(null);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [fieldErr, setFieldErr] = useState('');
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState('');

  const load = async () => {
    try { setList((await api.get('/letters')).data.letters); } catch (e) { setError(errorMessage(e)); }
  };
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault(); setFieldErr(''); setBusy('new');
    try {
      const { data } = await api.post('/letters', { ...form, dueDate: form.dueDate || null, message: form.message || null });
      setList((l) => [data.letter, ...(l || [])]);
      setOpen(false); setForm(EMPTY);
      setNotice(`We emailed ${data.letter.teacherName}. You will get a notification when the letter arrives.`);
    } catch (err) { setFieldErr(errorMessage(err)); } finally { setBusy(''); }
  };
  const act = async (l, action) => {
    setBusy(l.id + action); setError(''); setNotice('');
    try {
      const { data } = await api.post(`/letters/${l.id}/${action}`);
      setList((ls) => ls.map((x) => (x.id === l.id ? data.letter : x)));
      if (action === 'remind') setNotice(`Reminder sent to ${l.teacherName}.`);
    } catch (err) { setError(errorMessage(err)); } finally { setBusy(''); }
  };
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const waiting = list?.filter((l) => l.status === 'requested').length || 0;
  const received = list?.filter((l) => l.status === 'received').length || 0;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Recommendation letters</h2>
          <p className="text-sm text-ink-soft mt-0.5 max-w-2xl">Ask a teacher by email. They upload the letter from the link we send (no account needed) and it is saved in your document vault.</p>
        </div>
        <Button onClick={() => { setOpen(true); setFieldErr(''); }} className="!min-h-10 !px-4 text-sm"><Plus size={16} aria-hidden="true" />Ask a teacher</Button>
      </div>

      {list && list.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mt-4 max-w-md">
          {[['Asked', list.filter((l) => l.status !== 'cancelled').length], ['Waiting', waiting], ['Received', received]].map(([l, n]) => (
            <div key={l} className="bg-surface border border-line rounded-md px-3 py-2"><p className="text-lg font-bold leading-tight">{n}</p><p className="text-xs text-ink-soft">{l}</p></div>
          ))}
        </div>
      )}

      <div className="mt-4 space-y-3">
        {notice && <Alert tone="success">{notice}</Alert>}
        {error && <Alert>{error}</Alert>}
      </div>

      {!list ? <div className="mt-4"><ListRowsSkeleton rows={3} /></div> : list.length === 0 ? (
        <div className="mt-5 bg-surface border border-dashed border-line rounded-md p-6 text-center">
          <Mail size={28} className="mx-auto text-brand" aria-hidden="true" />
          <p className="font-semibold mt-2">No letters yet</p>
          <p className="text-sm text-ink-soft mt-1 max-w-md mx-auto">Most scholarships ask for 2 letters. Ask early: teachers need 1–2 weeks. A teacher who knows you well is better than a famous one.</p>
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {list.map((l) => {
            const st = STATUS[l.status] || STATUS.requested;
            return (
              <li key={l.id} className="bg-surface border border-line rounded-md p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold">{l.teacherName} <span className="text-sm font-normal text-ink-soft">· {l.relationship}</span></p>
                    <p className="text-sm text-ink-soft">For: <span className="text-ink">{l.purpose}</span>{l.dueDate && <> · needed by {formatDate(l.dueDate)}</>}</p>
                    <Steps l={l} />
                    {l.status === 'declined' && l.declineNote && <p className="text-sm mt-2 text-danger-ink">“{l.declineNote}”</p>}
                  </div>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${st.cls}`}><st.Icon size={13} aria-hidden="true" />{st.label}</span>
                </div>
                {(l.status === 'requested' || l.status === 'received') && (
                  <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-line">
                    {l.status === 'received' && <Button variant="ghost" to="/profile?tab=documents" className="!min-h-9 !px-3 text-sm"><FileText size={15} aria-hidden="true" />See it in my documents</Button>}
                    {l.status === 'requested' && (
                      <>
                        <Button variant="outline" className="!min-h-9 !px-3 text-sm !border" disabled={!canRemind(l)} loading={busy === l.id + 'remind'} onClick={() => act(l, 'remind')}
                          title={canRemind(l) ? '' : 'You can remind 3 days after the last email'}><BellRing size={15} aria-hidden="true" />Send a reminder</Button>
                        <Button variant="ghost" className="!min-h-9 !px-3 text-sm" loading={busy === l.id + 'cancel'} onClick={() => act(l, 'cancel')}>Cancel request</Button>
                        {!canRemind(l) && <span className="text-xs text-ink-soft self-center">Reminder possible 3 days after the last email.</span>}
                      </>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Ask a teacher for a letter"
        footer={<><Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" form="letter-form" loading={busy === 'new'}>Send request</Button></>}>
        <form id="letter-form" onSubmit={submit} className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Teacher's name" value={form.teacherName} onChange={set('teacherName')} placeholder="Mr. Jean Habimana" required />
            <Field label="Teacher's email" type="email" value={form.teacherEmail} onChange={set('teacherEmail')} placeholder="teacher@school.rw" required />
          </div>
          <Field label="How does this teacher know you?" value={form.relationship} onChange={set('relationship')} placeholder="My Mathematics teacher in S5 and S6" required />
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="What is the letter for?" value={form.purpose} onChange={set('purpose')} placeholder="Mastercard Foundation Scholarship" required />
            <Field label="Needed by (optional)" type="date" value={form.dueDate} onChange={set('dueDate')} min={new Date().toISOString().slice(0, 10)} />
          </div>
          <Field as="textarea" rows={3} label="Short message to your teacher (optional)" value={form.message} onChange={set('message')} maxLength={800}
            hint="Remind them of your best work, your goals and why this scholarship matters to you." />
          {fieldErr && <Alert>{fieldErr}</Alert>}
        </form>
      </Modal>
    </div>
  );
}
