import { useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, Laptop, SearchX } from 'lucide-react';
import PublicShell, { PageHero } from '../../components/landing/PublicShell';
import { CourseDetails, CourseGridCard, CourseListCard, Pagination, ViewSwitch } from '../../components/courses/CourseCards';
import { COURSE_PHOTOS } from '../../config/photos';
import {
  ActiveChips, CheckOption, FilterButton, FilterGroup, FilterSheet, FilterSidebar, SortSelect,
} from '../../components/filters/FilterPanel';
import { useUrlFilters } from '../../components/filters/useUrlFilters';
import { Button, EmptyState, Modal } from '../../components/ui';
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

const PER_PAGE = 6;
const HERO_PHOTOS = Object.values(COURSE_PHOTOS);
const savedView = () => { try { return localStorage.getItem('inuka-course-view') === 'list' ? 'list' : 'grid'; } catch { return 'grid'; } };

export default function Learn() {
  const { user } = useAuth();
  const f = useUrlFilters(SPEC);
  const { values: v } = f;
  const [courses, setCourses] = useState(null);
  const [progress, setProgress] = useState({}); // slug -> { status, percent, nextLessonId }
  const [error, setError] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [view, setView] = useState(savedView);
  const [page, setPage] = useState(1);
  const [details, setDetails] = useState(null);
  const resultsRef = useRef(null);
  const changeView = (next) => { setView(next); try { localStorage.setItem('inuka-course-view', next); } catch { /* private mode */ } };

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
  const pages = Math.max(1, Math.ceil(count / PER_PAGE));
  // Back to page 1 whenever the filters, search or sort change.
  const filterKey = JSON.stringify(v);
  useEffect(() => { setPage(1); }, [filterKey]);
  const current = Math.min(page, pages);
  const shown = results.slice((current - 1) * PER_PAGE, current * PER_PAGE);
  const goTo = (n) => { setPage(n); resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); };

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
        photos={HERO_PHOTOS}
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
              <ViewSwitch view={view} onChange={changeView} label="Show courses as" />
            </div>
          </div>
          {chips.length > 0 && <div className="mt-4"><ActiveChips chips={chips} onClearAll={f.clearAll} /></div>}
          {error && <p role="alert" className="mt-4 text-danger">{error}</p>}

          <div className="mt-6">
            {!courses ? (
              <ul className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">{[0, 1, 2].map((i) => <CourseCardSkeleton key={i} />)}</ul>
            ) : count === 0 ? (
              <EmptyState icon={SearchX} title="No courses match these filters"
                action={<Button variant="outline" onClick={f.clearAll}>Clear all filters</Button>}>
                Try removing a filter, or search for a different word.
              </EmptyState>
            ) : (
              <>
                {view === 'list' ? (
                  <ul className="flex flex-col gap-5">
                    {shown.map((c) => <CourseListCard key={c.id} c={c} signedIn={!!user} onDetails={setDetails} />)}
                  </ul>
                ) : (
                  <ul className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
                    {shown.map((c) => <CourseGridCard key={c.id} c={c} signedIn={!!user} onDetails={setDetails} />)}
                  </ul>
                )}
                <Pagination page={current} pages={pages} onChange={goTo} label="Course pages" />
              </>
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

      <Modal open={!!details} onClose={() => setDetails(null)} title={details?.title || ''}
        footer={<><Button variant="ghost" onClick={() => setDetails(null)}>Close</Button><Button to="/register">Start this course for free</Button></>}>
        {details && <CourseDetails c={details} />}
      </Modal>

      <FilterSheet open={sheetOpen} onClose={() => setSheetOpen(false)} onClearAll={f.clearAll}
        resultLabel={`Show ${count} course${count === 1 ? '' : 's'}`}>
        <Filters f={f} facets={facets} skills={skills} signedIn={!!user} />
      </FilterSheet>
    </PublicShell>
  );
}
