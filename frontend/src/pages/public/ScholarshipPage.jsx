import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, Bookmark, BookmarkCheck, Building2, CalendarDays, Check, CircleDollarSign, ExternalLink, Globe2, GraduationCap,
  Languages, MapPin, ShieldCheck,
} from 'lucide-react';
import PublicShell from '../../components/landing/PublicShell';
import ScholarshipCard from '../../components/scholarships/ScholarshipCard';
import DocumentChecklist from '../../components/scholarships/DocumentChecklist';
import RichText from '../../components/ui/RichText';
import { Button, EmptyState } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { api, errorMessage } from '../../services/api';
import { FUNDING_LABEL, LEVEL_LABEL, daysUntil, formatDate } from '../../utils/format';
import { HELP_PHOTO, scholarshipPhoto } from '../../config/photos';

// One page per scholarship: /opportunities/<slug>. Open to everyone.
// Signed-in users can save it and apply (with the document checklist); visitors are asked to sign in first.
const LANG = (l) => (l === 'Both' ? 'English or French' : l);

function daysText(deadline) {
  const d = daysUntil(deadline);
  if (d === null) return { text: 'Deadline varies', cls: 'text-ink-soft' };
  if (d < 0) return { text: 'Deadline passed', cls: 'text-ink-soft' };
  return { text: d === 0 ? 'Closes today' : d === 1 ? '1 day left' : `${d} days left`, cls: d < 30 ? 'text-danger' : 'text-success' };
}

function Section({ title, children }) {
  return (
    <section className="mt-10 first:mt-0">
      <h2 className="flex items-center gap-3 text-xl font-semibold text-brand">
        <span className="w-8 h-[3px] rounded-full bg-accent" aria-hidden="true" />{title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function CheckList({ items }) {
  return (
    <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-3">
      {items.map((i) => (
        <li key={i} className="flex gap-3 text-[15px]">
          <span className="mt-0.5 w-5 h-5 shrink-0 rounded-full bg-success text-white flex items-center justify-center" aria-hidden="true"><Check size={13} strokeWidth={3} /></span>
          <span>{i}</span>
        </li>
      ))}
    </ul>
  );
}

function Steps({ items }) {
  return (
    <ol className="space-y-4">
      {items.map((step, n) => (
        <li key={step} className="flex gap-4">
          <span className="w-9 h-9 shrink-0 rounded-full bg-brand text-white font-semibold flex items-center justify-center">{n + 1}</span>
          <p className="pt-1.5 text-[15px]">{step}</p>
        </li>
      ))}
    </ol>
  );
}

// "Key facts" list in the side panel (funding, refugees, level, language, where).
function Facts({ s }) {
  const rows = [
    [CircleDollarSign, 'Funding', FUNDING_LABEL[s.fundingType]],
    [ShieldCheck, 'Refugees', s.refugeesOnly ? 'For refugees only' : s.openToRefugees ? 'Open to refugees' : 'Not open to refugees'],
    [GraduationCap, 'Study level', LEVEL_LABEL[s.level]],
    [Languages, 'Language', LANG(s.languageOfStudy)],
    [MapPin, 'Country', s.hostCountry],
    ...(s.hostUniversity ? [[Building2, 'University', s.hostUniversity]] : []),
    [Globe2, 'Region', s.region],
  ];
  return (
    <dl className="divide-y divide-line">
      {rows.map(([Icon, label, value]) => (
        <div key={label} className="flex items-center gap-3 py-3">
          <Icon size={18} className="text-accent-hover shrink-0" aria-hidden="true" />
          <dt className="text-sm text-ink-soft w-24 shrink-0">{label}</dt>
          <dd className="text-[15px] font-medium text-ink min-w-0">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export default function ScholarshipPage() {
  const { slug } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [data, setData] = useState(null); // { scholarship, related, checklist? }
  const [error, setError] = useState('');
  const [checklistOpen, setChecklistOpen] = useState(false);
  const [params, setParams] = useSearchParams();

  useEffect(() => {
    setData(null); setError('');
    window.scrollTo(0, 0);
    // Signed in: the student endpoint also says whether it is saved and which documents are ready.
    const url = user ? `/scholarships/${slug}` : `/public/scholarships/${slug}`;
    api.get(url).then((r) => setData(r.data)).catch((e) => setError(errorMessage(e)));
  }, [slug, user]);

  useEffect(() => { if (data) document.title = `${data.scholarship.name} — INUKA`; }, [data]);

  const signIn = (andApply) => navigate('/login', { state: { from: location.pathname + (andApply ? '?apply=1' : '') } });
  const toggleSave = async () => {
    if (!user) return signIn();
    const s = data.scholarship;
    try {
      if (s.saved) await api.delete(`/scholarships/save/${s.id}`); else await api.post('/scholarships/save', { scholarshipId: s.id });
      setData((d) => ({ ...d, scholarship: { ...d.scholarship, saved: !s.saved } }));
    } catch (e) { setError(errorMessage(e)); }
  };
  const apply = () => { if (!user) return signIn(true); setChecklistOpen(true); };
  // "Apply now" on a card opens this page with ?apply=1: go straight to the checklist.
  useEffect(() => {
    if (!data || params.get('apply') !== '1') return;
    setParams({}, { replace: true });
    apply();
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps
  const continueToApply = async () => {
    const s = data.scholarship;
    window.open(s.applyUrl, '_blank', 'noopener,noreferrer');
    setChecklistOpen(false);
    try { await api.post('/applications', { scholarshipId: s.id }); } catch { /* tracking only */ }
  };
  const openOther = (r) => navigate(`/opportunities/${r.slug || r.id}`);

  if (error && !data) {
    return (
      <PublicShell>
        <div className="max-w-[1200px] mx-auto px-5 py-20">
          <EmptyState icon={GraduationCap} title="Scholarship not found" action={<Button to="/opportunities">See all scholarships</Button>}>{error}</EmptyState>
        </div>
      </PublicShell>
    );
  }

  const s = data?.scholarship;
  const photo = s ? scholarshipPhoto(s) : null;
  const left = s ? daysText(s.deadline) : null;

  return (
    <PublicShell>
      {/* Hero: the scholarship's photo behind the name */}
      <section className="relative isolate bg-brand text-white overflow-hidden">
        {photo && (
          <img src={photo.src} alt="" onError={(e) => { e.currentTarget.style.display = 'none'; }}
            className="absolute inset-0 -z-10 w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(7,41,77,0.92)_0%,rgba(7,41,77,0.75)_55%,rgba(7,41,77,0.45)_100%)]" aria-hidden="true" />
        <div className="max-w-[1200px] mx-auto px-5 pt-10 pb-12 md:pt-14 md:pb-16">
          <Link to="/opportunities" className="inline-flex items-center gap-1.5 text-sm text-white/85 hover:text-accent">
            <ArrowLeft size={16} aria-hidden="true" />All scholarships
          </Link>
          {s ? (
            <>
              <p className="mt-6 flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-accent">
                <MapPin size={15} aria-hidden="true" />{s.hostCountry}
              </p>
              <h1 className="mt-2 text-white text-[1.9rem] sm:text-4xl font-bold leading-tight max-w-[22ch]">{s.name}</h1>
              <p className="mt-3 text-white/85 text-[15px] sm:text-base">{s.hostUniversity || s.orgName}</p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Button onClick={apply} className="min-h-11 px-7">Apply now</Button>
                <button type="button" onClick={toggleSave} aria-pressed={!!s.saved}
                  className="inline-flex items-center gap-2 min-h-11 px-6 rounded border-2 border-white text-white font-semibold hover:bg-white hover:text-brand transition-colors">
                  {s.saved ? <BookmarkCheck size={18} aria-hidden="true" /> : <Bookmark size={18} aria-hidden="true" />}{s.saved ? 'Saved' : 'Save'}
                </button>
              </div>
            </>
          ) : (
            <div className="mt-6 space-y-3" aria-label="Loading"><div className="h-4 w-32 rounded bg-white/20" /><div className="h-10 w-2/3 rounded bg-white/20" /><div className="h-4 w-48 rounded bg-white/20" /></div>
          )}
        </div>
      </section>

      {s && (
        <div className="max-w-[1200px] mx-auto px-5 py-12 grid lg:grid-cols-[1fr_360px] gap-10 items-start">
          {/* Main column */}
          <article className="min-w-0">
            {error && <p role="alert" className="mb-6 text-danger">{error}</p>}
            <Section title="About this scholarship">
              <RichText html={s.description} className="text-[15px] leading-7 text-ink" />
            </Section>
            {s.eligibility?.length > 0 && <Section title="Who can apply"><CheckList items={s.eligibility} /></Section>}
            {s.coverage?.length > 0 && <Section title="What it covers"><CheckList items={s.coverage} /></Section>}
            {s.applicationSteps?.length > 0 && <Section title="How to apply"><Steps items={s.applicationSteps} /></Section>}
            <p className="mt-10 text-sm text-ink-soft border-t border-line pt-5">
              INUKA is not part of this scholarship. Always check the latest details on the{' '}
              <a href={s.applyUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand underline">official website</a>.
            </p>
          </article>

          {/* Side panel */}
          <aside className="space-y-6 lg:sticky lg:top-24">
            <div className="bg-surface rounded-xl border border-line overflow-hidden">
              <div className="px-5 pt-5 pb-4 border-b border-line">
                <p className="text-sm text-ink-soft">Application deadline</p>
                <p className="mt-1 flex items-center gap-2 text-lg font-semibold text-brand">
                  <CalendarDays size={20} className="text-accent-hover" aria-hidden="true" />
                  {s.deadline ? formatDate(s.deadline) : 'Varies'}
                </p>
                <p className={`mt-0.5 text-sm font-semibold ${left.cls}`}>{left.text}</p>
                {s.deadlineNote && <p className="mt-2 text-xs text-ink-soft">{s.deadlineNote}</p>}
              </div>
              <div className="px-5"><Facts s={s} /></div>
              <div className="p-5 pt-3 grid gap-2">
                <Button onClick={apply} className="w-full">Apply now</Button>
                <Button variant="outline" onClick={toggleSave} aria-pressed={!!s.saved} className="w-full">
                  {s.saved ? <BookmarkCheck size={18} aria-hidden="true" /> : <Bookmark size={18} aria-hidden="true" />}{s.saved ? 'Saved' : 'Save for later'}
                </Button>
                <a href={s.applyUrl} target="_blank" rel="noopener noreferrer"
                  className="mt-1 inline-flex items-center justify-center gap-1.5 text-sm font-semibold text-brand hover:underline">
                  Official website<ExternalLink size={15} aria-hidden="true" />
                </a>
              </div>
            </div>

            <div className="relative rounded-xl overflow-hidden text-white">
              <img src={HELP_PHOTO.src} alt={HELP_PHOTO.alt} loading="lazy" className="absolute inset-0 w-full h-full object-cover"
                onError={(e) => { e.currentTarget.style.display = 'none'; }} />
              <div className="relative bg-[linear-gradient(180deg,rgba(7,41,77,0.35)_0%,rgba(7,41,77,0.92)_60%)] bg-brand/40 px-5 pt-28 pb-5">
                <h2 className="text-white text-lg font-semibold">Need help applying?</h2>
                <p className="mt-1 text-sm text-white/85">A free INUKA mentor can check your essay and documents with you.</p>
                <Button to={user ? '/mentorship' : '/register'} className="mt-4">Find a mentor</Button>
              </div>
            </div>
          </aside>
        </div>
      )}

      {s && data.related?.length > 0 && (
        <section className="bg-surface border-t border-line">
          <div className="max-w-[1200px] mx-auto px-5 py-12">
            <h2 className="flex items-center gap-3 text-xl font-semibold text-brand">
              <span className="w-8 h-[3px] rounded-full bg-accent" aria-hidden="true" />You may also like
            </h2>
            <ul className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {data.related.map((r) => (
                <ScholarshipCard key={r.id} s={r} onOpen={openOther} onSave={() => (user ? openOther(r) : signIn())} onApply={(x) => navigate(`/opportunities/${x.slug || x.id}?apply=1`)} />
              ))}
            </ul>
          </div>
        </section>
      )}

      {s && data.checklist && (
        <DocumentChecklist open={checklistOpen} scholarship={s} checklist={data.checklist}
          onClose={() => setChecklistOpen(false)} onContinue={continueToApply}
          onSave={async () => { if (!s.saved) await toggleSave(); setChecklistOpen(false); }} />
      )}
    </PublicShell>
  );
}
