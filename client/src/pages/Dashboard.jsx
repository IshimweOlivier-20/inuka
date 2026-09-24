import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Alert, Button, Card, ProgressBar } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { api, errorMessage } from '../services/api';
import { formatDate, quoteOfTheDay } from '../utils/format';
import { DashboardSkeleton } from '../components/ui/Skeletons';
import { BookOpen, Flame, GraduationCap, HeartHandshake, Laptop, Sparkles, Sprout } from 'lucide-react';
import IconTile from '../components/ui/IconTile';
import { BadgeMedal } from '../utils/badgeIcons';

export default function Dashboard() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const [d, setD] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { api.get('/dashboard').then((r) => setD(r.data)).catch((e) => setError(errorMessage(e))); }, []);

  if (error) return <Alert>{error}</Alert>;
  if (!d) return <DashboardSkeleton />;
  const next = d.scholarships.nextDeadline;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-forest text-white p-6 md:p-8">
        <p className="text-white/70 text-sm">{formatDate(new Date())}</p>
        <h1 className="text-white text-2xl md:text-3xl font-semibold mt-1">
          {params.get('welcome') ? `Welcome to INUKA, ${user.firstName}!` : `Welcome back, ${user.firstName}!`} Ready to learn today?
        </h1>
        <p className="mt-3 text-white/85 max-w-2xl italic">{quoteOfTheDay()}</p>
      </section>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <h2 className="text-lg font-semibold mb-4">Your learning</h2>
          <ProgressBar value={d.overall.percent} label={`${d.overall.completed} of ${d.overall.total} lessons completed`} />
          <div className="grid sm:grid-cols-2 gap-4 mt-5">
            <Level icon={BookOpen} tone="forest" name="English level" level={d.levels.english.level} pct={d.levels.english.percent} />
            <Level icon={Laptop} tone="sky" name="Computer skills" level={d.levels.computer.level} pct={d.levels.computer.percent} />
          </div>
          {d.continueLearning ? (
            <div className="mt-5 rounded-xl bg-leaf p-4 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1">
                <p className="text-sm text-ink-soft">Continue: {d.continueLearning.courseTitle}</p>
                <p className="font-semibold">{d.continueLearning.lessonTitle}</p>
                <div className="mt-2"><ProgressBar value={d.continueLearning.percent} tone="forest" /></div>
              </div>
              <Button to={`/lessons/${d.continueLearning.lessonId}`}>Resume</Button>
            </div>
          ) : (
            <div className="mt-5 rounded-xl bg-leaf p-4 flex flex-col sm:flex-row sm:items-center gap-4">
              <p className="flex-1">{d.overall.completed ? 'Pick your next course.' : 'Start with “Reading & Comprehension” — it is the first step for everyone.'}</p>
              <Button to="/courses">Browse courses</Button>
            </div>
          )}
        </Card>

        <Card>
          <h2 className="text-lg font-semibold mb-3">Your streak</h2>
          <p className="text-4xl font-display font-bold text-forest">{d.streak.current} <Flame className="inline -mt-2 text-gold" size={32} fill="currentColor" aria-hidden="true" /></p>
          <p className="text-ink-soft">{d.streak.current === 1 ? 'day in a row' : 'days in a row'}</p>
          {d.streak.atRisk && <p className="mt-3 text-sm font-medium text-amber-800 bg-amber-50 rounded-lg px-3 py-2">Your streak is at risk! Study today to keep it going.</p>}
          <div className="mt-5 pt-4 border-t border-line">
            {d.latestBadge ? (
              <p className="flex items-center gap-3"><BadgeMedal badgeKey={d.latestBadge.key} size={48} /><span><span className="block text-sm text-ink-soft">Latest badge</span><span className="font-semibold">{d.latestBadge.name}</span></span></p>
            ) : <p className="text-sm text-ink-soft">Finish your first lesson to earn the <Sprout size={16} className="inline text-sprout -mt-0.5" aria-hidden="true" /> First Step badge.</p>}
            <Link to="/my-learning" className="inline-block mt-3 text-sm text-forest font-semibold hover:underline">View all badges</Link>
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold mb-3">Scholarships</h2>
          <dl className="grid grid-cols-2 gap-3">
            <div><dt className="text-sm text-ink-soft">Saved</dt><dd className="text-2xl font-display font-bold">{d.scholarships.saved}</dd></div>
            <div><dt className="text-sm text-ink-soft">Applied</dt><dd className="text-2xl font-display font-bold">{d.scholarships.applied}</dd></div>
          </dl>
          {next && (
            <p className="mt-4 text-sm">Next deadline: <Link to={`/scholarships?open=${next.id}`} className="font-semibold text-forest hover:underline">{next.name}</Link> — <span className={next.daysLeft < 30 ? 'text-danger font-semibold' : ''}>{next.daysLeft} days left</span></p>
          )}
          <Button to="/scholarships" variant="outline" className="w-full mt-4">Find more scholarships</Button>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold mb-3">Mentorship</h2>
          <p className="text-ink-soft text-sm">Talk to someone who can guide your application. Mentor booking opens soon.</p>
          <Button to="/mentorship" variant="outline" className="w-full mt-4">Book a mentor</Button>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold mb-3">Quick actions</h2>
          <div className="grid grid-cols-2 gap-2">
            {[[BookOpen, 'forest', 'Start a lesson', '/courses'], [GraduationCap, 'gold', 'Find a scholarship', '/scholarships'], [HeartHandshake, 'sprout', 'Book a mentor', '/mentorship'], [Sparkles, 'sky', 'Ask INUKA AI', '/ai']].map(([i, tone, l, to]) => (
              <Link key={l} to={to} className="rounded-lg bg-paper hover:bg-leaf p-3 text-sm font-medium flex flex-col gap-2 min-h-11"><IconTile icon={i} tone={tone} size="sm" />{l}</Link>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function Level({ icon, tone, name, level, pct }) {
  return (
    <div className="rounded-lg border border-line p-3 flex items-center gap-3">
      <IconTile icon={icon} tone={tone} size="sm" />
      <div><p className="text-sm text-ink-soft">{name}</p><p className="font-semibold">{level} <span className="text-sm font-normal text-ink-soft">({pct}%)</span></p></div>
    </div>
  );
}
