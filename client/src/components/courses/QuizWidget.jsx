import { useState } from 'react';
import { Alert, Button } from '../ui';
import { api, errorMessage } from '../../services/api';

export default function QuizWidget({ lessonId, quizzes, passMark, onPassed }) {
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const byId = Object.fromEntries((result?.results || []).map((r) => [r.quizId, r]));

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
    <section className="mt-10 rounded-2xl border-2 border-forest/20 bg-white p-5 md:p-6" aria-labelledby="quiz-title">
      <h2 id="quiz-title" className="text-xl font-semibold">Check what you learned</h2>
      <p className="text-ink-soft text-sm mt-1">Score {passMark}% or more to finish this lesson. You can try as many times as you need.</p>
      <ol className="mt-5 space-y-6">
        {quizzes.map((q, qi) => {
          const r = byId[q.id];
          return (
            <li key={q.id}>
              <fieldset>
                <legend className="font-medium mb-2">{qi + 1}. {q.question}</legend>
                <div className="grid sm:grid-cols-2 gap-2">
                  {q.options.map((o) => {
                    const chosen = answers[q.id] === o;
                    let cls = chosen ? 'border-forest bg-leaf' : 'border-line bg-white hover:border-forest';
                    if (r) cls = o === r.correctAnswer ? 'border-success bg-green-50' : chosen ? 'border-danger bg-red-50' : 'border-line bg-white opacity-70';
                    return (
                      <label key={o} className={`flex items-center gap-3 min-h-12 px-4 rounded-lg border-2 cursor-pointer ${cls}`}>
                        <input type="radio" name={q.id} value={o} checked={chosen} disabled={!!result} className="w-5 h-5 accent-forest"
                          onChange={() => setAnswers({ ...answers, [q.id]: o })} />
                        <span>{o}</span>
                      </label>
                    );
                  })}
                </div>
                {r && <p className={`mt-2 text-sm ${r.correct ? 'text-green-800' : 'text-red-800'}`}>{r.correct ? 'Correct. ' : `The answer is “${r.correctAnswer}”. `}{r.explanation}</p>}
              </fieldset>
            </li>
          );
        })}
      </ol>
      {error && <div className="mt-4"><Alert>{error}</Alert></div>}
      <div className="mt-6">
        {!result && <Button onClick={submit} loading={busy} disabled={Object.keys(answers).length < quizzes.length}>Check my answers</Button>}
        {result && (
          <div className={`rounded-xl p-4 ${result.passed ? 'bg-green-50' : 'bg-amber-50'}`} role="status">
            <p className="font-display text-2xl font-bold">{result.score}%</p>
            <p>{result.passed ? 'Well done! You passed. Mark this lesson complete to continue.' : `Not yet — you need ${passMark}%. Read the lesson again, then try once more.`}</p>
            {!result.passed && <Button variant="outline" onClick={retry} className="mt-3">Try again</Button>}
          </div>
        )}
      </div>
    </section>
  );
}
