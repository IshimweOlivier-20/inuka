import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Alert, Button, ProgressBar } from '../components/ui';
import { api, errorMessage } from '../services/api';
import { CourseDetailSkeleton } from '../components/ui/Skeletons';
import { Check, Lock, PartyPopper } from 'lucide-react';

export default function CourseDetail() {
  const { slug } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { api.get(`/courses/${slug}`).then((r) => setData(r.data)).catch((e) => setError(errorMessage(e))); }, [slug]);
  if (error) return <Alert>{error}</Alert>;
  if (!data) return <CourseDetailSkeleton />;
  const { course, certificate } = data;
  const done = course.lessons.filter((l) => l.completed).length;
  const next = course.lessons.find((l) => !l.completed && !l.locked);

  return (
    <div className="max-w-3xl">
      <Link to="/courses" className="text-sm text-forest hover:underline">← All courses</Link>
      <h1 className="text-3xl font-bold mt-2">{course.title}</h1>
      <p className="text-ink-soft mt-2">{course.description}</p>
      <div className="mt-5"><ProgressBar value={Math.round((done / course.lessons.length) * 100)} label={`${done} of ${course.lessons.length} lessons completed`} /></div>
      {certificate && <div className="mt-5"><Alert tone="success"><PartyPopper size={18} className="inline -mt-1 mr-1" aria-hidden="true" />You finished this course. Your certificate is in <Link to="/my-learning" className="underline font-semibold">My Learning</Link>.</Alert></div>}
      {next && <Button to={`/lessons/${next.id}`} className="mt-5">{done ? 'Continue' : 'Start the first lesson'}</Button>}

      <ol className="mt-8 bg-white rounded-xl border border-line divide-y divide-line">
        {course.lessons.map((l, i) => (
          <li key={l.id}>
            {l.locked ? (
              <div className="flex items-center gap-4 p-4 opacity-60">
                <Marker state="locked" n={i + 1} />
                <div className="flex-1"><p className="font-medium">{l.title}</p><p className="text-sm text-ink-soft">{l.summary}</p></div>
              </div>
            ) : (
              <Link to={`/lessons/${l.id}`} className="flex items-center gap-4 p-4 hover:bg-paper">
                <Marker state={l.completed ? 'done' : 'open'} n={i + 1} />
                <div className="flex-1"><p className="font-medium">{l.title}</p><p className="text-sm text-ink-soft">{l.summary}</p></div>
                {l.bestScore !== null && <span className="text-sm text-ink-soft whitespace-nowrap">Quiz {l.bestScore}%</span>}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

function Marker({ state, n }) {
  if (state === 'done') return <span className="w-9 h-9 shrink-0 rounded-full bg-success text-white flex items-center justify-center font-bold" aria-label="Completed"><Check size={18} strokeWidth={3} /></span>;
  if (state === 'locked') return <span className="w-9 h-9 shrink-0 rounded-full bg-line flex items-center justify-center" aria-label="Locked"><Lock size={16} className="text-ink-soft" /></span>;
  return <span className="w-9 h-9 shrink-0 rounded-full border-2 border-forest text-forest flex items-center justify-center font-semibold">{n}</span>;
}
