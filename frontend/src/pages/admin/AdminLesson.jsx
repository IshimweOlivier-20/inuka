import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import DOMPurify from 'dompurify';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { Alert, Button, Card, Field } from '../../components/ui';
import { ListRowsSkeleton } from '../../components/ui/Skeletons';
import { PageTitle } from '../../components/admin/AdminUI';
import { api, errorMessage } from '../../services/api';

// Lesson editor: content (simple HTML with a live preview) and quiz questions.
export default function AdminLesson() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lesson, setLesson] = useState(null);
  const [f, setF] = useState(null);
  const [msg, setMsg] = useState(null);
  const [tab, setTab] = useState('write');

  const load = () => api.get(`/admin/lessons/${id}`).then((r) => {
    setLesson(r.data.lesson);
    const l = r.data.lesson;
    setF((old) => old || { title: l.title, summary: l.summary || '', contentHtml: l.contentHtml || '', audioUrl: l.audioUrl || '', isPublished: l.isPublished });
  }).catch((e) => setMsg({ tone: 'error', text: errorMessage(e) }));
  useEffect(() => { document.title = 'Edit lesson — INUKA admin'; load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  const preview = useMemo(() => DOMPurify.sanitize(f?.contentHtml || ''), [f?.contentHtml]);

  if (!lesson) return msg ? <Alert>{msg.text}</Alert> : <ListRowsSkeleton rows={6} />;
  const save = async (e) => {
    e.preventDefault(); setMsg(null);
    try { await api.patch(`/admin/lessons/${id}`, f); setMsg({ tone: 'success', text: 'Lesson saved.' }); }
    catch (err) { setMsg({ tone: 'error', text: errorMessage(err) }); }
  };
  const remove = async () => {
    if (!window.confirm(`Delete the lesson "${lesson.title}" and its quiz? Students' progress on it is removed too.`)) return;
    await api.delete(`/admin/lessons/${id}`); navigate(`/admin/courses/${lesson.course.id}`);
  };

  return (
    <div className="space-y-6">
      <Link to={`/admin/courses/${lesson.course.id}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline min-h-11"><ArrowLeft size={16} aria-hidden="true" />{lesson.course.title}</Link>
      <PageTitle title="Edit lesson" action={<Button variant="ghost" className="text-danger" onClick={remove}><Trash2 size={18} aria-hidden="true" />Delete lesson</Button>} />
      {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}
      <Card>
        <form onSubmit={save} className="space-y-4" noValidate>
          <Field label="Lesson title" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
          <Field label="Short summary (optional)" value={f.summary} onChange={(e) => setF({ ...f, summary: e.target.value })} />
          <div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium">Lesson content</p>
              <div role="tablist" className="flex gap-1 bg-paper rounded-lg p-1">
                {[['write', 'Write'], ['preview', 'Preview']].map(([k, l]) => (
                  <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`min-h-9 px-3 rounded-md text-sm font-medium ${tab === k ? 'bg-white shadow-sm text-brand' : 'text-ink-soft'}`}>{l}</button>
                ))}
              </div>
            </div>
            {tab === 'write' ? (
              <>
                <textarea rows={16} value={f.contentHtml} onChange={(e) => setF({ ...f, contentHtml: e.target.value })} aria-label="Lesson content (HTML)"
                  className="mt-2 w-full rounded-lg border border-line p-3 font-mono text-sm" />
                <p className="text-xs text-ink-soft mt-1">Use simple HTML: &lt;p&gt; paragraph, &lt;h3&gt; heading, &lt;ul&gt;&lt;li&gt; list, &lt;strong&gt; bold. Students can listen to the text aloud.</p>
              </>
            ) : (
              <div className="lesson-prose mt-2 rounded-lg border border-line p-4 min-h-[200px]" dangerouslySetInnerHTML={{ __html: preview || '<p>Nothing written yet.</p>' }} />
            )}
          </div>
          <Field label="Audio file link (optional)" type="url" value={f.audioUrl} onChange={(e) => setF({ ...f, audioUrl: e.target.value })} />
          <label className="flex items-center gap-3 min-h-11"><input type="checkbox" className="w-5 h-5 accent-[#0A6CF0]" checked={f.isPublished} onChange={(e) => setF({ ...f, isPublished: e.target.checked })} />Show this lesson to students</label>
          <Button type="submit">Save lesson</Button>
        </form>
      </Card>
      <Quizzes lessonId={id} quizzes={lesson.quizzes} reload={load} />
    </div>
  );
}

function Quizzes({ lessonId, quizzes, reload }) {
  const [editing, setEditing] = useState(null); // quiz id or 'new'
  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Quiz questions ({quizzes.length})</h2>
        {editing !== 'new' && <Button variant="outline" onClick={() => setEditing('new')}><Plus size={18} aria-hidden="true" />Add question</Button>}
      </div>
      <p className="text-sm text-ink-soft mt-1">Students need 60% to pass the lesson quiz.</p>
      <ol className="mt-4 space-y-3">
        {quizzes.map((q, i) => (
          <li key={q.id} className="rounded-lg border border-line p-3">
            {editing === q.id ? <QuizForm lessonId={lessonId} quiz={q} onDone={() => { setEditing(null); reload(); }} onCancel={() => setEditing(null)} /> : (
              <div className="flex items-start gap-3">
                <span className="text-sm font-bold text-brand">{i + 1}.</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{q.question}</p>
                  <ul className="mt-1 text-sm space-y-0.5">{(q.options || []).map((o) => <li key={o} className={o === q.correctAnswer ? 'font-semibold text-brand' : 'text-ink-soft'}>{o === q.correctAnswer ? '✓ ' : '• '}{o}</li>)}</ul>
                </div>
                <Button variant="ghost" className="px-3" onClick={() => setEditing(q.id)}>Edit</Button>
              </div>
            )}
          </li>
        ))}
        {editing === 'new' && <li className="rounded-lg border border-brand/40 p-3"><QuizForm lessonId={lessonId} onDone={() => { setEditing(null); reload(); }} onCancel={() => setEditing(null)} /></li>}
      </ol>
    </Card>
  );
}

function QuizForm({ lessonId, quiz, onDone, onCancel }) {
  const [question, setQuestion] = useState(quiz?.question || '');
  const [options, setOptions] = useState(quiz?.options?.length ? quiz.options : ['', '', '', '']);
  const [correct, setCorrect] = useState(quiz ? quiz.options.indexOf(quiz.correctAnswer) : 0);
  const [explanation, setExplanation] = useState(quiz?.explanation || '');
  const [error, setError] = useState('');

  const save = async () => {
    const opts = options.map((o) => o.trim());
    const filled = opts.filter(Boolean);
    const body = { question, options: filled, correctAnswer: opts[correct] || '', explanation };
    try {
      if (quiz) await api.patch(`/admin/quizzes/${quiz.id}`, body); else await api.post(`/admin/lessons/${lessonId}/quizzes`, body);
      onDone();
    } catch (e) { setError(errorMessage(e)); }
  };
  const remove = async () => { if (window.confirm('Delete this question?')) { await api.delete(`/admin/quizzes/${quiz.id}`); onDone(); } };

  return (
    <div className="space-y-3">
      {error && <Alert>{error}</Alert>}
      <Field label="Question" value={question} onChange={(e) => setQuestion(e.target.value)} />
      <fieldset>
        <legend className="text-sm font-medium mb-1">Answers (choose the correct one)</legend>
        <div className="space-y-2">
          {options.map((o, i) => (
            <div key={i} className="flex items-center gap-2">
              <input type="radio" name={`correct-${quiz?.id || 'new'}`} checked={correct === i} onChange={() => setCorrect(i)} className="w-5 h-5 accent-[#0A6CF0]" aria-label={`Answer ${i + 1} is correct`} />
              <input value={o} onChange={(e) => setOptions(options.map((x, j) => (j === i ? e.target.value : x)))} placeholder={`Answer ${i + 1}`} aria-label={`Answer ${i + 1}`}
                className="flex-1 min-h-11 rounded-lg border border-line px-3" />
            </div>
          ))}
        </div>
        {options.length < 6 && <button type="button" onClick={() => setOptions([...options, ''])} className="mt-1 min-h-11 text-sm font-semibold text-brand">+ Add an answer</button>}
      </fieldset>
      <Field label="Explanation (shown after answering, optional)" value={explanation} onChange={(e) => setExplanation(e.target.value)} />
      <div className="flex flex-wrap gap-2">
        <Button onClick={save}>Save question</Button>
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        {quiz && <Button variant="ghost" className="ml-auto text-danger" onClick={remove}>Delete</Button>}
      </div>
    </div>
  );
}
