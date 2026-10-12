import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Award, CheckCircle2, ChevronLeft, ChevronRight, ClipboardCheck, Clock, Lock, RotateCcw, XCircle } from 'lucide-react';
import { Alert, Button, Card } from '../../components/ui';
import { ListRowsSkeleton } from '../../components/ui/Skeletons';
import QuestionInput, { isAnswered } from '../../components/courses/QuestionInput';
import { useConfirm } from '../../context/FeedbackContext';
import { api, errorMessage } from '../../services/api';

// Final course exam: rules → timed questions (saved as you go, resumes after a lost connection) → result and review.
export default function ExamPage() {
  const { slug } = useParams();
  const [status, setStatus] = useState(null);
  const [attempt, setAttempt] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const loadStatus = useCallback(() => api.get(`/courses/${slug}/exam`).then((r) => { setStatus(r.data); return r.data; }), [slug]);
  const openAttempt = (id) => api.get(`/exam-attempts/${id}`).then((r) => setAttempt(r.data.attempt));

  useEffect(() => {
    document.title = 'Final exam — INUKA';
    loadStatus().then((s) => {
      if (s.inProgress) return openAttempt(s.inProgress.id); // resume
      return null;
    }).catch((e) => setError(errorMessage(e)));
  }, [loadStatus]);

  const start = async () => {
    setBusy(true); setError('');
    try {
      const { data } = await api.post(`/courses/${slug}/exam/start`);
      await openAttempt(data.attemptId);
      window.scrollTo(0, 0);
    } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  };
  const finished = (a) => { setAttempt(a); loadStatus().catch(() => {}); window.scrollTo(0, 0); };

  if (error && !status) return <div className="max-w-xl"><Alert>{error}</Alert><Button variant="ghost" to={`/courses/${slug}`} className="mt-4">← Back to the course</Button></div>;
  if (!status) return <ListRowsSkeleton rows={5} />;
  if (attempt && !attempt.submittedAt) return <TakeExam attempt={attempt} onFinished={finished} />;
  if (attempt?.submittedAt) return <ExamResult attempt={attempt} status={status} onRetry={() => { setAttempt(null); }} slug={slug} />;
  return <ExamIntro status={status} slug={slug} onStart={start} busy={busy} error={error} onSeeResult={(id) => openAttempt(id).catch((e) => setError(errorMessage(e)))} />;
}

function ExamIntro({ status, slug, onStart, busy, error, onSeeResult }) {
  const { exam: e, course } = status;
  const rules = [
    [ClipboardCheck, `${e.questionCount} questions`],
    [Clock, e.timeLimitMinutes ? `${e.timeLimitMinutes} minutes. When the time is up, your answers are sent automatically.` : 'No time limit.'],
    [Award, `You need ${e.passMark}% to pass${e.requiredForCertificate ? ' and get your certificate' : ''}.`],
    [RotateCcw, e.maxAttempts ? `${e.maxAttempts} ${e.maxAttempts === 1 ? 'try' : 'tries'} in total${e.retryAfterHours ? `, with ${e.retryAfterHours} hours between tries` : ''}.` : 'You can try as many times as you need.'],
  ];
  const last = status.attempts[0];
  return (
    <div className="max-w-2xl space-y-5">
      <Link to={`/courses/${slug}`} className="text-sm text-brand hover:underline">← {course.title}</Link>
      <h1 className="text-2xl sm:text-[1.75rem] font-bold">{e.title}</h1>
      {error && <Alert>{error}</Alert>}
      <Card>
        <ul className="space-y-3">
          {rules.map(([Icon, text]) => <li key={text} className="flex items-start gap-3"><Icon size={20} className="text-brand shrink-0 mt-0.5" aria-hidden="true" /><span>{text}</span></li>)}
        </ul>
        {e.instructions && <p className="mt-4 pt-4 border-t border-line whitespace-pre-line">{e.instructions}</p>}
        <p className="mt-4 text-sm text-ink-soft">Your answers are saved as you go. If your connection stops, open this page again to continue.</p>
      </Card>
      {status.reason === 'lessons' && <Alert tone="info"><Lock size={16} className="inline -mt-0.5 mr-1" aria-hidden="true" />Finish every lesson of the course first ({status.lessons.done} of {status.lessons.total} done).</Alert>}
      {status.reason === 'passed' && <Alert tone="success">You passed this exam with {status.bestScore}%.{status.certificate && <> Your certificate is in <Link to="/my-learning" className="underline font-semibold">My Learning</Link>.</>}</Alert>}
      {status.reason === 'no_attempts' && <Alert tone="error">You have used all your tries (best score {status.bestScore}%). Please contact INUKA if you need another try.</Alert>}
      {status.reason === 'wait' && <Alert tone="warning">You can try again on {new Date(status.nextTryAt).toLocaleString(undefined, { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}. Review the lessons in the meantime.</Alert>}
      {status.bestScore != null && status.reason !== 'passed' && status.reason !== 'no_attempts' && status.reason !== 'wait' && (
        <p className="text-ink-soft">Best score so far: {status.bestScore}%.{status.attemptsLeft != null && ` ${status.attemptsLeft} ${status.attemptsLeft === 1 ? 'try' : 'tries'} left.`}</p>
      )}
      <div className="flex flex-wrap gap-3">
        {status.canStart && <Button onClick={onStart} loading={busy}>{status.bestScore != null ? 'Try again' : 'Start the exam'}</Button>}
        {last && <Button variant="outline" onClick={() => onSeeResult(last.id)}>See my last result</Button>}
        {status.reason === 'lessons' && <Button variant="outline" to={`/courses/${slug}`}>Back to the lessons</Button>}
      </div>
    </div>
  );
}

const fmt = (ms) => {
  const s = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); const sec = s % 60;
  return `${h ? `${h}:` : ''}${String(m).padStart(h ? 2 : 1, '0')}:${String(sec).padStart(2, '0')}`;
};

function TakeExam({ attempt, onFinished }) {
  const confirm = useConfirm();
  const [answers, setAnswers] = useState(attempt.answers || {});
  const [i, setI] = useState(0);
  const [saved, setSaved] = useState('saved'); // saved | saving | offline
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [left, setLeft] = useState(null);
  const offset = useRef(new Date(attempt.serverTime).getTime() - Date.now()); // server clock vs this phone's clock
  const latest = useRef(answers);
  const timer = useRef(null);
  const submitted = useRef(false);
  const qs = attempt.questions;
  const q = qs[i];
  const answeredCount = qs.filter((x) => isAnswered(x, answers[x.id])).length;

  const save = useCallback(async () => {
    setSaved('saving');
    try { await api.put(`/exam-attempts/${attempt.id}/answers`, { answers: latest.current }); setSaved('saved'); } catch { setSaved('offline'); }
  }, [attempt.id]);

  const submit = useCallback(async (auto = false) => {
    if (submitted.current) return;
    if (!auto) {
      const missing = qs.length - qs.filter((x) => isAnswered(x, latest.current[x.id])).length;
      const ok = await confirm({
        title: 'Send your answers?',
        message: missing ? `You have not answered ${missing} ${missing === 1 ? 'question' : 'questions'}. Unanswered questions count as wrong. You cannot change answers after sending.` : 'You cannot change your answers after sending.',
        confirmLabel: 'Yes, send my answers',
      });
      if (!ok) return;
    }
    submitted.current = true; setBusy(true); setError('');
    clearTimeout(timer.current);
    try {
      const { data } = await api.post(`/exam-attempts/${attempt.id}/submit`, { answers: latest.current });
      onFinished(data.attempt);
    } catch (e) {
      submitted.current = false; setBusy(false);
      setError(`${errorMessage(e)} Your answers are kept: check your connection and press "Send my answers" again.`);
    }
  }, [attempt.id, confirm, onFinished, qs]);

  const setAnswer = (v) => {
    const next = { ...latest.current, [q.id]: v };
    latest.current = next; setAnswers(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(save, 1200);
  };

  useEffect(() => {
    if (!attempt.expiresAt) return undefined;
    const end = new Date(attempt.expiresAt).getTime();
    const tick = () => {
      const ms = end - (Date.now() + offset.current);
      setLeft(ms);
      if (ms <= 0) submit(true);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [attempt.expiresAt, submit]);
  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    const warn = (e) => { if (!submitted.current) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, []);

  const low = left != null && left < 5 * 60 * 1000;
  return (
    <div className="max-w-3xl">
      <div className="sticky top-0 z-20 -mx-4 md:-mx-8 px-4 md:px-8 py-3 bg-paper/95 backdrop-blur border-b border-line">
        <div className="flex items-center gap-3">
          <p className="font-semibold min-w-0 flex-1 truncate">{attempt.exam.title}</p>
          {left != null && (
            <span className={`inline-flex items-center gap-1.5 font-bold tabular-nums rounded-full px-3 py-1.5 shrink-0 ${low ? 'bg-danger-soft text-danger-ink' : 'bg-brand-soft text-brand'}`} role="timer" aria-live={low ? 'polite' : 'off'} aria-label={`Time left ${fmt(left)}`}>
              <Clock size={16} aria-hidden="true" />{fmt(left)}
            </span>
          )}
        </div>
        <div className="mt-2 flex items-center justify-between gap-3">
          <p className="text-xs text-ink-soft min-w-0">{answeredCount} of {qs.length} answered · {saved === 'saving' ? 'Saving…' : saved === 'offline' ? 'Not saved yet (no connection). Keep going: everything is sent when you finish.' : 'Saved'}</p>
          <Button onClick={() => submit(false)} loading={busy} className="shrink-0 !px-4">Send my answers</Button>
        </div>
      </div>

      {error && <div className="mt-4"><Alert>{error}</Alert></div>}

      <nav aria-label="Questions" className="mt-5 flex flex-wrap gap-1.5">
        {qs.map((x, k) => {
          const done = isAnswered(x, answers[x.id]);
          return (
            <button key={x.id} type="button" onClick={() => setI(k)} aria-current={k === i ? 'step' : undefined} aria-label={`Question ${k + 1}${done ? ', answered' : ''}`}
              className={`w-10 h-10 rounded-lg text-sm font-semibold border-2 ${k === i ? 'border-brand bg-brand text-white' : done ? 'border-brand/40 bg-brand-soft text-brand' : 'border-line bg-surface text-ink-soft'}`}>{k + 1}</button>
          );
        })}
      </nav>

      <Card className="mt-5">
        <p className="text-sm text-ink-soft mb-3">Question {i + 1} of {qs.length}</p>
        <QuestionInput key={q.id} q={q} n={i + 1} value={answers[q.id]} onChange={setAnswer} disabled={busy} />
      </Card>
      <div className="mt-5 flex items-center gap-3">
        <Button variant="ghost" onClick={() => setI(i - 1)} disabled={i === 0}><ChevronLeft size={18} aria-hidden="true" />Previous</Button>
        <span className="flex-1" />
        {i < qs.length - 1
          ? <Button variant="outline" onClick={() => { setI(i + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Next<ChevronRight size={18} aria-hidden="true" /></Button>
          : <Button onClick={() => submit(false)} loading={busy}>Send my answers</Button>}
      </div>
    </div>
  );
}

function ExamResult({ attempt, status, onRetry, slug }) {
  const passed = attempt.passed;
  return (
    <div className="max-w-3xl space-y-6">
      <Link to={`/courses/${slug}`} className="text-sm text-brand hover:underline">← {attempt.course.title}</Link>
      <div className={`rounded-2xl p-6 text-center ${passed ? 'bg-success-soft text-success-ink' : 'bg-warning-soft text-warning-ink'}`} role="status">
        {passed ? <CheckCircle2 size={48} className="mx-auto" aria-hidden="true" /> : <XCircle size={48} className="mx-auto" aria-hidden="true" />}
        <p className="font-display text-4xl font-bold mt-2">{attempt.score}%</p>
        <p className="font-semibold mt-1">{passed ? 'Congratulations, you passed!' : `Not passed this time — you need ${attempt.exam.passMark}%.`}</p>
        <p className="text-sm mt-1">{attempt.correctCount} of {attempt.total} questions correct.</p>
        <div className="mt-4 flex flex-wrap justify-center gap-3">
          {attempt.certificate && <Button to={`/certificates/${attempt.certificate.id}`}><Award size={18} aria-hidden="true" />See my certificate</Button>}
          {!passed && status?.canStart && <Button onClick={onRetry}>Try again</Button>}
          <Button variant="outline" to={`/courses/${slug}`}>Back to the course</Button>
        </div>
        {!passed && !status?.canStart && status?.reason === 'wait' && <p className="text-sm mt-3">You can try again on {new Date(status.nextTryAt).toLocaleString(undefined, { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}.</p>}
        {!passed && status?.reason === 'no_attempts' && <p className="text-sm mt-3">You have used all your tries. Please contact INUKA if you need another try.</p>}
      </div>
      <section aria-labelledby="review-title">
        <h2 id="review-title" className="text-xl font-semibold">Your answers</h2>
        {!attempt.exam.showAnswers && <p className="text-sm text-ink-soft mt-1">For this exam you see which answers were right, but not the correct answers.</p>}
        <ol className="mt-4 space-y-4">
          {attempt.results.map((r, k) => (
            <li key={r.id}><Card><QuestionInput q={r} n={k + 1} value={r.answer} onChange={() => {}} result={r} disabled /></Card></li>
          ))}
        </ol>
      </section>
    </div>
  );
}
