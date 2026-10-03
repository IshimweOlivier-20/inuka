import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Info, SearchX } from 'lucide-react';
import PublicShell, { PageHero } from '../../components/landing/PublicShell';
import { SCHOLAR_PHOTOS } from '../../config/photos';
import ScholarshipCard from '../../components/scholarships/ScholarshipCard';
import {
  ActiveChips, CheckOption, FilterButton, FilterGroup, FilterSheet, FilterSidebar, LongOptionList, RadioOption, SortSelect,
} from '../../components/filters/FilterPanel';
import { useUrlFilters } from '../../components/filters/useUrlFilters';
import { Button, EmptyState } from '../../components/ui';
import { ScholarshipCardSkeleton } from '../../components/ui/Skeletons';
import { Pagination, ViewSwitch } from '../../components/ui/ListControls';
import { useAuth } from '../../context/AuthContext';
import { api, errorMessage } from '../../services/api';

const SPEC = {
  q: { type: 'value' },
  refugees: { type: 'value' },
  funding: { type: 'list' },
  level: { type: 'list' },
  deadline: { type: 'value' },
  past: { type: 'value', default: 'hide' },
  covers: { type: 'list' },
  region: { type: 'list' },
  country: { type: 'list' },
  language: { type: 'list' },
  sort: { type: 'value', default: 'deadline' },
};

const L = {
  refugees: { open: 'Open to refugees', only: 'For refugees only' },
  funding: { fully_funded: 'Fully funded', partial: 'Partial funding', tuition_only: 'Tuition only' },
  level: { undergraduate: 'Undergraduate', postgraduate: 'Postgraduate (master’s, PhD)' },
  deadline: { 30: 'Within 30 days', 90: 'Within 3 months', 180: 'Within 6 months', varies: 'Deadline varies' },
  covers: { tuition: 'Tuition', living: 'Living allowance', travel: 'Travel', accommodation: 'Accommodation', health: 'Health insurance' },
  region: { 'East Africa': 'East Africa', 'West Africa': 'West Africa', 'Southern Africa': 'Southern Africa', 'North Africa': 'North Africa', Global: 'Anywhere in the world' },
  language: { English: 'English', French: 'French' },
};
const SORTS = [['deadline', 'Deadline (soonest first)'], ['relevant', 'Most relevant'], ['newest', 'Newest added'], ['name', 'Name (A to Z)']];
const PAGE_SIZE = 9;
const savedView = () => { try { return localStorage.getItem('inuka-scholarship-view') === 'list' ? 'list' : 'grid'; } catch { return 'grid'; } };

function toParams(v) {
  const p = {};
  for (const [k, val] of Object.entries(v)) {
    if (Array.isArray(val) ? val.length : val) p[k] = Array.isArray(val) ? val.join(',') : val;
  }
  return p;
}

// All filter groups (used in the desktop sidebar and the phone sheet).
function Filters({ f, facets, sheet }) {
  const { values: v, toggle, update } = f;
  const c = (group, key) => facets?.[group]?.[key] ?? 0;
  const name = (g) => `${g}${sheet ? '-sheet' : ''}`;
  return (
    <>
      <FilterGroup title="Open to refugees" selectedCount={v.refugees ? 1 : 0}>
        <RadioOption name={name('refugees')} label="All scholarships" count={facets?.refugees?.all} checked={!v.refugees} onChange={() => update({ refugees: '' })} />
        {['open', 'only'].map((k) => (
          <RadioOption key={k} name={name('refugees')} label={L.refugees[k]} count={c('refugees', k)} checked={v.refugees === k} onChange={() => update({ refugees: k })} />
        ))}
      </FilterGroup>
      <FilterGroup title="Funding" selectedCount={v.funding.length}>
        {Object.keys(L.funding).map((k) => (
          <CheckOption key={k} label={L.funding[k]} count={c('funding', k)} checked={v.funding.includes(k)} onChange={() => toggle('funding', k)} />
        ))}
      </FilterGroup>
      <FilterGroup title="Study level" selectedCount={v.level.length}>
        {Object.keys(L.level).map((k) => (
          <CheckOption key={k} label={L.level[k]} count={c('level', k)} checked={v.level.includes(k)} onChange={() => toggle('level', k)} />
        ))}
      </FilterGroup>
      <FilterGroup title="Application deadline" selectedCount={v.deadline ? 1 : 0}>
        <RadioOption name={name('deadline')} label="Any time" count={facets?.deadline?.all} checked={!v.deadline} onChange={() => update({ deadline: '' })} />
        {Object.keys(L.deadline).map((k) => (
          <RadioOption key={k} name={name('deadline')} label={L.deadline[k]} count={c('deadline', k)} checked={v.deadline === k} onChange={() => update({ deadline: k })} />
        ))}
        <div className="pt-2 mt-2 border-t border-line">
          <CheckOption label="Include closed scholarships" checked={v.past === 'show'} onChange={() => update({ past: v.past === 'show' ? 'hide' : 'show' })} />
        </div>
      </FilterGroup>
      <FilterGroup title="What it covers" hint="Shows scholarships that cover everything you tick." selectedCount={v.covers.length}>
        {Object.keys(L.covers).map((k) => (
          <CheckOption key={k} label={L.covers[k]} count={c('covers', k)} checked={v.covers.includes(k)} onChange={() => toggle('covers', k)} />
        ))}
      </FilterGroup>
      <FilterGroup title="Region" selectedCount={v.region.length}>
        {Object.keys(L.region).map((k) => (
          <CheckOption key={k} label={L.region[k]} count={c('region', k)} checked={v.region.includes(k)} onChange={() => toggle('region', k)} />
        ))}
      </FilterGroup>
      <FilterGroup title="Study destination" selectedCount={v.country.length} defaultOpen={!sheet}>
        <LongOptionList
          findLabel="Find a country"
          options={Object.entries(facets?.country || {})
            .concat(v.country.filter((k) => !(k in (facets?.country || {}))).map((k) => [k, 0]))
            .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
            .map(([k, n]) => ({ key: k, label: k, count: n }))}
          renderOption={(o) => (
            <CheckOption key={o.key} label={o.label} count={o.count} checked={v.country.includes(o.key)} onChange={() => toggle('country', o.key)} />
          )}
        />
      </FilterGroup>
      <FilterGroup title="Language of study" selectedCount={v.language.length} defaultOpen={false}>
        {Object.keys(L.language).map((k) => (
          <CheckOption key={k} label={L.language[k]} count={c('language', k)} checked={v.language.includes(k)} onChange={() => toggle('language', k)} />
        ))}
      </FilterGroup>
    </>
  );
}

export default function Opportunities() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const f = useUrlFilters(SPEC);
  const { values: v } = f;
  const [data, setData] = useState(null); // { total, results, facets, summary, page }
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [view, setView] = useState(savedView);
  const changeView = (next) => { setView(next); try { localStorage.setItem('inuka-scholarship-view', next); } catch { /* private mode */ } };
  const [error, setError] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);
  const resultsRef = useRef(null);
  const request = useRef(0);

  useEffect(() => { document.title = 'Scholarships and opportunities — INUKA'; }, []);

  const key = JSON.stringify(v);
  // New filters, search or sort: back to page 1.
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) { firstRun.current = false; return; }
    setPage(1);
  }, [key]);
  useEffect(() => {
    const id = ++request.current;
    setLoading(true);
    api.get('/public/scholarships', { params: { ...toParams(v), pageSize: PAGE_SIZE, page } })
      .then(async (r) => {
        // Signed in: mark the ones already saved.
        if (user) {
          try {
            const ids = new Set((await api.get('/scholarships/saved')).data.scholarships.map((x) => x.id));
            r.data.results = r.data.results.map((x) => ({ ...x, saved: ids.has(x.id) }));
          } catch { /* not important */ }
        }
        if (id === request.current) { setData(r.data); setError(''); }
      })
      .catch((e) => { if (id === request.current) setError(errorMessage(e)); })
      .finally(() => { if (id === request.current) setLoading(false); });
  }, [key, page]); // eslint-disable-line react-hooks/exhaustive-deps

  const goTo = (n) => { setPage(n); resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
  const pages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  const openDetail = (s) => navigate(`/opportunities/${s.slug || s.id}`);
  // Save from the card: signed-in users save right here; visitors are asked to sign in.
  const toggleSave = async (s) => {
    if (!user) { navigate('/login', { state: { from: '/opportunities' } }); return; }
    try {
      if (s.saved) await api.delete(`/scholarships/save/${s.id}`); else await api.post('/scholarships/save', { scholarshipId: s.id });
      setData((d) => ({ ...d, results: d.results.map((x) => (x.id === s.id ? { ...x, saved: !s.saved } : x)) }));
    } catch (e) { setError(errorMessage(e)); }
  };

  const chips = [
    ...(v.q ? [{ key: 'q', label: `“${v.q}”`, onRemove: () => f.update({ q: '' }) }] : []),
    ...(v.refugees ? [{ key: 'refugees', label: L.refugees[v.refugees], onRemove: () => f.update({ refugees: '' }) }] : []),
    ...v.funding.map((k) => ({ key: `funding-${k}`, label: L.funding[k] || k, onRemove: () => f.toggle('funding', k) })),
    ...v.level.map((k) => ({ key: `level-${k}`, label: k === 'postgraduate' ? 'Postgraduate' : L.level[k] || k, onRemove: () => f.toggle('level', k) })),
    ...(v.deadline ? [{ key: 'deadline', label: L.deadline[v.deadline], onRemove: () => f.update({ deadline: '' }) }] : []),
    ...(v.past === 'show' ? [{ key: 'past', label: 'Including closed', onRemove: () => f.update({ past: 'hide' }) }] : []),
    ...v.covers.map((k) => ({ key: `covers-${k}`, label: `Covers ${(L.covers[k] || k).toLowerCase()}`, onRemove: () => f.toggle('covers', k) })),
    ...v.region.map((k) => ({ key: `region-${k}`, label: L.region[k] || k, onRemove: () => f.toggle('region', k) })),
    ...v.country.map((k) => ({ key: `country-${k}`, label: k, onRemove: () => f.toggle('country', k) })),
    ...v.language.map((k) => ({ key: `language-${k}`, label: `Taught in ${k}`, onRemove: () => f.toggle('language', k) })),
  ];

  const total = data?.total ?? 0;
  const resultLabel = loading && !data ? 'Loading…' : `Show ${total} scholarship${total === 1 ? '' : 's'}`;

  return (
    <PublicShell>
      <PageHero
        title={<>Scholarships <span className="text-accent">and</span> opportunities</>}
        intro="Fully funded and partial scholarships in Africa and around the world, including many open to refugees. Search for free."
        search={{
          label: 'Search scholarships', placeholder: 'Scholarship, country or university',
          value: v.q, onChange: (q) => f.update({ q }),
          onSubmit: () => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
        }}
        photos={SCHOLAR_PHOTOS}
      />

      <div ref={resultsRef} className="scroll-mt-20 max-w-[1200px] mx-auto px-5 py-10 grid lg:grid-cols-[280px_1fr] gap-8">
        <FilterSidebar activeCount={f.activeCount} onClearAll={f.clearAll}>
          <Filters f={f} facets={data?.facets} />
        </FilterSidebar>

        <section aria-label="Results" className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-lg" aria-live="polite">
              {data ? <><strong className="font-display">{total}</strong> scholarship{total === 1 ? '' : 's'} found</> : 'Loading scholarships…'}
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <FilterButton activeCount={f.activeCount} onClick={() => setSheetOpen(true)} />
              <SortSelect value={v.sort} onChange={(sort) => f.update({ sort })} options={SORTS} />
              <ViewSwitch view={view} onChange={changeView} label="Show scholarships as" />
            </div>
          </div>
          {chips.length > 0 && <div className="mt-4"><ActiveChips chips={chips} onClearAll={f.clearAll} /></div>}

          {!user && (
            <p className="mt-5 flex items-start gap-2 rounded-xl bg-brand-soft border border-brand/15 px-4 py-3 text-[15px]">
              <Info size={18} className="text-brand mt-0.5 shrink-0" aria-hidden="true" />
              <span>Sign in to save scholarships, track your applications and see exactly which documents you still need.</span>
            </p>
          )}
          {error && <p role="alert" className="mt-4 text-danger">{error}</p>}

          <div className={`mt-6 transition-opacity ${loading && data ? 'opacity-50' : ''}`} aria-busy={loading}>
            {!data ? (
              <ul className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">{[0, 1, 2].map((i) => <ScholarshipCardSkeleton key={i} />)}</ul>
            ) : data.results.length === 0 ? (
              <EmptyState icon={SearchX} title="No scholarships match these filters"
                action={<Button variant="outline" onClick={f.clearAll}>Clear all filters</Button>}>
                Try removing a filter, or search for a different word.
              </EmptyState>
            ) : (
              <>
                <ul className={view === 'list' ? 'flex flex-col gap-5' : 'grid sm:grid-cols-2 xl:grid-cols-3 gap-5'}>
                  {data.results.map((s) => <ScholarshipCard key={s.id} s={s} view={view} onOpen={openDetail} onSave={toggleSave} onApply={(s) => navigate(`/opportunities/${s.slug || s.id}?apply=1`)} />)}
                </ul>
                <Pagination page={Math.min(page, pages)} pages={pages} onChange={goTo} label="Scholarship pages" />
              </>
            )}
          </div>
        </section>
      </div>

      <FilterSheet open={sheetOpen} onClose={() => setSheetOpen(false)} onClearAll={f.clearAll} resultLabel={resultLabel}>
        <Filters f={f} facets={data?.facets} sheet />
      </FilterSheet>
    </PublicShell>
  );
}
