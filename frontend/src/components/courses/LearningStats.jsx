import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, ListChecks } from 'lucide-react';
import { Card, Pill } from '../ui';
import { api } from '../../services/api';
import { formatDate } from '../../utils/format';

// My Learning (spec §9): lessons finished per week (bar chart, last 8 weeks) and quiz history table.
const short = (d) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

export default function LearningStats() {
  const [d, setD] = useState(null);
  useEffect(() => { api.get('/learning-stats').then((r) => setD(r.data)).catch(() => setD({ weekly: [], quizHistory: [] })); }, []);
  if (!d) return null;
  const max = Math.max(1, ...d.weekly.map((w) => w.lessons));
  const total = d.weekly.reduce((n, w) => n + w.lessons, 0);
  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <Card className="min-w-0">
        <div className="flex items-baseline justify-between gap-2 mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2"><BarChart3 size={20} className="text-brand" aria-hidden="true" />Lessons per week</h2>
          <span className="text-sm text-ink-soft">{total} in 8 weeks</span>
        </div>
        <figure>
          <div className="h-40 flex items-end gap-2" role="img" aria-label={`Lessons finished per week: ${d.weekly.map((w) => `${short(w.weekStart)} ${w.lessons}`).join(', ')}`}>
            {d.weekly.map((w, i) => (
              <div key={w.weekStart} className="flex-1 h-full flex flex-col justify-end items-center gap-1">
                <span className="text-xs font-semibold tabular-nums">{w.lessons || ''}</span>
                <div className={`w-full rounded-t ${i === d.weekly.length - 1 ? 'bg-accent' : 'bg-brand'}`} style={{ height: `${Math.max(w.lessons ? 6 : 2, (w.lessons / max) * 100)}%`, opacity: w.lessons ? 1 : 0.25 }} />
              </div>
            ))}
          </div>
          <div className="mt-2 flex gap-2 text-[11px] text-ink-soft">
            {d.weekly.map((w, i) => <span key={w.weekStart} className="flex-1 text-center">{i === d.weekly.length - 1 ? 'This week' : short(w.weekStart)}</span>)}
          </div>
        </figure>
      </Card>
      <Card className="min-w-0">
        <h2 className="text-lg font-semibold flex items-center gap-2 mb-4"><ListChecks size={20} className="text-brand" aria-hidden="true" />Quiz history</h2>
        {!d.quizHistory.length ? <p className="text-ink-soft">Your quiz results will show here after your first quiz.</p> : (
          <div className="overflow-x-auto max-h-64 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-ink-soft sticky top-0 bg-surface"><tr><th className="py-2 pr-3 font-semibold">Lesson</th><th className="py-2 pr-3 font-semibold">Date</th><th className="py-2 font-semibold">Score</th></tr></thead>
              <tbody className="divide-y divide-line">
                {d.quizHistory.map((q) => (
                  <tr key={`${q.lessonId}${q.at}`}>
                    <td className="py-2 pr-3"><Link to={`/lessons/${q.lessonId}`} className="font-medium text-brand hover:underline">{q.lesson}</Link><span className="block text-xs text-ink-soft">{q.course}</span></td>
                    <td className="py-2 pr-3 whitespace-nowrap text-ink-soft">{formatDate(q.at)}</td>
                    <td className="py-2 whitespace-nowrap"><Pill tone={q.passed ? 'success' : 'danger'}>{q.score}% {q.passed ? 'passed' : 'try again'}</Pill></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
