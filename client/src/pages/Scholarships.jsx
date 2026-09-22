import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Alert, Button, EmptyState } from '../components/ui';
import ScholarshipCard from '../components/scholarships/ScholarshipCard';
import ScholarshipDetail from '../components/scholarships/ScholarshipDetail';
import DocumentChecklist from '../components/scholarships/DocumentChecklist';
import ApplicationsTable from '../components/scholarships/ApplicationsTable';
import { api, errorMessage } from '../services/api';
import { ScholarshipGridSkeleton } from '../components/ui/Skeletons';

const EMPTY = { q: '', region: '', level: '', funding: '', refugees: '', language: '', deadline: '', sort: 'deadline' };
const TABS = [['discover', 'Discover'], ['saved', 'Saved'], ['applications', 'My applications']];

export default function Scholarships() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'discover';
  const [filters, setFilters] = useState(EMPTY);
  const [list, setList] = useState(null);
  const [error, setError] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [detail, setDetail] = useState(null);
  const [checklist, setChecklist] = useState(null);
  const debounce = useRef();

  const load = useCallback(async () => {
    setError('');
    try {
      if (tab === 'saved') {
        setList((await api.get('/scholarships/saved')).data.scholarships);
      } else if (tab === 'discover') {
        const q = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
        setList((await api.get('/scholarships', { params: q })).data.scholarships);
      }
    } catch (e) { setError(errorMessage(e)); }
  }, [tab, filters]);

  useEffect(() => {
    clearTimeout(debounce.current);
    debounce.current = setTimeout(load, filters.q ? 300 : 0);
    return () => clearTimeout(debounce.current);
  }, [load, filters.q]);

  const fetchDetail = async (s) => (await api.get(`/scholarships/${s.id}`)).data;
  const openDetail = async (s) => { try { setDetail(await fetchDetail(s)); } catch (e) { setError(errorMessage(e)); } };

  // Deep link from the dashboard: /scholarships?open=<id>
  useEffect(() => {
    const id = params.get('open');
    if (id) { openDetail({ id }); params.delete('open'); setParams(params, { replace: true }); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const patchSaved = (id, saved) => {
    setList((l) => l && (tab === 'saved' && !saved ? l.filter((s) => s.id !== id) : l.map((s) => (s.id === id ? { ...s, saved } : s))));
    setDetail((d) => d && d.scholarship.id === id ? { ...d, scholarship: { ...d.scholarship, saved } } : d);
    setChecklist((c) => c && c.scholarship.id === id ? { ...c, scholarship: { ...c.scholarship, saved } } : c);
  };
  const toggleSave = async (s) => {
    try {
      if (s.saved) await api.delete(`/scholarships/save/${s.id}`); else await api.post('/scholarships/save', { scholarshipId: s.id });
      patchSaved(s.id, !s.saved);
    } catch (e) { setError(errorMessage(e)); }
  };

  const apply = async (s) => {
    try {
      const d = await fetchDetail(s);
      setDetail(null);
      setChecklist(d);
    } catch (e) { setError(errorMessage(e)); }
  };
  const continueToApply = async () => {
    const s = checklist.scholarship;
    window.open(s.applyUrl, '_blank', 'noopener,noreferrer');
    setChecklist(null);
    try { await api.post('/applications', { scholarshipId: s.id }); } catch { /* tracking only */ }
  };
  const saveFromChecklist = async () => { if (!checklist.scholarship.saved) await toggleSave(checklist.scholarship); setChecklist(null); };

  const set = (k) => (e) => setFilters({ ...filters, [k]: e.target.value });
  const activeCount = Object.entries(filters).filter(([k, v]) => v && k !== 'sort' && k !== 'q').length;

  return (
    <div>
      <h1 className="text-3xl font-bold">Scholarships</h1>
      <p className="text-ink-soft mt-1">African and refugee-friendly scholarships first. Always check details on the official website.</p>

      <div role="tablist" className="flex gap-1 mt-6 border-b border-line overflow-x-auto">
        {TABS.map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => { setList(null); setParams({ tab: k }); }}
            className={`min-h-11 px-4 font-medium whitespace-nowrap border-b-2 -mb-px ${tab === k ? 'border-forest text-forest' : 'border-transparent text-ink-soft hover:text-ink'}`}>{l}</button>
        ))}
      </div>

      {error && <div className="mt-4"><Alert>{error}</Alert></div>}

      {tab === 'applications' ? <div className="mt-6"><ApplicationsTable /></div> : (
        <div className={`mt-6 ${tab === 'discover' ? 'grid lg:grid-cols-[250px_1fr] gap-6' : ''}`}>
          {tab === 'discover' && (
            <aside>
              <label className="block">
                <span className="sr-only">Search scholarships</span>
                <input type="search" value={filters.q} onChange={set('q')} placeholder="Search by name, country, university…"
                  className="w-full min-h-11 rounded-lg border border-line bg-white px-3" />
              </label>
              <Button variant="outline" className="w-full mt-3 lg:hidden" onClick={() => setShowFilters(!showFilters)} aria-expanded={showFilters}>
                Filters{activeCount ? ` (${activeCount})` : ''}
              </Button>
              <div className={`${showFilters ? 'block' : 'hidden'} lg:block mt-4 space-y-4`}>
                <Select label="Region" value={filters.region} onChange={set('region')} options={[['', 'Any region'], ...['East Africa', 'West Africa', 'Southern Africa', 'North Africa', 'Global'].map((r) => [r, r])]} />
                <Select label="Level" value={filters.level} onChange={set('level')} options={[['', 'Any level'], ['undergraduate', 'Undergraduate'], ['postgraduate', 'Postgraduate']]} />
                <Select label="Funding" value={filters.funding} onChange={set('funding')} options={[['', 'Any funding'], ['fully_funded', 'Fully funded'], ['partial', 'Partial'], ['tuition_only', 'Tuition only']]} />
                <Select label="Open to refugees" value={filters.refugees} onChange={set('refugees')} options={[['', 'All scholarships'], ['yes', 'Only refugee-friendly']]} />
                <Select label="Language of study" value={filters.language} onChange={set('language')} options={[['', 'Any language'], ['English', 'English'], ['French', 'French']]} />
                <Select label="Deadline" value={filters.deadline} onChange={set('deadline')} options={[['', 'Any time'], ['month', 'This month'], ['3months', 'Next 3 months']]} />
                <Select label="Sort by" value={filters.sort} onChange={set('sort')} options={[['deadline', 'Deadline (soonest first)'], ['relevant', 'Most relevant'], ['newest', 'Newest added']]} />
                {activeCount > 0 && <button onClick={() => setFilters({ ...EMPTY, q: filters.q })} className="text-sm text-forest font-semibold hover:underline">Clear filters</button>}
              </div>
            </aside>
          )}

          <div>
            {!list ? <ScholarshipGridSkeleton /> : list.length === 0 ? (
              tab === 'saved'
                ? <EmptyState icon="🔖" title="No saved scholarships yet" action={<Button onClick={() => setParams({ tab: 'discover' })}>Discover scholarships</Button>}>Tap “Save” on any scholarship to keep it here, sorted by deadline.</EmptyState>
                : <EmptyState icon="🔍" title="No scholarships match these filters" action={<Button variant="outline" onClick={() => setFilters(EMPTY)}>Clear all filters</Button>}>Try removing a filter or searching for a different word.</EmptyState>
            ) : (
              <>
                <p className="text-sm text-ink-soft mb-3" aria-live="polite">{list.length} scholarship{list.length === 1 ? '' : 's'}</p>
                <ul className="grid md:grid-cols-2 gap-4">
                  {list.map((s) => <ScholarshipCard key={s.id} s={s} onOpen={openDetail} onSave={toggleSave} onApply={apply} />)}
                </ul>
              </>
            )}
          </div>
        </div>
      )}

      {detail && <ScholarshipDetail data={detail} onClose={() => setDetail(null)} onSave={toggleSave} onApply={apply} onOpenRelated={openDetail} />}
      <DocumentChecklist open={!!checklist} scholarship={checklist?.scholarship} checklist={checklist?.checklist}
        onClose={() => setChecklist(null)} onContinue={continueToApply} onSave={saveFromChecklist} />
    </div>
  );
}

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
