import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Button, Pill, ProgressBar } from '../../components/ui';
import { api, errorMessage } from '../../services/api';
import { CoursesSkeleton } from '../../components/ui/Skeletons';
import { BookOpen, Check, Laptop } from 'lucide-react';
import IconTile from '../../components/ui/IconTile';

const TRACKS = [
  { key: 'english', title: 'English Language', icon: BookOpen, tone: 'brand', text: 'From the alphabet to a strong scholarship essay.' },
  { key: 'computer', title: 'Basic Computer Skills', icon: Laptop, tone: 'cyan', text: 'From your first click to a full online application.' },
];

export default function Courses() {
  const [courses, setCourses] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { api.get('/courses').then((r) => setCourses(r.data.courses)).catch((e) => setError(errorMessage(e))); }, []);
  if (error) return <Alert>{error}</Alert>;
  if (!courses) return <CoursesSkeleton />;

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-3xl font-bold">Courses</h1>
        <p className="text-ink-soft mt-1">All courses are free. Finish each lesson's quiz with 60% or more to unlock the next one.</p>
      </header>
      {TRACKS.map((t) => (
        <section key={t.key}>
          <div className="flex items-center gap-3 mb-4">
            <IconTile icon={t.icon} tone={t.tone} size="md" />
            <div><h2 className="text-xl font-semibold">{t.title}</h2><p className="text-ink-soft text-sm">{t.text}</p></div>
          </div>
          <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {courses.filter((c) => c.category === t.key).map((c) => <CourseCard key={c.id} c={c} />)}
          </ul>
        </section>
      ))}
    </div>
  );
}

function CourseCard({ c }) {
  const action = c.status === 'completed' ? 'Review' : c.status === 'in_progress' ? 'Resume' : 'Start';
  return (
    <li className="bg-surface rounded-xl border border-line overflow-hidden flex flex-col">
      <div className={`px-5 pt-5 pb-4 ${c.category === 'english' ? 'bg-brand-soft' : 'bg-[#E0F7FD]'}`}>
        <div className="flex items-center justify-between">
          <span className="font-display font-bold text-3xl text-brand/80" aria-label={`Sub-course ${c.track}`}>{c.track}</span>
          {c.status === 'completed' ? <Pill tone="sky"><Check size={14} strokeWidth={3} aria-hidden="true" />Completed</Pill> : <Pill tone="grey">{c.level}</Pill>}
        </div>
        <h3 className="font-semibold text-lg mt-2 leading-snug"><Link to={`/courses/${c.slug}`} className="hover:underline">{c.title}</Link></h3>
      </div>
      <div className="p-5 flex-1 flex flex-col">
        <p className="text-sm text-ink-soft flex-1">{c.description}</p>
        <div className="mt-4"><ProgressBar value={c.percent} label={`${c.completedCount} of ${c.lessonCount} lessons`} /></div>
        <Button to={c.status === 'completed' ? `/courses/${c.slug}` : `/lessons/${c.nextLessonId}`} variant={c.status === 'in_progress' ? 'primary' : 'outline'} className="mt-4 w-full">{action}</Button>
      </div>
    </li>
  );
}
