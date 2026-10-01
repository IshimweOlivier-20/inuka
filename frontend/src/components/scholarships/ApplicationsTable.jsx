import { useEffect, useState } from 'react';
import { Alert, Button, EmptyState } from '../ui';
import { api, errorMessage } from '../../services/api';
import { APP_STATUS, formatDate } from '../../utils/format';
import { ListRowsSkeleton } from '../ui/Skeletons';
import { ExternalLink, FileText } from 'lucide-react';

// Spec 10.4 — students update their own status and notes.
export default function ApplicationsTable() {
  const [apps, setApps] = useState(null);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const load = () => api.get('/applications').then((r) => setApps(r.data.applications)).catch((e) => setError(errorMessage(e)));
  useEffect(() => { load(); }, []);

  const update = async (id, patch) => {
    setApps((list) => list.map((a) => (a.id === id ? { ...a, ...patch } : a)));
    try {
      const { data } = await api.patch(`/applications/${id}`, patch);
      if (data.newBadge) setMsg(`You earned the ${data.newBadge.name} badge!`);
    } catch (e) { setError(errorMessage(e)); load(); }
  };
  const remove = async (id) => { await api.delete(`/applications/${id}`); load(); };

  if (error) return <Alert>{error}</Alert>;
  if (!apps) return <ListRowsSkeleton label="Loading your applications" />;
  if (!apps.length) return <EmptyState icon={FileText} title="No applications yet">When you click “Apply now” on a scholarship and continue to its website, it appears here so you can track it.</EmptyState>;

  return (
    <div className="space-y-3">
      {msg && <Alert tone="success">{msg}</Alert>}
      <ul className="space-y-3">
        {apps.map((a) => (
          <li key={a.id} className="bg-white rounded-xl border border-line p-4 grid gap-3 md:grid-cols-[1.4fr_1fr_1.4fr_auto] md:items-center">
            <div>
              <p className="font-semibold">{a.scholarship.name}</p>
              <p className="text-sm text-ink-soft">{a.scholarship.hostUniversity || a.scholarship.orgName} — started {formatDate(a.dateApplied)}</p>
            </div>
            <label className="text-sm">
              <span className="sr-only">Status</span>
              <select value={a.status} onChange={(e) => update(a.id, { status: e.target.value })} className="w-full min-h-11 rounded-lg border border-line bg-white px-3">
                {Object.entries(APP_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </label>
            <label className="text-sm">
              <span className="sr-only">Notes</span>
              <input defaultValue={a.notes || ''} placeholder="Notes, e.g. missing recommendation letter" maxLength={500}
                onBlur={(e) => e.target.value !== (a.notes || '') && update(a.id, { notes: e.target.value })}
                className="w-full min-h-11 rounded-lg border border-line px-3" />
            </label>
            <div className="flex gap-1">
              <Button variant="ghost" href={a.scholarship.applyUrl} target="_blank" rel="noopener noreferrer" className="px-3">Open <ExternalLink size={15} aria-hidden="true" /></Button>
              <Button variant="ghost" onClick={() => remove(a.id)} className="px-3 text-danger" aria-label={`Remove ${a.scholarship.name}`}>Remove</Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
