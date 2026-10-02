import { useState } from 'react';
import { BookOpen, CalendarClock, Link2, MapPin, NotebookPen } from 'lucide-react';
import { Alert, Button, Field, Modal } from '../ui';
import Avatar from '../ui/Avatar';
import { JoinSessionButton, Stars, StatusPill, sessionDate, sessionTime } from './shared';
import { api, errorMessage } from '../../services/api';
import { useConfirm } from '../../context/FeedbackContext';

// One session as the mentor sees it, with a student preview (spec 12.5) and the right actions:
// pending → Accept / Decline; confirmed → Join, video link, Mark as done; any confirmed/completed → notes.
export default function MentorSessionCard({ b, onChanged, compact }) {
  const confirm = useConfirm();
  const [dialog, setDialog] = useState(null); // 'accept' | 'decline' | 'notes' | 'link'
  const [msg, setMsg] = useState(null);
  const now = Date.now();
  const start = new Date(b.scheduledAt).getTime();
  const past = start < now;
  const s = b.student;

  const complete = async () => {
    const ok = await confirm({ title: 'Mark this session as done?', message: `Only do this after you have met ${s.firstName}. They will be asked to rate the session.`, confirmLabel: 'Yes, mark as done' });
    if (!ok) return;
    try { await api.post(`/mentor/bookings/${b.id}/complete`); onChanged?.('The session is marked as done. The student can now rate it.'); }
    catch (e) { setMsg(errorMessage(e)); }
  };

  return (
    <div className="bg-surface rounded-xl border border-line p-4">
      <div className="flex items-start gap-3">
        <Avatar user={s} size="md" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold">{s.firstName} {s.lastName}</p>
            <StatusPill status={b.status} past={past} />
          </div>
          <p className="text-[15px] font-medium mt-0.5">{b.topic}</p>
          <p className="text-sm text-ink-soft inline-flex items-center gap-1.5 mt-0.5"><CalendarClock size={15} aria-hidden="true" />{sessionDate(b.scheduledAt)}, {sessionTime(b.scheduledAt)}</p>
        </div>
      </div>

      {!compact && (
        <div className="mt-3 grid sm:grid-cols-2 gap-2 text-sm">
          {(s.countryResidence || s.countryOrigin) && (
            <p className="inline-flex items-center gap-1.5 text-ink-soft"><MapPin size={15} className="text-brand" aria-hidden="true" />
              Lives in {s.countryResidence || '—'}{s.countryOrigin && s.countryOrigin !== s.countryResidence ? `, from ${s.countryOrigin}` : ''}</p>
          )}
          {b.progress && (
            <p className="inline-flex items-center gap-1.5 text-ink-soft"><BookOpen size={15} className="text-brand" aria-hidden="true" />
              {b.progress.currentCourse ? `${b.progress.currentCourse.title} (${b.progress.currentCourse.percent}%)` : 'Has not started a course yet'}</p>
          )}
        </div>
      )}
      {b.message && <p className="mt-3 text-sm rounded-lg bg-paper border border-line px-3 py-2">“{b.message}”</p>}
      {b.notes?.[0] && <p className="mt-3 text-sm rounded-lg bg-brand-soft px-3 py-2 whitespace-pre-line"><strong>Your notes:</strong> {b.notes[0].notes}</p>}
      {b.review && <p className="mt-3 text-sm inline-flex flex-wrap items-center gap-2">Student rating: <Stars value={b.review.rating} size={14} />{b.review.comment && <span className="text-ink-soft">“{b.review.comment}”</span>}</p>}
      {msg && <div className="mt-3"><Alert>{msg}</Alert></div>}

      <div className="mt-4 flex flex-wrap gap-2">
        {b.status === 'pending' && !past && (
          <>
            <Button onClick={() => setDialog('accept')}>Accept</Button>
            <Button variant="outline" onClick={() => setDialog('decline')}>Decline</Button>
          </>
        )}
        {b.status === 'confirmed' && (
          <>
            {!past && <JoinSessionButton session={b} className="min-w-[180px]" />}
            <Button variant="outline" onClick={() => setDialog('link')}><Link2 size={18} aria-hidden="true" />{b.videoLink ? 'Change link' : 'Add video link'}</Button>
            {past && <Button onClick={complete}>Mark as done</Button>}
          </>
        )}
        {['confirmed', 'completed'].includes(b.status) && (
          <Button variant="ghost" onClick={() => setDialog('notes')}><NotebookPen size={18} aria-hidden="true" />{b.notes?.[0] ? 'Edit notes' : 'Add notes'}</Button>
        )}
      </div>

      {dialog && <ActionDialog kind={dialog} b={b} onClose={() => setDialog(null)} onDone={(text) => { setDialog(null); onChanged?.(text); }} />}
    </div>
  );
}

const COPY = {
  accept: { title: 'Accept this session', button: 'Accept and confirm' },
  decline: { title: 'Decline this request', button: 'Decline request' },
  notes: { title: 'Session notes', button: 'Save notes' },
  link: { title: 'Video link', button: 'Save link' },
};

function ActionDialog({ kind, b, onClose, onDone }) {
  const [videoLink, setVideoLink] = useState(b.videoLink || '');
  const [message, setMessage] = useState('');
  const [notes, setNotes] = useState(b.notes?.[0]?.notes || '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true); setError('');
    try {
      if (kind === 'accept') { await api.post(`/mentor/bookings/${b.id}/accept`, { videoLink, message }); onDone(`Confirmed. ${b.student.firstName} has been told by email.`); }
      if (kind === 'decline') { await api.post(`/mentor/bookings/${b.id}/decline`, { message }); onDone(`Declined. ${b.student.firstName} has been told by email.`); }
      if (kind === 'notes') { await api.put(`/mentor/bookings/${b.id}/notes`, { notes }); onDone(`Notes saved. ${b.student.firstName} can read them in My Learning.`); }
      if (kind === 'link') { await api.patch(`/mentor/bookings/${b.id}`, { videoLink }); onDone('Video link saved.'); }
    } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  };

  return (
    <Modal open onClose={onClose} title={COPY[kind].title}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant={kind === 'decline' ? 'danger' : 'primary'} onClick={save} loading={busy}>{COPY[kind].button}</Button></>}>
      <div className="space-y-4">
        {error && <Alert>{error}</Alert>}
        <p className="text-sm text-ink-soft">{b.student.firstName} {b.student.lastName} · {b.topic} · {sessionDate(b.scheduledAt)}, {sessionTime(b.scheduledAt)}</p>
        {(kind === 'accept' || kind === 'link') && (
          <Field label="Video call link (Zoom, Google Meet or WhatsApp)" type="url" placeholder="https://meet.google.com/…" value={videoLink} onChange={(e) => setVideoLink(e.target.value)}
            hint={kind === 'accept' ? 'You can also add it later.' : 'The student sees it on their dashboard.'} />
        )}
        {(kind === 'accept' || kind === 'decline') && (
          <Field as="textarea" rows={3} label="Message to the student (optional)" value={message} onChange={(e) => setMessage(e.target.value)}
            hint={kind === 'decline' ? 'For example, suggest another time or another mentor.' : undefined} />
        )}
        {kind === 'notes' && (
          <Field as="textarea" rows={7} label="What did you discuss? What should the student do next?" value={notes} onChange={(e) => setNotes(e.target.value)}
            hint="The student sees these notes in their My Learning page." />
        )}
      </div>
    </Modal>
  );
}
