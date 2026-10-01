import { useEffect, useState } from 'react';
import Avatar from '../../components/ui/Avatar';
import { Link, useSearchParams } from 'react-router-dom';
import { Alert, Button, Card, ProgressBar } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { api, errorMessage } from '../../services/api';
import { formatDate, quoteOfTheDay } from '../../utils/format';
import { DashboardSkeleton } from '../../components/ui/Skeletons';
import { BookOpen, CalendarClock, Flame, GraduationCap, HeartHandshake, Laptop, Sparkles, Sprout, UserRound, Video } from 'lucide-react';
import IconTile from '../../components/ui/IconTile';
import { BadgeMedal } from '../../utils/badgeIcons';

export default function StudentDashboard() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const [d, setD] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { api.get('/dashboard').then((r) => setD(r.data)).catch((e) => setError(errorMessage(e))); }, []);

  if (error) return <Alert>{error}</Alert>;
  if (!d) return <DashboardSkeleton />;
  const next = d.scholarships.nextDeadline;
  const quote = quoteOfTheDay();
  const profileIncomplete = !user.countryOrigin || !user.countryResidence;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-brand text-white p-6 md:p-8">
        <p className="text-white/70 text-sm">{formatDate(new Date())}</p>
        <h1 className="text-white text-2xl md:text-3xl font-semibold mt-1">
          {params.get('welcome') ? `Welcome to INUKA, ${user.firstName}!` : `Welcome back, ${user.firstName}!`} Ready to learn today?
        </h1>
        <figure className="mt-3 max-w-2xl">
          <blockquote className="text-white/90 italic">“{quote.text}”</blockquote>
          <figcaption className="text-sm text-white/70 mt-1">— {quote.author}</figcaption>
        </figure>
      </section>

      {profileIncomplete && (
        <div className="rounded-xl bg-white border border-brand/30 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <IconTile icon={UserRound} tone="tint" size="sm" />
          <p className="flex-1"><strong>Finish your profile.</strong> Add your countries, education level and language so we can show you the right scholarships.</p>
          <Button to="/profile" variant="outline">Complete my profile</Button>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <h2 className="text-lg font-semibold mb-4">Your learning</h2>
          <ProgressBar value={d.overall.percent} label={`${d.overall.completed} of ${d.overall.total} lessons completed`} />
          <div className="grid sm:grid-cols-2 gap-4 mt-5">
            <Level icon={BookOpen} tone="brand" name="English level" level={d.levels.english.level} pct={d.levels.english.percent} />
            <Level icon={Laptop} tone="cyan" name="Computer skills" level={d.levels.computer.level} pct={d.levels.computer.percent} />
          </div>
          {d.continueLearning ? (
            <div className="mt-5 rounded-xl bg-brand-soft p-4 flex flex-col sm:flex-row sm:items-center gap-4">
              <CourseThumb c={d.continueLearning} />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-ink-soft">Continue: {d.continueLearning.courseTitle}</p>
                <p className="font-semibold">{d.continueLearning.lessonTitle}</p>
                <div className="mt-2"><ProgressBar value={d.continueLearning.percent} tone="brand" /></div>
              </div>
              <Button to={`/lessons/${d.continueLearning.lessonId}`}>Resume</Button>
            </div>
          ) : (
            <div className="mt-5 rounded-xl bg-brand-soft p-4 flex flex-col sm:flex-row sm:items-center gap-4">
              <p className="flex-1">{d.overall.completed ? 'Pick your next course.' : 'Start with “Reading & Comprehension” — it is the first step for everyone.'}</p>
              <Button to="/courses">Browse courses</Button>
            </div>
          )}
        </Card>

        <Card>
          <h2 className="text-lg font-semibold mb-3">Your streak</h2>
          <p className="text-4xl font-display font-bold text-brand">{d.streak.current} <Flame className="inline -mt-2 text-brand" size={32} fill="currentColor" aria-hidden="true" /></p>
          <p className="text-ink-soft">{d.streak.current === 1 ? 'day in a row' : 'days in a row'}</p>
          {d.streak.atRisk && <p className="mt-3 text-sm font-medium text-brand-deep bg-brand-soft rounded-lg px-3 py-2">Your streak is at risk! Study today to keep it going.</p>}
          <div className="mt-5 pt-4 border-t border-line">
            {d.latestBadge ? (
              <p className="flex items-center gap-3"><BadgeMedal badgeKey={d.latestBadge.key} size={48} /><span><span className="block text-sm text-ink-soft">Latest badge</span><span className="font-semibold">{d.latestBadge.name}</span></span></p>
            ) : <p className="text-sm text-ink-soft">Finish your first lesson to earn the <Sprout size={16} className="inline text-cyan -mt-0.5" aria-hidden="true" /> First Step badge.</p>}
            <Link to="/my-learning" className="inline-block mt-3 text-sm text-brand font-semibold hover:underline">View all badges</Link>
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold mb-3">Scholarships</h2>
          <dl className="grid grid-cols-2 gap-3">
            <div><dt className="text-sm text-ink-soft">Saved</dt><dd className="text-2xl font-display font-bold">{d.scholarships.saved}</dd></div>
            <div><dt className="text-sm text-ink-soft">Applied</dt><dd className="text-2xl font-display font-bold">{d.scholarships.applied}</dd></div>
          </dl>
          {next && (
            <p className="mt-4 text-sm">Next deadline: <Link to={`/scholarships?open=${next.id}`} className="font-semibold text-brand hover:underline">{next.name}</Link> — <span className={next.daysLeft < 30 ? 'text-danger font-semibold' : ''}>{next.daysLeft} days left</span></p>
          )}
          <Button to="/scholarships" variant="outline" className="w-full mt-4">Find more scholarships</Button>
        </Card>

        <MentorshipCard session={d.nextSession} />

        <Card>
          <h2 className="text-lg font-semibold mb-3">Quick actions</h2>
          <div className="grid grid-cols-2 gap-2">
            {[[BookOpen, 'brand', 'Start a lesson', '/courses'], [GraduationCap, 'accent', 'Find a scholarship', '/scholarships'], [HeartHandshake, 'cyan', 'Book a mentor', '/mentorship'], [Sparkles, 'deep', 'Ask INUKA AI', '/ai']].map(([i, tone, l, to]) => (
              <Link key={l} to={to} className="rounded-lg bg-paper hover:bg-brand-soft p-3 text-sm font-medium flex flex-col gap-2 min-h-11"><IconTile icon={i} tone={tone} size="sm" />{l}</Link>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

// Thumbnail for the Continue Learning card: the course image, or a coloured tile for its subject.
function CourseThumb({ c }) {
  if (c.thumbnailUrl) return <img src={c.thumbnailUrl} alt="" className="w-20 h-20 rounded-xl object-cover shrink-0" />;
  const english = c.category === 'english';
  const Icon = english ? BookOpen : Laptop;
  return (
    <span className={`w-20 h-20 shrink-0 rounded-xl text-white flex flex-col items-center justify-center gap-1 bg-gradient-to-br ${english ? 'from-brand to-brand-deep' : 'from-cyan to-[#0369A1]'}`} aria-hidden="true">
      <Icon size={28} />
      <span className="text-[11px] font-semibold tracking-wide">COURSE {c.track}</span>
    </span>
  );
}

// Mentorship card (spec 6.2): next booked session, with Join active from 15 minutes before it starts.
const JOIN_EARLY_MIN = 15;
const SESSION_MIN = 60;
function MentorshipCard({ session }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!session) return undefined;
    const t = setInterval(() => setNow(Date.now()), 30000); // re-check every 30 seconds
    return () => clearInterval(t);
  }, [session]);

  if (!session) {
    return (
      <Card>
        <h2 className="text-lg font-semibold mb-3">Mentorship</h2>
        <p className="text-ink-soft text-sm">You have no mentor session booked. A mentor can review your personal statement and guide your applications.</p>
        <Button to="/mentorship" variant="outline" className="w-full mt-4">Book a mentor</Button>
      </Card>
    );
  }
  const start = new Date(session.scheduledAt).getTime();
  const opensAt = start - JOIN_EARLY_MIN * 60000;
  const canJoin = now >= opensAt && now <= start + SESSION_MIN * 60000 && !!session.videoLink;
  const m = session.mentor;
  return (
    <Card>
      <h2 className="text-lg font-semibold mb-3">Your next mentor session</h2>
      <div className="flex items-center gap-3">
        <Avatar user={m} size="md" />
        <div className="min-w-0">
          <p className="font-semibold">{m.firstName} {m.lastName}</p>
          {m.title && <p className="text-sm text-ink-soft truncate">{m.title}</p>}
        </div>
      </div>
      <p className="mt-3 font-medium">{session.topic}</p>
      <p className="mt-1 text-sm text-ink-soft inline-flex items-center gap-1.5">
        <CalendarClock size={16} className="text-brand" aria-hidden="true" />
        {formatDate(session.scheduledAt)}, {new Date(session.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </p>
      {canJoin ? (
        <Button href={session.videoLink} target="_blank" rel="noreferrer" className="w-full mt-4"><Video size={18} aria-hidden="true" />Join session</Button>
      ) : (
        <>
          <Button disabled className="w-full mt-4" aria-describedby="join-hint"><Video size={18} aria-hidden="true" />Join session</Button>
          <p id="join-hint" className="mt-2 text-xs text-ink-soft text-center">
            {session.videoLink ? `The button opens ${JOIN_EARLY_MIN} minutes before your session.` : 'Your mentor will add the video link before the session.'}
          </p>
        </>
      )}
    </Card>
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
