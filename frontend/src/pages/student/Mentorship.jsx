import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Languages, Search, UsersRound } from 'lucide-react';
import { Alert, Button, EmptyState, Field, Pill } from '../../components/ui';
import Avatar from '../../components/ui/Avatar';
import { useToast } from '../../context/FeedbackContext';
import { ListRowsSkeleton, ScholarshipGridSkeleton } from '../../components/ui/Skeletons';
import { Stars } from '../../components/mentorship/shared';
import SessionCard, { CardButton } from '../../components/mentorship/SessionCard';
import { ConfirmSheet } from '../../components/mentorship/booking';
import { api, errorMessage } from '../../services/api';

// Mentorship for students (spec 12): find a mentor, book a session, see your sessions, rate them.
export default function Mentorship() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'sessions' || params.get('tab') === 'past' ? 'sessions' : 'find';
  const [bookings, setBookings] = useState(null);
  const loadBookings = useCallback(() => api.get('/bookings').then((r) => setBookings(r.data.bookings)).catch(() => setBookings([])), []);
  useEffect(() => { document.title = 'Mentorship — INUKA'; loadBookings(); }, [loadBookings]);

  const upcomingCount = bookings?.filter((b) => viewOf(b) === 'upcoming').length || 0;
  const setTab = (t) => setParams(t === 'find' ? {} : { tab: t });

  return (
    <div>
      <h1 className="text-xl sm:text-2xl font-bold">Mentorship</h1>
      <p className="text-ink-soft mt-1">Book a free 1-hour session with a mentor who can guide your applications: by video, voice call or messages.</p>
      <div role="tablist" className="flex gap-1 mt-6 border-b border-line">
        {[['find', 'Find a mentor'], ['sessions', `My sessions${upcomingCount ? ` (${upcomingCount})` : ''}`]].map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
            className={`min-h-11 px-4 font-medium whitespace-nowrap border-b-2 -mb-px ${tab === k ? 'border-brand text-brand' : 'border-transparent text-ink-soft hover:text-ink'}`}>{l}</button>
        ))}
      </div>
      <div className="mt-6">
        {tab === 'find'
          ? <MentorDirectory />
          : <MySessions bookings={bookings} onFind={() => setTab('find')} />}
      </div>
    </div>
  );
}

/* ---------- Directory (spec 12.1) ---------- */
function MentorDirectory() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [expertise, setExpertise] = useState('');
  const [language, setLanguage] = useState('');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  // ?book=<mentorId> (from the search bar) opens the booking page
  useEffect(() => { if (params.get('book')) navigate(`/mentorship/book/${params.get('book')}`, { replace: true }); }, [params, navigate]);

  useEffect(() => {
    const t = setTimeout(() => {
      api.get('/mentors', { params: { q, expertise, language } }).then((r) => { setData(r.data); setError(''); }).catch((e) => setError(errorMessage(e)));
    }, q ? 300 : 0);
    return () => clearTimeout(t);
  }, [q, expertise, language]);

  return (
    <div>
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
              <Button to={`/mentorship/book/${m.id}`} className="mt-4 w-full">Book a session</Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ---------- My sessions: Upcoming / Completed / Cancelled ---------- */
const VIEWS = [['upcoming', 'Upcoming'], ['completed', 'Completed'], ['cancelled', 'Cancelled']];
export function viewOf(b, now = Date.now()) {
  const t = new Date(b.scheduledAt).getTime();
  if (b.status === 'completed') return 'completed';
  if (b.status === 'cancelled' || b.status === 'declined') return 'cancelled';
  if (b.status === 'pending') return t > now ? 'upcoming' : 'cancelled'; // never confirmed
  return t + 3600e3 > now ? 'upcoming' : 'completed'; // confirmed: upcoming until it ends
}

function MySessions({ bookings, onFind }) {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const view = VIEWS.some(([k]) => k === params.get('view')) ? params.get('view') : 'upcoming';
  const [cancelling, setCancelling] = useState(null);
  const toast = useToast();
  if (!bookings) return <ListRowsSkeleton rows={3} />;
  const now = Date.now();
  const groups = { upcoming: [], completed: [], cancelled: [] };
  for (const b of bookings) groups[viewOf(b, now)].push(b);
  groups.upcoming.sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));
  const list = groups[view];
  const message = async (b) => {
    try {
      const { data } = await api.post('/conversations', { mentorId: b.mentor.id });
      navigate(`/messages/${data.conversation.id}`);
    } catch (e) { toast.error(errorMessage(e)); }
  };

  return (
    <div>
      <div role="tablist" className="grid grid-cols-3 border-b border-line max-w-xl">
        {VIEWS.map(([k, l]) => (
          <button key={k} role="tab" aria-selected={view === k} onClick={() => setParams({ tab: 'sessions', ...(k !== 'upcoming' && { view: k }) })}
            className={`min-h-12 font-medium border-b-[3px] -mb-px transition-colors ${view === k ? 'border-brand text-brand font-semibold' : 'border-transparent text-ink-soft hover:text-ink'}`}>
            {l}{groups[k].length > 0 && k !== 'cancelled' ? <span className="ml-1.5 text-xs tabular-nums opacity-70">{groups[k].length}</span> : null}
          </button>
        ))}
      </div>
      {list.length === 0 ? (
        <EmptySessions view={view} onFind={onFind} />
      ) : (
        <ul className="mt-5 grid lg:grid-cols-2 gap-4">
          {list.map((b) => {
            const name = b.mentor.user.firstName;
            let actions;
            if (view === 'upcoming') {
              actions = <>
                <CardButton onClick={() => setCancelling(b)}>Cancel session</CardButton>
                <CardButton filled to={`/mentorship/sessions/${b.id}/reschedule`}>Reschedule</CardButton>
              </>;
            } else if (view === 'completed') {
              actions = <>
                <CardButton to={`/mentorship/book/${b.mentor.id}`}>Book again</CardButton>
                {b.status === 'completed' && !b.review
                  ? <CardButton filled to={`/mentorship/sessions/${b.id}#review`}>Leave a review</CardButton>
                  : <CardButton filled to={`/mentorship/sessions/${b.id}`}>{b.review ? `You rated ${b.review.rating}/5` : 'View session'}</CardButton>}
              </>;
            } else {
              actions = <>
                <CardButton to={`/mentorship/sessions/${b.id}`}>View details</CardButton>
                <CardButton filled to={`/mentorship/book/${b.mentor.id}`}>Book again</CardButton>
              </>;
            }
            return (
              <li key={b.id}>
                <SessionCard b={b} person={b.mentor.user} to={`/mentorship/sessions/${b.id}`} actions={actions}
                  iconAction={{ label: `Message ${name}`, onClick: () => message(b) }} />
              </li>
            );
          })}
        </ul>
      )}
      <ConfirmSheet open={!!cancelling} title="Cancel session" danger confirmLabel="Yes, cancel" onClose={() => setCancelling(null)}
        onConfirm={() => { const id = cancelling.id; setCancelling(null); navigate(`/mentorship/sessions/${id}/cancel`); }}>
        <p>Are you sure you want to cancel your session with {cancelling?.mentor.user.firstName}?</p>
        <p className="text-ink-soft text-sm">The time becomes free for other students. You can move it to another time instead.</p>
        {cancelling && <Link to={`/mentorship/sessions/${cancelling.id}/reschedule`} className="inline-block text-brand font-semibold underline min-h-11 leading-[44px]">Reschedule instead</Link>}
      </ConfirmSheet>
    </div>
  );
}

function EmptySessions({ view, onFind }) {
  const copy = {
    upcoming: ['You have no upcoming session', 'Book a free session with a mentor to get help with scholarships, essays or English.'],
    completed: ['No finished sessions yet', 'After a session, you can read your mentor\'s notes and rate it here.'],
    cancelled: ['No cancelled sessions', 'Sessions that you, or a mentor, cancel will appear here.'],
  }[view];
  return (
    <div className="py-14 text-center max-w-sm mx-auto">
      <svg viewBox="0 0 180 150" className="w-48 mx-auto" aria-hidden="true">
        <g transform="rotate(-12 70 80)">
          <rect x="22" y="28" width="86" height="104" rx="8" fill="var(--color-surface)" stroke="var(--color-ink-soft)" strokeWidth="2" />
          <rect x="32" y="42" width="66" height="80" rx="3" fill="var(--color-line)" />
          <rect x="44" y="20" width="42" height="14" rx="4" fill="var(--color-brand)" />
          <circle cx="65" cy="17" r="5" fill="none" stroke="var(--color-brand)" strokeWidth="2" />
        </g>
        <rect x="74" y="38" width="86" height="106" rx="8" fill="var(--color-surface)" stroke="var(--color-ink-soft)" strokeWidth="2" />
        <rect x="84" y="52" width="66" height="82" rx="3" fill="var(--color-paper)" stroke="var(--color-line)" />
        <rect x="96" y="30" width="42" height="14" rx="4" fill="var(--color-accent)" />
        <circle cx="117" cy="27" r="5" fill="none" stroke="var(--color-accent)" strokeWidth="2" />
        <path d="M94 76h40M94 90h46M94 104h28" stroke="var(--color-line)" strokeWidth="4" strokeLinecap="round" />
      </svg>
      <h2 className="mt-5 font-bold text-lg">{copy[0]}</h2>
      <p className="mt-1 text-ink-soft">{copy[1]}</p>
      {view !== 'cancelled' && <Button onClick={onFind} className="mt-5">Find a mentor</Button>}
    </div>
  );
}
