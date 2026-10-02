import { useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, ChevronDown, Laptop, ListChecks, SearchX } from 'lucide-react';
import PublicShell, { PageHero } from '../../components/landing/PublicShell';
import Showcase, { CourseShowcaseCard } from '../../components/landing/Showcase';
import {
  ActiveChips, CheckOption, FilterButton, FilterGroup, FilterSheet, FilterSidebar, SortSelect,
} from '../../components/filters/FilterPanel';
import { useUrlFilters } from '../../components/filters/useUrlFilters';
import IconTile from '../../components/ui/IconTile';
import CourseImage from '../../components/ui/CourseImage';
import { Button, EmptyState, ProgressBar } from '../../components/ui';
import { CourseCardSkeleton } from '../../components/ui/Skeletons';
import { useAuth } from '../../context/AuthContext';
import { api, errorMessage } from '../../services/api';
import { plainText } from '../../utils/sanitize';

const SPEC = {
  q: { type: 'value' },
  subject: { type: 'list' },
  level: { type: 'list' },
  skill: { type: 'list' },
  length: { type: 'list' },
  progress: { type: 'list' },
  sort: { type: 'value', default: 'recommended' },
};

const SUBJECTS = {
  english: { label: 'English language', short: 'English', icon: BookOpen, tone: 'brand', band: 'bg-brand-soft' },
  computer: { label: 'Computer skills', short: 'Computer skills', icon: Laptop, tone: 'cyan', band: 'bg-[#EEF3F9]' },
};
const LEVELS = { absolute: 'Absolute beginner', beginner: 'Beginner', intermediate: 'Intermediate' };
const LENGTHS = { short: 'Up to 6 lessons', medium: '7 to 8 lessons', long: '9 lessons or more' };
const PROGRESS = { not_started: 'Not started', in_progress: 'In progress', completed: 'Completed' };
const SORTS = [['recommended', 'Recommended order'], ['level', 'Beginner level first'], ['short', 'Fewest lessons first'], ['name', 'Name (A to Z)']];

const fold = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// "Beginner–Intermediate" counts as both Beginner and Intermediate.
function levelsOf(level) {
  const l = fold(level);
  if (l.includes('absolute')) return ['absolute'];
  const out = [];
  if (l.includes('beginner')) out.push('beginner');
  if (l.includes('intermediate')) out.push('intermediate');
  return out;
}
const lengthOf = (n) => (n <= 6 ? 'short' : n <= 8 ? 'medium' : 'long');
const LEVEL_RANK = { absolute: 0, beginner: 1, intermediate: 2 };

// Matching with one filter group skipped, so each option can show how many results it would give.
function matches(c, v, skip) {
  if (v.q) {
    const words = fold(v.q).split(/\s+/).filter(Boolean);
    if (!words.every((w) => c._text.includes(w))) return false;
  }
  if (skip !== 'subject' && v.subject.length && !v.subject.includes(c.category)) return false;
  if (skip !== 'level' && v.level.length && !v.level.some((l) => c._levels.includes(l))) return false;
  if (skip !== 'skill' && v.skill.length && !v.skill.some((s) => c.skills.includes(s))) return false;
  if (skip !== 'length' && v.length.length && !v.length.includes(c._length)) return false;
  if (skip !== 'progress' && v.progress.length && !v.progress.includes(c._status)) return false;
  return true;
}
const countBy = (items, pick) => {
  const out = {};
  for (const c of items) for (const k of pick(c)) out[k] = (out[k] || 0) + 1;
  return out;
};

function Filters({ f, facets, skills, signedIn }) {
  const { values: v, toggle } = f;
  const n = (g, k) => facets[g][k] || 0;
  return (
    <>
      {signedIn && (
        <FilterGroup title="My progress" selectedCount={v.progress.length}>
          {Object.keys(PROGRESS).map((k) => (
            <CheckOption key={k} label={PROGRESS[k]} count={n('progress', k)} checked={v.progress.includes(k)} onChange={() => toggle('progress', k)} />
          ))}
        </FilterGroup>
      )}
      <FilterGroup title="Subject" selectedCount={v.subject.length}>
        {Object.keys(SUBJECTS).map((k) => (
          <CheckOption key={k} label={SUBJECTS[k].label} count={n('subject', k)} checked={v.subject.includes(k)} onChange={() => toggle('subject', k)} />
        ))}
      </FilterGroup>
      <FilterGroup title="Level" selectedCount={v.level.length}>
        {Object.keys(LEVELS).map((k) => (
          <CheckOption key={k} label={LEVELS[k]} count={n('level', k)} checked={v.level.includes(k)} onChange={() => toggle('level', k)} />
        ))}
      </FilterGroup>
      <FilterGroup title="Skills you will build" selectedCount={v.skill.length}>
        {skills.map((s) => (
          <CheckOption key={s} label={s} count={n('skill', s)} checked={v.skill.includes(s)} onChange={() => toggle('skill', s)} />
        ))}
      </FilterGroup>
      <FilterGroup title="Course length" selectedCount={v.length.length}>
        {Object.keys(LENGTHS).map((k) => (
          <CheckOption key={k} label={LENGTHS[k]} count={n('length', k)} checked={v.length.includes(k)} onChange={() => toggle('length', k)} />
        ))}
      </FilterGroup>
    </>
  );
}

function CourseCard({ c, signedIn }) {
  const [open, setOpen] = useState(false);
  const subject = SUBJECTS[c.category];
  const to = !signedIn ? '/register'
    : c._status === 'not_started' ? `/courses/${c.slug}`
      : c._status === 'completed' ? `/courses/${c.slug}` : `/lessons/${c._nextLessonId}`;
  const action = !signedIn ? 'Start this course' : { not_started: 'Start this course', in_progress: 'Continue', completed: 'Review course' }[c._status];
  return (
    <li className="group bg-surface rounded-lg border border-line overflow-hidden flex flex-col hover:border-brand/30 hover:shadow-[0_14px_40px_-24px_rgba(7,44,107,0.5)] transition">
      <CourseImage c={c} className="h-44" />
      <div className={`px-5 pt-5 pb-4 ${subject.band}`}>
        <div className="flex items-center gap-3">
          <IconTile icon={subject.icon} tone={subject.tone} size="sm" />
          <span className="text-sm font-semibold text-ink-soft">{subject.short}, course {c.track}</span>
          <span className="ml-auto rounded-full bg-surface px-2.5 py-0.5 text-xs font-semibold text-ink-soft">{c.level}</span>
        </div>
        <h3 className="font-bold text-xl mt-3 leading-snug">{c.title}</h3>
        <p className="mt-1 text-sm text-ink-soft inline-flex items-center gap-1.5">
          <ListChecks size={16} aria-hidden="true" />{c.lessons.length} lessons, free, with certificate
        </p>
      </div>
      <div className="p-5 flex-1 flex flex-col">
        {c.skills?.length > 0 && (
          <ul className="flex flex-wrap gap-1.5 mb-3" aria-label="Skills you will build">
            {c.skills.map((s) => <li key={s} className="rounded-full bg-paper border border-line px-2.5 py-0.5 text-xs font-medium text-ink-soft">{s}</li>)}
          </ul>
        )}
        <p className="text-[15px] text-ink-soft flex-1">{plainText(c.description)}</p>
        {c._matchedLesson && (
          <p className="mt-3 text-sm rounded-lg bg-brand-soft border border-brand/20 px-3 py-2">
            Includes the lesson <strong>{c._matchedLesson}</strong>
          </p>
        )}
        {signedIn && c._status !== 'not_started' && (
          <div className="mt-4"><ProgressBar value={c._percent} label={c._status === 'completed' ? 'Completed' : 'Your progress'} /></div>
        )}
        <button onClick={() => setOpen(!open)} aria-expanded={open}
          className="mt-4 inline-flex items-center gap-1 self-start min-h-11 font-semibold text-brand hover:underline">
          {open ? 'Hide the lessons' : 'See the lessons'}
          <ChevronDown size={18} className={`transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
        </button>
        {open && (
          <ol className="mt-1 space-y-2 border-t border-line pt-3">
            {c.lessons.map((l, i) => (
              <li key={l.id} className="flex gap-3 text-sm">
                <span className="w-6 h-6 shrink-0 rounded-full bg-brand-soft text-brand font-semibold flex items-center justify-center text-xs">{i + 1}</span>
                <span><span className="font-medium text-ink">{l.title}</span>{l.summary && <span className="block text-ink-soft">{plainText(l.summary)}</span>}</span>
              </li>
            ))}
          </ol>
        )}
        <Button to={to} variant={c._status === 'in_progress' ? 'primary' : 'outline'} className="mt-4 w-full">{action}</Button>
      </div>
    </li>
  );
}

export default function Learn() {
  const { user } = useAuth();
  const f = useUrlFilters(SPEC);
  const { values: v } = f;
  const [courses, setCourses] = useState(null);
  const [progress, setProgress] = useState({}); // slug -> { status, percent, nextLessonId }
  const [error, setError] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);
  const resultsRef = useRef(null);

  useEffect(() => {
    document.title = 'Free courses — INUKA';
    api.get('/public/courses').then((r) => setCourses(r.data.courses)).catch((e) => setError(errorMessage(e)));
  }, []);
  // Signed-in students also see their own progress on each course.
  useEffect(() => {
    if (!user) { setProgress({}); return; }
    api.get('/courses').then((r) => setProgress(Object.fromEntries(r.data.courses.map((c) => [c.slug, c])))).catch(() => {});
  }, [user]);

  const prepared = useMemo(() => (courses || []).map((c) => {
    const p = progress[c.slug];
    const lessonText = c.lessons.map((l) => `${l.title} ${plainText(l.summary)}`).join(' ');
    return {
      ...c,
      _levels: levelsOf(c.level),
      _length: lengthOf(c.lessons.length),
      _status: p?.status || 'not_started',
      _percent: p?.percent || 0,
      _nextLessonId: p?.nextLessonId,
      _text: fold([c.title, plainText(c.description), c.level, SUBJECTS[c.category]?.label, ...(c.skills || []), lessonText].join(' ')),
      _headText: fold([c.title, plainText(c.description), ...(c.skills || [])].join(' ')),
    };
  }), [courses, progress]);

  const skills = useMemo(() => [...new Set(prepared.flatMap((c) => c.skills || []))], [prepared]);

  const { results, facets } = useMemo(() => {
    const base = (dim) => prepared.filter((c) => matches(c, v, dim));
    const words = fold(v.q).split(/\s+/).filter(Boolean);
    let list = prepared.filter((c) => matches(c, v, null)).map((c) => {
      // When the search only matched a lesson, say which one.
      if (!words.length || words.every((w) => c._headText.includes(w))) return c;
      const hit = c.lessons.find((l) => words.every((w) => fold(`${l.title} ${plainText(l.summary)}`).includes(w)));
      return hit ? { ...c, _matchedLesson: hit.title } : c;
    });
    const sorters = {
      recommended: () => 0,
      level: (a, b) => Math.min(...a._levels.map((l) => LEVEL_RANK[l])) - Math.min(...b._levels.map((l) => LEVEL_RANK[l])),
      short: (a, b) => a.lessons.length - b.lessons.length,
      name: (a, b) => a.title.localeCompare(b.title),
    };
    list = [...list].sort(sorters[v.sort] || sorters.recommended);
    return {
      results: list,
      facets: {
        subject: countBy(base('subject'), (c) => [c.category]),
        level: countBy(base('level'), (c) => c._levels),
        skill: countBy(base('skill'), (c) => c.skills || []),
        length: countBy(base('length'), (c) => [c._length]),
        progress: countBy(base('progress'), (c) => [c._status]),
      },
    };
  }, [prepared, v]);

  const chips = [
    ...(v.q ? [{ key: 'q', label: `“${v.q}”`, onRemove: () => f.update({ q: '' }) }] : []),
    ...v.progress.map((k) => ({ key: `p-${k}`, label: PROGRESS[k] || k, onRemove: () => f.toggle('progress', k) })),
    ...v.subject.map((k) => ({ key: `s-${k}`, label: SUBJECTS[k]?.label || k, onRemove: () => f.toggle('subject', k) })),
    ...v.level.map((k) => ({ key: `l-${k}`, label: LEVELS[k] || k, onRemove: () => f.toggle('level', k) })),
    ...v.skill.map((k) => ({ key: `k-${k}`, label: k, onRemove: () => f.toggle('skill', k) })),
    ...v.length.map((k) => ({ key: `n-${k}`, label: LENGTHS[k] || k, onRemove: () => f.toggle('length', k) })),
  ];
  const count = results.length;

  return (
    <PublicShell>
      <PageHero
        title="Free courses"
        intro="Build the English and computer skills you need for university and scholarship applications. Every course is free, forever."
        search={{
          label: 'Search courses', placeholder: 'Try “essay”, “email” or “interview”',
          value: v.q, onChange: (q) => f.update({ q }),
          onSubmit: () => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
        }}
        showcase={(
          <Showcase
            label="Our courses"
            items={courses}
            getKey={(c) => c.slug}
            getLabel={(c) => c.title}
            renderItem={(c) => <CourseShowcaseCard c={c} to={user ? `/courses/${c.slug}` : '/register'} />}
          />
        )}
      />

      <div ref={resultsRef} className="scroll-mt-20 max-w-[1200px] mx-auto px-5 py-10 grid lg:grid-cols-[280px_1fr] gap-8">
        <FilterSidebar activeCount={f.activeCount} onClearAll={f.clearAll}>
          <Filters f={f} facets={facets} skills={skills} signedIn={!!user} />
        </FilterSidebar>

        <section aria-label="Courses" className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-lg" aria-live="polite">
              {courses ? <><strong className="font-display">{count}</strong> course{count === 1 ? '' : 's'} found</> : 'Loading courses…'}
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <FilterButton activeCount={f.activeCount} onClick={() => setSheetOpen(true)} />
              <SortSelect value={v.sort} onChange={(sort) => f.update({ sort })} options={SORTS} />
            </div>
          </div>
          {chips.length > 0 && <div className="mt-4"><ActiveChips chips={chips} onClearAll={f.clearAll} /></div>}
          {error && <p role="alert" className="mt-4 text-danger">{error}</p>}

          <div className="mt-6">
            {!courses ? (
              <ul className="grid sm:grid-cols-2 gap-5">{[0, 1, 2, 3].map((i) => <CourseCardSkeleton key={i} />)}</ul>
            ) : count === 0 ? (
              <EmptyState icon={SearchX} title="No courses match these filters"
                action={<Button variant="outline" onClick={f.clearAll}>Clear all filters</Button>}>
                Try removing a filter, or search for a different word.
              </EmptyState>
            ) : (
              <ul className="grid sm:grid-cols-2 gap-5 items-start">
                {results.map((c) => <CourseCard key={c.id} c={c} signedIn={!!user} />)}
              </ul>
            )}
          </div>

          {!user && courses && (
            <div className="mt-10 rounded-lg bg-brand text-white p-6 md:p-8 flex flex-col md:flex-row md:items-center gap-5">
              <div className="flex-1">
                <h2 className="text-white text-2xl font-bold">Ready to start learning?</h2>
                <p className="text-white/80 mt-1">Create a free account to take the quizzes, track your progress and earn certificates.</p>
              </div>
              <Button to="/register" variant="accent" className="min-h-12 px-6">Create your free account</Button>
            </div>
          )}
        </section>
      </div>

      <FilterSheet open={sheetOpen} onClose={() => setSheetOpen(false)} onClearAll={f.clearAll}
        resultLabel={`Show ${count} course${count === 1 ? '' : 's'}`}>
        <Filters f={f} facets={facets} skills={skills} signedIn={!!user} />
      </FilterSheet>
    </PublicShell>
  );
}
