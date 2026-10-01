import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import RichEditor from '../../components/editor/RichEditor';
import { Download, Pencil, Plus, Trash2 } from 'lucide-react';
import { Alert, Button, EmptyState, Field, Modal, Pill } from '../../components/ui';
import { ListRowsSkeleton } from '../../components/ui/Skeletons';
import { PageTitle } from '../../components/admin/AdminUI';
import { api, errorMessage } from '../../services/api';
import { formatDate } from '../../utils/format';

// Field types: text, textarea, html, url, number, date, checkbox, select (with options)
const TYPES = {
  posts: {
    label: 'News & guides', one: 'article', where: 'News page (/news) and the home page',
    title: (i) => i.title, sub: (i) => `${i.category} · ${formatDate(i.publishedAt)} · ${i.authorName}`,
    empty: { title: '', category: 'guide', excerpt: '', contentHtml: '', authorName: 'INUKA Team', readMinutes: 3, publishedAt: new Date().toISOString().slice(0, 10), isPublished: true },
    fields: [
      ['title', 'Title', 'text'], ['category', 'Type', 'select', [['guide', 'Guide'], ['news', 'News'], ['story', 'Student story']]],
      ['excerpt', 'Short summary (shown on cards)', 'textarea'], ['contentHtml', 'Article', 'html'],
      ['authorName', 'Author', 'text'], ['readMinutes', 'Minutes to read', 'number'],
      ['publishedAt', 'Publish date (a future date schedules it)', 'date'], ['isPublished', 'Show on the website', 'checkbox'],
    ],
  },
  testimonials: {
    label: 'Testimonials', one: 'testimonial', where: 'home page, "What our students say"',
    note: 'Only publish real words from real people, with their written permission to use their name and photo.',
    title: (i) => i.name, sub: (i) => `${i.country}${i.role ? ` · ${i.role}` : ''} · “${i.quote.slice(0, 70)}${i.quote.length > 70 ? '…' : ''}”`,
    empty: { name: '', country: '', role: '', quote: '', photoUrl: '', orderIndex: 0, isPublished: true },
    fields: [['name', 'Name', 'text'], ['country', 'Country', 'text'], ['role', 'Role (optional), e.g. "Mastercard Foundation Scholar, 2027"', 'text'], ['quote', 'Their words', 'textarea'], ['photoUrl', 'Photo link (optional)', 'url'], ['orderIndex', 'Order (0 first)', 'number'], ['isPublished', 'Show on the website', 'checkbox']],
  },
  team: {
    label: 'Team', one: 'team member', where: 'home page, "Meet the team"',
    title: (i) => i.name, sub: (i) => i.role,
    empty: { name: '', role: '', bio: '', photoUrl: '', linkedinUrl: '', orderIndex: 0, isPublished: true },
    fields: [['name', 'Name', 'text'], ['role', 'Role', 'text'], ['bio', 'Short bio (optional)', 'textarea'], ['photoUrl', 'Photo link (optional)', 'url'], ['linkedinUrl', 'LinkedIn link (optional)', 'url'], ['orderIndex', 'Order (0 first)', 'number'], ['isPublished', 'Show on the website', 'checkbox']],
  },
  partners: {
    label: 'Partners & sponsors', one: 'partner', where: 'home page, "Partners & sponsors"',
    note: 'Only show an organisation after it has agreed to be listed as an INUKA partner or sponsor.',
    title: (i) => i.name, sub: (i) => `${i.kind}${i.websiteUrl ? ` · ${i.websiteUrl}` : ''}`,
    empty: { name: '', kind: 'partner', description: '', websiteUrl: '', logoUrl: '', orderIndex: 0, isPublished: false },
    fields: [['name', 'Organisation', 'text'], ['kind', 'Type', 'select', [['partner', 'Partner'], ['sponsor', 'Sponsor']]], ['description', 'Short description (optional)', 'textarea'], ['websiteUrl', 'Website (optional)', 'url'], ['logoUrl', 'Logo (a link, or a file name in frontend/public/partners/)', 'text'], ['orderIndex', 'Order (0 first)', 'number'], ['isPublished', 'Show on the website', 'checkbox']],
  },
  faq: {
    label: 'FAQ', one: 'question', where: 'home page, "Questions"',
    title: (i) => i.question, sub: (i) => i.answer.replace(/<[^>]+>/g, ' ').slice(0, 100),
    empty: { question: '', answer: '', orderIndex: 0, isPublished: true },
    fields: [['question', 'Question', 'text'], ['answer', 'Answer', 'html'], ['orderIndex', 'Order (0 first)', 'number'], ['isPublished', 'Show on the website', 'checkbox']],
  },
  tips: {
    label: 'Tips', one: 'tip', where: 'tips for students',
    title: (i) => i.title, sub: (i) => i.body.slice(0, 100),
    empty: { icon: 'lightbulb', title: '', body: '', orderIndex: 0, isPublished: true },
    fields: [['title', 'Title', 'text'], ['body', 'Tip', 'textarea'], ['icon', 'Icon name (optional)', 'text'], ['orderIndex', 'Order (0 first)', 'number'], ['isPublished', 'Show on the website', 'checkbox']],
  },
};
const TABS = [...Object.keys(TYPES), 'subscribers'];

// Website content (home page sections, News & guides) and email subscribers.
export default function AdminContent() {
  const [params, setParams] = useSearchParams();
  const tab = TABS.includes(params.get('tab')) ? params.get('tab') : 'posts';
  useEffect(() => { document.title = 'Website content — INUKA admin'; }, []);
  return (
    <div className="space-y-5">
      <PageTitle title="Website content" intro="Everything visitors read on the website: articles, testimonials, team, partners, questions and tips. Changes appear straight away." />
      <div role="tablist" className="flex gap-1 border-b border-line overflow-x-auto">
        {TABS.map((k) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setParams({ tab: k })}
            className={`min-h-11 px-4 font-medium whitespace-nowrap border-b-2 -mb-px ${tab === k ? 'border-brand text-brand' : 'border-transparent text-ink-soft hover:text-ink'}`}>
            {k === 'subscribers' ? 'Email subscribers' : TYPES[k].label}
          </button>
        ))}
      </div>
      {tab === 'subscribers' ? <Subscribers /> : <ContentList key={tab} type={tab} />}
    </div>
  );
}

function ContentList({ type }) {
  const t = TYPES[type];
  const [items, setItems] = useState(null);
  const [editing, setEditing] = useState(null); // item or 'new'
  const [msg, setMsg] = useState(null);
  const load = () => api.get(`/admin/content/${type}`).then((r) => setItems(r.data.items)).catch((e) => setMsg({ tone: 'error', text: errorMessage(e) }));
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const remove = async (i) => {
    if (!window.confirm(`Delete this ${t.one}?`)) return;
    try { await api.delete(`/admin/content/${type}/${i.id}`); setMsg({ tone: 'success', text: 'Deleted.' }); load(); } catch (e) { setMsg({ tone: 'error', text: errorMessage(e) }); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-soft">Shown on the {t.where}.</p>
        <Button onClick={() => setEditing('new')}><Plus size={18} aria-hidden="true" />Add {t.one}</Button>
      </div>
      {t.note && <Alert tone="info">{t.note}</Alert>}
      {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}
      {!items ? <ListRowsSkeleton rows={4} /> : items.length === 0 ? (
        <EmptyState title={`No ${t.label.toLowerCase()} yet`} action={<Button onClick={() => setEditing('new')}>Add the first {t.one}</Button>}>When there is nothing to show, the section is hidden on the website.</EmptyState>
      ) : (
        <ul className="bg-surface rounded-xl border border-line divide-y divide-line">
          {items.map((i) => (
            <li key={i.id} className="px-4 py-3 flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-semibold truncate">{t.title(i)}</p>
                <p className="text-sm text-ink-soft truncate">{t.sub(i)}</p>
              </div>
              {i.isSample && <Pill>Placeholder (hidden in production)</Pill>}
              {!i.isPublished && <Pill>Hidden</Pill>}
              <button type="button" onClick={() => setEditing(i)} className="w-11 h-11 rounded-lg hover:bg-brand-soft flex items-center justify-center" aria-label={`Edit ${t.title(i)}`}><Pencil size={17} /></button>
              <button type="button" onClick={() => remove(i)} className="w-11 h-11 rounded-lg hover:bg-brand-soft text-ink-soft hover:text-danger flex items-center justify-center" aria-label={`Delete ${t.title(i)}`}><Trash2 size={17} /></button>
            </li>
          ))}
        </ul>
      )}
      {editing && (
        <ItemForm type={type} item={editing === 'new' ? null : editing} onClose={() => setEditing(null)}
          onSaved={(text) => { setEditing(null); setMsg({ tone: 'success', text }); load(); }} />
      )}
    </div>
  );
}

function ItemForm({ type, item, onClose, onSaved }) {
  const t = TYPES[type];
  const [f, setF] = useState(() => {
    const base = { ...t.empty };
    if (item) for (const k of Object.keys(base)) base[k] = item[k] ?? base[k];
    if (base.publishedAt) base.publishedAt = String(base.publishedAt).slice(0, 10);
    return base;
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true); setError('');
    try {
      if (item) await api.put(`/admin/content/${type}/${item.id}`, f); else await api.post(`/admin/content/${type}`, f);
      onSaved(item ? 'Changes saved.' : `${t.one[0].toUpperCase()}${t.one.slice(1)} added.`);
    } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  };

  return (
    <Modal open wide onClose={onClose} title={item ? `Edit ${t.one}` : `Add ${t.one}`}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={save} loading={busy}>{item ? 'Save changes' : `Add ${t.one}`}</Button></>}>
      <div className="space-y-4">
        {error && <Alert>{error}</Alert>}
        {t.fields.map(([k, label, kind, options]) => {
          const set = (e) => setF({ ...f, [k]: kind === 'checkbox' ? e.target.checked : e.target.value });
          if (kind === 'checkbox') return <label key={k} className="flex items-center gap-3 min-h-11"><input type="checkbox" className="w-5 h-5 accent-[#0A6CF0]" checked={!!f[k]} onChange={set} />{label}</label>;
          if (kind === 'select') return <Field key={k} as="select" label={label} value={f[k]} onChange={set}>{options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Field>;
          if (kind === 'textarea') return <Field key={k} as="textarea" rows={3} label={label} value={f[k] ?? ''} onChange={set} />;
          if (kind === 'html') {
            return (
              <div key={k}>
                <p className="text-sm font-medium mb-1.5">{label}</p>
                <RichEditor inModal label={label} value={f[k] || ''} onChange={(html) => setF((x) => ({ ...x, [k]: html }))} minHeight={k === 'answer' ? 140 : 280} />
              </div>
            );
          }
          return <Field key={k} label={label} type={kind === 'number' ? 'number' : kind === 'date' ? 'date' : kind === 'url' ? 'url' : 'text'} value={f[k] ?? ''} onChange={set} />;
        })}
      </div>
    </Modal>
  );
}

function Subscribers() {
  const [list, setList] = useState(null);
  const load = () => api.get('/admin/subscribers').then((r) => setList(r.data.subscribers));
  useEffect(() => { load(); }, []);
  const download = async () => {
    const r = await api.get('/admin/subscribers.csv', { responseType: 'blob' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(r.data); a.download = 'inuka-subscribers.csv'; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  const remove = async (s) => { if (window.confirm(`Remove ${s.email}?`)) { await api.delete(`/admin/subscribers/${s.id}`); load(); } };
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
