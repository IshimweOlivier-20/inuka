import { useEffect, useState } from 'react';
import { ExternalLink, UserCheck } from 'lucide-react';
import { Alert, Button, EmptyState, Field, Modal, Pill } from '../../components/ui';
import Avatar from '../../components/ui/Avatar';
import { ListRowsSkeleton } from '../../components/ui/Skeletons';
import { PageTitle } from '../../components/admin/AdminUI';
import { DAY_NAMES, utcSlotsToLocalRanges } from '../../utils/availability';
import { api, errorMessage } from '../../services/api';
import { formatDate } from '../../utils/format';

const TABS = [['pending', 'Waiting for approval'], ['approved', 'Approved'], ['rejected', 'Sent back']];

// Mentor approval (spec 16.2): review applications, approve, or reject with feedback.
export default function AdminMentors() {
  const [tab, setTab] = useState('pending');
  const [data, setData] = useState(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [rejecting, setRejecting] = useState(null);

  const load = () => api.get('/admin/mentors', { params: { status: tab } }).then((r) => setData(r.data)).catch((e) => setError(errorMessage(e)));
  useEffect(() => { document.title = 'Mentors — INUKA admin'; }, []);
  useEffect(() => { setData(null); load(); }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  const approve = async (m) => {
    try { await api.post(`/admin/mentors/${m.id}/approve`); setNotice(`${m.user.firstName} ${m.user.lastName} is approved and has been told by email.`); load(); }
    catch (e) { setError(errorMessage(e)); }
  };

  return (
    <div className="space-y-5">
      <PageTitle title="Mentors" intro="Every mentor is checked before students can see them. Approve good profiles, or send them back with feedback." />
      {notice && <Alert tone="success">{notice}</Alert>}
      {error && <Alert>{error}</Alert>}
      <div role="tablist" className="flex gap-1 border-b border-line overflow-x-auto">
        {TABS.map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
            className={`min-h-11 px-4 font-medium whitespace-nowrap border-b-2 -mb-px ${tab === k ? 'border-brand text-brand' : 'border-transparent text-ink-soft hover:text-ink'}`}>
            {l}{data?.counts && <span className="ml-1.5 text-xs rounded-full bg-paper border border-line px-1.5">{data.counts[k]}</span>}
          </button>
        ))}
      </div>
      {!data ? <ListRowsSkeleton rows={3} /> : data.mentors.length === 0 ? (
        <EmptyState icon={UserCheck} title={tab === 'pending' ? 'No applications waiting' : 'Nobody here yet'}>{tab === 'pending' ? 'New mentor applications will appear here.' : ' '}</EmptyState>
      ) : (
        <ul className="space-y-4">
          {data.mentors.map((m) => (
            <li key={m.id} className="bg-white rounded-xl border border-line p-5">
              <div className="flex flex-wrap items-start gap-4">
                <Avatar user={m.user} size="xl" />
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-bold">{m.user.firstName} {m.user.lastName}</h2>
                  <p className="text-ink-soft">{m.title}{m.org ? `, ${m.org}` : ''}</p>
                  <p className="text-sm text-ink-soft mt-0.5">{m.user.email} · {m.user.countryResidence || 'Country not given'} · applied {formatDate(m.user.createdAt)}{!m.user.isVerified && ' · email not confirmed'}</p>
                </div>
                {tab !== 'approved' && <Button onClick={() => approve(m)}>Approve</Button>}
                {tab !== 'rejected' && <Button variant="outline" onClick={() => setRejecting(m)}>{tab === 'approved' ? 'Remove approval' : 'Send back'}</Button>}
              </div>
              <div className="mt-4 grid lg:grid-cols-[1fr_260px] gap-5">
                <div>
                  <p className="whitespace-pre-line text-[15px]">{m.bio}</p>
                  <div className="flex flex-wrap gap-1.5 mt-3">{(m.expertise || []).map((x) => <Pill key={x} tone="brand">{x}</Pill>)}</div>
                  <p className="text-sm text-ink-soft mt-2">Languages: {(m.languages || []).join(', ')}</p>
                  {m.linkedinUrl && <a href={m.linkedinUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline min-h-11">LinkedIn profile<ExternalLink size={14} aria-hidden="true" /></a>}
                  {m.rejectionNote && <p className="mt-3 text-sm rounded-lg bg-paper border border-line px-3 py-2"><strong>Feedback sent:</strong> {m.rejectionNote}</p>}
                </div>
                <div className="rounded-lg bg-paper border border-line p-3">
                  <p className="text-sm font-semibold">Weekly availability</p>
                  {m.slots.length ? (
                    <ul className="mt-1 text-sm space-y-0.5">{utcSlotsToLocalRanges(m.slots).map((r) => <li key={`${r.day}${r.start}`} className="flex justify-between"><span>{DAY_NAMES[r.day]}</span><span className="tabular-nums text-ink-soft">{r.start}–{r.end}</span></li>)}</ul>
                  ) : <p className="text-sm text-ink-soft">No times set.</p>}
                  <p className="text-xs text-ink-soft mt-2">{m.sessionsCount} sessions · rating {m.ratingAvg ? m.ratingAvg.toFixed(1) : '—'}</p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      {rejecting && <RejectDialog m={rejecting} onClose={() => setRejecting(null)} onDone={(t) => { setRejecting(null); setNotice(t); load(); }} />}
    </div>
  );
}

function RejectDialog({ m, onClose, onDone }) {
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const send = async () => {
    setBusy(true); setError('');
    try { await api.post(`/admin/mentors/${m.id}/reject`, { message }); onDone(`Feedback sent to ${m.user.firstName}. They can update their profile and it comes back here.`); }
    catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  };
  return (
    <Modal open onClose={onClose} title={`Send ${m.user.firstName}'s profile back`}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={send} loading={busy}>Send feedback</Button></>}>
      {error && <div className="mb-3"><Alert>{error}</Alert></div>}
      <Field as="textarea" rows={5} label="What should they change?" value={message} onChange={(e) => setMessage(e.target.value)}
        hint="For example: please add a clear photo of your face and explain your experience with university applications. They receive this by email." />
    </Modal>
  );
}
