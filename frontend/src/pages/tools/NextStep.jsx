import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, BookOpen, Building2, CircleAlert, CircleCheck, Compass, ExternalLink, GraduationCap, Plus, RotateCcw, School, Sparkles, Trash2, Wrench,
} from 'lucide-react';
import { Alert, Button, PageLoader } from '../../components/ui';
import ToolShell, { DashTitle, ToolHeader } from '../../components/tools/ToolShell';
import { useAuth } from '../../context/AuthContext';
import { api, errorMessage } from '../../services/api';
import { formatDate } from '../../utils/format';

// "Type your S6 results, see your options" — degrees, diplomas/TVET, scholarships and second-chance paths.
// Public at /next-step (anyone can try, nothing saved) and in the student dashboard at /options (saved to the profile).
const AWARD = { bachelor: "Bachelor's degree", diploma: 'Advanced diploma', certificate: 'Short course' };
const KIND = { public: 'Public university', private: 'Private university', tvet: 'Polytechnic / TVET' };
const GRADE_TONE = { A: 'bg-success text-white', B: 'bg-success/80 text-white', C: 'bg-info text-white', D: 'bg-warning text-night', E: 'bg-warning/70 text-night', S: 'bg-danger/80 text-white', F: 'bg-danger text-white' };
const YEARS = Array.from({ length: 8 }, (_, i) => new Date().getFullYear() - i);
const blank = () => ({ subject: '', grade: '', percent: '' });

function Segmented({ value, onChange, options, label }) {
  return (
    <div role="radiogroup" aria-label={label} className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-brand-soft">
      {options.map(([k, l]) => (
        <button key={k} type="button" role="radio" aria-checked={value === k} onClick={() => onChange(k)}
          className={`min-h-10 px-3 rounded-md text-sm font-semibold transition-colors ${value === k ? 'bg-surface text-brand shadow-sm' : 'text-ink-soft hover:text-ink'}`}>{l}</button>
      ))}
    </div>
  );
}

function ResultsForm({ meta, initial, onResult, signedIn, saveByDefault }) {
  const [system, setSystem] = useState(initial?.system || 'rwanda');
  const [combination, setCombination] = useState(initial?.combination || '');
  const [examYear, setExamYear] = useState(initial?.examYear || '');
  const [subjects, setSubjects] = useState(() => (initial?.subjects?.length
    ? initial.subjects.map((s) => ({ subject: s.subject, grade: s.grade || '', percent: s.percent ?? '' }))
    : [blank(), blank(), blank()]));
  const [save, setSave] = useState(saveByDefault);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const pickCombination = (code) => {
    setCombination(code);
    const list = meta.combinations[code];
    if (list) setSubjects((cur) => list.map((subject, i) => ({ ...blank(), ...(cur[i]?.subject === subject ? cur[i] : {}), subject })));
  };
  const setRow = (i, patch) => setSubjects((rows) => rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  const submit = async (e) => {
    e.preventDefault(); setError(''); setBusy(true);
    try {
      const body = {
        system, combination: system === 'rwanda' ? combination || null : null, examYear: examYear ? Number(examYear) : null,
        subjects: subjects.filter((s) => s.subject).map((s) => (system === 'rwanda' ? { subject: s.subject, grade: s.grade || undefined } : { subject: s.subject, percent: s.percent === '' ? undefined : Number(s.percent) })),
        save: signedIn && save,
      };
      const { data } = await api.post('/options/check', body);
      onResult(data.result, data.options, signedIn && save);
    } catch (err) { setError(errorMessage(err)); } finally { setBusy(false); }
  };

  return (
    <form onSubmit={submit} className="bg-surface border border-line rounded-md p-5 space-y-4" aria-label="Your S6 results">
      <div>
        <p className="text-sm font-semibold mb-1.5">Where did you finish secondary school?</p>
        <Segmented label="School system" value={system} onChange={setSystem} options={[['rwanda', 'Rwanda (S6)'], ['other', 'Another country']]} />
        {system === 'other' && <p className="text-xs text-ink-soft mt-1.5">Type your final marks in %. INUKA estimates the Rwandan grade; universities make the official conversion.</p>}
      </div>

      {system === 'rwanda' && (
        <label className="block">
          <span className="block text-sm font-semibold mb-1">Combination</span>
          <select value={combination} onChange={(e) => pickCombination(e.target.value)} className="w-full min-h-10 rounded-lg border border-line bg-surface px-3 text-sm">
            <option value="">Choose your combination…</option>
            {Object.entries(meta.combinations).map(([code, subs]) => <option key={code} value={code}>{code} — {subs.join(', ')}</option>)}
            <option value="OTHER">Another combination</option>
          </select>
        </label>
      )}

      <fieldset>
        <legend className="text-sm font-semibold mb-1.5">{system === 'rwanda' ? 'Principal subjects and grades' : 'Main subjects and marks'}</legend>
        <ul className="space-y-2.5">
          {subjects.map((r, i) => (
            <li key={i} className="rounded-lg border border-line p-2.5">
              <div className="flex gap-2">
                <input list="inuka-subjects" value={r.subject} onChange={(e) => setRow(i, { subject: e.target.value })} placeholder={`Subject ${i + 1}`} aria-label={`Subject ${i + 1}`}
                  className="flex-1 min-w-0 min-h-10 rounded-lg border border-line bg-surface px-3 text-sm" />
                {system === 'other' && (
                  <div className="relative w-24">
                    <input type="number" min="0" max="100" inputMode="decimal" value={r.percent} onChange={(e) => setRow(i, { percent: e.target.value })} aria-label={`Mark for subject ${i + 1} in percent`}
                      className="w-full min-h-10 rounded-lg border border-line bg-surface pl-3 pr-7 text-sm" placeholder="0" />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-sm text-ink-soft">%</span>
                  </div>
                )}
                {subjects.length > 1 && (
                  <button type="button" onClick={() => setSubjects((rows) => rows.filter((_, j) => j !== i))} aria-label={`Remove subject ${i + 1}`}
                    className="w-10 min-h-10 rounded-lg text-ink-soft hover:text-danger hover:bg-danger-soft inline-flex items-center justify-center"><Trash2 size={16} /></button>
                )}
              </div>
              {system === 'rwanda' && (
                <div role="radiogroup" aria-label={`Grade for ${r.subject || `subject ${i + 1}`}`} className="flex flex-wrap gap-1.5 mt-2">
                  {meta.grades.map((g) => (
                    <button key={g} type="button" role="radio" aria-checked={r.grade === g} onClick={() => setRow(i, { grade: g })}
                      className={`w-9 h-8 rounded-md text-sm font-bold border transition-colors ${r.grade === g ? `${GRADE_TONE[g]} border-transparent` : 'border-line text-ink-soft hover:border-brand hover:text-brand'}`}>{g}</button>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
        <datalist id="inuka-subjects">{meta.subjects.map((s) => <option key={s} value={s} />)}</datalist>
        {subjects.length < 5 && (
          <button type="button" onClick={() => setSubjects((rows) => [...rows, blank()])} className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline">
            <Plus size={15} aria-hidden="true" />Add a subject
          </button>
        )}
      </fieldset>

      <label className="block">
        <span className="block text-sm font-semibold mb-1">Exam year <span className="font-normal text-ink-soft">(optional)</span></span>
        <select value={examYear} onChange={(e) => setExamYear(e.target.value)} className="w-full min-h-10 rounded-lg border border-line bg-surface px-3 text-sm">
          <option value="">Choose…</option>
          {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </label>

      {signedIn && (
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" checked={save} onChange={(e) => setSave(e.target.checked)} className="mt-1 w-4 h-4 accent-[#07294D]" />
          <span>Save my results to my profile <span className="block text-xs text-ink-soft">Used for your scholarship readiness score. Only you can see them.</span></span>
        </label>
      )}
      {error && <Alert>{error}</Alert>}
      <Button type="submit" loading={busy} className="w-full !min-h-11 text-sm">See my options<ArrowRight size={16} aria-hidden="true" /></Button>
      <p className="text-xs text-ink-soft text-center">Free. INUKA does not connect to NESA: you type your own results.</p>
    </form>
  );
}

function Pill({ tone, children }) {
  const cls = { green: 'bg-success-soft text-success-ink', amber: 'bg-warning-soft text-warning-ink', blue: 'bg-info-soft text-info-ink', grey: 'bg-brand-soft/60 text-ink-soft', red: 'bg-danger-soft text-danger-ink' }[tone];
  return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap ${cls}`}>{children}</span>;
}

function ProgrammeRow({ p }) {
  const u = p.university;
  return (
    <li className="py-3.5 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-[15px] leading-snug">{p.name}</p>
          <p className="text-sm text-ink-soft mt-0.5">
            <Link to={`/universities/${u.slug}`} className="text-brand font-medium hover:underline">{u.shortName || u.name}</Link>
            {' · '}{AWARD[p.award]}{p.durationYears ? ` · ${p.durationYears < 1 ? `${Math.round(p.durationYears * 12)} months` : `${p.durationYears} years`}` : ''}{u.city ? ` · ${u.city}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {p.status === 'qualify' ? <Pill tone="green"><CircleCheck size={12} aria-hidden="true" />You meet the minimum</Pill> : <Pill tone="amber"><CircleAlert size={12} aria-hidden="true" />Almost</Pill>}
          {u.isSample && <Pill tone="grey">Sample data</Pill>}
        </div>
      </div>
      {p.gaps?.length > 0 && <ul className="mt-1.5 text-sm text-warning-ink space-y-0.5">{p.gaps.map((g) => <li key={g}>• {g}</li>)}</ul>}
      {p.notes && <p className="text-xs text-ink-soft mt-1">{p.notes}</p>}
    </li>
  );
}

function ProgrammeList({ group, emptyText }) {
  const all = [...group.qualify, ...group.almost];
  if (!all.length) return <p className="text-sm text-ink-soft py-4">{emptyText}</p>;
  return <ul className="divide-y divide-line">{all.map((p) => <ProgrammeRow key={p.id} p={p} />)}</ul>;
}

function SecondChance({ sc, diplomas }) {
  const tvet = [...diplomas.qualify, ...diplomas.almost].slice(0, 4);
  return (
    <div className="grid md:grid-cols-2 gap-3">
      <div className="rounded-md border border-line p-4 bg-surface">
        <p className="flex items-center gap-2 font-semibold"><Wrench size={17} className="text-brand" aria-hidden="true" />Polytechnic and TVET diplomas</p>
        <p className="text-sm text-ink-soft mt-1">A diploma gives you a job skill in 1–3 years. Many graduates later join a bachelor's degree in year 2 or 3.</p>
        {tvet.length ? <ul className="mt-2 text-sm space-y-1">{tvet.map((p) => <li key={p.id}>• {p.name} <span className="text-ink-soft">({p.university.shortName || p.university.name})</span></li>)}</ul>
          : <p className="text-sm mt-2">See all colleges in the <Link to="/universities?kind=tvet" className="text-brand font-semibold hover:underline">directory</Link>.</p>}
      </div>
      <div className="rounded-md border border-line p-4 bg-surface">
        <p className="flex items-center gap-2 font-semibold"><RotateCcw size={17} className="text-brand" aria-hidden="true" />Re-sit plan</p>
        {sc.resit ? (
          <>
            <p className="text-sm text-ink-soft mt-1">You can register again as a private candidate. Focus on these subjects:</p>
            <ul className="mt-2 text-sm space-y-1">{sc.resit.plan.map((r) => <li key={r.subject} className="flex justify-between gap-2"><span>{r.subject} <span className="text-ink-soft">(now {r.grade})</span></span><span className="font-semibold">{r.hoursPerWeek} h / week</span></li>)}</ul>
            <p className="text-xs text-ink-soft mt-2">Check registration dates for private candidates with NESA.</p>
          </>
        ) : <p className="text-sm text-ink-soft mt-1">Your grades are not weak in any subject. A re-sit is probably not needed.</p>}
      </div>
      <div className="rounded-md border border-line p-4 bg-surface">
        <p className="flex items-center gap-2 font-semibold"><BookOpen size={17} className="text-brand" aria-hidden="true" />Build skills now (free)</p>
        <p className="text-sm text-ink-soft mt-1">English and computer certificates help every application and many jobs.</p>
        <ul className="mt-2 text-sm space-y-1">{sc.skills.slice(0, 4).map((c) => <li key={c.slug}>• <Link to={`/learn`} className="text-brand hover:underline">{c.title}</Link></li>)}</ul>
      </div>
      <div className="rounded-md border border-line p-4 bg-surface">
        <p className="flex items-center gap-2 font-semibold"><GraduationCap size={17} className="text-brand" aria-hidden="true" />Scholarships without a grade minimum</p>
        <p className="text-sm text-ink-soft mt-1">{sc.noGradeScholarships} open scholarships do not publish a minimum grade. They look at your story, motivation and letters too.</p>
        <Link to="/opportunities" className="inline-flex items-center gap-1 mt-2 text-sm font-semibold text-brand hover:underline">Browse scholarships<ArrowRight size={14} aria-hidden="true" /></Link>
      </div>
    </div>
  );
}

function Results({ options, signedIn, saved }) {
  const { summary, degrees, diplomas, scholarships, secondChance } = options;
  const tabs = useMemo(() => [
    ['degrees', 'Degrees', degrees.qualify.length + degrees.almost.length],
    ['diplomas', 'Diplomas & TVET', diplomas.qualify.length + diplomas.almost.length],
    ['scholarships', 'Scholarships', scholarships.length],
    ['second', 'Second chance', null],
  ], [degrees, diplomas, scholarships]);
  const [tab, setTab] = useState(secondChance.recommended ? 'second' : 'degrees');
  useEffect(() => setTab(secondChance.recommended ? 'second' : 'degrees'), [options]); // eslint-disable-line react-hooks/exhaustive-deps
  const pct = Math.round((summary.points / summary.maxPoints) * 100);

  return (
    <div className="space-y-4" aria-live="polite">
      <div className="bg-surface border border-line rounded-md p-5 flex flex-wrap items-center gap-5">
        <div className="relative w-20 h-20 shrink-0" role="img" aria-label={`${summary.points} of ${summary.maxPoints} points`}>
          <svg viewBox="0 0 36 36" className="w-20 h-20 -rotate-90"><circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--color-line)" strokeWidth="3.5" />
            <circle cx="18" cy="18" r="15.5" fill="none" stroke={pct >= 60 ? 'var(--color-success)' : pct >= 40 ? 'var(--color-accent)' : 'var(--color-danger)'} strokeWidth="3.5" strokeLinecap="round" strokeDasharray={`${pct * 0.974} 100`} /></svg>
          <span className="absolute inset-0 flex flex-col items-center justify-center"><span className="text-lg font-bold leading-none">{summary.points}</span><span className="text-[10px] text-ink-soft">of {summary.maxPoints}</span></span>
        </div>
        <div className="flex-1 min-w-[200px]">
          <p className="font-semibold">{summary.counts.qualify ? `You meet the minimum for ${summary.counts.qualify} programme${summary.counts.qualify === 1 ? '' : 's'}` : 'No programme in our list matches yet'}{summary.counts.almost ? `, and you are close for ${summary.counts.almost} more` : ''}.</p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {summary.subjects.map((s) => <span key={s.subject} className="inline-flex items-center gap-1.5 text-xs rounded-full border border-line pl-1 pr-2.5 py-0.5"><span className={`w-5 h-5 rounded-full text-[11px] font-bold flex items-center justify-center ${GRADE_TONE[s.grade]}`}>{s.grade}</span>{s.subject}{s.percent != null && <span className="text-ink-soft">{s.percent}%</span>}</span>)}
          </div>
          {summary.estimated && <p className="text-xs text-ink-soft mt-2">Grades estimated from your percentages.</p>}
        </div>
        {signedIn && saved && <Pill tone="green"><CircleCheck size={12} aria-hidden="true" />Saved to your profile</Pill>}
      </div>

      {secondChance.recommended && (
        <div className="rounded-md border border-accent/60 bg-accent/10 p-4 flex gap-3">
          <Compass size={20} className="text-accent-hover shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-sm"><span className="font-semibold">Low marks are not the end.</span> Below are real second-chance paths: a polytechnic diploma, a re-sit plan, free skills courses and scholarships that look beyond grades.</p>
        </div>
      )}

      <div className="bg-surface border border-line rounded-md">
        <div role="tablist" className="flex gap-1 px-3 border-b border-line overflow-x-auto">
          {tabs.map(([k, l, n]) => (
            <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
              className={`min-h-11 px-3 text-sm font-semibold whitespace-nowrap border-b-2 -mb-px ${tab === k ? 'border-brand text-brand' : 'border-transparent text-ink-soft hover:text-ink'}`}>
              {l}{n != null && <span className="ml-1.5 text-xs rounded-full bg-brand-soft px-1.5 py-0.5">{n}</span>}
            </button>
          ))}
        </div>
        <div className="p-4">
          {tab === 'degrees' && <ProgrammeList group={degrees} emptyText="No bachelor's programme in our list matches these results yet. Look at Diplomas & TVET and Second chance." />}
          {tab === 'diplomas' && <ProgrammeList group={diplomas} emptyText="No diploma in our list matches yet. The list grows as our team adds colleges." />}
          {tab === 'scholarships' && (
            scholarships.length ? (
              <ul className="divide-y divide-line">
                {scholarships.slice(0, 15).map((s) => (
                  <li key={s.id} className="py-3 first:pt-0 flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link to={`/opportunities/${s.slug || s.id}`} className="font-semibold text-[15px] text-brand hover:underline">{s.name}</Link>
                      <p className="text-sm text-ink-soft">{s.orgName} · {s.hostCountry}{s.deadline ? ` · closes ${formatDate(s.deadline)}` : ''}</p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {s.gradeBased ? (s.gradeOk ? <Pill tone="green">Grades OK ({s.minPoints}+ points)</Pill> : <Pill tone="amber">Needs {s.minPoints}+ points</Pill>) : <Pill tone="blue">No grade minimum listed</Pill>}
                      {s.match != null && <Pill tone="grey">{s.match}% profile match</Pill>}
                      {s.disabilityFriendly && <Pill tone="blue">Disability support</Pill>}
                    </div>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-ink-soft">No open scholarships right now.</p>
          )}
          {tab === 'second' && <SecondChance sc={secondChance} diplomas={diplomas} />}
        </div>
      </div>
      <p className="text-xs text-ink-soft flex gap-1.5"><CircleAlert size={14} className="shrink-0 mt-0.5" aria-hidden="true" />{options.disclaimer} Entries marked “Sample data” are examples that our team is still checking.</p>
    </div>
  );
}

function EmptyResults() {
  return (
    <div className="bg-surface border border-dashed border-line rounded-md p-8 text-center">
      <School size={32} className="mx-auto text-brand" aria-hidden="true" />
      <p className="font-semibold mt-3">Your options will appear here</p>
      <p className="text-sm text-ink-soft mt-1 max-w-sm mx-auto">Type your grades on the left. In a few seconds you will see the degrees and diplomas you can apply for, scholarships, and second-chance paths if your marks are low.</p>
    </div>
  );
}

function OptionsTool({ signedIn, initial }) {
  const [meta, setMeta] = useState(null);
  const [error, setError] = useState('');
  const [result, setResult] = useState(initial?.result || null);
  const [options, setOptions] = useState(initial?.options || null);
  const [saved, setSaved] = useState(!!initial?.result);
  useEffect(() => { api.get('/options/meta').then((r) => setMeta(r.data)).catch((e) => setError(errorMessage(e))); }, []);
  if (error) return <Alert>{error}</Alert>;
  if (!meta) return <PageLoader />;
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] lg:grid-cols-[360px_minmax(0,1fr)] gap-5 items-start">
      <ResultsForm meta={meta} initial={result} signedIn={signedIn} saveByDefault={signedIn}
        onResult={(r, o, s) => { setResult(r); setOptions(o); setSaved(s); if (window.innerWidth < 1024) setTimeout(() => document.getElementById('options-results')?.scrollIntoView({ behavior: 'smooth' }), 50); }} />
      <div id="options-results">{options ? <Results options={options} signedIn={signedIn} saved={saved} /> : <EmptyResults />}</div>
    </div>
  );
}

// Public page: /next-step
export default function NextStepPublic() {
  const { user } = useAuth();
  const student = user?.role === 'student';
  return (
    <ToolShell header={
      <ToolHeader icon={Compass} eyebrow="Free tool" title="Type your S6 results, see your options"
        intro="Find the degrees and diplomas you can apply for, the scholarships that fit, and second-chance paths if your marks are low. Works for refugees with results from another country too." />
    }>
      {!student && (
        <div className="mb-5 rounded-md border border-line bg-surface px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm flex items-center gap-2"><Sparkles size={16} className="text-accent-hover" aria-hidden="true" />Create a free account to save your results and get a readiness score for each scholarship.</p>
          <Button to="/register" className="!min-h-9 !px-4 text-sm">Create my account</Button>
        </div>
      )}
      <OptionsTool signedIn={student} />
    </ToolShell>
  );
}

// Student dashboard: /options
export function MyOptions() {
  const [initial, setInitial] = useState(undefined);
  const [error, setError] = useState('');
  const load = () => api.get('/options').then((r) => setInitial(r.data)).catch((e) => setError(errorMessage(e)));
  useEffect(() => { load(); }, []);
  const forget = async () => {
    if (!window.confirm('Delete your saved S6 results?')) return;
    try { await api.delete('/options/result'); setInitial({ result: null, options: null }); } catch (e) { setError(errorMessage(e)); }
  };
  return (
    <div className="text-[15px]">
      <DashTitle title="My next step" intro="Your S6 results, the programmes you can apply for, scholarships and second-chance paths."
        action={<div className="flex gap-2">
          <Button variant="ghost" to="/universities" className="!min-h-9 !px-3 text-sm"><Building2 size={16} aria-hidden="true" />University directory<ExternalLink size={13} aria-hidden="true" /></Button>
          {initial?.result && <Button variant="ghost" onClick={forget} className="!min-h-9 !px-3 text-sm text-danger"><Trash2 size={15} aria-hidden="true" />Delete my results</Button>}
        </div>} />
      {error && <div className="mb-4"><Alert>{error}</Alert></div>}
      {initial === undefined ? <PageLoader /> : <OptionsTool key={initial.result?.updatedAt || 'new'} signedIn initial={initial.result ? initial : null} />}
    </div>
  );
}
