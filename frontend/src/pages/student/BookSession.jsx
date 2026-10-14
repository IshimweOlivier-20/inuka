import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Check, Languages, Star } from 'lucide-react';
import { Alert, Button, Field } from '../../components/ui';
import { ListRowsSkeleton } from '../../components/ui/Skeletons';
import RichText from '../../components/ui/RichText';
import { PersonPhoto } from '../../components/mentorship/SessionCard';
import {
  FlowHeader, HourChips, MonthCalendar, Steps, SuccessDialog, TYPES, longDate, timeRange, useTimesByDay,
} from '../../components/mentorship/booking';
import { countWords } from '../../components/mentorship/shared';
import { api, errorMessage } from '../../services/api';

// Book a session: 1. day and hour → 2. how to meet + what about → 3. check and send.
export default function BookSession() {
  const { mentorId } = useParams();
  const navigate = useNavigate();
  const [d, setD] = useState(null);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1);
  const [day, setDay] = useState('');
  const [time, setTime] = useState('');
  const [type, setType] = useState('video');
  const [topic, setTopic] = useState('');
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);

  const load = () => api.get(`/mentors/${mentorId}`).then((r) => setD(r.data)).catch((e) => setError(errorMessage(e)));
  useEffect(() => { document.title = 'Book a session — INUKA'; load(); }, [mentorId]); // eslint-disable-line react-hooks/exhaustive-deps
  const byDay = useTimesByDay(d?.times);
  const allByDay = useTimesByDay(d?.allTimes || d?.times);
  const free = new Set(d?.times || []);
  useEffect(() => { if (byDay.size && !day) setDay([...byDay.keys()][0]); }, [byDay, day]);

  if (error && !d) return <Alert>{error}</Alert>;
  if (!d) return <ListRowsSkeleton rows={5} />;
  const m = d.mentor;
  const back = () => (step > 1 ? setStep(step - 1) : navigate(-1));

  const next = () => {
    const errs = {};
    if (step === 1 && !time) errs.time = 'Please choose an hour.';
    if (step === 2) {
      if (!topic) errs.topic = 'Please choose a topic.';
      if (message.trim().length < 10) errs.message = 'Please tell the mentor what you need help with (at least 10 characters).';
      else if (countWords(message) > 200) errs.message = 'Please keep your message to 200 words or fewer.';
    }
    setErrors(errs);
    if (!Object.keys(errs).length) { setStep(step + 1); window.scrollTo(0, 0); }
  };
  const send = async () => {
    setBusy(true); setError('');
    try {
      const { data } = await api.post('/bookings', { mentorId, topic, scheduledAt: time, message, sessionType: type });
      setDone(data.booking.id);
    } catch (e) {
      setError(errorMessage(e));
      if (e.response?.status === 409) { setTime(''); setStep(1); load(); }
    } finally { setBusy(false); }
  };

  return (
    <div className="max-w-2xl">
      <FlowHeader title={step === 1 ? 'Book a session' : step === 2 ? 'Session details' : 'Check and send'} onBack={back} />
      <Steps step={step} total={3} />

      <div className="flex items-center gap-4 rounded-3xl border border-line bg-surface p-4">
        <PersonPhoto person={m} className="w-16 h-16 rounded-2xl shrink-0" />
        <div className="min-w-0">
          <p className="font-bold text-lg leading-snug">{m.firstName} {m.lastName}</p>
          <p className="text-sm text-ink-soft truncate">{m.title}{m.org ? `, ${m.org}` : ''}</p>
          <p className="text-xs text-ink-soft mt-0.5 flex flex-wrap items-center gap-x-3">
            {m.reviewsCount > 0 && <span className="inline-flex items-center gap-1"><Star size={12} className="text-accent" fill="currentColor" aria-hidden="true" />{m.ratingAvg.toFixed(1)} ({m.reviewsCount})</span>}
            <span className="inline-flex items-center gap-1"><Languages size={12} aria-hidden="true" />{m.languages.join(', ')}</span>
          </p>
        </div>
      </div>
      {error && <div className="mt-4"><Alert>{error}</Alert></div>}

      {step === 1 && (
        <>
          {d.times.length === 0 && <div className="mt-6"><Alert tone="info">{m.firstName} has no free hours in the next 14 days. Please choose another mentor or check again later.</Alert></div>}
          <h2 className="mt-7 mb-3 text-lg font-bold">Select date</h2>
          <MonthCalendar byDay={byDay} value={day} onChange={(k) => { setDay(k); setTime(''); }} />
          <div className="mt-7 mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg font-bold">Select hour</h2>
            <p className="text-xs text-ink-soft">Your time · 1 hour · <span className="line-through">crossed out</span> = booked</p>
          </div>
          <HourChips times={allByDay.get(day)} free={free} value={time} onChange={setTime} />
          {errors.time && <p className="mt-2 text-sm text-danger">{errors.time}</p>}
        </>
      )}

      {step === 2 && (
        <div className="mt-7 space-y-6">
          <fieldset>
            <legend className="text-lg font-bold mb-3">How do you want to meet?</legend>
            <div className="space-y-3" role="radiogroup">
              {Object.entries(TYPES).map(([k, t]) => (
                <label key={k} className={`flex items-center gap-4 rounded-3xl border-2 p-4 cursor-pointer transition-colors ${type === k ? 'border-brand bg-brand-soft/60' : 'border-line bg-surface hover:border-brand/40'}`}>
                  <input type="radio" name="type" value={k} checked={type === k} onChange={() => setType(k)} className="sr-only peer" />
                  <span className="w-12 h-12 shrink-0 rounded-full bg-brand-soft text-brand flex items-center justify-center peer-focus-visible:ring-2 peer-focus-visible:ring-brand/40"><t.icon size={22} aria-hidden="true" /></span>
                  <span className="flex-1 min-w-0">
                    <span className="block font-bold">{t.label}</span>
                    <span className="block text-sm text-ink-soft">{t.about}</span>
                  </span>
                  <span className="text-right shrink-0">
                    <span className="block font-bold text-brand">Free</span>
                    <span className={`mt-1 ml-auto w-6 h-6 rounded-full border-2 flex items-center justify-center ${type === k ? 'bg-brand border-brand text-white' : 'border-line'}`}>{type === k && <Check size={14} strokeWidth={3} />}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <Field as="select" label="What is the session about?" value={topic} onChange={(e) => setTopic(e.target.value)} error={errors.topic}>
            <option value="">Choose a topic</option>{d.topics.map((t) => <option key={t}>{t}</option>)}
          </Field>
          <Field as="textarea" rows={5} label="What do you need help with?" value={message} onChange={(e) => setMessage(e.target.value)} error={errors.message}
            hint={`${countWords(message)} of 200 words. For example: "I am applying to the Mastercard Foundation Scholars Program and need feedback on my personal statement."`} />
        </div>
      )}

      {step === 3 && (
        <div className="mt-7 space-y-6">
          <section>
            <h2 className="text-lg font-bold">Scheduled session</h2>
            <p className="mt-2">{longDate(time)}</p>
            <p className="text-ink-soft">{timeRange(time)}</p>
          </section>
          <section>
            <h2 className="text-lg font-bold">About the session</h2>
            <dl className="mt-2 grid grid-cols-[7rem_1fr] gap-y-1.5 text-[15px]">
              <dt className="text-ink-soft">Topic</dt><dd>{topic}</dd>
              <dt className="text-ink-soft">Message</dt><dd className="whitespace-pre-line break-words">{message}</dd>
            </dl>
          </section>
          <section>
            <h2 className="text-lg font-bold mb-2">How you meet</h2>
            <TypeCard type={type} />
          </section>
          <p className="text-sm text-ink-soft">{m.firstName} will confirm the session{type !== 'message' ? ' and share the call link' : ''}. You get a notification and an email.</p>
        </div>
      )}

      {(step < 3 ? d.times.length > 0 : true) && (
        <div className="sticky bottom-20 md:bottom-4 mt-8">
          <Button className="w-full !rounded-full min-h-12 shadow-lg" onClick={step < 3 ? next : send} loading={busy}>{step < 3 ? 'Next' : 'Send request'}</Button>
        </div>
      )}
      {step === 1 && m.bio && (
        <details className="mt-8 text-sm">
          <summary className="cursor-pointer font-semibold text-brand min-h-11 inline-flex items-center">About {m.firstName}</summary>
          <RichText html={m.bio} className="mt-1 text-ink-soft" />
        </details>
      )}

      <SuccessDialog open={!!done} title="Request sent!"
        primary={{ label: 'View session', onClick: () => navigate(`/mentorship/sessions/${done}`) }}
        secondary={{ label: 'Back to my sessions', onClick: () => navigate('/mentorship?tab=sessions') }}>
        Your request was sent to {m.firstName}. You will get a notification when the session is confirmed.
      </SuccessDialog>
    </div>
  );
}

export function TypeCard({ type, extra }) {
  const t = TYPES[type] || TYPES.video;
  return (
    <div className="flex items-center gap-4 rounded-3xl border border-line bg-surface p-4">
      <span className="w-12 h-12 shrink-0 rounded-full bg-brand-soft text-brand flex items-center justify-center"><t.icon size={22} aria-hidden="true" /></span>
      <div className="flex-1 min-w-0">
        <p className="font-bold">{t.label}</p>
        <p className="text-sm text-ink-soft">{extra || t.about}</p>
      </div>
      <div className="text-right shrink-0"><p className="font-bold text-brand">Free</p><p className="text-xs text-ink-soft">INUKA</p></div>
    </div>
  );
}
