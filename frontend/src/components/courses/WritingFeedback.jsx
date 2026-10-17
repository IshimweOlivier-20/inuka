import VoiceInputButton from '../ui/VoiceInput';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PenLine, RotateCcw } from 'lucide-react';
import { Button } from '../ui';
import { AiAvatar, Rich } from '../ai/ChatPanel';
import { api, errorMessage } from '../../services/api';

// "Paste your text, get INUKA AI feedback" (writing lessons). Free: AI review with a free AI key,
// otherwise INUKA's built-in checker. Each review is also saved on the INUKA AI page.
const countWords = (t) => (t.match(/[A-Za-zÀ-ɏ']+/g) || []).length;

export default function WritingFeedback({ lessonId, activity }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null); // { feedback, mode }
  const n = countWords(text);
  const { minWords: min, maxWords: max } = activity;
  const inRange = n >= min && n <= max;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    try { setResult((await api.post('/ai/feedback', { lessonId, text })).data); }
    catch (err) { setError(errorMessage(err)); }
    finally { setBusy(false); }
  };

  return (
    <section className="mt-10 rounded-xl border border-line bg-surface overflow-hidden" aria-labelledby="ai-writing-title">
      <header className="flex items-center gap-3 px-5 py-4 bg-brand text-white">
        <AiAvatar size={40} />
        <div>
          <h2 id="ai-writing-title" className="text-white text-lg font-semibold leading-tight">Get INUKA AI feedback</h2>
          <p className="text-sm text-white/80">Free · paste or type your text, then press “Check my writing”.</p>
        </div>
      </header>
      <div className="p-5">
        <p className="flex gap-2 text-[15px]"><PenLine size={18} className="text-accent-hover mt-1 shrink-0" aria-hidden="true" /><span><strong>Your task:</strong> {activity.task}</span></p>
        <form onSubmit={submit} className="mt-4">
          <div className="relative">
          <span className="absolute right-2 bottom-3 z-[1]"><VoiceInputButton onText={(t) => setText((v) => (v ? `${v.trimEnd()} ${t}` : t))} label="Speak your text" /></span>
          <label className="block">
            <span className="sr-only">Your text</span>
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={activity.kind === 'paragraph' ? 7 : 12}
              placeholder="Write or paste your text here…"
              className="w-full rounded-lg border border-line bg-surface pl-3 pr-12 py-3 text-[15px] leading-7 focus:outline-none focus:ring-2 focus:ring-brand" />
          </label>
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            <p className={`text-sm font-semibold ${!n ? 'text-ink-soft' : inRange ? 'text-success-ink' : 'text-warning-ink'}`} aria-live="polite">
              {n} word{n === 1 ? '' : 's'} · target {min}–{max}
            </p>
            <div className="flex gap-2">
              {result && <Button type="button" variant="ghost" onClick={() => { setResult(null); setText(''); }}><RotateCcw size={16} aria-hidden="true" />Start again</Button>}
              <Button type="submit" loading={busy} disabled={countWords(text) < 5}>{result ? 'Check again' : 'Check my writing'}</Button>
            </div>
          </div>
        </form>
        {error && <p role="alert" className="mt-3 text-sm rounded-lg bg-danger-soft text-danger-ink px-3 py-2">{error}</p>}
        {result && (
          <div className="mt-5 rounded-lg border border-line bg-paper p-4 text-[15px]" aria-live="polite">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft mb-2">
              INUKA AI feedback · {result.mode === 'ai' ? 'AI review' : 'INUKA writing checker (free basic mode)'}
            </p>
            <Rich text={result.feedback} />
            <p className="mt-3 text-xs text-ink-soft">Saved on your <Link to="/ai" className="underline">INUKA AI</Link> page.</p>
          </div>
        )}
      </div>
    </section>
  );
}
