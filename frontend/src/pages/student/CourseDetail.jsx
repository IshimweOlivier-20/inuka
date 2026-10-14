import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Alert, Button, ProgressBar } from '../../components/ui';
import { api, errorMessage } from '../../services/api';
import { CourseDetailSkeleton } from '../../components/ui/Skeletons';
import { Check, ClipboardCheck, Clock, Lock, PartyPopper } from 'lucide-react';
import RichText from '../../components/ui/RichText';
import { plainText } from '../../utils/sanitize';

export default function CourseDetail() {
  const { slug } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { api.get(`/courses/${slug}`).then((r) => setData(r.data)).catch((e) => setError(errorMessage(e))); }, [slug]);
  if (error) return <Alert>{error}</Alert>;
  if (!data) return <CourseDetailSkeleton />;
  const { course, certificate, exam } = data;
  const done = course.lessons.filter((l) => l.completed).length;
  const next = course.lessons.find((l) => !l.completed && !l.locked);

  return (
    <div className="max-w-3xl">
      <Link to="/courses" className="text-sm text-brand hover:underline">← All courses</Link>
      <h1 className="text-xl sm:text-2xl font-bold mt-2">{course.title}</h1>
      <RichText html={course.description} className="text-ink-soft mt-2" />
      <div className="mt-5"><ProgressBar value={Math.round((done / course.lessons.length) * 100)} label={`${done} of ${course.lessons.length} lessons completed`} /></div>
      {certificate && <div className="mt-5"><Alert tone="success"><PartyPopper size={18} className="inline -mt-1 mr-1" aria-hidden="true" />You finished this course. Your certificate is in <Link to="/my-learning" className="underline font-semibold">My Learning</Link>.</Alert></div>}
      {next && <Button to={`/lessons/${next.id}`} className="mt-5">{done ? 'Continue' : 'Start the first lesson'}</Button>}
      {!next && exam && !certificate && (exam.canStart || exam.inProgress) && <Button to={`/courses/${course.slug}/exam`} className="mt-5">{exam.inProgress ? 'Continue the final exam' : 'Take the final exam'}</Button>}

      <ol className="mt-8 bg-surface rounded-xl border border-line divide-y divide-line">
        {course.lessons.map((l, i) => (
          <li key={l.id}>
            {l.locked ? (
              <div className="flex items-center gap-4 p-4 opacity-60">
                <Marker state="locked" n={i + 1} />
                <div className="flex-1"><p className="font-medium">{l.title}</p><p className="text-sm text-ink-soft">{plainText(l.summary)}</p></div>
              </div>
            ) : (
              <Link to={`/lessons/${l.id}`} className="flex items-center gap-4 p-4 hover:bg-paper">
                <Marker state={l.completed ? 'done' : 'open'} n={i + 1} />
                <div className="flex-1"><p className="font-medium">{l.title}</p><p className="text-sm text-ink-soft">{plainText(l.summary)}</p></div>
                {l.estimatedMinutes && <span className="hidden sm:inline-flex items-center gap-1 text-sm text-ink-soft whitespace-nowrap"><Clock size={14} aria-hidden="true" />{l.estimatedMinutes} min</span>}
                {l.bestScore !== null && <span className="text-sm text-ink-soft whitespace-nowrap">Quiz {l.bestScore}%</span>}
              </Link>
            )}
          </li>
        ))}
      </ol>
      {exam && <ExamCard exam={exam} slug={course.slug} />}
    </div>
  );
}

// The final exam: locked until every lesson is done, then start / continue / result.
function ExamCard({ exam, slug }) {
  const e = exam.exam;
  const facts = [
    `${e.questionCount} questions`,
    e.timeLimitMinutes ? `${e.timeLimitMinutes} minutes` : 'no time limit',
    `pass mark ${e.passMark}%`,
    e.maxAttempts ? `${e.maxAttempts} ${e.maxAttempts === 1 ? 'try' : 'tries'}` : 'unlimited tries',
  ].join(' · ');
  let status;
  if (exam.passed) status = <p className="text-success-ink font-semibold">You passed with {exam.bestScore}%.</p>;
  else if (exam.reason === 'lessons') status = <p className="text-ink-soft">Finish every lesson to open the exam ({exam.lessons.done} of {exam.lessons.total} done).</p>;
  else if (exam.reason === 'no_attempts') status = <p className="text-danger-ink">You have used all your tries (best score {exam.bestScore}%). Please contact INUKA if you need another try.</p>;
  else if (exam.reason === 'wait') status = <p className="text-warning-ink">Best score so far: {exam.bestScore}%. You can try again on {new Date(exam.nextTryAt).toLocaleString(undefined, { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}. Use the time to review the lessons.</p>;
  else if (exam.bestScore != null) status = <p className="text-ink-soft">Best score so far: {exam.bestScore}%.{exam.attemptsLeft != null && ` ${exam.attemptsLeft} ${exam.attemptsLeft === 1 ? 'try' : 'tries'} left.`}</p>;
  return (
    <section className={`mt-6 rounded-xl border-2 p-5 ${exam.reason === 'lessons' ? 'border-line bg-surface' : exam.passed ? 'border-success/40 bg-success-soft/40' : 'border-brand/30 bg-surface'}`} aria-labelledby="exam-title">
      <div className="flex items-start gap-4">
        <span className={`w-11 h-11 shrink-0 rounded-full flex items-center justify-center ${exam.reason === 'lessons' ? 'bg-line text-ink-soft' : exam.passed ? 'bg-success text-white' : 'bg-brand text-white'}`}>
          {exam.reason === 'lessons' ? <Lock size={18} aria-hidden="true" /> : exam.passed ? <Check size={20} strokeWidth={3} aria-hidden="true" /> : <ClipboardCheck size={20} aria-hidden="true" />}
        </span>
        <div className="flex-1 min-w-0">
          <h2 id="exam-title" className="font-semibold text-lg">{e.title}</h2>
          <p className="text-sm text-ink-soft">{facts}{e.requiredForCertificate ? '. Pass it to get your certificate.' : '.'}</p>
          <div className="mt-2 text-sm">{status}</div>
          {(exam.canStart || exam.inProgress) && <Button to={`/courses/${slug}/exam`} className="mt-3">{exam.inProgress ? 'Continue the exam' : exam.bestScore != null ? 'Try again' : 'Start the exam'}</Button>}
          {exam.passed && <Button variant="outline" to={`/courses/${slug}/exam`} className="mt-3">See my result</Button>}
        </div>
      </div>
    </section>
  );
}

function Marker({ state, n }) {
  if (state === 'done') return <span className="w-9 h-9 shrink-0 rounded-full bg-success text-white flex items-center justify-center font-bold" aria-label="Completed"><Check size={18} strokeWidth={3} /></span>;
  if (state === 'locked') return <span className="w-9 h-9 shrink-0 rounded-full bg-line flex items-center justify-center" aria-label="Locked"><Lock size={16} className="text-ink-soft" /></span>;
  return <span className="w-9 h-9 shrink-0 rounded-full border-2 border-brand text-brand flex items-center justify-center font-semibold">{n}</span>;
}
