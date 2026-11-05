import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, Link2, Sparkles, TriangleAlert } from 'lucide-react';
import { Button } from '../ui';
import { api, errorMessage } from '../../services/api';

// "Import from the official page": INUKA reads the page and fills in the scholarship form.
// The admin checks every field before saving; imported listings start hidden from the website.
export default function ScholarshipImport({ initialUrl, onDraft }) {
  const [url, setUrl] = useState(initialUrl || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const ran = useRef(false);

  const run = async (link = url) => {
    if (!link.trim()) return;
    setBusy(true); setError(''); setResult(null);
    try {
      const { data } = await api.post('/admin/scholarships/import', { url: link.trim() }, { timeout: 60000 });
      setResult(data);
      onDraft(data.draft);
    } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  };
  useEffect(() => { if (initialUrl && !ran.current) { ran.current = true; run(initialUrl); } }, [initialUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <section className="rounded-xl border border-brand/25 bg-brand-soft/50 p-5" aria-labelledby="import-title">
      <h2 id="import-title" className="text-base font-semibold flex items-center gap-2"><Sparkles size={17} className="text-brand" aria-hidden="true" />Fill in from a link</h2>
      <p className="text-sm text-ink-soft mt-1">Paste the scholarship's official page. INUKA reads it and fills in the form below; you check every field before saving.</p>
      <form onSubmit={(e) => { e.preventDefault(); run(); }} className="mt-3 flex flex-col sm:flex-row gap-2">
        <label className="flex-1 flex items-center gap-2 min-h-11 rounded-lg border border-line bg-surface px-3">
          <Link2 size={16} className="text-ink-soft shrink-0" aria-hidden="true" /><span className="sr-only">Official page link</span>
          <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.example.org/scholarship" className="flex-1 min-w-0 bg-transparent outline-none text-sm" />
        </label>
        <Button type="submit" variant="dark" loading={busy} disabled={!url.trim()} className="!min-h-11 text-sm">{busy ? 'Reading the page…' : 'Fill in the form'}</Button>
      </form>
      {error && <p className="mt-3 text-sm text-danger-ink" role="alert">{error}</p>}
      {result && (
        <div className="mt-3 rounded-lg bg-surface border border-line p-3 text-sm space-y-2" aria-live="polite">
          <p className="font-semibold text-success-ink">
            Form filled from <a href={result.page.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{result.page.host}<ExternalLink size={12} className="inline ml-0.5 -mt-0.5" aria-hidden="true" /></a>
            {result.aiUsed ? ' with INUKA AI.' : '.'} It is set to hidden until you tick “Visible on the website”.
          </p>
          {result.notes.length > 0 && (
            <ul className="space-y-1">
              {result.notes.map((n) => <li key={n} className="flex gap-2 text-warning-ink"><TriangleAlert size={15} className="shrink-0 mt-0.5" aria-hidden="true" />{n}</li>)}
            </ul>
          )}
          {result.existing.length > 0 && (
            <p className="text-warning-ink">Maybe already on INUKA: {result.existing.map((s, i) => <span key={s.id}>{i > 0 && ', '}<Link to={`/admin/scholarships/${s.id}`} className="underline underline-offset-2">{s.name}</Link></span>)}</p>
          )}
          <p className="text-xs text-ink-soft">Always compare the deadline, eligibility and the application link with the official website before you publish.</p>
        </div>
      )}
    </section>
  );
}
