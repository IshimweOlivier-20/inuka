import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Button, Pill, ProgressBar } from '../../components/ui';
import { api, errorMessage } from '../../services/api';
import { CoursesSkeleton } from '../../components/ui/Skeletons';
import { BookOpen, Check, Laptop } from 'lucide-react';
import IconTile from '../../components/ui/IconTile';
import CourseImage from '../../components/ui/CourseImage';
import { plainText } from '../../utils/sanitize';

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
        <h1 className="text-xl sm:text-2xl font-bold">Courses</h1>
        <p className="text-ink-soft mt-1">All courses are free. Finish each lesson's quiz with 60% or more to unlock the next one.</p>
      </header>
      {TRACKS.map((t) => (
        <section key={t.key}>
          <div className="flex items-center gap-3 mb-4">
            <IconTile icon={t.icon} tone={t.tone} size="md" />
            <div><h2 className="text-xl font-semibold">{t.title}</h2><p className="text-ink-soft text-sm">{t.text}</p></div>
          </div>
          <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-10">
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
    <li className="group flex flex-col">
      <Link to={`/courses/${c.slug}`} className="block rounded-2xl overflow-hidden" tabIndex={-1} aria-hidden="true">
        <CourseImage c={c} className="h-40 rounded-2xl" />
      </Link>
      <div className="pt-4 flex-1 flex flex-col">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-semibold text-brand">Course {c.track}</span>
          {c.status === 'completed' ? <Pill tone="success"><Check size={14} strokeWidth={3} aria-hidden="true" />Completed</Pill> : <span className="text-sm text-ink-soft">{c.level}</span>}
        </div>
        <h3 className="font-semibold text-lg mt-1 leading-snug"><Link to={`/courses/${c.slug}`} className="hover:underline">{c.title}</Link></h3>
        <p className="text-sm text-ink-soft mt-1.5 flex-1 line-clamp-3">{plainText(c.description)}</p>
        <div className="mt-4"><ProgressBar value={c.percent} label={`${c.completedCount} of ${c.lessonCount} lessons`} /></div>
        <Button to={c.status === 'completed' ? `/courses/${c.slug}` : `/lessons/${c.nextLessonId}`} variant={c.status === 'in_progress' ? 'primary' : 'outline'} className="mt-4 w-full">{action}</Button>
      </div>
    </li>
  );
}
