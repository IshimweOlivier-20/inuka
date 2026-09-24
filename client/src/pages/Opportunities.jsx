import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Info, Search, SearchX } from 'lucide-react';
import PublicShell, { PublicHeader } from '../components/landing/PublicShell';
import ScholarshipCard from '../components/scholarships/ScholarshipCard';
import ScholarshipDetail from '../components/scholarships/ScholarshipDetail';
import { Button, EmptyState } from '../components/ui';
import { ScholarshipCardSkeleton } from '../components/ui/Skeletons';
import { useAuth } from '../context/AuthContext';
import { api, errorMessage } from '../services/api';

const EMPTY = { q: '', region: '', level: '', funding: '', refugees: '', sort: 'deadline' };

function Select({ label, options, ...props }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium mb-1">{label}</span>
      <select className="w-full min-h-11 rounded-lg border border-line bg-white px-3" {...props}>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  );
}

export default function Opportunities() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [filters, setFilters] = useState(EMPTY);
  const [list, setList] = useState(null);
  const [error, setError] = useState('');
  const [detail, setDetail] = useState(null);
  const debounce = useRef();

  useEffect(() => { document.title = 'Scholarships and opportunities — INUKA'; }, []);
  useEffect(() => {
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => {
      const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
      api.get('/public/scholarships', { params })
        .then((r) => { setList(r.data.scholarships); setError(''); })
        .catch((e) => setError(errorMessage(e)));
    }, filters.q ? 300 : 0);
    return () => clearTimeout(debounce.current);
  }, [filters]);

  const set = (k) => (e) => setFilters({ ...filters, [k]: e.target.value });
  const active = Object.entries(filters).filter(([k, v]) => v && k !== 'sort').length;

  // Saving and applying happen in the student area (with the document checklist).
  const goToStudentArea = (s) => {
    const target = `/scholarships?open=${s.id}`;
    if (user) navigate(target);
    else navigate('/login', { state: { from: target } });
  };
  const openDetail = async (s) => {
    try { setDetail((await api.get(`/public/scholarships/${s.id}`)).data); } catch (e) { setError(errorMessage(e)); }
  };

  return (
    <PublicShell>
      <PublicHeader title="Scholarships and opportunities"
        intro="Fully funded and partial scholarships in Africa and around the world, including programmes open to refugees. Search for free." />

      <div className="max-w-[1200px] mx-auto px-5 py-10">
        <div className="rounded-2xl bg-white border border-line p-4 sm:p-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_1fr]">
          <label className="block sm:col-span-2 lg:col-span-1">
            <span className="block text-sm font-medium mb-1">Search</span>
            <span className="relative block">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" aria-hidden="true" />
              <input type="search" value={filters.q} onChange={set('q')} placeholder="Name, country or university"
                className="w-full min-h-11 rounded-lg border border-line bg-white pl-10 pr-3" />
            </span>
          </label>
          <Select label="Region" value={filters.region} onChange={set('region')} options={[['', 'Any region'], ...['East Africa', 'West Africa', 'Southern Africa', 'North Africa', 'Global'].map((r) => [r, r])]} />
          <Select label="Level" value={filters.level} onChange={set('level')} options={[['', 'Any level'], ['undergraduate', 'Undergraduate'], ['postgraduate', 'Postgraduate']]} />
          <Select label="Funding" value={filters.funding} onChange={set('funding')} options={[['', 'Any funding'], ['fully_funded', 'Fully funded'], ['partial', 'Partial']]} />
          <Select label="Open to refugees" value={filters.refugees} onChange={set('refugees')} options={[['', 'All'], ['yes', 'Refugee-friendly only']]} />
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-ink-soft" aria-live="polite">{list ? `${list.length} scholarship${list.length === 1 ? '' : 's'}` : 'Loading…'}
            {active > 0 && <button onClick={() => setFilters(EMPTY)} className="ml-3 font-semibold text-forest hover:underline">Clear filters</button>}
          </p>
          <label className="flex items-center gap-2 text-sm">
            <span className="font-medium">Sort by</span>
            <select value={filters.sort} onChange={set('sort')} className="min-h-11 rounded-lg border border-line bg-white px-3">
              <option value="deadline">Deadline (soonest first)</option>
              <option value="relevant">Most relevant</option>
              <option value="newest">Newest added</option>
            </select>
          </label>
        </div>

        {!user && (
          <p className="mt-4 flex items-start gap-2 rounded-xl bg-leaf border border-forest/15 px-4 py-3 text-[15px]">
            <Info size={18} className="text-forest mt-0.5 shrink-0" aria-hidden="true" />
            <span>Sign in to save scholarships, track your applications and see exactly which documents you still need.</span>
          </p>
        )}
        {error && <p role="alert" className="mt-4 text-danger">{error}</p>}

        <div className="mt-6">
          {!list ? (
            <ul className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">{[0, 1, 2, 3, 4, 5].map((i) => <ScholarshipCardSkeleton key={i} />)}</ul>
          ) : list.length === 0 ? (
            <EmptyState icon={SearchX} title="No scholarships match these filters" action={<Button variant="outline" onClick={() => setFilters(EMPTY)}>Clear all filters</Button>}>
              Try removing a filter or searching for a different word.
            </EmptyState>
          ) : (
            <ul className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {list.map((s) => <ScholarshipCard key={s.id} s={s} onOpen={openDetail} onSave={goToStudentArea} onApply={goToStudentArea} />)}
            </ul>
          )}
        </div>
      </div>

      {detail && <ScholarshipDetail data={detail} onClose={() => setDetail(null)} onSave={goToStudentArea} onApply={goToStudentArea} onOpenRelated={openDetail} />}
    </PublicShell>
  );
}
