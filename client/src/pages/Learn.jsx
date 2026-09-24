import { useEffect, useState } from 'react';
import { BookOpen, ChevronDown, Headphones, Laptop, ListChecks, Smartphone } from 'lucide-react';
import PublicShell, { PublicHeader } from '../components/landing/PublicShell';
import IconTile from '../components/ui/IconTile';
import Reveal from '../components/ui/Reveal';
import { Button } from '../components/ui';
import { CourseCardSkeleton, Skeleton } from '../components/ui/Skeletons';
import { useAuth } from '../context/AuthContext';
import { api, errorMessage } from '../services/api';

const TRACKS = [
  { key: 'english', title: 'English Language', icon: BookOpen, tone: 'forest', text: 'From the alphabet to a strong scholarship essay and interview.' },
  { key: 'computer', title: 'Basic Computer Skills', icon: Laptop, tone: 'sky', text: 'From your first click to a complete online university application.' },
];

const PERKS = [
  [ListChecks, 'Short lessons with a quiz at the end'],
  [Headphones, 'Listen to every lesson'],
  [Smartphone, 'Works on any phone'],
];

function CourseCard({ c, startTo }) {
  const [open, setOpen] = useState(false);
  return (
    <li className="bg-white rounded-2xl border border-line overflow-hidden flex flex-col">
      <div className={`px-5 pt-5 pb-4 ${c.category === 'english' ? 'bg-leaf' : 'bg-[#EAF2FB]'}`}>
        <div className="flex items-center justify-between gap-3">
          <span className="font-display font-bold text-3xl text-forest/80" aria-label={`Course ${c.track}`}>{c.track}</span>
          <span className="rounded-full bg-white/80 px-2.5 py-0.5 text-xs font-semibold text-ink-soft">{c.level}</span>
        </div>
        <h3 className="font-semibold text-lg mt-2 leading-snug">{c.title}</h3>
        <p className="text-sm text-ink-soft mt-1">{c.lessons.length} lessons, free</p>
      </div>
      <div className="p-5 flex-1 flex flex-col">
        <p className="text-[15px] text-ink-soft flex-1">{c.description}</p>
        <button onClick={() => setOpen(!open)} aria-expanded={open}
          className="mt-4 inline-flex items-center gap-1 self-start min-h-11 font-semibold text-forest hover:underline">
          {open ? 'Hide the lessons' : 'See the lessons'}
          <ChevronDown size={18} className={`transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
        </button>
        {open && (
          <ol className="mt-2 space-y-2 border-t border-line pt-3">
            {c.lessons.map((l, i) => (
              <li key={l.id} className="flex gap-3 text-sm">
                <span className="w-6 h-6 shrink-0 rounded-full bg-leaf text-forest font-semibold flex items-center justify-center text-xs">{i + 1}</span>
                <span><span className="font-medium text-ink">{l.title}</span>{l.summary && <span className="block text-ink-soft">{l.summary}</span>}</span>
              </li>
            ))}
          </ol>
        )}
        <Button to={startTo(c)} variant="outline" className="mt-4 w-full">Start this course</Button>
      </div>
    </li>
  );
}

export default function Learn() {
  const { user } = useAuth();
  const [courses, setCourses] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    document.title = 'Free courses — INUKA';
    api.get('/public/courses').then((r) => setCourses(r.data.courses)).catch((e) => setError(errorMessage(e)));
  }, []);
  const startTo = (c) => (user ? `/courses/${c.slug}` : '/register');
  const lessonTotal = courses?.reduce((n, c) => n + c.lessons.length, 0);

  return (
    <PublicShell>
      <PublicHeader title="Free courses"
        intro="Build the English and computer skills you need for university and scholarship applications. Every course is free, forever.">
        <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-3">
          {PERKS.map(([Icon, label]) => (
            <li key={label} className="inline-flex items-center gap-2 font-medium"><Icon size={18} className="text-forest" aria-hidden="true" />{label}</li>
          ))}
          <li className="inline-flex items-center gap-2 font-medium">
            <BookOpen size={18} className="text-forest" aria-hidden="true" />
            {courses ? `${courses.length} courses, ${lessonTotal} lessons` : <Skeleton width={140} />}
          </li>
        </ul>
      </PublicHeader>

      <div className="max-w-[1200px] mx-auto px-5 py-12 space-y-14">
        {error && <p role="alert" className="text-danger">{error}</p>}
        {TRACKS.map((t) => (
          <section key={t.key} aria-labelledby={`track-${t.key}`}>
            <Reveal className="flex items-center gap-4 mb-6">
              <IconTile icon={t.icon} tone={t.tone} size="lg" />
              <div>
                <h2 id={`track-${t.key}`} className="text-2xl font-bold">{t.title}</h2>
                <p className="text-ink-soft">{t.text}</p>
              </div>
            </Reveal>
            <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 items-start">
              {courses
                ? courses.filter((c) => c.category === t.key).map((c) => <CourseCard key={c.id} c={c} startTo={startTo} />)
                : [0, 1, 2].map((i) => <CourseCardSkeleton key={i} />)}
            </ul>
          </section>
        ))}

        {!user && (
          <Reveal className="rounded-2xl bg-forest text-white p-6 md:p-8 flex flex-col md:flex-row md:items-center gap-5">
            <div className="flex-1">
              <h2 className="text-white text-2xl font-bold">Ready to start learning?</h2>
              <p className="text-white/80 mt-1">Create a free account to take the quizzes, track your progress and earn certificates.</p>
            </div>
            <Button to="/register" variant="gold" className="min-h-12 px-6">Create your free account</Button>
          </Reveal>
        )}
      </div>
    </PublicShell>
  );
}
