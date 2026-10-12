import { useState } from 'react';
import { ArrowDown, ArrowUp, ClipboardPaste, Plus, Trash2, X } from 'lucide-react';
import { Alert, Button, Card, Field, Modal, Pill } from '../ui';
import UploadButton, { ACCEPT } from './UploadButton';
import { useConfirm, useToast } from '../../context/FeedbackContext';
import { errorMessage } from '../../services/api';

// Questions for lesson quizzes and final exams.
// api: { create(body), update(id, body), remove(id), move(id, direction), importText(text, preview) } — each returns a promise.
export const TYPE_LABEL = {
  single: 'One correct answer',
  multiple: 'Several correct answers',
  true_false: 'True or false',
  short: 'Short typed answer',
};

const correctList = (q) => (q.correctAnswers?.length ? q.correctAnswers : (q.correctAnswer ? [q.correctAnswer] : []));

export default function QuestionEditor({ title, intro, questions, api, reload, withPoints = false, extraActions }) {
  const [editing, setEditing] = useState(null); // question id or 'new'
  const [importing, setImporting] = useState(false);
  const confirm = useConfirm();
  const toast = useToast();
  const done = () => { setEditing(null); reload(); };
  const move = async (id, direction) => { try { await api.move(id, direction); reload(); } catch (e) { toast.error(errorMessage(e)); } };
  const remove = async (q) => {
    const ok = await confirm({ title: 'Delete this question?', message: `"${q.question}" is removed. This cannot be undone.`, confirmLabel: 'Yes, delete question', tone: 'danger' });
    if (!ok) return;
    try { await api.remove(q.id); toast.success('Question deleted.'); done(); } catch (e) { toast.error(errorMessage(e)); }
  };
  const totalPoints = questions.reduce((s, q) => s + (q.points || 1), 0);

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{title} ({questions.length}{withPoints && questions.length ? `, ${totalPoints} points` : ''})</h2>
        <div className="flex flex-wrap gap-2">
          {extraActions}
          <Button variant="ghost" onClick={() => setImporting(true)}><ClipboardPaste size={18} aria-hidden="true" />Paste many</Button>
          {editing !== 'new' && <Button variant="outline" onClick={() => setEditing('new')}><Plus size={18} aria-hidden="true" />Add question</Button>}
        </div>
      </div>
      {intro && <p className="text-sm text-ink-soft mt-1">{intro}</p>}
      {!questions.length && editing !== 'new' && <p className="mt-4 text-sm text-ink-soft">No questions yet. Add them one by one, or paste many at once.</p>}
      <ol className="mt-4 space-y-3">
        {questions.map((q, i) => (
          <li key={q.id} className="rounded-lg border border-line p-3">
            {editing === q.id ? <QuestionForm question={q} withPoints={withPoints} api={api} onDone={done} onCancel={() => setEditing(null)} /> : (
              <div className="flex items-start gap-3">
                <span className="text-sm font-bold text-brand pt-0.5">{i + 1}.</span>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap gap-1.5 mb-1">
                    <Pill tone="brand">{TYPE_LABEL[q.type || 'single']}</Pill>
                    {withPoints && <Pill>{q.points || 1} {q.points === 1 || !q.points ? 'point' : 'points'}</Pill>}
                    {q.stats?.answers > 0 && (
                      <Pill tone={q.stats.correct / q.stats.answers >= 0.7 ? 'success' : q.stats.correct / q.stats.answers >= 0.4 ? 'warning' : 'danger'}>
                        {Math.round((q.stats.correct / q.stats.answers) * 100)}% right ({q.stats.answers} answers)
                      </Pill>
                    )}
                  </div>
                  <p className="font-medium break-words">{q.question}</p>
                  {q.imageUrl && <img src={q.imageUrl} alt="" className="mt-2 max-h-32 rounded border border-line" />}
                  {q.type === 'short' ? (
                    <p className="mt-1 text-sm"><span className="text-ink-soft">Accepted answers: </span><span className="font-semibold text-success-ink">{correctList(q).join(' / ')}</span></p>
                  ) : (
                    <ul className="mt-1 text-sm space-y-0.5">
                      {(q.type === 'true_false' ? ['True', 'False'] : q.options || []).map((o) => {
                        const right = correctList(q).includes(o);
                        return <li key={o} className={right ? 'font-semibold text-success-ink' : 'text-ink-soft'}>{right ? '✓ ' : '• '}{o}</li>;
                      })}
                    </ul>
                  )}
                  {q.explanation && <p className="mt-1 text-xs text-ink-soft">Explanation: {q.explanation}</p>}
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-0.5 shrink-0">
                  <IconBtn label={`Move question ${i + 1} up`} disabled={i === 0} onClick={() => move(q.id, 'up')}><ArrowUp size={16} /></IconBtn>
                  <IconBtn label={`Move question ${i + 1} down`} disabled={i === questions.length - 1} onClick={() => move(q.id, 'down')}><ArrowDown size={16} /></IconBtn>
                  <Button variant="ghost" className="px-3" onClick={() => setEditing(q.id)}>Edit</Button>
                  <IconBtn label={`Delete question ${i + 1}`} onClick={() => remove(q)} danger><Trash2 size={16} /></IconBtn>
                </div>
              </div>
            )}
          </li>
        ))}
        {editing === 'new' && <li className="rounded-lg border border-brand/40 p-3"><QuestionForm withPoints={withPoints} api={api} onDone={done} onCancel={() => setEditing(null)} /></li>}
      </ol>
      <ImportModal open={importing} onClose={() => setImporting(false)} api={api} onAdded={() => { setImporting(false); reload(); }} />
    </Card>
  );
}

function IconBtn({ label, onClick, disabled, danger, children }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={label} title={label}
      className={`w-10 h-10 rounded-lg disabled:opacity-30 flex items-center justify-center ${danger ? 'text-danger hover:bg-danger-soft' : 'hover:bg-brand-soft'}`}>
      {children}
    </button>
  );
}

export function QuestionForm({ question, withPoints, api, onDone, onCancel }) {
  const toast = useToast();
  const [type, setType] = useState(question?.type || 'single');
  const [text, setText] = useState(question?.question || '');
  const [options, setOptions] = useState(question?.options?.length && question.type !== 'true_false' ? question.options : ['', '', '', '']);
  const [correct, setCorrect] = useState(correctList(question || {})); // option texts (or accepted answers for "short")
  const [accepted, setAccepted] = useState(question?.type === 'short' ? correctList(question).join('\n') : '');
  const [imageUrl, setImageUrl] = useState(question?.imageUrl || '');
  const [explanation, setExplanation] = useState(question?.explanation || '');
  const [points, setPoints] = useState(question?.points || 1);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const uid = question?.id || 'new';

  const changeType = (t) => {
    setType(t);
    if (t === 'true_false') setCorrect((c) => (['True', 'False'].includes(c[0]) ? [c[0]] : ['True']));
    else if (t === 'single') setCorrect((c) => c.slice(0, 1));
  };
  const setOption = (i, v) => {
    const old = options[i];
    setOptions(options.map((x, j) => (j === i ? v : x)));
    setCorrect((c) => c.map((x) => (x === old ? v : x)));
  };
  const removeOption = (i) => { const old = options[i]; setOptions(options.filter((_, j) => j !== i)); setCorrect((c) => c.filter((x) => x !== old)); };
  const toggle = (o) => setCorrect((c) => (type === 'multiple' ? (c.includes(o) ? c.filter((x) => x !== o) : [...c, o]) : [o]));

  const save = async () => {
    setError(''); setBusy(true);
    const opts = options.map((o) => o.trim()).filter(Boolean);
    const body = {
      type, question: text, imageUrl: imageUrl || null, explanation: explanation || null,
      options: type === 'single' || type === 'multiple' ? opts : [],
      correctAnswers: type === 'short' ? accepted.split('\n').map((s) => s.trim()).filter(Boolean) : correct.map((c) => c.trim()).filter((c) => type === 'true_false' || opts.includes(c)),
      ...(withPoints && { points: Number(points) || 1 }),
    };
    try {
      if (question) await api.update(question.id, body); else await api.create(body);
      toast.success(question ? 'Question saved.' : 'Question added.');
      onDone();
    } catch (e) { setError(errorMessage(e)); setBusy(false); }
  };

  return (
    <div className="space-y-4">
      {error && <Alert>{error}</Alert>}
      <div className={`grid gap-4 ${withPoints ? 'sm:grid-cols-[1fr_8rem]' : ''}`}>
        <Field as="select" label="Question type" value={type} onChange={(e) => changeType(e.target.value)}>
          {Object.entries(TYPE_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </Field>
        {withPoints && <Field label="Points" type="number" min="1" max="20" value={points} onChange={(e) => setPoints(e.target.value)} />}
      </div>
      <Field as="textarea" rows={2} label="Question" value={text} onChange={(e) => setText(e.target.value)} />
      <div>
        <p className="text-sm font-medium mb-1.5">Picture (optional)</p>
        {imageUrl ? (
          <div className="flex items-start gap-3">
            <img src={imageUrl} alt="" className="max-h-28 rounded border border-line" />
            <Button variant="ghost" className="px-3" onClick={() => setImageUrl('')}><X size={16} aria-hidden="true" />Remove picture</Button>
          </div>
        ) : <UploadButton small accept={ACCEPT.image} label="Add a picture" onUploaded={(f) => setImageUrl(f.url)} onError={setError} />}
      </div>

      {type === 'short' && (
        <Field as="textarea" rows={3} label="Accepted answers (one per line)" value={accepted} onChange={(e) => setAccepted(e.target.value)}
          hint="Capital letters, accents and full stops do not matter. Add other correct spellings on new lines." />
      )}
      {type === 'true_false' && (
        <fieldset>
          <legend className="text-sm font-medium mb-1.5">Correct answer</legend>
          <div className="flex gap-3">
            {['True', 'False'].map((o) => (
              <label key={o} className={`flex items-center gap-2 min-h-11 px-4 rounded-lg border cursor-pointer ${correct[0] === o ? 'border-success bg-success-soft font-semibold' : 'border-line'}`}>
                <input type="radio" name={`tf-${uid}`} checked={correct[0] === o} onChange={() => setCorrect([o])} className="w-5 h-5 accent-[#07294D]" />{o}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      {(type === 'single' || type === 'multiple') && (
        <fieldset>
          <legend className="text-sm font-medium mb-1.5">{type === 'multiple' ? 'Answers (tick every correct one)' : 'Answers (choose the correct one)'}</legend>
          <div className="space-y-2">
            {options.map((o, i) => (
              <div key={i} className="flex items-center gap-2">
                <input type={type === 'multiple' ? 'checkbox' : 'radio'} name={`correct-${uid}`} checked={!!o.trim() && correct.includes(o)} disabled={!o.trim()}
                  onChange={() => toggle(o)} className="w-5 h-5 accent-[#07294D]" aria-label={`Answer ${i + 1} is correct`} />
                <input value={o} onChange={(e) => setOption(i, e.target.value)} placeholder={`Answer ${i + 1}`} aria-label={`Answer ${i + 1}`}
                  className="flex-1 min-w-0 min-h-11 rounded-lg border border-line bg-surface px-3" />
                {options.length > 2 && <IconBtn label={`Remove answer ${i + 1}`} onClick={() => removeOption(i)}><X size={16} /></IconBtn>}
              </div>
            ))}
          </div>
          {options.length < 8 && <button type="button" onClick={() => setOptions([...options, ''])} className="mt-1 min-h-11 text-sm font-semibold text-brand">+ Add an answer</button>}
        </fieldset>
      )}
      <Field label="Explanation (shown after answering, optional)" value={explanation} onChange={(e) => setExplanation(e.target.value)} />
      <div className="flex flex-wrap gap-2">
        <Button onClick={save} loading={busy}>Save question</Button>
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}

const EXAMPLE = `Q: What is the capital of Rwanda?
- Nairobi
* Kigali
- Kampala
E: Kigali is the capital city of Rwanda.

Q: Which of these are input devices?
* Keyboard
* Mouse
- Monitor

Q: A monitor is an output device.
A: True

Q: Type the plural of "child".
A: children`;

function ImportModal({ open, onClose, api, onAdded }) {
  const toast = useToast();
  const [text, setText] = useState('');
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const close = () => { setPreview(null); setError(''); onClose(); };
  const check = async () => {
    setError(''); setBusy(true);
    try { setPreview(await api.importText(text, true)); } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  };
  const add = async () => {
    setBusy(true);
    try {
      const r = await api.importText(text, false);
      if (r.errors?.length) { setPreview(r); return; }
      toast.success(`${r.added} ${r.added === 1 ? 'question' : 'questions'} added.`);
      setText(''); setPreview(null); onAdded();
    } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  };
  return (
    <Modal open={open} onClose={close} title="Paste many questions" wide
      footer={<>
        <Button variant="ghost" onClick={close}>Cancel</Button>
        <Button variant="outline" onClick={check} loading={busy && !preview} disabled={!text.trim()}>Check</Button>
        <Button onClick={add} disabled={!preview || preview.errors.length > 0 || !preview.questions.length} loading={busy && !!preview}>Add {preview?.questions.length || ''} questions</Button>
      </>}>
      <div className="space-y-4">
        <div className="text-sm text-ink-soft space-y-1">
          <p>Write each question on a line starting with <b>Q:</b>, then its answers. Leave an empty line between questions.</p>
          <ul className="list-disc pl-5">
            <li><b>-</b> a wrong answer, <b>*</b> a correct answer (two or more * = several correct answers)</li>
            <li><b>A: True</b> or <b>A: False</b> for true-or-false questions</li>
            <li><b>A: answer</b> for a typed answer (several accepted answers: <b>A: colour | color</b>)</li>
            <li><b>E:</b> explanation (optional)</li>
          </ul>
          <button type="button" className="text-brand font-semibold min-h-11" onClick={() => { setText(EXAMPLE); setPreview(null); }}>Use the example</button>
        </div>
        {error && <Alert>{error}</Alert>}
        <Field as="textarea" rows={10} label="Questions" value={text} onChange={(e) => { setText(e.target.value); setPreview(null); }} className="font-mono" />
        {preview && (
          <div className="space-y-2">
            {preview.errors.length > 0 && <Alert tone="warning"><p className="font-semibold">Please fix these first:</p><ul className="list-disc pl-5">{preview.errors.map((e) => <li key={e}>{e}</li>)}</ul></Alert>}
            {preview.questions.length > 0 && (
              <Alert tone="success">
                <p className="font-semibold">{preview.questions.length} {preview.questions.length === 1 ? 'question is' : 'questions are'} ready:</p>
                <ol className="list-decimal pl-5">{preview.questions.map((q, i) => <li key={i}>{q.question} <span className="opacity-75">({TYPE_LABEL[q.type]}; correct: {q.correctAnswers.join(' / ')})</span></li>)}</ol>
              </Alert>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

