import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Copy, FileText, Link2, Sparkles, Trash2, X } from 'lucide-react';
import RichEditor from '../../components/editor/RichEditor';
import { sanitizeRich } from '../../utils/sanitize';
import { Alert, Button, Card, Field } from '../../components/ui';
import { ListRowsSkeleton } from '../../components/ui/Skeletons';
import { ActionBar, BackLink, PageTitle } from '../../components/admin/AdminUI';
import QuestionEditor from '../../components/admin/QuestionEditor';
import UploadButton, { ACCEPT } from '../../components/admin/UploadButton';
import { useConfirm, useToast } from '../../context/FeedbackContext';
import { api, errorMessage } from '../../services/api';

const KINDS = { writing: [['paragraph', 'A paragraph'], ['essay', 'An essay'], ['statement', 'A personal statement / motivation letter']], voice: [['introduce', 'Speaking conversation']] };

const formFrom = (l) => {
  const a = l.aiActivity;
  return {
    title: l.title, summary: l.summary || '', contentHtml: l.contentHtml || '', audioUrl: l.audioUrl || '', isPublished: l.isPublished,
    estimatedMinutes: l.estimatedMinutes ?? '', passMark: l.passMark ?? '',
    resources: Array.isArray(l.resources) ? l.resources : [],
    aiMode: !a ? 'default' : a.type, // default = INUKA's built-in activity (if any); none; writing; voice
    aiKind: a?.kind || 'paragraph', aiTask: a?.task || '', aiMin: a?.minWords ?? '', aiMax: a?.maxWords ?? '',
  };
};

// Lesson editor: content, settings (time, pass mark, audio, files, INUKA AI activity) and quiz questions.
export default function AdminLesson() {
  const { id } = useParams();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const toast = useToast();
  const [lesson, setLesson] = useState(null);
  const [meta, setMeta] = useState({});
  const [f, setF] = useState(null);
  const [msg, setMsg] = useState(null);
  const [tab, setTab] = useState('write');
  const [busy, setBusy] = useState(false);

  const load = () => api.get(`/admin/lessons/${id}`).then((r) => {
    setLesson(r.data.lesson);
    setMeta({ defaultPassMark: r.data.defaultPassMark, builtIn: r.data.builtInActivity });
    setF((old) => old || formFrom(r.data.lesson));
  }).catch((e) => setMsg({ tone: 'error', text: errorMessage(e) }));
  useEffect(() => { document.title = 'Edit lesson — INUKA admin'; setF(null); load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  const preview = useMemo(() => sanitizeRich(f?.contentHtml || ''), [f?.contentHtml]);

  if (!lesson || !f) return msg ? <Alert>{msg.text}</Alert> : <ListRowsSkeleton rows={6} />;
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const save = async (e) => {
    e?.preventDefault(); setMsg(null); setBusy(true);
    let aiActivity = null;
    if (f.aiMode === 'none') aiActivity = { type: 'none' };
    if (f.aiMode === 'writing' || f.aiMode === 'voice') {
      aiActivity = { type: f.aiMode, kind: f.aiMode === 'voice' ? 'introduce' : f.aiKind, task: f.aiTask };
      if (f.aiMode === 'writing') {
        if (f.aiMin !== '') aiActivity.minWords = Number(f.aiMin);
        if (f.aiMax !== '') aiActivity.maxWords = Number(f.aiMax);
      }
    }
    const resources = f.resources.map((r) => ({ name: r.name.trim(), url: r.url.trim() })).filter((r) => r.name || r.url);
    try {
      await api.patch(`/admin/lessons/${id}`, {
        title: f.title, summary: f.summary || null, contentHtml: f.contentHtml, audioUrl: f.audioUrl || null, isPublished: f.isPublished,
        estimatedMinutes: f.estimatedMinutes === '' ? null : Number(f.estimatedMinutes),
        passMark: f.passMark === '' ? null : Number(f.passMark),
        resources, aiActivity,
      });
      toast.success('Lesson saved.');
    } catch (err) { setMsg({ tone: 'error', text: errorMessage(err) }); window.scrollTo({ top: 0, behavior: 'smooth' }); } finally { setBusy(false); }
  };
  const remove = async () => {
    const ok = await confirm({ title: `Delete the lesson "${lesson.title}"?`, message: "Its quiz questions and students' progress on it are deleted too. This cannot be undone. To keep it, untick \"Show this lesson to students\" instead.", confirmLabel: 'Yes, delete lesson', tone: 'danger' });
    if (!ok) return;
    try { await api.delete(`/admin/lessons/${id}`); toast.success('Lesson deleted.'); navigate(`/admin/courses/${lesson.course.id}`); }
    catch (err) { toast.error(errorMessage(err)); }
  };
  const duplicate = async () => {
    try {
      const { data } = await api.post(`/admin/lessons/${id}/duplicate`);
      toast.success('A hidden copy was added at the end of the course.');
      navigate(`/admin/lessons/${data.lesson.id}`);
    } catch (err) { toast.error(errorMessage(err)); }
  };
  const setResource = (i, k, v) => setF({ ...f, resources: f.resources.map((r, j) => (j === i ? { ...r, [k]: v } : r)) });
  const passMark = f.passMark === '' ? meta.defaultPassMark : f.passMark;

  const quizApi = {
    create: (body) => api.post(`/admin/lessons/${id}/quizzes`, body),
    update: (qid, body) => api.patch(`/admin/quizzes/${qid}`, body),
    remove: (qid) => api.delete(`/admin/quizzes/${qid}`),
    move: (qid, direction) => api.post(`/admin/quizzes/${qid}/move`, { direction }),
    importText: (text, preview) => api.post(`/admin/lessons/${id}/quizzes/import`, { text, preview }).then((r) => r.data),
  };

  return (
    <div className="space-y-6">
      <BackLink to={`/admin/courses/${lesson.course.id}`}>{lesson.course.title}</BackLink>
      <PageTitle title="Edit lesson" action={(
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" onClick={duplicate}><Copy size={18} aria-hidden="true" />Duplicate</Button>
          <Button variant="ghost" className="text-danger" onClick={remove}><Trash2 size={18} aria-hidden="true" />Delete lesson</Button>
        </div>
      )} />
      {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}
      <form onSubmit={save} className="space-y-6" noValidate>
        <Card className="space-y-4">
          <Field label="Lesson title" value={f.title} onChange={set('title')} />
          <RichEditor showLabel variant="compact" label="Short summary (optional)" value={f.summary} onChange={(html) => setF((x) => ({ ...x, summary: html }))} placeholder="One or two sentences about what students learn." />
          <div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium">Lesson content</p>
              <div role="tablist" className="flex gap-1 bg-paper rounded-lg p-1">
                {[['write', 'Write'], ['preview', 'Preview']].map(([k, l]) => (
                  <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`min-h-9 px-3 rounded-md text-sm font-medium ${tab === k ? 'bg-surface shadow-sm text-brand' : 'text-ink-soft'}`}>{l}</button>
                ))}
              </div>
            </div>
            <div className="mt-2">
              {tab === 'write' ? (
                <RichEditor label="Lesson content" value={f.contentHtml} onChange={(html) => setF((x) => ({ ...x, contentHtml: html }))}
                  placeholder="Write the lesson here. Use headings, lists, colours, images and videos." />
              ) : (
                <div className="lesson-prose rounded-xl border border-line p-5 min-h-[200px]" dangerouslySetInnerHTML={{ __html: preview || '<p>Nothing written yet.</p>' }} />
              )}
              <p className="text-xs text-ink-soft mt-1">Preview shows the lesson exactly as students see it. Students can also listen to the text aloud.</p>
            </div>
          </div>
        </Card>

        <Card className="space-y-5">
          <h2 className="text-lg font-semibold">Lesson settings</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Time to study (minutes, optional)" type="number" min="1" max="600" value={f.estimatedMinutes} onChange={set('estimatedMinutes')} hint='Students see "About 15 minutes".' />
            <Field label="Quiz pass mark (%)" type="number" min="10" max="100" value={f.passMark} onChange={set('passMark')} placeholder={String(meta.defaultPassMark)}
              hint={`Leave empty for the usual ${meta.defaultPassMark}%. Students need ${passMark}% to finish this lesson.`} />
          </div>

          <div>
            <p className="text-sm font-medium mb-1.5">Listening audio (optional)</p>
            <p className="text-sm text-ink-soft mb-2">For listening lessons: upload an MP3 or M4A (25 MB at most), or paste a link.</p>
            <div className="flex flex-wrap items-center gap-2">
              <UploadButton accept={ACCEPT.audio} label={f.audioUrl ? 'Replace audio' : 'Upload audio'} onUploaded={(file) => setF((x) => ({ ...x, audioUrl: file.url }))} onError={(t) => setMsg({ tone: 'error', text: t })} />
              <input value={f.audioUrl} onChange={set('audioUrl')} placeholder="https://… (or upload)" aria-label="Audio link" className="flex-1 min-w-[200px] min-h-11 rounded-lg border border-line bg-surface px-3" />
              {f.audioUrl && <Button variant="ghost" className="px-3" onClick={() => setF({ ...f, audioUrl: '' })}><X size={16} aria-hidden="true" />Remove</Button>}
            </div>
            {f.audioUrl && <audio controls src={f.audioUrl} className="mt-2 w-full max-w-md" preload="none"><track kind="captions" /></audio>}
          </div>

          <div>
            <p className="text-sm font-medium mb-1.5">Files to download (optional)</p>
            <p className="text-sm text-ink-soft mb-2">Worksheets, slides or reading texts (PDF, Word, PowerPoint, Excel or pictures). Students see them under the lesson.</p>
            <ul className="space-y-2">
              {f.resources.map((r, i) => (
                <li key={i} className="flex flex-wrap items-center gap-2 rounded-lg border border-line p-2">
                  <FileText size={18} className="text-brand shrink-0" aria-hidden="true" />
                  <input value={r.name} onChange={(e) => setResource(i, 'name', e.target.value)} placeholder="Name students see" aria-label={`File ${i + 1} name`} className="flex-1 min-w-[160px] min-h-11 rounded-lg border border-line bg-surface px-3" />
                  <input value={r.url} onChange={(e) => setResource(i, 'url', e.target.value)} placeholder="Link" aria-label={`File ${i + 1} link`} className="flex-1 min-w-[160px] min-h-11 rounded-lg border border-line bg-surface px-3 text-sm" />
                  <button type="button" onClick={() => setF({ ...f, resources: f.resources.filter((_, j) => j !== i) })} className="w-10 h-10 rounded-lg text-danger hover:bg-danger-soft flex items-center justify-center" aria-label={`Remove file ${i + 1}`}><X size={16} /></button>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-2 mt-2">
              <UploadButton small accept={ACCEPT.document} label="Upload a file" onError={(t) => setMsg({ tone: 'error', text: t })}
                onUploaded={(file) => setF((x) => ({ ...x, resources: [...x.resources, { name: file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '), url: file.url }] }))} />
              <button type="button" onClick={() => setF({ ...f, resources: [...f.resources, { name: '', url: '' }] })} className="inline-flex items-center gap-2 min-h-10 px-3 text-sm font-semibold text-brand rounded hover:bg-brand-soft"><Link2 size={16} aria-hidden="true" />Add a link</button>
            </div>
          </div>

          <fieldset className="rounded-lg border border-line p-4 space-y-3">
            <legend className="px-1 text-sm font-medium flex items-center gap-1.5"><Sparkles size={16} className="text-brand" aria-hidden="true" />INUKA AI activity</legend>
            <p className="text-sm text-ink-soft">Students write a text and get feedback from INUKA AI, or practise speaking in a short conversation.</p>
            <div className="grid sm:grid-cols-2 gap-2">
              {[
                ['default', meta.builtIn ? `INUKA's built-in activity (${meta.builtIn.type === 'voice' ? 'speaking' : meta.builtIn.kind})` : 'No activity (default)'],
                ['none', 'No AI activity'],
                ['writing', 'Writing feedback'],
                ['voice', 'Speaking practice'],
              ].filter(([k]) => meta.builtIn || k !== 'none').map(([k, l]) => (
                <label key={k} className={`flex items-center gap-2 min-h-11 px-3 rounded-lg border cursor-pointer ${f.aiMode === k ? 'border-brand bg-brand-soft font-semibold' : 'border-line'}`}>
                  <input type="radio" name="aiMode" value={k} checked={f.aiMode === k} onChange={() => setF({ ...f, aiMode: k, aiTask: f.aiTask || (k !== 'default' && k !== 'none' && meta.builtIn?.type === k ? meta.builtIn.task : f.aiTask) })} className="w-5 h-5 accent-[#07294D]" />{l}
                </label>
              ))}
            </div>
            {f.aiMode === 'default' && meta.builtIn && <p className="text-sm rounded-lg bg-paper p-3"><b>Task:</b> {meta.builtIn.task}</p>}
            {(f.aiMode === 'writing' || f.aiMode === 'voice') && (
              <div className="space-y-3">
                {f.aiMode === 'writing' && (
                  <Field as="select" label="What students write" value={f.aiKind} onChange={set('aiKind')}>
                    {KINDS.writing.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </Field>
                )}
                <Field as="textarea" rows={3} label={f.aiMode === 'voice' ? 'Speaking topic for students' : 'Writing task for students'} value={f.aiTask} onChange={set('aiTask')}
                  placeholder={f.aiMode === 'voice' ? 'Introduce yourself: your name, where you are from, and your goals.' : 'Write one paragraph about your goals for the future.'} />
                {f.aiMode === 'writing' && (
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Fewest words (optional)" type="number" min="10" value={f.aiMin} onChange={set('aiMin')} />
                    <Field label="Most words (optional)" type="number" min="20" value={f.aiMax} onChange={set('aiMax')} />
                  </div>
                )}
              </div>
            )}
          </fieldset>

          <label className="flex items-center gap-3 min-h-11"><input type="checkbox" className="w-5 h-5 accent-[#07294D]" checked={f.isPublished} onChange={(e) => setF({ ...f, isPublished: e.target.checked })} />Show this lesson to students</label>
        </Card>
        <ActionBar>
          <Button type="submit" loading={busy}>Save lesson</Button>
          <Button variant="ghost" to={`/admin/courses/${lesson.course.id}`}>Back to the course</Button>
        </ActionBar>
      </form>

      <QuestionEditor title="Quiz questions" questions={lesson.quizzes} api={quizApi} reload={load}
        intro={`Students answer every question and need ${passMark}% to finish the lesson. The coloured label shows how many students got a question right.`} />
    </div>
  );
}
