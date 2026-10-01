import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CalendarClock, CircleCheck, HeartHandshake, Languages, Search, UsersRound } from 'lucide-react';
import { Alert, Button, Card, EmptyState, Field, Modal, Pill } from '../../components/ui';
import Avatar from '../../components/ui/Avatar';
import { ListRowsSkeleton, ScholarshipGridSkeleton } from '../../components/ui/Skeletons';
import {
  JoinSessionButton, StarInput, Stars, StatusPill, countWords, sessionDate, sessionTime, sessionWhen,
} from '../../components/mentorship/shared';
import { api, errorMessage } from '../../services/api';

// Mentorship for students (spec 12): find a mentor, book a session, see your sessions, rate them.
export default function Mentorship() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'sessions' || params.get('tab') === 'past' ? 'sessions' : 'find';
  const [bookings, setBookings] = useState(null);
  const loadBookings = useCallback(() => api.get('/bookings').then((r) => setBookings(r.data.bookings)).catch(() => setBookings([])), []);
  useEffect(() => { document.title = 'Mentorship — INUKA'; loadBookings(); }, [loadBookings]);

  const upcomingCount = bookings?.filter((b) => ['pending', 'confirmed'].includes(b.status) && new Date(b.scheduledAt) > Date.now() - 3600e3).length || 0;
  const setTab = (t) => setParams(t === 'find' ? {} : { tab: t });

  return (
    <div>
      <h1 className="text-3xl font-bold">Mentorship</h1>
      <p className="text-ink-soft mt-1">Book a free 1-hour video session with a mentor who can guide your applications.</p>
      <div role="tablist" className="flex gap-1 mt-6 border-b border-line">
        {[['find', 'Find a mentor'], ['sessions', `My sessions${upcomingCount ? ` (${upcomingCount})` : ''}`]].map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
            className={`min-h-11 px-4 font-medium whitespace-nowrap border-b-2 -mb-px ${tab === k ? 'border-brand text-brand' : 'border-transparent text-ink-soft hover:text-ink'}`}>{l}</button>
        ))}
      </div>
      <div className="mt-6">
        {tab === 'find'
          ? <MentorDirectory onBooked={() => { loadBookings(); setTab('sessions'); }} />
          : <MySessions bookings={bookings} reload={loadBookings} onFind={() => setTab('find')} />}
      </div>
    </div>
  );
}

/* ---------- Directory (spec 12.1) ---------- */
function MentorDirectory({ onBooked }) {
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState('');
  const [expertise, setExpertise] = useState('');
  const [language, setLanguage] = useState('');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [booking, setBooking] = useState(params.get('book')); // ?book=<mentorId> opens the booking form (from search)
  const [done, setDone] = useState('');
  useEffect(() => { if (params.get('book')) { setBooking(params.get('book')); setParams({}, { replace: true }); } }, [params]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const t = setTimeout(() => {
      api.get('/mentors', { params: { q, expertise, language } }).then((r) => { setData(r.data); setError(''); }).catch((e) => setError(errorMessage(e)));
    }, q ? 300 : 0);
    return () => clearTimeout(t);
  }, [q, expertise, language]);

  return (
    <div>
      {done && <div className="mb-4"><Alert tone="success">{done}</Alert></div>}
      <div className="flex flex-wrap gap-3 items-end">
        <label className="relative flex-1 min-w-[220px]">
          <span className="sr-only">Search mentors</span>
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" aria-hidden="true" />
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, topic or organisation"
            className="w-full min-h-11 rounded-lg border border-line bg-surface pl-10 pr-3" />
        </label>
        <Field as="select" label="Expertise" value={expertise} onChange={(e) => setExpertise(e.target.value)} className="min-w-[200px]">
          <option value="">All areas</option>{data?.filters.expertise.map((x) => <option key={x}>{x}</option>)}
        </Field>
        <Field as="select" label="Language" value={language} onChange={(e) => setLanguage(e.target.value)} className="min-w-[160px]">
          <option value="">All languages</option>{data?.filters.languages.map((x) => <option key={x}>{x}</option>)}
        </Field>
      </div>

      {error && <div className="mt-4"><Alert>{error}</Alert></div>}
      {!data ? <div className="mt-6"><ScholarshipGridSkeleton count={3} /></div> : data.mentors.length === 0 ? (
        <EmptyState icon={UsersRound} title={q || expertise || language ? 'No mentor matches your search' : 'No mentors yet'}>
          {q || expertise || language ? 'Try another word or clear the filters.' : 'Our first mentors are being approved. Please check again soon.'}
        </EmptyState>
      ) : (
        <ul className="mt-6 grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {data.mentors.map((m) => (
            <li key={m.id} className="bg-surface rounded-2xl border border-line p-5 flex flex-col">
              <div className="flex items-center gap-4">
                <Avatar user={m} size="xl" />
                <div className="min-w-0">
                  <h2 className="font-bold text-lg leading-snug">{m.firstName} {m.lastName}</h2>
                  <p className="text-sm text-ink-soft">{m.title}{m.org ? `, ${m.org}` : ''}</p>
                </div>
              </div>
              <ul className="flex flex-wrap gap-1.5 mt-4" aria-label="Expertise">
                {m.expertise.map((x) => <li key={x}><Pill tone="brand">{x}</Pill></li>)}
              </ul>
              <p className="mt-3 text-sm text-ink-soft inline-flex items-center gap-1.5"><Languages size={16} className="text-brand" aria-hidden="true" />{m.languages.join(', ')}</p>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                <span className="inline-flex items-center gap-1.5">
                  <Stars value={m.ratingAvg} label={m.reviewsCount ? `${m.ratingAvg} out of 5 stars` : 'No ratings yet'} />
                  <span className="text-ink-soft">{m.reviewsCount ? `${m.ratingAvg.toFixed(1)} (${m.reviewsCount})` : 'New mentor'}</span>
                </span>
                <span className="text-ink-soft">{m.sessionsCount} {m.sessionsCount === 1 ? 'session' : 'sessions'}</span>
              </div>
              <p className={`mt-3 text-sm font-semibold inline-flex items-center gap-1.5 ${m.availableThisWeek ? 'text-brand' : 'text-ink-soft'}`}>
                <span className={`w-2 h-2 rounded-full ${m.availableThisWeek ? 'bg-brand' : 'bg-line'}`} aria-hidden="true" />
                {m.availableThisWeek ? 'Available this week' : 'Fully booked this week'}
              </p>
              <Button onClick={() => { setDone(''); setBooking(m.id); }} className="mt-4 w-full">Book a session</Button>
            </li>
          ))}
        </ul>
      )}
      {booking && (
        <BookingModal mentorId={booking} onClose={() => setBooking(null)}
          onBooked={(msg) => { setBooking(null); setDone(msg); onBooked(); }} />
      )}
    </div>
  );
}

/* ---------- Booking flow (spec 12.2) ---------- */
function BookingModal({ mentorId, onClose, onBooked }) {
  const [d, setD] = useState(null);
  const [error, setError] = useState('');
  const [topic, setTopic] = useState('');
  const [day, setDay] = useState('');
  const [time, setTime] = useState('');
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => { api.get(`/mentors/${mentorId}`).then((r) => setD(r.data)).catch((e) => setError(errorMessage(e))); }, [mentorId]);

  // Open times grouped by the student's local day
  const days = useMemo(() => {
    const map = new Map();
    for (const t of d?.times || []) {
      const key = new Date(t).toDateString();
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(t);
    }
    return [...map.entries()];
  }, [d]);
  useEffect(() => { if (days.length && !day) setDay(days[0][0]); }, [days, day]);

  const submit = async () => {
    const errs = {};
    if (!topic) errs.topic = 'Please choose a topic.';
    if (!time) errs.time = 'Please choose a time.';
    if (message.trim().length < 10) errs.message = 'Please tell the mentor what you need help with.';
    else if (countWords(message) > 200) errs.message = 'Please keep your message to 200 words or fewer.';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true); setError('');
    try {
      await api.post('/bookings', { mentorId, topic, scheduledAt: time, message });
      onBooked(`Your request has been sent to ${d.mentor.firstName} for ${sessionWhen(time)}. We will tell you when it is confirmed.`);
    } catch (e) {
      setError(errorMessage(e));
      if (e.response?.status === 409) { setTime(''); api.get(`/mentors/${mentorId}`).then((r) => setD(r.data)); }
    } finally { setBusy(false); }
  };

  const m = d?.mentor;
  return (
    <Modal open onClose={onClose} wide title={m ? `Book a session with ${m.firstName}` : 'Book a session'}
      footer={m && d.times.length > 0 && <><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={submit} loading={busy}>Confirm booking</Button></>}>
      {error && <div className="mb-4"><Alert>{error}</Alert></div>}
      {!d ? <ListRowsSkeleton rows={4} /> : (
        <div className="space-y-5">
          <div className="flex items-start gap-4">
            <Avatar user={m} size="md" />
            <div className="min-w-0">
              <p className="font-semibold">{m.firstName} {m.lastName}</p>
              <p className="text-sm text-ink-soft">{m.title}{m.org ? `, ${m.org}` : ''}</p>
              <p className="text-sm mt-2 whitespace-pre-line">{m.bio}</p>
              {d.reviews.length > 0 && (
                <details className="mt-2 text-sm">
                  <summary className="cursor-pointer text-brand font-semibold min-h-11 inline-flex items-center">What students say ({d.reviews.length})</summary>
                  <ul className="mt-1 space-y-2">
                    {d.reviews.map((r) => <li key={r.id}><Stars value={r.rating} size={14} /> {r.comment && <span className="text-ink-soft">“{r.comment}” — {r.student.firstName}</span>}</li>)}
                  </ul>
                </details>
              )}
            </div>
          </div>

          {d.times.length === 0 ? (
            <Alert tone="info">{m.firstName} has no free times in the next 14 days. Please try another mentor or check again later.</Alert>
          ) : (
            <>
              <Field as="select" label="What is the session about?" value={topic} onChange={(e) => setTopic(e.target.value)} error={errors.topic}>
                <option value="">Choose a topic</option>{d.topics.map((t) => <option key={t}>{t}</option>)}
              </Field>

              <fieldset>
                <legend className="text-sm font-medium mb-1.5">Choose a day and time <span className="text-ink-soft font-normal">(your time zone, 1 hour)</span></legend>
                <div className="flex gap-2 overflow-x-auto pb-2" role="radiogroup" aria-label="Day">
                  {days.map(([key, times]) => {
                    const date = new Date(times[0]);
                    return (
                      <button key={key} type="button" role="radio" aria-checked={day === key} onClick={() => { setDay(key); setTime(''); }}
                        className={`shrink-0 min-w-[76px] rounded-xl border px-3 py-2 text-center ${day === key ? 'bg-brand text-white border-brand' : 'bg-surface border-line hover:border-brand'}`}>
                        <span className="block text-xs font-semibold uppercase">{date.toLocaleDateString('en-GB', { weekday: 'short' })}</span>
                        <span className="block text-lg font-bold leading-tight">{date.getDate()}</span>
                        <span className="block text-xs">{date.toLocaleDateString('en-GB', { month: 'short' })}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="flex flex-wrap gap-2 mt-2" role="radiogroup" aria-label="Time">
                  {(days.find(([k]) => k === day)?.[1] || []).map((t) => (
                    <button key={t} type="button" role="radio" aria-checked={time === t} onClick={() => setTime(t)}
                      className={`min-h-11 px-4 rounded-lg border font-semibold tabular-nums ${time === t ? 'bg-brand text-white border-brand' : 'bg-surface border-line hover:border-brand'}`}>
                      {sessionTime(t)}
                    </button>
                  ))}
                </div>
                {errors.time && <p className="mt-1 text-sm text-danger">{errors.time}</p>}
              </fieldset>

              <Field as="textarea" rows={4} label="What do you need help with?" value={message} onChange={(e) => setMessage(e.target.value)} error={errors.message}
                hint={`${countWords(message)} of 200 words. For example: "I am applying to the Mastercard Foundation Scholars Program and need feedback on my personal statement."`} />
              <p className="text-sm text-ink-soft">The mentor will accept your request and share a video link (Zoom, Google Meet or WhatsApp). You will get an email when it is confirmed.</p>
            </>
          )}
        </div>
      )}
    </Modal>
  );
}

/* ---------- My sessions + rating (spec 12.4) ---------- */
function MySessions({ bookings, reload, onFind }) {
  const [msg, setMsg] = useState(null);
  if (!bookings) return <ListRowsSkeleton rows={3} />;
  const now = Date.now();
  const upcoming = bookings.filter((b) => ['pending', 'confirmed'].includes(b.status) && new Date(b.scheduledAt).getTime() > now - 3600e3).reverse();
  const past = bookings.filter((b) => !upcoming.includes(b));

  const cancel = async (b) => {
    if (!window.confirm(`Cancel your session "${b.topic}" on ${sessionWhen(b.scheduledAt)}?`)) return;
    try { await api.post(`/bookings/${b.id}/cancel`); setMsg({ tone: 'success', text: 'Your session has been cancelled.' }); reload(); }
    catch (e) { setMsg({ tone: 'error', text: errorMessage(e) }); }
  };

  if (!bookings.length) {
    return <EmptyState icon={HeartHandshake} title="No sessions yet" action={<Button onClick={onFind}>Find a mentor</Button>}>Book your first session with a mentor. It is free.</EmptyState>;
  }
  return (
    <div className="space-y-8">
      {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}
      <section>
        <h2 className="text-xl font-semibold">Upcoming</h2>
        {upcoming.length === 0 ? <p className="mt-2 text-ink-soft">No upcoming sessions. <button onClick={onFind} className="text-brand font-semibold hover:underline">Find a mentor</button></p> : (
          <ul className="mt-3 grid md:grid-cols-2 gap-4">
            {upcoming.map((b) => (
              <li key={b.id}><Card>
                <SessionHeader b={b} />
                {b.status === 'confirmed'
                  ? <JoinSessionButton session={b} className="mt-4 w-full" />
                  : <p className="mt-4 text-sm rounded-lg bg-paper border border-line px-3 py-2">Waiting for {b.mentor.user.firstName} to accept. You will get an email.</p>}
                <button onClick={() => cancel(b)} className="mt-3 min-h-11 text-sm font-semibold text-ink-soft hover:text-danger">Cancel session</button>
              </Card></li>
            ))}
          </ul>
        )}
      </section>
      <section>
        <h2 className="text-xl font-semibold">Past sessions</h2>
        {past.length === 0 ? <p className="mt-2 text-ink-soft">Your finished sessions, mentor notes and ratings will appear here.</p> : (
          <ul className="mt-3 space-y-4">
            {past.map((b) => (
              <li key={b.id}><Card>
                <SessionHeader b={b} past />
                {b.notes?.[0] && (
                  <div className="mt-4 rounded-lg bg-brand-soft p-3">
                    <p className="text-sm font-semibold">Notes from {b.mentor.user.firstName}</p>
                    <p className="text-sm mt-1 whitespace-pre-line">{b.notes[0].notes}</p>
                  </div>
                )}
                {b.status === 'completed' && (b.review ? (
                  <p className="mt-3 text-sm inline-flex items-center gap-2"><CircleCheck size={16} className="text-brand" aria-hidden="true" />You rated this session <Stars value={b.review.rating} size={14} /></p>
                ) : <RateSession booking={b} onDone={reload} />)}
              </Card></li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function SessionHeader({ b, past }) {
  return (
    <div className="flex items-start gap-3">
      <Avatar user={b.mentor.user} size="md" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold">{b.mentor.user.firstName} {b.mentor.user.lastName}</p>
          <StatusPill status={b.status} past={past} />
        </div>
        <p className="text-[15px] mt-0.5">{b.topic}</p>
        <p className="text-sm text-ink-soft inline-flex items-center gap-1.5 mt-0.5"><CalendarClock size={15} aria-hidden="true" />{sessionDate(b.scheduledAt)}, {sessionTime(b.scheduledAt)}</p>
      </div>
    </div>
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
    <form onSubmit={submit} className="mt-4 pt-4 border-t border-line space-y-3">
      <p className="font-semibold">How was your session?</p>
      <StarInput value={rating} onChange={setRating} />
      <Field as="textarea" rows={2} label="Short review (optional, shown on the mentor's profile)" value={comment} onChange={(e) => setComment(e.target.value)} />
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button type="submit" loading={busy}>Send rating</Button>
    </form>
  );
}
