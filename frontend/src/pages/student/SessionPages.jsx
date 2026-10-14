import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { CalendarX2, CircleCheck, Clock, MoreHorizontal, NotebookPen } from 'lucide-react';
import { Alert, Button, Field } from '../../components/ui';
import { ListRowsSkeleton } from '../../components/ui/Skeletons';
import { PersonPhoto, SessionStatus, statusOf } from '../../components/mentorship/SessionCard';
import {
  ConfirmSheet, FlowHeader, HourChips, MonthCalendar, ReasonList, Steps, SuccessDialog, longDate, timeLabel, timeRange, typeOf, useTimesByDay,
} from '../../components/mentorship/booking';
import { StarInput, Stars, JOIN_EARLY_MIN, SESSION_MIN } from '../../components/mentorship/shared';
import { TypeCard } from './BookSession';
import { useToast } from '../../context/FeedbackContext';
import { api, errorMessage } from '../../services/api';

function useBooking(id) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const load = () => api.get(`/bookings/${id}`).then((r) => setData(r.data)).catch((e) => setError(errorMessage(e)));
  useEffect(() => { load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  return { data, error, load };
}

async function openChat(mentorId, navigate, toast) {
  try {
    const { data } = await api.post('/conversations', { mentorId });
    navigate(`/messages/${data.conversation.id}`);
  } catch (e) { toast.error(errorMessage(e)); }
}

/* ---------- One session ---------- */
export function SessionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hash } = useLocation();
  const toast = useToast();
  const { data, error, load } = useBooking(id);
  const [menu, setMenu] = useState(false);
  const [cancelAsk, setCancelAsk] = useState(false);
  const [now, setNow] = useState(Date.now());
  const reviewRef = useRef(null);
  useEffect(() => { document.title = 'My session — INUKA'; const t = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(t); }, []);
  useEffect(() => { if (data && hash === '#review') reviewRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [data, hash]);

  if (error) return <Alert>{error}</Alert>;
  if (!data) return <ListRowsSkeleton rows={5} />;
  const { booking: b, student } = data;
  const m = b.mentor;
  const status = statusOf(b);
  const T = typeOf(b.sessionType);
  const start = new Date(b.scheduledAt).getTime();
  const active = ['pending', 'confirmed'].includes(b.status) && start > now;
  const open = b.status === 'confirmed' && now >= start - JOIN_EARLY_MIN * 60000 && now <= start + SESSION_MIN * 60000;

  let main = null;
  if (b.status === 'confirmed' && now <= start + SESSION_MIN * 60000) {
    const label = `${T.label} (starts at ${timeLabel(b.scheduledAt)})`;
    if (b.sessionType === 'message') main = <Button variant="dark" className="w-full !rounded-full min-h-12" onClick={() => openChat(m.id, navigate, toast)}><T.icon size={18} aria-hidden="true" />{open ? 'Open messages now' : `Messages (start at ${timeLabel(b.scheduledAt)})`}</Button>;
    else if (open && b.videoLink) main = <Button variant="dark" className="w-full !rounded-full min-h-12" href={b.videoLink} target="_blank" rel="noreferrer"><T.icon size={18} aria-hidden="true" />Join the {T.label.toLowerCase()} now</Button>;
    else main = (
      <div>
        <Button variant="dark" className="w-full !rounded-full min-h-12" disabled><T.icon size={18} aria-hidden="true" />{label}</Button>
        <p className="text-xs text-ink-soft text-center mt-1.5">{b.videoLink ? `The button opens ${JOIN_EARLY_MIN} minutes before the session.` : `${m.user.firstName} will add the call link before the session.`}</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <FlowHeader title="My session" onBack={() => navigate('/mentorship?tab=sessions')} right={active && (
        <div className="relative">
          <button type="button" onClick={() => setMenu(!menu)} aria-expanded={menu} aria-label="More actions" className="w-11 h-11 rounded-full border-2 border-ink/80 flex items-center justify-center hover:bg-brand-soft"><MoreHorizontal size={18} /></button>
          {menu && (
            <div className="absolute right-0 top-12 z-10 w-52 rounded-2xl bg-surface border border-line shadow-xl py-2" role="menu">
              <Link role="menuitem" to={`/mentorship/sessions/${b.id}/reschedule`} className="block px-4 py-2.5 hover:bg-brand-soft">Reschedule</Link>
              <button role="menuitem" type="button" onClick={() => openChat(m.id, navigate, toast)} className="w-full text-left px-4 py-2.5 hover:bg-brand-soft">Message {m.user.firstName}</button>
              <button role="menuitem" type="button" onClick={() => { setMenu(false); setCancelAsk(true); }} className="w-full text-left px-4 py-2.5 text-danger hover:bg-danger-soft">Cancel session</button>
            </div>
          )}
        </div>
      )} />

      <div className="flex items-center gap-4 rounded-3xl border border-line bg-surface p-4 shadow-[0_6px_24px_-14px_rgba(7,41,77,0.25)]">
        <PersonPhoto person={m.user} className="w-24 h-24 rounded-2xl shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="font-bold text-lg">{m.user.firstName} {m.user.lastName}</p>
          <div className="my-2 border-t border-line" />
          <p className="text-sm text-ink-soft">{m.title}</p>
          {m.org && <p className="text-sm text-ink-soft">{m.org}</p>}
        </div>
      </div>

      {status === 'pending' && <div className="mt-5"><Alert tone="warning">Waiting for {m.user.firstName} to confirm{b.rescheduleCount ? ' the new time' : ''}. You will get a notification.</Alert></div>}
      {(b.status === 'cancelled' || b.status === 'declined') && (
        <div className="mt-5"><Alert tone="error">
          {b.status === 'declined' ? `${m.user.firstName} could not take this session.` : b.cancelledBy === 'mentor' ? `${m.user.firstName} cancelled this session.` : 'You cancelled this session.'}
          {b.cancelReason && <> Reason: {b.cancelReason}</>}
        </Alert></div>
      )}
      {status === 'expired' && <div className="mt-5"><Alert tone="info">This request was not confirmed in time. You can book another time.</Alert></div>}

      <section className="mt-7">
        <h2 className="text-lg font-bold flex items-center gap-2">Scheduled session <SessionStatus status={status} /></h2>
        <p className="mt-2">{longDate(b.scheduledAt)}</p>
        <p className="text-ink-soft">{timeRange(b.scheduledAt)}</p>
        {b.previousTime && <p className="text-sm text-ink-soft mt-1 inline-flex items-center gap-1.5"><Clock size={14} aria-hidden="true" />Moved from {longDate(b.previousTime)}, {timeLabel(b.previousTime)}{b.rescheduleReason ? ` (${b.rescheduleReason})` : ''}</p>}
      </section>

      <section className="mt-7">
        <h2 className="text-lg font-bold">Your details</h2>
        <dl className="mt-2 grid grid-cols-[7.5rem_1fr] gap-y-1.5 text-[15px]">
          <dt className="text-ink-soft">Full name</dt><dd>: {student.firstName} {student.lastName}</dd>
          {student.countryResidence && <><dt className="text-ink-soft">Country</dt><dd>: {student.countryResidence}</dd></>}
          {student.educationLevel && <><dt className="text-ink-soft">School level</dt><dd>: {student.educationLevel}</dd></>}
          <dt className="text-ink-soft">Topic</dt><dd>: {b.topic}</dd>
          <dt className="text-ink-soft">Your message</dt><dd className="break-words"><Expandable text={b.message || '—'} /></dd>
        </dl>
      </section>

      <section className="mt-7">
        <h2 className="text-lg font-bold mb-2">How you meet</h2>
        <TypeCard type={b.sessionType} extra={b.sessionType !== 'message' && b.status === 'confirmed' ? (b.videoLink ? 'The call link is ready.' : 'The call link will be added by your mentor.') : undefined} />
      </section>

      {b.notes?.[0] && (
        <section className="mt-7 rounded-3xl bg-brand-soft p-5">
          <h2 className="font-bold flex items-center gap-2"><NotebookPen size={18} className="text-brand" aria-hidden="true" />Notes from {m.user.firstName}</h2>
          <p className="mt-2 whitespace-pre-line">{b.notes[0].notes}</p>
        </section>
      )}

      {b.status === 'completed' && (
        <section ref={reviewRef} id="review" className="mt-7 scroll-mt-24">
          {b.review ? (
            <p className="inline-flex items-center gap-2"><CircleCheck size={18} className="text-success" aria-hidden="true" />You rated this session <Stars value={b.review.rating} size={16} /></p>
          ) : <RateSession booking={b} onDone={load} />}
        </section>
      )}

      <div className="mt-8 space-y-3">
        {main}
        {(b.status === 'completed' || status === 'expired' || ['cancelled', 'declined'].includes(b.status)) && (
          <Button variant="outline" className="w-full !rounded-full" to={`/mentorship/book/${m.id}`}>Book again with {m.user.firstName}</Button>
        )}
        {!active && b.status !== 'confirmed' && (
          <button type="button" onClick={() => openChat(m.id, navigate, toast)} className="w-full min-h-11 rounded-full bg-brand-soft text-brand font-semibold hover:bg-brand/15">Message {m.user.firstName}</button>
        )}
      </div>

      <ConfirmSheet open={cancelAsk} title="Cancel session" danger confirmLabel="Yes, cancel" onClose={() => setCancelAsk(false)}
        onConfirm={() => navigate(`/mentorship/sessions/${b.id}/cancel`)}>
        <p>Are you sure you want to cancel your session with {m.user.firstName}?</p>
        <p className="text-sm text-ink-soft">The time becomes free for other students.</p>
      </ConfirmSheet>
    </div>
  );
}

function Expandable({ text }) {
  const [all, setAll] = useState(false);
  if (text.length <= 140) return <span className="whitespace-pre-line">{text}</span>;
  return (
    <span className="whitespace-pre-line">{all ? text : `${text.slice(0, 140)}…`} <button type="button" onClick={() => setAll(!all)} className="text-brand font-semibold">{all ? 'view less' : 'view more'}</button></span>
  );
}

function RateSession({ booking, onDone }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    if (!rating) { setError('Please choose 1 to 5 stars.'); return; }
    setBusy(true); setError('');
    try { await api.post(`/bookings/${booking.id}/review`, { rating, comment }); onDone(); }
    catch (err) { setError(errorMessage(err)); } finally { setBusy(false); }
  };
  return (
    <form onSubmit={submit} className="rounded-3xl border border-line bg-surface p-5 space-y-3">
      <h2 className="text-lg font-bold">How was your session?</h2>
      <StarInput value={rating} onChange={setRating} />
      <Field as="textarea" rows={3} label="Short review (optional, shown on the mentor's profile)" value={comment} onChange={(e) => setComment(e.target.value)} />
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button type="submit" loading={busy}>Send rating</Button>
    </form>
  );
}

/* ---------- Reschedule: 1. reason → 2. new day and hour ---------- */
const RESCHEDULE_REASONS = ['I have a schedule clash', 'I am not available at that time', 'I have an activity I cannot miss', 'I prefer not to say', 'Other'];
const CANCEL_REASONS = ['I want to choose another mentor', 'I found the help I needed', 'I have a schedule clash', 'I am not available any more', 'I prefer not to say', 'Other'];

export function RescheduleSession() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, error } = useBooking(id);
  const [times, setTimes] = useState(null);
  const [allTimes, setAllTimes] = useState(null);
  const [step, setStep] = useState(1);
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [day, setDay] = useState('');
  const [time, setTime] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  useEffect(() => { document.title = 'Reschedule session — INUKA'; }, []);
  useEffect(() => {
    if (data) api.get(`/mentors/${data.booking.mentor.id}`, { params: { moving: data.booking.id } }).then((r) => { setTimes(r.data.times); setAllTimes(r.data.allTimes || r.data.times); }).catch((e) => setMsg(errorMessage(e)));
  }, [data]);
  const byDay = useTimesByDay(times);
  const allByDay = useTimesByDay(allTimes);
  useEffect(() => { if (byDay.size && !day) setDay([...byDay.keys()][0]); }, [byDay, day]);

  if (error) return <Alert>{error}</Alert>;
  if (!data) return <ListRowsSkeleton rows={5} />;
  const b = data.booking;
  const left = data.maxReschedules - b.rescheduleCount;
  const canMove = ['pending', 'confirmed'].includes(b.status) && new Date(b.scheduledAt) > new Date() && left > 0;

  const next = () => {
    setMsg('');
    if (!reason) { setMsg('Please choose a reason.'); return; }
    if (reason === 'Other' && details.trim().length < 3) { setMsg('Please tell us the reason.'); return; }
    setStep(2); window.scrollTo(0, 0);
  };
  const submit = async () => {
    if (!time) { setMsg('Please choose a new day and hour.'); return; }
    setBusy(true); setMsg('');
    try {
      await api.post(`/bookings/${b.id}/reschedule`, { scheduledAt: time, reason, details: details.trim() || undefined });
      setDone(true);
    } catch (e) {
      setMsg(errorMessage(e));
      if (e.response?.status === 409) { setTime(''); api.get(`/mentors/${b.mentor.id}`, { params: { moving: b.id } }).then((r) => setTimes(r.data.times)); }
    } finally { setBusy(false); }
  };

  return (
    <div className="max-w-2xl">
      <FlowHeader title="Reschedule session" onBack={() => (step === 2 ? setStep(1) : navigate(-1))} />
      {!canMove ? (
        <Alert tone="info">{left <= 0 ? 'This session was already moved 3 times. Please cancel it and book a new one.' : 'This session can no longer be moved.'} <Link to={`/mentorship/sessions/${b.id}`} className="underline font-semibold">Back to the session</Link></Alert>
      ) : (
        <>
          <Steps step={step} total={2} />
          <p className="text-sm text-ink-soft mb-5">Now: {longDate(b.scheduledAt)}, {timeLabel(b.scheduledAt)} with {b.mentor.user.firstName}. {b.mentor.user.firstName} will confirm the new time.</p>
          {msg && <div className="mb-4"><Alert>{msg}</Alert></div>}
          {step === 1 ? (
            <>
              <h2 className="text-lg font-bold mb-3">Reason for the change</h2>
              <ReasonList name="reason" reasons={RESCHEDULE_REASONS} value={reason} onChange={setReason} details={details} onDetails={setDetails} />
            </>
          ) : (
            <>
              <h2 className="text-lg font-bold mb-3">Select date</h2>
              {times && times.length === 0 && <div className="mb-4"><Alert tone="info">{b.mentor.user.firstName} has no other free time in the next 14 days. You can keep this time, or cancel and book another mentor.</Alert></div>}
              {!times ? <ListRowsSkeleton rows={3} /> : <MonthCalendar byDay={byDay} value={day} onChange={(k) => { setDay(k); setTime(''); }} />}
              <h2 className="mt-7 mb-3 text-lg font-bold">Select hour</h2>
              <HourChips times={allByDay.get(day)} free={new Set(times || [])} value={time} onChange={setTime} />
            </>
          )}
          <div className="sticky bottom-20 md:bottom-4 mt-8">
            <Button className="w-full !rounded-full min-h-12 shadow-lg" onClick={step === 1 ? next : submit} loading={busy}>{step === 1 ? 'Next' : 'Submit'}</Button>
          </div>
        </>
      )}
      <SuccessDialog open={done} title="Session moved!"
        primary={{ label: 'View session', onClick: () => navigate(`/mentorship/sessions/${b.id}`) }}
        secondary={{ label: 'Close', onClick: () => navigate('/mentorship?tab=sessions') }}>
        Your new time is {time && `${longDate(time)}, ${timeLabel(time)}`}. You will get a notification when {b.mentor.user.firstName} confirms it.
      </SuccessDialog>
    </div>
  );
}

/* ---------- Cancel: reason → done ---------- */
export function CancelSession() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, error } = useBooking(id);
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  useEffect(() => { document.title = 'Cancel session — INUKA'; }, []);
  if (error) return <Alert>{error}</Alert>;
  if (!data) return <ListRowsSkeleton rows={5} />;
  const b = data.booking;
  const canCancel = ['pending', 'confirmed'].includes(b.status) && new Date(b.scheduledAt) > new Date();
  const submit = async () => {
    if (!reason) { setMsg('Please choose a reason.'); return; }
    if (reason === 'Other' && details.trim().length < 3) { setMsg('Please tell us the reason.'); return; }
    setBusy(true); setMsg('');
    try { await api.post(`/bookings/${b.id}/cancel`, { reason, details: details.trim() || undefined }); setDone(true); }
    catch (e) { setMsg(errorMessage(e)); } finally { setBusy(false); }
  };
  return (
    <div className="max-w-2xl">
      <FlowHeader title="Cancel session" onBack={() => navigate(-1)} />
      {!canCancel && !done ? (
        <Alert tone="info">This session can no longer be cancelled. <Link to={`/mentorship/sessions/${b.id}`} className="underline font-semibold">Back to the session</Link></Alert>
      ) : (
        <>
          <p className="text-sm text-ink-soft mb-5">{b.topic} with {b.mentor.user.firstName}, {longDate(b.scheduledAt)} at {timeLabel(b.scheduledAt)}.</p>
          {msg && <div className="mb-4"><Alert>{msg}</Alert></div>}
          <h2 className="text-lg font-bold mb-3">Reason for cancelling</h2>
          <ReasonList name="reason" reasons={CANCEL_REASONS} value={reason} onChange={setReason} details={details} onDetails={setDetails} />
          <div className="sticky bottom-20 md:bottom-4 mt-8">
            <Button variant="danger" className="w-full !rounded-full min-h-12 shadow-lg" onClick={submit} loading={busy}>Cancel the session</Button>
          </div>
        </>
      )}
      <SuccessDialog open={done} icon={CalendarX2} title="Session cancelled"
        primary={{ label: 'OK', onClick: () => navigate('/mentorship?tab=sessions&view=cancelled') }}
        secondary={{ label: 'Book another time', onClick: () => navigate(`/mentorship/book/${b.mentor.id}`) }}>
        {b.mentor.user.firstName} has been told. Thank you for letting us know: it frees the time for another student.
      </SuccessDialog>
    </div>
  );
}
