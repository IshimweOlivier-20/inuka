import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity, BookOpen, CalendarCheck, GraduationCap, HeartHandshake, Mail, UserPlus, Users,
} from 'lucide-react';
import { Alert, Button, Card, Pill } from '../../components/ui';
import Avatar from '../../components/ui/Avatar';
import IconTile from '../../components/ui/IconTile';
import { DashboardSkeleton } from '../../components/ui/Skeletons';
import { BarChart, RankBars } from '../../components/admin/AdminUI';
import { useAuth } from '../../context/AuthContext';
import { api, errorMessage } from '../../services/api';
import { formatDate, timeAgo } from '../../utils/format';

const n = (v) => (v ?? 0).toLocaleString('en');
const ROLE_TONE = { student: 'brand', mentor: 'cyan', admin: 'grey' };

// Admin overview (spec 16.1): live numbers from GET /api/admin/overview.
export default function AdminDashboard() {
  const { user } = useAuth();
  const [d, setD] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    document.title = 'Admin dashboard — INUKA';
    api.get('/admin/overview').then((r) => setD(r.data)).catch((e) => setError(errorMessage(e)));
  }, []);

  if (error) return <Alert>{error}</Alert>;
  if (!d) return <DashboardSkeleton />;
  const growth = d.users.growth.map((g) => {
    const date = new Date(g.week);
    return { label: `Week of ${date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`, short: date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }), value: g.count };
  });
  const joined12 = d.users.growth.reduce((a, g) => a + g.count, 0);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-brand-deep text-white p-6 md:p-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-white/70 text-sm">{formatDate(new Date())}</p>
          <h1 className="text-white text-2xl md:text-3xl font-semibold mt-1">Hello {user.firstName}, here is INUKA today</h1>
          <p className="mt-2 text-white/80">{n(d.users.newThisWeek)} new {d.users.newThisWeek === 1 ? 'account' : 'accounts'} and {n(d.users.activeThisWeek)} active {d.users.activeThisWeek === 1 ? 'learner' : 'learners'} in the last 7 days.</p>
        </div>
        {d.mentorship.pending > 0 && <Button to="/admin/mentors" variant="accent">{d.mentorship.pending} {d.mentorship.pending === 1 ? 'mentor' : 'mentors'} to approve</Button>}
      </section>

      <ul className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4" aria-label="Key numbers">
        <Stat icon={Users} tone="brand" value={n(d.users.students)} label="Registered students" note={`${n(d.users.refugees)} refugees`} to="/admin/users?role=student" />
        <Stat icon={HeartHandshake} tone="cyan" value={n(d.mentorship.approved)} label="Active mentors" note={`${n(d.mentorship.pending)} waiting for approval`} to="/admin/mentors" />
        <Stat icon={GraduationCap} tone="deep" value={n(d.scholarships.active)} label="Scholarships listed" note={`${n(d.scholarships.closingSoon)} close within 30 days`} to="/admin/scholarships" />
        <Stat icon={CalendarCheck} tone="accent" value={n(d.mentorship.sessionsCompleted)} label="Sessions completed" note={`${n(d.mentorship.bookingsUpcoming)} coming up`} />
      </ul>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 min-w-0">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg font-semibold flex items-center gap-2"><UserPlus size={20} className="text-brand" aria-hidden="true" />New students per week</h2>
            <span className="text-sm text-ink-soft">{n(joined12)} in the last 12 weeks</span>
          </div>
          <div className="mt-4"><BarChart data={growth} label="New students per week, last 12 weeks" /></div>
        </Card>
        <Card>
          <h2 className="text-lg font-semibold flex items-center gap-2"><Activity size={20} className="text-brand" aria-hidden="true" />This week</h2>
          <dl className="mt-3 divide-y divide-line">
            <Row label="Active learners" value={n(d.users.activeThisWeek)} />
            <Row label="New accounts" value={n(d.users.newThisWeek)} />
            <Row label="Course enrolments (all time)" value={n(d.learning.enrollments)} />
            <Row label="Certificates issued" value={n(d.learning.certificates)} />
            <Row label="Email subscribers" value={n(d.subscribers)} />
          </dl>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card>
          <h2 className="text-lg font-semibold flex items-center gap-2 mb-4"><BookOpen size={20} className="text-brand" aria-hidden="true" />Most popular courses</h2>
          <RankBars rows={d.learning.popularCourses.map((c) => ({ label: c.title, value: c._count.enrollments, sub: 'students' }))} empty="No students have started a course yet." />
        </Card>
        <Card>
          <h2 className="text-lg font-semibold flex items-center gap-2 mb-4"><GraduationCap size={20} className="text-brand" aria-hidden="true" />Most bookmarked scholarships</h2>
          <RankBars rows={d.scholarships.bookmarked.map((s) => ({ label: s.name, value: s._count.saves, sub: 'saves' }))} empty="No scholarship saved yet." />
        </Card>
        <Card>
          <h2 className="text-lg font-semibold flex items-center gap-2"><HeartHandshake size={20} className="text-brand" aria-hidden="true" />Mentors to approve</h2>
          {d.mentorship.pendingMentors.length ? (
            <ul className="mt-3 divide-y divide-line">
              {d.mentorship.pendingMentors.map((m) => (
                <li key={m.id} className="py-3 flex items-center gap-3">
                  <Avatar user={m.user} />
                  <div className="min-w-0">
                    <p className="font-semibold">{m.user.firstName} {m.user.lastName}</p>
                    <p className="text-sm text-ink-soft truncate">{m.title} · applied {timeAgo(m.user.createdAt)}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : <p className="mt-3 text-ink-soft">No mentor applications are waiting.</p>}
          <Link to="/admin/mentors" className="inline-flex mt-3 text-sm font-semibold text-brand hover:underline min-h-11 items-center">Review mentors</Link>
        </Card>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="px-5 pt-5 pb-3 flex items-center gap-2">
          <Mail size={20} className="text-brand" aria-hidden="true" />
          <h2 className="text-lg font-semibold">Newest accounts</h2>
          <Link to="/admin/users" className="ml-auto text-sm font-semibold text-brand hover:underline">All {n(d.users.total)} accounts</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-paper text-left text-ink-soft">
              <tr><th className="px-5 py-2.5 font-semibold">Name</th><th className="px-5 py-2.5 font-semibold">Role</th><th className="px-5 py-2.5 font-semibold">Country</th><th className="px-5 py-2.5 font-semibold">Joined</th></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {d.recentUsers.map((u) => (
                <tr key={u.id}>
                  <td className="px-5 py-3"><div className="flex items-center gap-3"><Avatar user={u} /><div><p className="font-semibold">{u.firstName} {u.lastName}</p><p className="text-ink-soft">{u.email}</p></div></div></td>
                  <td className="px-5 py-3"><Pill tone={ROLE_TONE[u.role]}>{u.role[0].toUpperCase() + u.role.slice(1)}</Pill>{u.refugeeStatus === 'yes' && <span className="ml-1.5"><Pill tone="sky">Refugee</Pill></span>}</td>
                  <td className="px-5 py-3 text-ink-soft">{u.countryResidence || '—'}</td>
                  <td className="px-5 py-3 text-ink-soft whitespace-nowrap">{formatDate(u.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function Stat({ icon, tone, value, label, note, to }) {
  const body = (
    <>
      <IconTile icon={icon} tone={tone} />
      <div>
        <p className="font-display text-3xl font-bold leading-none">{value}</p>
        <p className="font-semibold mt-1.5">{label}</p>
        <p className="text-sm text-ink-soft">{note}</p>
      </div>
    </>
  );
  return (
    <li>
      {to ? <Link to={to} className="h-full bg-white rounded-xl border border-line p-5 flex items-start gap-4 hover:border-brand/40">{body}</Link>
        : <div className="h-full bg-white rounded-xl border border-line p-5 flex items-start gap-4">{body}</div>}
    </li>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <dt className="text-ink-soft">{label}</dt>
      <dd className="font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
