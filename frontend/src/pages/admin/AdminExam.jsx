import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ClipboardCheck, Copy, RotateCcw, Trash2 } from 'lucide-react';
import { Alert, Button, Card, Field, Pill } from '../../components/ui';
import { ListRowsSkeleton } from '../../components/ui/Skeletons';
import { ActionBar, BackLink, PageTitle } from '../../components/admin/AdminUI';
import QuestionEditor from '../../components/admin/QuestionEditor';
import { useConfirm, useToast } from '../../context/FeedbackContext';
import { api, errorMessage } from '../../services/api';

const DEFAULTS = {
  title: 'Final exam', instructions: '', passMark: 70, timeLimitMinutes: 30, questionCount: 0, shuffle: true,
  maxAttempts: 3, retryAfterHours: 24, showAnswers: true, requiredForCertificate: true, isPublished: false,
};
const pick = (e) => Object.fromEntries(Object.keys(DEFAULTS).map((k) => [k, e[k] ?? DEFAULTS[k]]));

// Final exam of a course: settings, questions, results.
export default function AdminExam() {
  const { id } = useParams();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const toast = useToast();
  const [data, setData] = useState(null);
  const [f, setF] = useState(null);
  const [tab, setTab] = useState('settings');
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = () => api.get(`/admin/courses/${id}/exam`).then((r) => {
    setData(r.data);
    setF((old) => old || pick(r.data.exam || {}));
  }).catch((e) => setMsg({ tone: 'error', text: errorMessage(e) }));
  useEffect(() => { document.title = 'Final exam — INUKA admin'; load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!data || !f) return msg ? <Alert>{msg.text}</Alert> : <ListRowsSkeleton rows={6} />;
  const { course, exam } = data;
  const n = exam?.questions.length || 0;
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  const save = async (e, extra = {}) => {
    e?.preventDefault(); setMsg(null); setBusy(true);
    const body = { ...f, ...extra };
    for (const k of ['passMark', 'timeLimitMinutes', 'questionCount', 'maxAttempts', 'retryAfterHours']) body[k] = Number(body[k]) || 0;
    try {
      await api.put(`/admin/courses/${id}/exam`, body);
      setF(body);
      toast.success(exam ? 'Exam saved.' : 'Exam created. Now add its questions.');
      if (!exam) setTab('questions');
      load();
    } catch (err) { setMsg({ tone: 'error', text: errorMessage(err) }); } finally { setBusy(false); }
  };
  const remove = async () => {
    const ok = await confirm({ title: 'Delete the final exam?', message: 'All its questions and every student attempt are deleted. Certificates already given stay. This cannot be undone. To hide it instead, untick "Students can take this exam".', confirmLabel: 'Yes, delete exam', tone: 'danger' });
    if (!ok) return;
    try { await api.delete(`/admin/courses/${id}/exam`); toast.success('Exam deleted.'); navigate(`/admin/courses/${id}`); } catch (err) { toast.error(errorMessage(err)); }
  };
  const copyQuizzes = async () => {
    try {
      const { data: r } = await api.post(`/admin/courses/${id}/exam/questions/from-quizzes`);
      toast.success(r.added ? `${r.added} questions copied from the lesson quizzes.` : 'Every lesson quiz question is already in the exam.');
      load();
    } catch (err) { toast.error(errorMessage(err)); }
  };
  const examApi = {
    create: (body) => api.post(`/admin/courses/${id}/exam/questions`, body),
    update: (qid, body) => api.patch(`/admin/exam-questions/${qid}`, body),
    remove: (qid) => api.delete(`/admin/exam-questions/${qid}`),
    move: (qid, direction) => api.post(`/admin/exam-questions/${qid}/move`, { direction }),
    importText: (text, preview) => api.post(`/admin/courses/${id}/exam/questions/import`, { text, preview }).then((r) => r.data),
  };

  return (
    <div className="space-y-6">
      <BackLink to={`/admin/courses/${id}`}>{course.title}</BackLink>
      <PageTitle title="Final exam" intro={`The exam for "${course.title}". It opens when a student finishes every lesson.`}
        action={exam && <Button variant="ghost" className="text-danger" onClick={remove}><Trash2 size={18} aria-hidden="true" />Delete exam</Button>} />
      {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}
      {exam && (
        exam.isPublished
          ? <Alert tone="success">Students can take this exam. {exam.requiredForCertificate ? 'They must pass it to get the course certificate.' : 'The certificate does not need it.'}</Alert>
          : <Alert tone="warning">This exam is a draft: students cannot see it{n ? '' : ' (add questions first)'}. {n > 0 && 'When it is ready, tick "Students can take this exam" and save.'}</Alert>
      )}
      {exam && (
        <div role="tablist" className="flex gap-1 bg-surface border border-line rounded-lg p-1 w-fit max-w-full overflow-x-auto">
          {[['settings', 'Settings'], ['questions', `Questions (${n})`], ['results', `Results (${exam._count.attempts})`]].map(([k, l]) => (
            <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
              className={`min-h-10 px-4 rounded-md text-sm font-semibold whitespace-nowrap ${tab === k ? 'bg-brand text-white' : 'text-ink-soft hover:text-brand'}`}>{l}</button>
          ))}
        </div>
      )}

      {(tab === 'settings' || !exam) && (
        <form onSubmit={save} className="space-y-6" noValidate>
          <Card className="space-y-4">
            <Field label="Exam title" value={f.title} onChange={set('title')} />
            <Field as="textarea" rows={3} label="Instructions for students (optional)" value={f.instructions || ''} onChange={set('instructions')}
              placeholder="Read each question carefully. You can go back and change answers before you submit." />
            <div className="grid sm:grid-cols-3 gap-4">
              <Field label="Pass mark (%)" type="number" min="10" max="100" value={f.passMark} onChange={set('passMark')} />
              <Field label="Time limit (minutes)" type="number" min="0" max="600" value={f.timeLimitMinutes} onChange={set('timeLimitMinutes')} hint="0 = no time limit" />
              <Field label="Questions per student" type="number" min="0" max={n || 500} value={f.questionCount} onChange={set('questionCount')}
                hint={`0 = all ${n || ''} questions. A smaller number gives each student a random set.`} />
              <Field label="Tries allowed" type="number" min="0" max="50" value={f.maxAttempts} onChange={set('maxAttempts')} hint="0 = unlimited" />
              <Field label="Wait before trying again (hours)" type="number" min="0" max="720" value={f.retryAfterHours} onChange={set('retryAfterHours')} hint="After a failed try. 0 = no wait" />
            </div>
            <div className="grid sm:grid-cols-2 gap-x-6">
              <Check label="Shuffle questions and answers" checked={f.shuffle} onChange={set('shuffle')} />
              <Check label="Show correct answers after submitting" checked={f.showAnswers} onChange={set('showAnswers')} />
              <Check label="Students must pass it to get the certificate" checked={f.requiredForCertificate} onChange={set('requiredForCertificate')} />
              <Check label="Students can take this exam" checked={f.isPublished} onChange={set('isPublished')} disabled={!n} hint={!n ? 'Add questions first' : undefined} />
            </div>
          </Card>
          <ActionBar>
            <Button type="submit" loading={busy}>{exam ? 'Save settings' : 'Create exam'}</Button>
            <Button variant="ghost" to={`/admin/courses/${id}`}>Back to the course</Button>
          </ActionBar>
        </form>
      )}

      {exam && tab === 'questions' && (
        <QuestionEditor title="Exam questions" questions={exam.questions} api={examApi} reload={load} withPoints
          intro="Give harder questions more points. The score is the points earned out of all points, in %."
          extraActions={<Button variant="ghost" onClick={copyQuizzes}><Copy size={18} aria-hidden="true" />Copy lesson quiz questions</Button>} />
      )}

      {exam && tab === 'results' && <Results courseId={id} />}
    </div>
  );
}

function Check({ label, checked, onChange, disabled, hint }) {
  return (
    <label className={`flex items-center gap-3 min-h-11 ${disabled ? 'opacity-60' : ''}`}>
      <input type="checkbox" className="w-5 h-5 accent-[#07294D]" checked={checked} onChange={onChange} disabled={disabled} />
      <span>{label}{hint && <span className="text-sm text-ink-soft"> ({hint})</span>}</span>
    </label>
  );
}

function Results({ courseId }) {
  const confirm = useConfirm();
  const toast = useToast();
  const [r, setR] = useState(null);
  const [error, setError] = useState('');
  const load = () => api.get(`/admin/courses/${courseId}/exam/results`).then((x) => setR(x.data)).catch((e) => setError(errorMessage(e)));
  useEffect(() => { load(); }, [courseId]); // eslint-disable-line react-hooks/exhaustive-deps
  if (error) return <Alert>{error}</Alert>;
  if (!r) return <ListRowsSkeleton rows={5} />;
  const s = r.summary;
  const reset = async (a) => {
    const ok = await confirm({ title: `Remove this try by ${a.user.firstName}?`, message: 'The attempt is deleted, so the student gets one more try. A certificate already given stays.', confirmLabel: 'Yes, give another try' });
    if (!ok) return;
    try { await api.delete(`/admin/exam-attempts/${a.id}`); toast.success('The student can try again.'); load(); } catch (e) { toast.error(errorMessage(e)); }
  };
  const hardest = [...r.questions].filter((q) => q.asked).sort((a, b) => a.correct / a.asked - b.correct / b.asked);
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[['Students who took it', s.students], ['Passed', s.passedStudents], ['Pass rate', s.passRate == null ? '–' : `${s.passRate}%`], ['Average score', s.averageScore == null ? '–' : `${s.averageScore}%`]].map(([l, v]) => (
          <Card key={l} className="p-4"><p className="text-xl font-bold tabular-nums">{v}</p><p className="text-xs text-ink-soft">{l}</p></Card>
        ))}
      </div>
      <Card>
        <h2 className="text-lg font-semibold mb-3">Attempts</h2>
        {!r.attempts.length ? <p className="text-sm text-ink-soft">Nobody has taken the exam yet.</p> : (
          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full text-sm min-w-[560px]">
              <thead><tr className="text-left text-ink-soft border-b border-line"><th className="py-2 pr-3 font-medium">Student</th><th className="py-2 pr-3 font-medium">Date</th><th className="py-2 pr-3 font-medium">Time</th><th className="py-2 pr-3 font-medium">Score</th><th className="py-2 sr-only">Actions</th></tr></thead>
              <tbody className="divide-y divide-line">
                {r.attempts.map((a) => (
                  <tr key={a.id}>
                    <td className="py-2 pr-3"><span className="font-medium">{a.user.firstName} {a.user.lastName}</span><span className="block text-xs text-ink-soft">{a.user.email}</span></td>
                    <td className="py-2 pr-3 whitespace-nowrap">{new Date(a.startedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                    <td className="py-2 pr-3 whitespace-nowrap">{a.minutes ? `${a.minutes} min` : '—'}</td>
                    <td className="py-2 pr-3">{a.submittedAt ? <Pill tone={a.passed ? 'success' : 'danger'}>{a.score}% {a.passed ? 'passed' : 'not passed'}</Pill> : <Pill tone="info">In progress</Pill>}</td>
                    <td className="py-2 text-right">{a.submittedAt && !a.passed && <button type="button" onClick={() => reset(a)} className="inline-flex items-center gap-1 min-h-10 px-2 text-brand font-semibold rounded hover:bg-brand-soft"><RotateCcw size={14} aria-hidden="true" />Another try</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <Card>
        <h2 className="text-lg font-semibold mb-1 flex items-center gap-2"><ClipboardCheck size={20} className="text-brand" aria-hidden="true" />Questions, hardest first</h2>
        <p className="text-sm text-ink-soft mb-3">Questions most students get wrong may need a clearer lesson — or a clearer question.</p>
        {!hardest.length ? <p className="text-sm text-ink-soft">No answers yet.</p> : (
          <ul className="space-y-3">
            {hardest.map((q) => {
              const pct = Math.round((q.correct / q.asked) * 100);
              return (
                <li key={q.id}>
                  <div className="flex justify-between gap-3 text-sm"><span className="min-w-0 break-words">{q.question}</span><span className="shrink-0 font-semibold tabular-nums">{pct}% right <span className="font-normal text-ink-soft">({q.asked})</span></span></div>
                  <div className="h-2 mt-1 rounded-full bg-line overflow-hidden"><div className={`h-full rounded-full ${pct >= 70 ? 'bg-success' : pct >= 40 ? 'bg-warning' : 'bg-danger'}`} style={{ width: `${pct}%` }} /></div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
