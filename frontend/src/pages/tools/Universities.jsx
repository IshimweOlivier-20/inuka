import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Accessibility, ArrowLeft, BadgeCheck, Building2, Compass, ExternalLink, MapPin, Search } from 'lucide-react';
import { Alert, Button, PageLoader } from '../../components/ui';
import ToolShell, { ToolHeader } from '../../components/tools/ToolShell';
import { api, errorMessage } from '../../services/api';
import { formatDate } from '../../utils/format';

// University directory: universities, Rwanda Polytechnic / TVET colleges and their programmes with entry requirements.
// Built by the INUKA team from each institution's official page (Admin → Universities).
const KIND = { public: 'Public university', private: 'Private university', tvet: 'Polytechnic / TVET' };
const AWARD = { bachelor: "Bachelor's", diploma: 'Diploma', certificate: 'Short course' };
const ACCESS = [['supportOffice', 'Disability support office'], ['accessibleCampus', 'Accessible buildings'], ['assistiveTech', 'Assistive technology']];
const hasAccess = (u) => u.accessibility && ACCESS.some(([k]) => u.accessibility[k]);

function Initials({ u, big }) {
  const t = (u.shortName || u.name).replace(/[^A-Za-z]/g, '').slice(0, big ? 4 : 3).toUpperCase();
  return <span className={`${big ? 'w-16 h-16 text-base' : 'w-11 h-11 text-xs'} rounded-lg bg-brand text-white font-bold flex items-center justify-center shrink-0`} aria-hidden="true">{t}</span>;
}

export default function UniversityList() {
  const [params, setParams] = useSearchParams();
  const f = { q: params.get('q') || '', kind: params.get('kind') || '', field: params.get('field') || '', accessible: params.get('accessible') || '' };
  const [q, setQ] = useState(f.q);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const set = (patch) => {
    const next = { ...f, ...patch };
    setParams(Object.fromEntries(Object.entries(next).filter(([, v]) => v)), { replace: true });
  };
  useEffect(() => {
    setData(null);
    api.get('/public/universities', { params: Object.fromEntries(Object.entries(f).filter(([, v]) => v)) })
      .then((r) => setData(r.data)).catch((e) => setError(errorMessage(e)));
  }, [params.toString()]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const t = setTimeout(() => q !== f.q && set({ q }), 350); return () => clearTimeout(t); }, [q]); // eslint-disable-line react-hooks/exhaustive-deps

  const chip = (active, onClick, label) => (
    <button type="button" onClick={onClick} aria-pressed={active}
      className={`h-9 px-3.5 rounded-full text-sm font-semibold border transition-colors ${active ? 'bg-brand border-brand text-white' : 'bg-surface border-line text-ink hover:border-brand'}`}>{label}</button>
  );

  return (
    <ToolShell header={
      <ToolHeader icon={Building2} eyebrow="Directory" title="Universities and colleges"
        intro="Programmes, entry requirements and disability support in one place. Always confirm on the official website before applying.">
        <label className="mt-5 flex items-center gap-2 max-w-xl h-11 rounded-lg bg-white px-3 text-ink">
          <Search size={18} className="text-ink-soft" aria-hidden="true" /><span className="sr-only">Search</span>
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search a university, city or programme…" className="flex-1 bg-transparent outline-none text-sm" />
        </label>
      </ToolHeader>
    }>
      <div className="flex flex-wrap items-center gap-2">
        {chip(!f.kind, () => set({ kind: '' }), 'All')}
        {Object.entries(KIND).map(([k, l]) => chip(f.kind === k, () => set({ kind: f.kind === k ? '' : k }), l))}
        <span className="w-px h-6 bg-line mx-1" aria-hidden="true" />
        {chip(!!f.accessible, () => set({ accessible: f.accessible ? '' : '1' }), <span className="inline-flex items-center gap-1"><Accessibility size={14} aria-hidden="true" />Disability support</span>)}
        {data?.fields?.length > 0 && (
          <select value={f.field} onChange={(e) => set({ field: e.target.value })} aria-label="Field of study" className="h-9 rounded-full border border-line bg-surface px-3 text-sm">
            <option value="">Any field</option>{data.fields.map((x) => <option key={x} value={x}>{x}</option>)}
          </select>
        )}
      </div>
      <div className="mt-4 rounded-md border border-line bg-surface px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm flex items-center gap-2"><Compass size={16} className="text-brand" aria-hidden="true" />Not sure where you qualify? Type your S6 results and see your options.</p>
        <Button to="/next-step" className="!min-h-9 !px-4 text-sm">Check my options</Button>
      </div>

      {error && <div className="mt-4"><Alert>{error}</Alert></div>}
      {!data ? <PageLoader /> : data.universities.length === 0 ? (
        <p className="text-center text-ink-soft py-12">No institution matches. Try another filter.</p>
      ) : (
        <>
          <p className="text-sm text-ink-soft mt-5 mb-3" aria-live="polite">{data.universities.length} institution{data.universities.length === 1 ? '' : 's'}</p>
          <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.universities.map((u) => (
              <li key={u.id}>
                <Link to={`/universities/${u.slug}`} className="group h-full flex flex-col bg-surface border border-line rounded-md p-4 hover:border-brand hover:shadow-[0_8px_24px_-14px_rgba(7,41,77,0.35)] transition">
                  <div className="flex items-start gap-3">
                    <Initials u={u} />
                    <div className="min-w-0">
                      <p className="font-semibold leading-snug group-hover:text-brand">{u.name}</p>
                      <p className="text-xs text-ink-soft mt-0.5 flex items-center gap-1"><MapPin size={12} aria-hidden="true" />{u.city || 'Rwanda'} · {KIND[u.kind]}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {u.programmes.slice(0, 3).map((p) => <span key={p.id} className="text-xs rounded-full bg-brand-soft px-2 py-0.5 truncate max-w-full">{p.name}</span>)}
                    {u.programmes.length > 3 && <span className="text-xs text-ink-soft px-1">+{u.programmes.length - 3} more</span>}
                  </div>
                  <div className="mt-auto pt-3 flex flex-wrap gap-1.5 text-[11px] font-semibold">
                    {hasAccess(u) && <span className="inline-flex items-center gap-1 rounded-full bg-info-soft text-info-ink px-2 py-0.5"><Accessibility size={11} aria-hidden="true" />Disability support</span>}
                    {u.verifiedAt ? <span className="inline-flex items-center gap-1 rounded-full bg-success-soft text-success-ink px-2 py-0.5"><BadgeCheck size={11} aria-hidden="true" />Checked {formatDate(u.verifiedAt)}</span>
                      : u.isSample && <span className="rounded-full bg-brand-soft/60 text-ink-soft px-2 py-0.5">Sample data</span>}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </ToolShell>
  );
}

export function UniversityPage() {
  const { slug } = useParams();
  const [u, setU] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { api.get(`/public/universities/${slug}`).then((r) => setU(r.data.university)).catch((e) => setError(errorMessage(e))); }, [slug]);
  const groups = u ? ['bachelor', 'diploma', 'certificate'].map((a) => [a, u.programmes.filter((p) => p.award === a)]).filter(([, l]) => l.length) : [];
  return (
    <ToolShell header={
      <ToolHeader icon={Building2} eyebrow={u ? KIND[u.kind] : 'Directory'} title={u ? u.name : 'University'}
        intro={u ? [u.shortName, u.city].filter(Boolean).join(' · ') : ''}>
        <Link to="/universities" className="inline-flex items-center gap-1 mt-4 text-sm text-white/85 hover:text-white"><ArrowLeft size={15} aria-hidden="true" />All universities and colleges</Link>
      </ToolHeader>
    }>
      {error ? <Alert>{error}</Alert> : !u ? <PageLoader /> : (
        <div className="grid grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_300px] gap-6 items-start">
          <div className="space-y-5">
            {u.isSample && !u.verifiedAt && <Alert tone="warning">Sample data: these requirements are examples while our team checks them with the institution. Confirm on the official website.</Alert>}
            {u.about && <p className="text-[15px] leading-relaxed">{u.about}</p>}
            {groups.map(([award, list]) => (
              <section key={award} className="bg-surface border border-line rounded-md">
                <h2 className="px-4 py-3 border-b border-line text-base font-semibold">{AWARD[award]} programmes <span className="text-sm font-normal text-ink-soft">({list.length})</span></h2>
                <ul className="divide-y divide-line">
                  {list.map((p) => (
                    <li key={p.id} className="px-4 py-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <p className="font-semibold text-[15px]">{p.name}</p>
                        <span className="text-xs text-ink-soft">{p.field}{p.durationYears ? ` · ${p.durationYears < 1 ? `${Math.round(p.durationYears * 12)} months` : `${p.durationYears} years`}` : ''}</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-1.5 text-xs">
                        {p.minPoints ? <span className="rounded-full bg-brand-soft px-2 py-0.5">Minimum {p.minPoints} points</span> : null}
                        {(p.required || []).map((r) => <span key={r.subject} className="rounded-full bg-brand-soft px-2 py-0.5">{r.subject}: {r.minGrade} or better</span>)}
                        {(p.combinations || []).length > 0 && <span className="rounded-full bg-brand-soft px-2 py-0.5">Combinations: {p.combinations.join(', ')}</span>}
                        {!p.minPoints && !(p.required || []).length && !(p.combinations || []).length && <span className="text-ink-soft">No fixed grade minimum listed</span>}
                      </div>
                      {p.notes && <p className="text-xs text-ink-soft mt-1.5">{p.notes}</p>}
                      {p.applyUrl && <a href={p.applyUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-1.5 text-sm font-semibold text-brand hover:underline">How to apply<ExternalLink size={13} aria-hidden="true" /></a>}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
          <aside className="space-y-4 lg:sticky lg:top-20">
            <div className="bg-surface border border-line rounded-md p-4">
              <div className="flex items-center gap-3"><Initials u={u} big /><div><p className="font-semibold leading-snug">{u.shortName || u.name}</p><p className="text-xs text-ink-soft">{KIND[u.kind]}</p></div></div>
              {u.website && <Button href={u.website} target="_blank" rel="noopener noreferrer" variant="dark" className="w-full mt-4 !min-h-10 text-sm">Official website<ExternalLink size={14} aria-hidden="true" /></Button>}
              <p className="text-xs text-ink-soft mt-3">{u.verifiedAt ? <span className="inline-flex items-center gap-1 text-success-ink"><BadgeCheck size={13} aria-hidden="true" />Checked by INUKA on {formatDate(u.verifiedAt)}</span> : 'Not yet checked by our team.'}</p>
            </div>
            <div className="bg-surface border border-line rounded-md p-4">
              <p className="font-semibold flex items-center gap-2"><Accessibility size={17} className="text-brand" aria-hidden="true" />Disability support</p>
              <ul className="mt-2 space-y-1.5 text-sm">
                {ACCESS.map(([k, l]) => <li key={k} className="flex items-center justify-between gap-2"><span>{l}</span><span className={u.accessibility?.[k] ? 'text-success-ink font-semibold' : 'text-ink-soft'}>{u.accessibility?.[k] ? 'Yes' : 'Not known'}</span></li>)}
              </ul>
              {u.accessibility?.notes && <p className="text-xs text-ink-soft mt-2">{u.accessibility.notes}</p>}
            </div>
            <Button to="/next-step" className="w-full !min-h-10 text-sm"><Compass size={16} aria-hidden="true" />Check my options</Button>
          </aside>
        </div>
      )}
    </ToolShell>
  );
}
