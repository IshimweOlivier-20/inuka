import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Sparkles } from 'lucide-react';
import { Card } from '../ui';
import { api } from '../../services/api';
import { deadlineTone, formatDate } from '../../utils/format';

// Student dashboard: the best scholarships for this student's profile (spec: auto-suggest from the profile).
const TONE = { danger: 'text-danger', warning: 'text-warning-ink', success: 'text-success-ink', grey: 'text-ink-soft' };

export default function RecommendedScholarships() {
  const [data, setData] = useState(null);
  useEffect(() => { api.get('/scholarships/matches', { params: { limit: 3 } }).then((r) => setData(r.data)).catch(() => setData({ matches: [] })); }, []);
  if (!data || !data.matches.length) return null;
  return (
    <Card>
      <div className="flex flex-wrap items-center gap-2">
        <Sparkles size={20} className="text-accent-hover" aria-hidden="true" />
        <h2 className="text-lg font-semibold">Recommended for you</h2>
        <Link to="/scholarships?tab=foryou" className="ml-auto text-sm font-semibold text-brand hover:underline">See all matches</Link>
      </div>
      <p className="text-sm text-ink-soft mt-1">Matched to your profile: study level, refugee status, country and language.</p>
      <ul className="mt-4 grid md:grid-cols-3 gap-4">
        {data.matches.map((s) => {
          const d = deadlineTone(s.deadline);
          return (
            <li key={s.id} className="rounded-lg border border-line p-4 flex flex-col">
              <span className="self-start rounded-full bg-success-soft text-success-ink text-xs font-bold px-2.5 py-0.5">{s.match}% match</span>
              <Link to={`/opportunities/${s.slug}`} className="mt-2 font-semibold text-brand leading-snug hover:underline">{s.name}</Link>
              <p className="text-sm text-ink-soft">{s.hostCountry}</p>
              <ul className="mt-2 space-y-1 flex-1">
                {s.reasons.slice(0, 3).map((r) => <li key={r} className="flex gap-1.5 text-sm"><Check size={15} className="text-success mt-1 shrink-0" aria-hidden="true" />{r}</li>)}
              </ul>
              <p className="mt-3 text-sm"><span className="text-ink-soft">{s.deadline ? formatDate(s.deadline) : 'Deadline varies'}</span>{s.deadline && <span className={`ml-2 font-semibold ${TONE[d.tone]}`}>{d.text}</span>}</p>
            </li>
          );
        })}
      </ul>
      {!data.profileComplete && (
        <p className="mt-4 text-sm rounded-lg bg-warning-soft text-warning-ink px-3 py-2">
          Add your {data.missing.map((m) => ({ educationLevel: 'education level', refugeeStatus: 'refugee status', countryResidence: 'country' }[m])).join(', ')} on your <Link to="/profile" className="font-semibold underline">profile</Link> to get better matches.
        </p>
      )}
    </Card>
  );
}
