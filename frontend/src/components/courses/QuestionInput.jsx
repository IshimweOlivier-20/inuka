import VoiceInputButton from '../ui/VoiceInput';
// One question for students (lesson quiz or final exam). Types: single, multiple, true_false, short.
// value: string (or string[] for "multiple"). result (after checking): { correct, correctAnswers?, correctAnswer?, explanation? }
export const isAnswered = (q, v) => (q.type === 'multiple' ? Array.isArray(v) && v.length > 0 : String(v ?? '').trim() !== '');

export default function QuestionInput({ q, n, value, onChange, result, disabled }) {
  const right = result?.correctAnswers || (result?.correctAnswer ? [result.correctAnswer] : []);
  const chosenList = Array.isArray(value) ? value : value ? [value] : [];
  const pick = (o) => {
    if (q.type === 'multiple') onChange(chosenList.includes(o) ? chosenList.filter((x) => x !== o) : [...chosenList, o]);
    else onChange(o);
  };
  return (
    <fieldset>
      <legend className="font-medium mb-2">
        {n}. {q.question}
        {q.type === 'multiple' && <span className="block text-sm font-normal text-ink-soft">Choose every correct answer.</span>}
        {q.points > 1 && <span className="ml-2 text-xs font-semibold text-ink-soft">({q.points} points)</span>}
      </legend>
      {q.imageUrl && <img src={q.imageUrl} alt="" className="mb-3 max-h-64 rounded-lg border border-line" />}
      {q.type === 'short' ? (
        <div className="flex items-center gap-2 w-full sm:max-w-md">
          <input value={value || ''} onChange={(e) => onChange(e.target.value)} disabled={disabled} aria-label={`Your answer to question ${n}`} placeholder="Type your answer"
            className={`flex-1 min-w-0 min-h-12 rounded-lg border-2 bg-surface px-4 ${result ? (result.correct ? 'border-success' : 'border-danger') : 'border-line focus:border-brand'} outline-none`} />
          {!disabled && !result && <VoiceInputButton onText={(t) => onChange(value ? `${value} ${t}` : t)} label="Say your answer" />}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-2">
          {q.options.map((o) => {
            const chosen = chosenList.includes(o);
            let cls = chosen ? 'border-brand bg-brand-soft' : 'border-line bg-surface hover:border-brand';
            if (result) {
              if (right.length) cls = right.includes(o) ? 'border-success bg-success-soft' : chosen ? 'border-danger bg-danger-soft' : 'border-line bg-surface opacity-70';
              else cls = chosen ? (result.correct ? 'border-success bg-success-soft' : 'border-danger bg-danger-soft') : 'border-line bg-surface opacity-70';
            }
            return (
              <label key={o} className={`flex items-center gap-3 min-h-12 px-4 rounded-lg border-2 ${disabled ? '' : 'cursor-pointer'} ${cls}`}>
                <input type={q.type === 'multiple' ? 'checkbox' : 'radio'} name={q.id} value={o} checked={chosen} disabled={disabled} className="w-5 h-5 accent-brand shrink-0"
                  onChange={() => pick(o)} />
                <span>{o}</span>
              </label>
            );
          })}
        </div>
      )}
      {result && (
        <p className={`mt-2 text-sm ${result.correct ? 'text-success-ink' : 'text-danger-ink'}`}>
          {result.correct ? 'Correct. ' : (result.correctAnswer ? `The answer is “${result.correctAnswer}”. ` : 'Not correct. ')}
          {result.explanation}
        </p>
      )}
    </fieldset>
  );
}
