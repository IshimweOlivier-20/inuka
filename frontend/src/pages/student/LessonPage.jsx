import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { sanitizeRich } from '../../utils/sanitize';
import { Alert, Button, Modal, ProgressBar } from '../../components/ui';
import QuizWidget from '../../components/courses/QuizWidget';
import ListenButton from '../../components/courses/ListenButton';
import WritingFeedback from '../../components/courses/WritingFeedback';
import VoicePractice from '../../components/courses/VoicePractice';
import { api, errorMessage } from '../../services/api';
import { LessonSkeleton } from '../../components/ui/Skeletons';
import { BadgeMedal } from '../../utils/badgeIcons';
import RichText from '../../components/ui/RichText';
import { ClipboardCheck, Clock, Download, FileText, Headphones } from 'lucide-react';

export default function LessonPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [passed, setPassed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [celebrate, setCelebrate] = useState(null);
  const started = useRef(Date.now());
  const contentRef = useRef(null);

  useEffect(() => {
    setData(null); setError(null); setPassed(false);
    started.current = Date.now();
    api.get(`/lessons/${id}`).then((r) => {
      setData(r.data);
      setPassed((r.data.progress.bestScore ?? 0) >= r.data.passMark);
      window.scrollTo(0, 0);
    }).catch((e) => setError({ message: errorMessage(e), prev: e.response?.data?.details?.previousLessonId }));
  }, [id]);

  const html = useMemo(() => (data ? sanitizeRich(data.lesson.contentHtml) : ''), [data]);

  if (error) return (
    <div className="max-w-xl">
      <Alert>{error.message}</Alert>
      {error.prev && <Button to={`/lessons/${error.prev}`} className="mt-4">Go to the previous lesson</Button>}
    </div>
  );
  if (!data) return <LessonSkeleton />;

  const { lesson, course, position, nextLessonId, prevLessonId, progress, passMark, aiActivity } = data;
  const hasQuiz = lesson.quizzes.length > 0;
  const canComplete = !hasQuiz || passed;

  const complete = async () => {
    setBusy(true);
    try {
      const { data: r } = await api.post('/progress/complete', {
        lessonId: lesson.id, timeSpentSeconds: Math.min(6 * 3600, Math.round((Date.now() - started.current) / 1000)),
      });
      if (r.newBadges?.length || r.certificate || r.examUnlocked) setCelebrate(r);
      else goNext();
    } catch (e) { setError({ message: errorMessage(e) }); } finally { setBusy(false); }
  };
  const goNext = () => navigate(nextLessonId ? `/lessons/${nextLessonId}` : `/courses/${course.slug}`);

  return (
    <article className="max-w-3xl">
      <Link to={`/courses/${course.slug}`} className="text-sm text-brand hover:underline">← {course.title}</Link>
      <div className="mt-3"><ProgressBar value={position.percent} label={`Lesson ${position.index + 1} of ${position.total}`} tone="brand" /></div>
      <h1 className="text-xl sm:text-2xl font-bold mt-6">{lesson.title}</h1>
      {lesson.summary && <RichText html={lesson.summary} className="text-ink-soft mt-1 text-lg" />}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <ListenButton getText={() => contentRef.current?.innerText || ''} />
        {lesson.estimatedMinutes && <span className="inline-flex items-center gap-1.5 text-sm text-ink-soft"><Clock size={16} aria-hidden="true" />About {lesson.estimatedMinutes} minutes</span>}
      </div>
      {lesson.audioUrl && (
        <div className="mt-5 rounded-xl border border-line bg-surface p-4">
          <p className="font-semibold flex items-center gap-2 mb-2"><Headphones size={18} className="text-brand" aria-hidden="true" />Listen to the recording</p>
          <audio controls src={lesson.audioUrl} preload="none" className="w-full"><track kind="captions" /></audio>
        </div>
      )}

      <div ref={contentRef} className="lesson-prose mt-6" dangerouslySetInnerHTML={{ __html: html }} />

      {lesson.resources?.length > 0 && (
        <section className="mt-8 rounded-xl border border-line bg-surface p-4" aria-labelledby="files-title">
          <h2 id="files-title" className="font-semibold mb-2">Files for this lesson</h2>
          <ul className="space-y-1">
            {lesson.resources.map((r) => (
              <li key={r.url}>
                <a href={r.url} target="_blank" rel="noreferrer" download className="flex items-center gap-3 min-h-11 px-2 rounded-lg hover:bg-paper text-brand font-medium">
                  <FileText size={18} aria-hidden="true" /><span className="flex-1 min-w-0 truncate">{r.name}</span><Download size={16} aria-hidden="true" />
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* INUKA AI activity for this lesson (writing review or speaking practice), free */}
      {aiActivity?.type === 'writing' && <WritingFeedback key={`w-${lesson.id}`} lessonId={lesson.id} activity={aiActivity} />}
      {aiActivity?.type === 'voice' && <VoicePractice key={`v-${lesson.id}`} lessonId={lesson.id} activity={aiActivity} />}

      {hasQuiz && <QuizWidget key={lesson.id} lessonId={lesson.id} quizzes={lesson.quizzes} passMark={passMark} onPassed={() => setPassed(true)} />}

      <div className="mt-10 pt-6 border-t border-line flex flex-wrap items-center gap-3">
        {prevLessonId && <Button variant="ghost" to={`/lessons/${prevLessonId}`}>← Previous</Button>}
        <span className="flex-1" />
        {progress.completed ? (
          <Button onClick={goNext}>{nextLessonId ? 'Next lesson →' : 'Back to course'}</Button>
        ) : (
          <Button onClick={complete} loading={busy} disabled={!canComplete} title={canComplete ? '' : 'Pass the quiz first'}>Mark as complete</Button>
        )}
      </div>

      <Modal open={!!celebrate} onClose={() => { setCelebrate(null); goNext(); }} title={celebrate?.certificate ? 'You finished the course!' : celebrate?.examUnlocked ? 'The final exam is open!' : 'New badge!'}
        footer={celebrate?.examUnlocked
          ? <><Button variant="ghost" onClick={() => { setCelebrate(null); goNext(); }}>Later</Button><Button onClick={() => navigate(`/courses/${course.slug}/exam`)}>Go to the exam</Button></>
          : <Button onClick={() => { setCelebrate(null); goNext(); }}>{nextLessonId ? 'Continue' : 'Back to course'}</Button>}>
        <div className="text-center py-4">
          {celebrate?.newBadges?.map((b) => (
            <div key={b.id} className="mb-4 flex flex-col items-center"><BadgeMedal badgeKey={b.key} size={88} /><p className="font-display font-semibold text-xl mt-3">{b.name}</p><p className="text-ink-soft">{b.description}</p></div>
          ))}
          {celebrate?.examUnlocked && (
            <div className="flex flex-col items-center">
              <ClipboardCheck size={56} className="text-brand" aria-hidden="true" />
              <p className="mt-3">You finished every lesson. Pass the final exam to get your certificate.</p>
            </div>
          )}
          {celebrate?.certificate && <p className="mt-2">Your certificate is ready in <Link to="/my-learning" className="text-brand underline font-semibold">My Learning</Link>.</p>}
        </div>
      </Modal>
    </article>
  );
}
