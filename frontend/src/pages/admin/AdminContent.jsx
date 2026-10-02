import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import RichEditor from '../../components/editor/RichEditor';
import { Download, Mail, MailOpen, Pencil, Plus, Reply, Trash2 } from 'lucide-react';
import { Alert, Button, Card, EmptyState, Field, Pill } from '../../components/ui';
import { ListRowsSkeleton } from '../../components/ui/Skeletons';
import { ActionBar, BackLink, PageTitle } from '../../components/admin/AdminUI';
import { useConfirm, useToast } from '../../context/FeedbackContext';
import { plainText } from '../../utils/sanitize';
import { api, errorMessage } from '../../services/api';
import { formatDate } from '../../utils/format';

// Field types: text, rich (short formatted text), html (full editor), url, number, date, checkbox, select (with options)
const TYPES = {
  posts: {
    label: 'News & guides', one: 'article', where: 'News page (/news) and the home page',
    title: (i) => i.title, sub: (i) => `${i.category} · ${formatDate(i.publishedAt)} · ${i.authorName}`,
    empty: { title: '', category: 'guide', excerpt: '', contentHtml: '', authorName: 'INUKA Team', readMinutes: 3, publishedAt: new Date().toISOString().slice(0, 10), isPublished: true },
    fields: [
      ['title', 'Title', 'text'], ['category', 'Type', 'select', [['guide', 'Guide'], ['news', 'News'], ['story', 'Student story']]],
      ['excerpt', 'Short summary (shown on cards)', 'rich'], ['contentHtml', 'Article', 'html'],
      ['authorName', 'Author', 'text'], ['readMinutes', 'Minutes to read', 'number'],
      ['publishedAt', 'Publish date (a future date schedules it)', 'date'], ['isPublished', 'Show on the website', 'checkbox'],
    ],
  },
  testimonials: {
    label: 'Testimonials', one: 'testimonial', where: 'home page, "What our students say"',
    note: 'Only publish real words from real people, with their written permission to use their name and photo.',
    title: (i) => i.name, sub: (i) => { const q = plainText(i.quote); return `${i.country}${i.role ? ` · ${i.role}` : ''} · “${q.slice(0, 70)}${q.length > 70 ? '…' : ''}”`; },
    empty: { name: '', country: '', role: '', quote: '', photoUrl: '', orderIndex: 0, isPublished: true },
    fields: [['name', 'Name', 'text'], ['country', 'Country', 'text'], ['role', 'Role (optional), e.g. "Mastercard Foundation Scholar, 2027"', 'text'], ['quote', 'Their words', 'rich'], ['photoUrl', 'Photo link (optional)', 'url'], ['orderIndex', 'Order (0 first)', 'number'], ['isPublished', 'Show on the website', 'checkbox']],
  },
  team: {
    label: 'Team', one: 'team member', where: 'home page, "Meet the team"',
    title: (i) => i.name, sub: (i) => i.role,
    empty: { name: '', role: '', bio: '', photoUrl: '', linkedinUrl: '', facebookUrl: '', xUrl: '', instagramUrl: '', orderIndex: 0, isPublished: true },
    fields: [['name', 'Name', 'text'], ['role', 'Role', 'text'], ['bio', 'Short bio (optional)', 'rich'], ['photoUrl', 'Photo link (optional)', 'url'], ['linkedinUrl', 'LinkedIn link (optional)', 'url'], ['facebookUrl', 'Facebook link (optional)', 'url'], ['xUrl', 'X (Twitter) link (optional)', 'url'], ['instagramUrl', 'Instagram link (optional)', 'url'], ['orderIndex', 'Order (0 first)', 'number'], ['isPublished', 'Show on the website', 'checkbox']],
  },
  partners: {
    label: 'Partners & sponsors', one: 'partner', where: 'home page, "Partners & sponsors"',
    note: 'Only show an organisation after it has agreed to be listed as an INUKA partner or sponsor.',
    title: (i) => i.name, sub: (i) => `${i.kind}${i.websiteUrl ? ` · ${i.websiteUrl}` : ''}`,
    empty: { name: '', kind: 'partner', description: '', websiteUrl: '', logoUrl: '', orderIndex: 0, isPublished: false },
    fields: [['name', 'Organisation', 'text'], ['kind', 'Type', 'select', [['partner', 'Partner'], ['sponsor', 'Sponsor']]], ['description', 'Short description (optional)', 'rich'], ['websiteUrl', 'Website (optional)', 'url'], ['logoUrl', 'Logo (a link, or a file name in frontend/public/partners/)', 'text'], ['orderIndex', 'Order (0 first)', 'number'], ['isPublished', 'Show on the website', 'checkbox']],
  },
  faq: {
    label: 'FAQ', one: 'question', where: 'home page, "Questions"',
    title: (i) => i.question, sub: (i) => plainText(i.answer).slice(0, 100),
    empty: { question: '', answer: '', orderIndex: 0, isPublished: true },
    fields: [['question', 'Question', 'text'], ['answer', 'Answer', 'html'], ['orderIndex', 'Order (0 first)', 'number'], ['isPublished', 'Show on the website', 'checkbox']],
  },
  tips: {
    label: 'Tips', one: 'tip', where: 'tips for students',
    title: (i) => i.title, sub: (i) => plainText(i.body).slice(0, 100),
    empty: { icon: 'lightbulb', title: '', body: '', orderIndex: 0, isPublished: true },
    fields: [['title', 'Title', 'text'], ['body', 'Tip', 'rich'], ['icon', 'Icon name (optional)', 'text'], ['orderIndex', 'Order (0 first)', 'number'], ['isPublished', 'Show on the website', 'checkbox']],
  },
};
const TABS = ['messages', ...Object.keys(TYPES), 'subscribers'];

// Website content (home page sections, News & guides) and email subscribers.
export default function AdminContent() {
  const [params, setParams] = useSearchParams();
  const tab = TABS.includes(params.get('tab')) ? params.get('tab') : 'messages';
  useEffect(() => { document.title = 'Website content — INUKA admin'; }, []);
  return (
    <div className="space-y-5">
      <PageTitle title="Website content" intro="Everything visitors read on the website: articles, testimonials, team, partners, questions and tips. Changes appear straight away." />
      <div role="tablist" className="flex gap-1 border-b border-line overflow-x-auto">
        {TABS.map((k) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setParams({ tab: k })}
            className={`min-h-11 px-4 font-medium whitespace-nowrap border-b-2 -mb-px ${tab === k ? 'border-brand text-brand' : 'border-transparent text-ink-soft hover:text-ink'}`}>
            {k === 'subscribers' ? 'Email subscribers' : k === 'messages' ? 'Messages' : TYPES[k].label}
          </button>
        ))}
      </div>
      {tab === 'subscribers' ? <Subscribers /> : tab === 'messages' ? <Messages /> : <ContentList key={tab} type={tab} />}
    </div>
  );
}

function ContentList({ type }) {
  const t = TYPES[type];
  const confirm = useConfirm();
  const toast = useToast();
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');
  const load = () => api.get(`/admin/content/${type}`).then((r) => setItems(r.data.items)).catch((e) => setError(errorMessage(e)));
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const remove = async (i) => {
    const ok = await confirm({ title: `Delete this ${t.one}?`, message: `"${plainText(t.title(i))}" is removed from the website for good. This cannot be undone. To keep it, untick "Show on the website" instead.`, confirmLabel: `Yes, delete ${t.one}`, tone: 'danger' });
    if (!ok) return;
    try { await api.delete(`/admin/content/${type}/${i.id}`); toast.success(`${cap(t.one)} deleted.`); load(); } catch (e) { toast.error(errorMessage(e)); }
  };
  const addTo = `/admin/content/${type}/new`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-soft">Shown on the {t.where}.</p>
        <Button to={addTo}><Plus size={18} aria-hidden="true" />Add {t.one}</Button>
      </div>
      {t.note && <Alert tone="info">{t.note}</Alert>}
      {error && <Alert>{error}</Alert>}
      {!items ? <ListRowsSkeleton rows={4} /> : items.length === 0 ? (
        <EmptyState title={`No ${t.label.toLowerCase()} yet`} action={<Button to={addTo}>Add the first {t.one}</Button>}>When there is nothing to show, the section is hidden on the website.</EmptyState>
      ) : (
        <ul className="bg-surface rounded-xl border border-line divide-y divide-line">
          {items.map((i) => (
            <li key={i.id} className="px-4 py-3 flex items-center gap-3">
              <Link to={`/admin/content/${type}/${i.id}`} className="min-w-0 flex-1 group">
                <p className="font-semibold truncate group-hover:underline">{t.title(i)}</p>
                <p className="text-sm text-ink-soft truncate">{t.sub(i)}</p>
              </Link>
              {i.isSample && <Pill>Placeholder (hidden in production)</Pill>}
              {!i.isPublished && <Pill>Hidden</Pill>}
              <Link to={`/admin/content/${type}/${i.id}`} className="w-11 h-11 rounded-lg hover:bg-brand-soft flex items-center justify-center" aria-label={`Edit ${t.title(i)}`}><Pencil size={17} /></Link>
              <button type="button" onClick={() => remove(i)} className="w-11 h-11 rounded-lg hover:bg-brand-soft text-ink-soft hover:text-danger flex items-center justify-center" aria-label={`Delete ${t.title(i)}`}><Trash2 size={17} /></button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const cap = (x) => `${x[0].toUpperCase()}${x.slice(1)}`;

// Add or edit one item of website content, on its own page: /admin/content/:type/new or /admin/content/:type/:id
export function AdminContentItem() {
  const { type, id } = useParams();
  const t = TYPES[type];
  const isNew = id === 'new';
  const navigate = useNavigate();
  const confirm = useConfirm();
  const toast = useToast();
  const [f, setF] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const back = `/admin/content?tab=${type}`;

  useEffect(() => {
    if (!t) return;
    document.title = `${isNew ? 'Add' : 'Edit'} ${t.one} — INUKA admin`;
    const fill = (item) => {
      const base = { ...t.empty };
      if (item) for (const k of Object.keys(base)) base[k] = item[k] ?? base[k];
      if (base.publishedAt) base.publishedAt = String(base.publishedAt).slice(0, 10);
      setF(base);
    };
    if (isNew) { fill(null); return; }
    api.get(`/admin/content/${type}`).then((r) => {
      const item = r.data.items.find((x) => x.id === id);
      if (item) fill(item); else setError(`This ${t.one} was not found. It may have been deleted.`);
    }).catch((e) => setError(errorMessage(e)));
  }, [type, id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!t) return <Alert>Unknown content type.</Alert>;
  if (!f) return error ? <div className="space-y-4"><BackLink to={back}>{t.label}</BackLink><Alert>{error}</Alert></div> : <ListRowsSkeleton rows={6} />;

  const save = async (e) => {
    e.preventDefault(); setBusy(true); setError('');
    try {
      if (isNew) await api.post(`/admin/content/${type}`, f); else await api.put(`/admin/content/${type}/${id}`, f);
      toast.success(isNew ? `${cap(t.one)} added.` : 'Changes saved.');
      navigate(back);
    } catch (err) { setError(errorMessage(err)); window.scrollTo({ top: 0, behavior: 'smooth' }); } finally { setBusy(false); }
  };
  const remove = async () => {
    const ok = await confirm({ title: `Delete this ${t.one}?`, message: 'It is removed from the website for good. This cannot be undone. To keep it, untick "Show on the website" instead.', confirmLabel: `Yes, delete ${t.one}`, tone: 'danger' });
    if (!ok) return;
    try { await api.delete(`/admin/content/${type}/${id}`); toast.success(`${cap(t.one)} deleted.`); navigate(back); } catch (err) { toast.error(errorMessage(err)); }
  };

  return (
    <form onSubmit={save} className="space-y-6 max-w-4xl" noValidate>
      <BackLink to={back}>{t.label}</BackLink>
      <PageTitle title={isNew ? `Add ${t.one}` : `Edit ${t.one}`} intro={`Shown on the ${t.where}.`} />
      {t.note && <Alert tone="info">{t.note}</Alert>}
      {error && <Alert>{error}</Alert>}
      <Card className="space-y-4">
        {t.fields.map(([k, label, kind, options]) => {
          const set = (e) => setF({ ...f, [k]: kind === 'checkbox' ? e.target.checked : e.target.value });
          if (kind === 'checkbox') return <label key={k} className="flex items-center gap-3 min-h-11"><input type="checkbox" className="w-5 h-5 accent-[#07294D]" checked={!!f[k]} onChange={set} />{label}</label>;
          if (kind === 'select') return <Field key={k} as="select" label={label} value={f[k]} onChange={set}>{options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Field>;
          if (kind === 'rich' || kind === 'html') {
            return <RichEditor showLabel key={k} variant={kind === 'rich' ? 'compact' : 'full'} label={label} value={f[k] || ''} onChange={(html) => setF((x) => ({ ...x, [k]: html }))} minHeight={kind === 'rich' ? undefined : k === 'answer' ? 160 : 320} />;
          }
          return <Field key={k} label={label} type={kind === 'number' ? 'number' : kind === 'date' ? 'date' : kind === 'url' ? 'url' : 'text'} value={f[k] ?? ''} onChange={set} />;
        })}
      </Card>
      <ActionBar>
        <Button type="submit" loading={busy}>{isNew ? `Add ${t.one}` : 'Save changes'}</Button>
        <Button variant="ghost" to={back}>Cancel</Button>
        {!isNew && <Button variant="ghost" className="text-danger ml-auto" onClick={remove}><Trash2 size={18} aria-hidden="true" />Delete</Button>}
      </ActionBar>
    </form>
  );
}

function Subscribers() {
  const confirm = useConfirm();
  const toast = useToast();
  const [list, setList] = useState(null);
  const load = () => api.get('/admin/subscribers').then((r) => setList(r.data.subscribers));
  useEffect(() => { load(); }, []);
  const download = async () => {
    const r = await api.get('/admin/subscribers.csv', { responseType: 'blob' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(r.data); a.download = 'inuka-subscribers.csv'; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  const remove = async (s) => {
    const ok = await confirm({ title: `Remove ${s.email}?`, message: 'They will no longer get scholarship alerts. This cannot be undone.', confirmLabel: 'Yes, remove', tone: 'danger' });
    if (!ok) return;
    try { await api.delete(`/admin/subscribers/${s.id}`); toast.success(`${s.email} was removed.`); load(); } catch (e) { toast.error(errorMessage(e)); }
  };
  if (!list) return <ListRowsSkeleton rows={4} />;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-soft">{list.length} {list.length === 1 ? 'person' : 'people'} asked for scholarship alerts on the home page.</p>
        <Button variant="outline" onClick={download} disabled={!list.length}><Download size={18} aria-hidden="true" />Download CSV</Button>
      </div>
      {list.length === 0 ? <EmptyState title="No subscribers yet">Email addresses from the "Get scholarship alerts" box appear here.</EmptyState> : (
        <ul className="bg-surface rounded-xl border border-line divide-y divide-line">
          {list.map((s) => (
            <li key={s.id} className="px-4 py-2.5 flex items-center gap-3">
              <span className="flex-1 min-w-0 truncate">{s.email}</span>
              <span className="text-sm text-ink-soft">{formatDate(s.createdAt)}</span>
              <button type="button" onClick={() => remove(s)} className="w-11 h-11 rounded-lg text-ink-soft hover:text-danger hover:bg-brand-soft flex items-center justify-center" aria-label={`Remove ${s.email}`}><Trash2 size={17} /></button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Questions sent with the "Submit your query" form on the home page.
function Messages() {
  const confirm = useConfirm();
  const toast = useToast();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const load = () => api.get('/admin/messages').then((r) => setData(r.data)).catch((e) => setError(errorMessage(e)));
  useEffect(() => { load(); }, []);
  const mark = async (m, isRead) => { try { await api.patch(`/admin/messages/${m.id}`, { isRead }); load(); } catch (e) { toast.error(errorMessage(e)); } };
  const remove = async (m) => {
    const ok = await confirm({ title: `Delete the message from ${m.name}?`, message: 'It is deleted for good. This cannot be undone.', confirmLabel: 'Yes, delete', tone: 'danger' });
    if (!ok) return;
    try { await api.delete(`/admin/messages/${m.id}`); toast.success('Message deleted.'); load(); } catch (e) { toast.error(errorMessage(e)); }
  };
  if (error) return <Alert>{error}</Alert>;
  if (!data) return <ListRowsSkeleton rows={4} />;
  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-soft">Questions sent with the "Submit your query" form on the home page{data.unread ? ` · ${data.unread} not read yet` : ''}. Reply by email.</p>
      {data.messages.length === 0 ? <EmptyState title="No messages yet">Questions from the home page form appear here.</EmptyState> : (
        <ul className="space-y-3">
          {data.messages.map((m) => (
            <li key={m.id} className={`bg-surface rounded-md border p-4 sm:p-5 ${m.isRead ? 'border-line' : 'border-accent shadow-[inset_4px_0_0_var(--color-accent)]'}`}>
              <div className="flex flex-wrap items-start gap-x-3 gap-y-1">
                <p className="font-semibold">{m.name}</p>
                <a href={`mailto:${m.email}`} className="text-brand hover:underline break-all">{m.email}</a>
                <span className="text-sm text-ink-soft sm:ml-auto">{formatDate(m.createdAt)}</span>
                {!m.isRead && <Pill tone="brand">New</Pill>}
              </div>
              <p className="mt-2 whitespace-pre-line text-ink">{m.message}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button href={`mailto:${m.email}?subject=${encodeURIComponent('Your question to INUKA')}&body=${encodeURIComponent(`Hello ${m.name.split(' ')[0]},\n\n\n\n> ${m.message.slice(0, 500)}`)}`} onClick={() => !m.isRead && mark(m, true)} className="min-h-10 px-4"><Reply size={16} aria-hidden="true" />Reply by email</Button>
                <Button variant="ghost" onClick={() => mark(m, !m.isRead)} className="min-h-10 px-3">{m.isRead ? <><Mail size={16} aria-hidden="true" />Mark as new</> : <><MailOpen size={16} aria-hidden="true" />Mark as read</>}</Button>
                <Button variant="ghost" onClick={() => remove(m)} className="min-h-10 px-3 text-danger"><Trash2 size={16} aria-hidden="true" />Delete</Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

