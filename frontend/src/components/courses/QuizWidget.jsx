import { useState } from 'react';
import { Alert, Button } from '../ui';
import QuestionInput, { isAnswered } from './QuestionInput';
import { api, errorMessage } from '../../services/api';

export default function QuizWidget({ lessonId, quizzes, passMark, onPassed }) {
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const byId = Object.fromEntries((result?.results || []).map((r) => [r.quizId, r]));
  const done = quizzes.filter((q) => isAnswered(q, answers[q.id])).length;

  const submit = async () => {
    setError(''); setBusy(true);
    try {
      const { data } = await api.post(`/quizzes/${lessonId}/attempt`, { answers });
      setResult(data);
      if (data.passed) onPassed(data.score);
    } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  };
  const retry = () => { setAnswers({}); setResult(null); };

  return (
    <section className="mt-10 rounded-2xl border-2 border-brand/20 bg-surface p-5 md:p-6" aria-labelledby="quiz-title">
      <h2 id="quiz-title" className="text-xl font-semibold">Check what you learned</h2>
      <p className="text-ink-soft text-sm mt-1">Score {passMark}% or more to finish this lesson. You can try as many times as you need.</p>
      <ol className="mt-5 space-y-6">
        {quizzes.map((q, qi) => (
          <li key={q.id}>
            <QuestionInput q={q} n={qi + 1} value={answers[q.id]} onChange={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))} result={byId[q.id]} disabled={!!result} />
          </li>
        ))}
      </ol>
      {error && <div className="mt-4"><Alert>{error}</Alert></div>}
      <div className="mt-6">
        {!result && (
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={submit} loading={busy} disabled={done < quizzes.length}>Check my answers</Button>
            {done < quizzes.length && <span className="text-sm text-ink-soft">{done} of {quizzes.length} answered</span>}
          </div>
        )}
        {result && (
          <div className={`rounded-xl p-4 ${result.passed ? 'bg-success-soft text-success-ink' : 'bg-warning-soft text-warning-ink'}`} role="status">
            <p className="font-display text-2xl font-bold">{result.score}%</p>
            <p>{result.passed ? 'Well done! You passed. Mark this lesson complete to continue.' : `Not yet — you need ${passMark}%. Read the lesson again, then try once more.`}</p>
            {!result.passed && <Button variant="outline" onClick={retry} className="mt-3">Try again</Button>}
          </div>
        )}
      </div>
    </section>
  );
}
