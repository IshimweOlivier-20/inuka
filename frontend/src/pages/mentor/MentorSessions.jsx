import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { Alert, Card, EmptyState } from '../../components/ui';
import { ListRowsSkeleton } from '../../components/ui/Skeletons';
import MentorSessionCard from '../../components/mentorship/MentorSessionCard';
import { Stars } from '../../components/mentorship/shared';
import { api, errorMessage } from '../../services/api';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const dayKey = (d) => new Date(d).toDateString();
const ACTIVE = ['pending', 'confirmed', 'completed'];

// Mentor sessions (spec 12.5): calendar of upcoming and past sessions, notes, and ratings received.
export default function MentorSessions() {
  const [sessions, setSessions] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [view, setView] = useState('upcoming');
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [day, setDay] = useState(null);

  const load = () => api.get('/mentor/sessions').then((r) => setSessions(r.data.sessions)).catch((e) => setError(errorMessage(e)));
  useEffect(() => { document.title = 'Sessions — INUKA mentor'; load(); }, []);

  const byDay = useMemo(() => {
    const map = {};
    for (const s of sessions || []) if (ACTIVE.includes(s.status)) (map[dayKey(s.scheduledAt)] ??= []).push(s);
    return map;
  }, [sessions]);

  if (error) return <Alert>{error}</Alert>;
  if (!sessions) return <ListRowsSkeleton rows={4} />;

  const now = Date.now();
  const isUpcoming = (s) => ['pending', 'confirmed'].includes(s.status) && new Date(s.scheduledAt).getTime() > now - 3600e3;
  const list = day ? sessions.filter((s) => dayKey(s.scheduledAt) === day)
    : view === 'upcoming' ? sessions.filter(isUpcoming).reverse()
      : sessions.filter((s) => !isUpcoming(s));
  const reviews = sessions.filter((s) => s.review);
  const avg = reviews.length ? reviews.reduce((a, s) => a + s.review.rating, 0) / reviews.length : 0;

  // Month grid, Monday first
  const first = new Date(month);
  const offset = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells = [...Array(offset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1))];
  const todayKey = dayKey(new Date());

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Sessions</h1>
        <p className="text-ink-soft mt-1">Your calendar, session notes and the ratings students gave you.</p>
      </div>
      {notice && <Alert tone="success">{notice}</Alert>}

      <div className="grid lg:grid-cols-[340px_1fr] gap-6 items-start">
        <div className="space-y-6">
          <Card>
            <div className="flex items-center justify-between">
              <button type="button" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} className="w-11 h-11 rounded-lg hover:bg-brand-soft flex items-center justify-center" aria-label="Previous month"><ChevronLeft size={20} /></button>
              <h2 className="font-semibold">{month.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</h2>
              <button type="button" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} className="w-11 h-11 rounded-lg hover:bg-brand-soft flex items-center justify-center" aria-label="Next month"><ChevronRight size={20} /></button>
            </div>
            <div className="grid grid-cols-7 gap-1 mt-2 text-center text-xs font-semibold text-ink-soft" aria-hidden="true">
              {WEEKDAYS.map((w) => <span key={w}>{w}</span>)}
            </div>
            <div className="grid grid-cols-7 gap-1 mt-1">
              {cells.map((d, i) => {
                if (!d) return <span key={`e${i}`} />;
                const key = dayKey(d);
                const count = byDay[key]?.length || 0;
                const selected = day === key;
                return (
                  <button key={key} type="button" onClick={() => setDay(selected ? null : key)} aria-pressed={selected}
                    aria-label={`${d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}: ${count} ${count === 1 ? 'session' : 'sessions'}`}
                    className={`relative h-11 rounded-lg text-sm tabular-nums ${selected ? 'bg-brand text-white font-bold' : count ? 'bg-brand-soft text-brand-deep font-semibold hover:bg-brand/20' : 'hover:bg-paper'} ${key === todayKey && !selected ? 'ring-2 ring-brand/40' : ''}`}>
                    {d.getDate()}
                    {count > 0 && <span className={`absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full ${selected ? 'bg-white' : 'bg-brand'}`} aria-hidden="true" />}
                  </button>
                );
              })}
            </div>
            {day && <button type="button" onClick={() => setDay(null)} className="mt-3 min-h-11 text-sm font-semibold text-brand hover:underline">Show all days</button>}
          </Card>
          <Card>
            <h2 className="font-semibold">Ratings received</h2>
            {reviews.length ? (
              <p className="mt-2 flex items-center gap-2"><Stars value={avg} /> <span className="font-semibold">{avg.toFixed(1)}</span> <span className="text-ink-soft text-sm">from {reviews.length} {reviews.length === 1 ? 'student' : 'students'}</span></p>
            ) : <p className="mt-2 text-sm text-ink-soft">Students can rate a session after you mark it as done.</p>}
          </Card>
        </div>

        <div>
          {day ? (
            <h2 className="text-lg font-semibold">{new Date(day).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</h2>
          ) : (
            <div role="tablist" className="flex gap-1 border-b border-line">
              {[['upcoming', 'Upcoming'], ['past', 'Past']].map(([k, l]) => (
                <button key={k} role="tab" aria-selected={view === k} onClick={() => setView(k)}
                  className={`min-h-11 px-4 font-medium border-b-2 -mb-px ${view === k ? 'border-brand text-brand' : 'border-transparent text-ink-soft hover:text-ink'}`}>{l}</button>
              ))}
            </div>
          )}
          {list.length === 0 ? (
            <EmptyState icon={CalendarDays} title={day ? 'No sessions on this day' : view === 'upcoming' ? 'No upcoming sessions' : 'No past sessions yet'}>
              {view === 'upcoming' && !day ? 'When students book you and you accept, sessions appear here.' : 'Finished sessions, your notes and ratings appear here.'}
            </EmptyState>
          ) : (
            <ul className="mt-4 space-y-3">
              {list.map((s) => <li key={s.id}><MentorSessionCard b={s} onChanged={(t) => { setNotice(t); load(); }} /></li>)}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
