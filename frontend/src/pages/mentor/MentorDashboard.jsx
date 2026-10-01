import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import MentorSessionCard from '../../components/mentorship/MentorSessionCard';
import { CalendarCheck, CalendarClock, Clock, Inbox, Star, UserCheck, Users } from 'lucide-react';
import { Alert, Card, EmptyState, Pill } from '../../components/ui';
import IconTile from '../../components/ui/IconTile';
import { DashboardSkeleton } from '../../components/ui/Skeletons';
import { useAuth } from '../../context/AuthContext';
import { api, errorMessage } from '../../services/api';
import { formatDate } from '../../utils/format';
import { DAY_NAMES, timeZoneName, utcSlotsToLocalRanges } from '../../utils/availability';
import ProfilePhotoCard from '../../components/auth/ProfilePhotoCard';

const asList = (v) => (Array.isArray(v) ? v : []);

// Mentor dashboard home: live data from GET /api/mentor/overview.
export default function MentorDashboard() {
  const { user } = useAuth();
  const [d, setD] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const load = () => api.get('/mentor/overview').then((r) => setD(r.data)).catch((e) => setError(errorMessage(e)));
  useEffect(() => { document.title = 'Mentor dashboard — INUKA'; load(); }, []);
  const changed = (text) => { setNotice(text); load(); };

  if (error) return <Alert>{error}</Alert>;
  if (!d) return <DashboardSkeleton />;
  const m = d.mentor;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-brand text-white p-6 md:p-8">
        <p className="text-white/70 text-sm">{formatDate(new Date())}</p>
        <h1 className="text-white text-2xl md:text-3xl font-semibold mt-1">Welcome back, {user.firstName}</h1>
        <p className="mt-2 text-white/85 max-w-2xl">Thank you for guiding young people towards university. One conversation can change a whole application.</p>
      </section>

      {!m ? (
        <Card>
          <EmptyState icon={UserCheck} title="Your mentor profile is not set up yet">
            An INUKA admin will create your mentor profile (title, expertise, languages and weekly times). Once it is approved, students can book sessions with you.
          </EmptyState>
        </Card>
      ) : (
        <>
          {!m.isApproved && (
            <Alert tone="info">
              Your profile is waiting for approval by the INUKA team. Students will see you once it is approved.
              {m.rejectionNote && <> Note from the team: {m.rejectionNote}</>}
            </Alert>
          )}

          <ul className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4" aria-label="Your numbers">
            <Stat icon={Inbox} tone="brand" value={d.stats.pending} label="New requests" />
            <Stat icon={CalendarClock} tone="cyan" value={d.stats.upcoming} label="Upcoming sessions" />
            <Stat icon={CalendarCheck} tone="deep" value={d.stats.completed} label="Sessions completed" />
            <Stat icon={Users} tone="accent" value={d.stats.students} label="Students helped" />
          </ul>

          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {notice && <Alert tone="success">{notice}</Alert>}
              <section>
                <h2 className="text-lg font-semibold">Session requests</h2>
                {d.requests.length ? (
                  <ul className="mt-3 space-y-3">
                    {d.requests.map((b) => <li key={b.id}><MentorSessionCard b={b} onChanged={changed} /></li>)}
                  </ul>
                ) : <p className="mt-2 text-ink-soft">No new requests. When a student asks for a session, it will appear here.</p>}
              </section>

              <section>
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold">Upcoming sessions</h2>
                  <Link to="/mentor/sessions" className="text-sm font-semibold text-brand hover:underline">All sessions</Link>
                </div>
                {d.upcoming.length ? (
                  <ul className="mt-3 space-y-3">
                    {d.upcoming.map((b) => <li key={b.id}><MentorSessionCard b={b} onChanged={changed} /></li>)}
                  </ul>
                ) : <p className="mt-2 text-ink-soft">No sessions booked yet.</p>}
              </section>
            </div>

            <div className="space-y-6">
              <ProfilePhotoCard />
              <Card>
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold">Your profile</h2>
                  <Link to="/mentor/profile" className="text-sm font-semibold text-brand hover:underline">Edit</Link>
                </div>
                <p className="mt-2 font-semibold">{m.title}</p>
                {m.org && <p className="text-sm text-ink-soft">{m.org}</p>}
                <p className="mt-2 text-sm inline-flex items-center gap-1.5">
                  <Star size={16} className="text-brand" fill="currentColor" aria-hidden="true" />
                  {m.ratingAvg ? `${m.ratingAvg.toFixed(1)} average rating` : 'No ratings yet'}
                </p>
                {asList(m.expertise).length > 0 && (
                  <>
                    <h3 className="text-sm font-semibold text-ink-soft mt-4">Expertise</h3>
                    <ul className="mt-1.5 flex flex-wrap gap-1.5">{asList(m.expertise).map((x) => <li key={x}><Pill tone="brand">{x}</Pill></li>)}</ul>
                  </>
                )}
                {asList(m.languages).length > 0 && (
                  <>
                    <h3 className="text-sm font-semibold text-ink-soft mt-4">Languages</h3>
                    <p className="mt-1 text-sm">{asList(m.languages).join(', ')}</p>
                  </>
                )}
              </Card>

              <Card>
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold">Weekly availability</h2>
                  <Link to="/mentor/profile#availability" className="text-sm font-semibold text-brand hover:underline">Change</Link>
                </div>
                <p className="text-xs text-ink-soft">In your time zone ({timeZoneName()})</p>
                {m.slots.length ? (
                  <ul className="mt-3 space-y-2">
                    {utcSlotsToLocalRanges(m.slots).map((r) => (
                      <li key={`${r.day}-${r.start}`} className="flex items-center gap-3 rounded-lg bg-paper border border-line px-3 py-2 text-sm">
                        <Clock size={16} className="text-brand" aria-hidden="true" />
                        <span className="font-semibold">{DAY_NAMES[r.day]}</span>
                        <span className="ml-auto text-ink-soft tabular-nums">{r.start}–{r.end}</span>
                      </li>
                    ))}
                  </ul>
                ) : <p className="mt-2 text-ink-soft">No weekly times set yet.</p>}
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ icon, tone, value, label }) {
  return (
    <li className="bg-surface rounded-xl border border-line p-5 flex items-center gap-4">
      <IconTile icon={icon} tone={tone} />
      <div>
        <p className="font-display text-3xl font-bold leading-none">{value}</p>
        <p className="font-semibold mt-1.5">{label}</p>
      </div>
    </li>
  );
}
