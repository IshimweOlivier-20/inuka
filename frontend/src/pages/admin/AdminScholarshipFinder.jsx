import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CircleAlert, CircleCheck, ExternalLink, Plus, RefreshCw, Rss, Trash2, Undo2, X } from 'lucide-react';
import { Alert, Button, Field, Modal } from '../../components/ui';
import { ListRowsSkeleton } from '../../components/ui/Skeletons';
import { BackLink, PageTitle } from '../../components/admin/AdminUI';
import { useConfirm, useToast } from '../../context/FeedbackContext';
import { api, errorMessage } from '../../services/api';
import { formatDate, timeAgo } from '../../utils/format';

// Scholarship finder: scholarship posts found in news feeds wait here until an admin imports or dismisses them.
// Import = read the post, find the official link, check every detail, publish. Nothing is published automatically.
const TABS = [['new', 'Waiting for review'], ['imported', 'Imported'], ['dismissed', 'Dismissed']];
const host = (u) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return u; } };

export default function AdminScholarshipFinder() {
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  const [tab, setTab] = useState('new');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);
  const [adding, setAdding] = useState(false);
  const [feed, setFeed] = useState({ name: '', url: '' });
  const [feedErr, setFeedErr] = useState('');
  const [saving, setSaving] = useState(false);

  const load = (t = tab) => api.get('/admin/scholarship-leads', { params: { status: t } }).then((r) => setData(r.data)).catch((e) => setError(errorMessage(e)));
  useEffect(() => { document.title = 'Find new scholarships — INUKA admin'; }, []);
  useEffect(() => { setData(null); load(tab); }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  const act = async (lead, action) => {
    try {
      await api.post(`/admin/scholarship-leads/${lead.id}/${action}`);
      setData((d) => ({ ...d, leads: d.leads.filter((l) => l.id !== lead.id), counts: { ...d.counts, [tab]: (d.counts[tab] || 1) - 1, [action === 'dismiss' ? 'dismissed' : 'new']: (d.counts[action === 'dismiss' ? 'dismissed' : 'new'] || 0) + 1 } }));
    } catch (e) { toast.error(errorMessage(e)); }
  };
  const checkNow = async () => {
    setChecking(true);
    try {
      const { data: r } = await api.post('/admin/lead-sources/check', {}, { timeout: 120000 });
      toast.success(r.found ? `${r.found} new scholarship post${r.found === 1 ? '' : 's'} found.` : 'No new scholarship posts since the last check.');
      setTab('new'); load('new');
    } catch (e) { toast.error(errorMessage(e)); } finally { setChecking(false); }
  };
  const addFeed = async (e) => {
    e.preventDefault(); setSaving(true); setFeedErr('');
    try {
      const { data: r } = await api.post('/admin/lead-sources', feed, { timeout: 60000 });
      setAdding(false); setFeed({ name: '', url: '' });
      if (r.source.lastError) toast.error(`Feed added, but it could not be read: ${r.source.lastError}`);
      else toast.success(`Feed added: ${r.source.lastFound} scholarship post${r.source.lastFound === 1 ? '' : 's'} found.`);
      load();
    } catch (err) { setFeedErr(errorMessage(err)); } finally { setSaving(false); }
  };
  const toggleFeed = async (s) => {
    try { await api.patch(`/admin/lead-sources/${s.id}`, { isActive: !s.isActive }); load(); } catch (e) { toast.error(errorMessage(e)); }
  };
  const removeFeed = async (s) => {
    if (!(await confirm({ title: `Stop following "${s.name}"?`, message: 'Posts already found stay in the list.', confirmLabel: 'Remove feed', tone: 'danger' }))) return;
    try { await api.delete(`/admin/lead-sources/${s.id}`); load(); } catch (e) { toast.error(errorMessage(e)); }
  };

  return (
    <div className="space-y-5">
      <BackLink to="/admin/scholarships">All scholarships</BackLink>
      <PageTitle title="Find new scholarships"
        intro="INUKA reads scholarship news feeds every 12 hours and lists new posts here. Import a post to fill in the form from its page, check every detail on the official website, then publish. Nothing goes on the website without a person checking it."
        action={<Button onClick={checkNow} loading={checking} variant="outline"><RefreshCw size={17} aria-hidden="true" />Check feeds now</Button>} />
      {error && <Alert>{error}</Alert>}

      <div className="grid lg:grid-cols-[minmax(0,1fr)_320px] gap-5 items-start">
        <section className="bg-surface rounded-xl border border-line overflow-hidden">
          <div role="tablist" className="flex gap-1 px-3 border-b border-line overflow-x-auto">
            {TABS.map(([k, l]) => (
              <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
                className={`min-h-11 px-3 text-sm font-semibold whitespace-nowrap border-b-2 -mb-px ${tab === k ? 'border-brand text-brand' : 'border-transparent text-ink-soft hover:text-ink'}`}>
                {l}{data?.counts?.[k] ? <span className="ml-1.5 text-xs rounded-full bg-brand-soft px-1.5 py-0.5">{data.counts[k]}</span> : null}
              </button>
            ))}
          </div>
          {!data ? <div className="p-4"><ListRowsSkeleton rows={5} /></div> : data.leads.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-ink-soft">{tab === 'new' ? 'Nothing waiting. Press “Check feeds now”, or add a feed on the right.' : 'Nothing here yet.'}</p>
          ) : (
            <ul className="divide-y divide-line">
              {data.leads.map((l) => (
                <li key={l.id} className="px-5 py-4 flex flex-wrap items-start gap-3">
                  <div className="flex-1 min-w-[220px]">
                    <a href={l.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand hover:underline">{l.title}<ExternalLink size={13} className="inline ml-1 -mt-0.5" aria-hidden="true" /></a>
                    <p className="text-xs text-ink-soft mt-0.5">{l.source?.name || host(l.url)} · {l.publishedAt ? formatDate(l.publishedAt) : `found ${timeAgo(l.createdAt)}`}</p>
                    {l.summary && <p className="text-sm text-ink-soft mt-1 line-clamp-2">{l.summary}</p>}
                  </div>
                  <div className="flex gap-2">
                    {tab === 'new' && (
                      <>
                        <Button onClick={() => navigate(`/admin/scholarships/new?import=${encodeURIComponent(l.url)}&lead=${l.id}`)} className="!min-h-9 !px-3 text-sm">Import</Button>
                        <Button variant="ghost" onClick={() => act(l, 'dismiss')} className="!min-h-9 !px-3 text-sm"><X size={15} aria-hidden="true" />Dismiss</Button>
                      </>
                    )}
                    {tab === 'dismissed' && <Button variant="ghost" onClick={() => act(l, 'restore')} className="!min-h-9 !px-3 text-sm"><Undo2 size={15} aria-hidden="true" />Restore</Button>}
                    {tab === 'imported' && l.scholarshipId && <Link to={`/admin/scholarships/${l.scholarshipId}`} className="text-sm font-semibold text-brand hover:underline self-center">Open listing</Link>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <aside className="bg-surface rounded-xl border border-line p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold flex items-center gap-2"><Rss size={16} className="text-brand" aria-hidden="true" />Feeds we follow</h2>
            <button type="button" onClick={() => { setAdding(true); setFeedErr(''); }} className="text-sm font-semibold text-brand hover:underline inline-flex items-center gap-1"><Plus size={14} aria-hidden="true" />Add</button>
          </div>
          {!data ? null : data.sources.length === 0 ? <p className="text-sm text-ink-soft mt-3">No feeds yet.</p> : (
            <ul className="mt-3 space-y-3">
              {data.sources.map((s) => (
                <li key={s.id} className="rounded-lg border border-line p-3 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold leading-snug">{s.name}</p>
                    <button type="button" onClick={() => removeFeed(s)} aria-label={`Remove ${s.name}`} className="text-ink-soft hover:text-danger"><Trash2 size={15} /></button>
                  </div>
                  <p className="text-xs text-ink-soft break-all">{host(s.url)}</p>
                  <p className={`text-xs mt-1.5 flex gap-1 ${s.lastError ? 'text-danger-ink' : 'text-success-ink'}`}>
                    {s.lastError ? <CircleAlert size={13} className="shrink-0 mt-px" aria-hidden="true" /> : s.lastCheckedAt && <CircleCheck size={13} className="shrink-0 mt-px" aria-hidden="true" />}
                    {s.lastError ? s.lastError : s.lastCheckedAt ? `Checked ${timeAgo(s.lastCheckedAt)} · ${s.lastFound} new` : <span className="text-ink-soft">Not checked yet</span>}
                  </p>
                  <label className="mt-2 inline-flex items-center gap-2 text-xs cursor-pointer"><input type="checkbox" checked={s.isActive} onChange={() => toggleFeed(s)} className="w-4 h-4 accent-[#07294D]" />Follow this feed</label>
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs text-ink-soft mt-4">A feed is the RSS address of a scholarship news site, often the site address + <code>/feed/</code>. Posts are only leads: always publish from the official website.</p>
        </aside>
      </div>

      <Modal open={adding} onClose={() => setAdding(false)} title="Follow a news feed"
        footer={<><Button variant="ghost" onClick={() => setAdding(false)}>Cancel</Button><Button type="submit" form="feed-form" loading={saving}>Add and check</Button></>}>
        <form id="feed-form" onSubmit={addFeed} className="space-y-3">
          <Field label="Name" value={feed.name} onChange={(e) => setFeed({ ...feed, name: e.target.value })} placeholder="Scholarships for Africans" required />
          <Field label="Feed address (RSS or Atom)" type="url" value={feed.url} onChange={(e) => setFeed({ ...feed, url: e.target.value })} placeholder="https://example.com/category/scholarships/feed/" required />
          {feedErr && <Alert>{feedErr}</Alert>}
        </form>
      </Modal>
    </div>
  );
}
