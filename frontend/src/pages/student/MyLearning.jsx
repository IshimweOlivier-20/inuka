import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Button, Card, EmptyState, ProgressBar } from '../../components/ui';
import { api, errorMessage } from '../../services/api';
import { formatDate } from '../../utils/format';
import { MyLearningSkeleton, Skeleton } from '../../components/ui/Skeletons';
import { Award, BookOpen, Flame } from 'lucide-react';
import IconTile from '../../components/ui/IconTile';
import { BadgeMedal } from '../../utils/badgeIcons';

export default function MyLearning() {
  const [d, setD] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    Promise.all([api.get('/dashboard'), api.get('/courses'), api.get('/badges'), api.get('/streak'), api.get('/bookings')])
      .then(([dash, courses, badges, streak, bookings]) => setD({
        dash: dash.data, courses: courses.data.courses, badges: badges.data.badges, streak: streak.data,
        sessions: bookings.data.bookings.filter((b) => b.status === 'completed'),
      }))
      .catch((e) => setError(errorMessage(e)));
  }, []);
  if (error) return <Alert>{error}</Alert>;
  if (!d) return <MyLearningSkeleton />;
  const started = d.courses.filter((c) => c.status !== 'not_started');

  return (
    <div className="space-y-6">
      <h1 className="text-2xl sm:text-[1.75rem] font-bold">My Learning</h1>
      <div className="grid md:grid-cols-3 gap-6">
        <Card><Ring pct={d.dash.levels.english.percent} label="English track" sub={d.dash.levels.english.level} /></Card>
        <Card><Ring pct={d.dash.levels.computer.percent} label="Computer skills track" sub={d.dash.levels.computer.level} /></Card>
        <Card>
          <p className="text-sm text-ink-soft">Study streak</p>
          <p className="text-4xl font-display font-bold text-brand">{d.streak.current} <Flame className="inline -mt-2 text-brand" size={32} fill="currentColor" aria-hidden="true" /></p>
          <p className="text-sm text-ink-soft mb-3">{d.dash.overall.completed} of {d.dash.overall.total} lessons completed</p>
          {d.streak.atRisk && <p className="text-sm font-medium text-brand-deep">Your streak is at risk! Study today to keep it going.</p>}
          <Heatmap days={d.streak.calendar} />
        </Card>
      </div>

      <Card>
        <h2 className="text-lg font-semibold mb-4">Your courses</h2>
        {started.length === 0 ? <EmptyState icon={BookOpen} title="No courses started yet" action={<Button to="/courses">Browse courses</Button>}>Start your first lesson and your progress will show here.</EmptyState> : (
          <ul className="divide-y divide-line">
            {started.map((c) => (
              <li key={c.id} className="py-3 grid sm:grid-cols-[1fr_200px_auto] gap-3 items-center">
                <div><p className="font-medium">{c.title}</p><p className="text-sm text-ink-soft">{c.category === 'english' ? 'English' : 'Computer skills'} — last active {formatDate(c.lastActiveAt)}</p></div>
                <ProgressBar value={c.percent} />
                <Button variant="ghost" to={c.status === 'completed' ? `/courses/${c.slug}` : `/lessons/${c.nextLessonId}`}>{c.status === 'completed' ? 'Review' : 'Resume'}</Button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <h2 className="text-lg font-semibold mb-4">Badges</h2>
        <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {d.badges.map((b) => (
            <li key={b.id} className={`rounded-xl p-3 text-center border flex flex-col items-center ${b.earnedAt ? 'bg-brand-soft border-brand/20' : 'bg-paper border-line opacity-60'}`}>
              <BadgeMedal badgeKey={b.key} earned={!!b.earnedAt} size={52} />
              <p className="font-semibold text-sm mt-2">{b.name}</p>
              <p className="text-xs text-ink-soft">{b.earnedAt ? `Earned ${formatDate(b.earnedAt)}` : b.description}</p>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold mb-4">Mentor sessions</h2>
        {d.sessions.length === 0 ? (
          <p className="text-ink-soft">Your mentor sessions and the notes your mentors write will be saved here. <Link to="/mentorship" className="text-brand font-semibold hover:underline">Book a mentor</Link></p>
        ) : (
          <ul className="divide-y divide-line">
            {d.sessions.map((b) => (
              <li key={b.id} className="py-3">
                <p className="font-medium">{b.topic} <span className="text-ink-soft font-normal">with {b.mentor.user.firstName} {b.mentor.user.lastName}, {formatDate(b.scheduledAt)}</span></p>
                {b.notes?.[0] ? <p className="mt-1 text-sm whitespace-pre-line rounded-lg bg-brand-soft px-3 py-2">{b.notes[0].notes}</p> : <p className="text-sm text-ink-soft">No notes yet.</p>}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <h2 className="text-lg font-semibold mb-4">Certificates</h2>
        <CertificateList />
      </Card>
    </div>
  );
}

function Ring({ pct, label, sub }) {
  const r = 42, c = 2 * Math.PI * r;
  return (
    <div className="flex items-center gap-4">
      <svg width="104" height="104" viewBox="0 0 104 104" role="img" aria-label={`${label}: ${pct}% complete`}>
        <circle cx="52" cy="52" r={r} fill="none" stroke="#E5E7EB" strokeWidth="12" />
        <circle cx="52" cy="52" r={r} fill="none" stroke="#07294D" strokeWidth="12" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} transform="rotate(-90 52 52)" />
        <text x="52" y="58" textAnchor="middle" className="font-display" fontSize="20" fontWeight="700" fill="#1A1A2E">{pct}%</text>
      </svg>
      <div><p className="font-semibold">{label}</p><p className="text-sm text-ink-soft">Level: {sub}</p></div>
    </div>
  );
}

// Last 5 weeks of activity, GitHub-style
function Heatmap({ days }) {
  const counts = Object.fromEntries(days.map((d) => [d.date, d.count]));
  const today = new Date();
  const cells = Array.from({ length: 35 }, (_, i) => {
    const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - (34 - i)));
    const key = d.toISOString().slice(0, 10);
    return { key, n: counts[key] || 0 };
  });
  return (
    <div className="grid grid-cols-7 gap-1 w-max" aria-label="Study activity in the last 5 weeks">
      {cells.map((c) => (
        <span key={c.key} title={`${c.key}: ${c.n} lesson${c.n === 1 ? '' : 's'}`}
          className={`w-4 h-4 rounded-sm ${c.n === 0 ? 'bg-line' : c.n < 3 ? 'bg-success/60' : 'bg-brand'}`} />
      ))}
    </div>
  );
}

export function CertificateList() {
  const [certs, setCerts] = useState(null);
  useEffect(() => { api.get('/certificates').then((r) => setCerts(r.data.certificates)).catch(() => setCerts([])); }, []);
  if (!certs) return <Skeleton height={72} count={2} className="mb-3" />;
  if (!certs.length) return <p className="text-ink-soft">Finish every lesson in a course to earn its certificate.</p>;
  return (
    <ul className="grid sm:grid-cols-2 gap-3">
      {certs.map((c) => (
        <li key={c.id} className="rounded-xl border border-line p-4 flex items-center gap-3">
          <IconTile icon={Award} tone="accent" size="md" />
          <div className="flex-1"><p className="font-semibold">{c.course.title}</p><p className="text-sm text-ink-soft">Issued {formatDate(c.issuedAt)}</p></div>
          <Link to={`/certificates/${c.id}`} className="text-brand font-semibold hover:underline">View / Download</Link>
        </li>
      ))}
    </ul>
  );
}
