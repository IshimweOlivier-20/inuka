import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Alert, Button, Card, Field, Pill } from '../../components/ui';
import { ListRowsSkeleton } from '../../components/ui/Skeletons';
import RichEditor from '../../components/editor/RichEditor';
import { ActionBar, BackLink, PageTitle, Pager, SearchInput, Select } from '../../components/admin/AdminUI';
import { useConfirm, useToast } from '../../context/FeedbackContext';
import { api, errorMessage } from '../../services/api';
import { FUNDING_LABEL, LEVEL_LABEL, formatDate } from '../../utils/format';

// Scholarship management (spec 16.2): add, edit, remove expired, flag refugee-friendly.
export function AdminScholarships() {
  const confirm = useConfirm();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [msg, setMsg] = useState(null);
  const load = () => api.get('/admin/scholarships', { params: { q, status, page } }).then((r) => setData(r.data)).catch((e) => setMsg({ tone: 'error', text: errorMessage(e) }));
  useEffect(() => { document.title = 'Scholarships — INUKA admin'; }, []);
  useEffect(() => { const t = setTimeout(load, q ? 300 : 0); return () => clearTimeout(t); }, [q, status, page]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = async (s, field) => {
    if (field === 'isActive' && s.isActive) {
      const ok = await confirm({ title: `Hide "${s.name}"?`, message: 'Students will no longer see it on the website. It stays here, so you can show it again later.', confirmLabel: 'Yes, hide it' });
      if (!ok) return;
    }
    try {
      await api.patch(`/admin/scholarships/${s.id}`, { [field]: !s[field] });
      toast.success(field === 'isActive' ? (s.isActive ? `"${s.name}" is hidden.` : `"${s.name}" is visible on the website.`) : (s.openToRefugees ? 'Marked as not open to refugees.' : 'Marked as open to refugees.'));
      load();
    } catch (e) { toast.error(errorMessage(e)); }
  };
  const removeExpired = async () => {
    const n = data.expiredActive;
    const ok = await confirm({ title: `Hide ${n} expired ${n === 1 ? 'scholarship' : 'scholarships'}?`, message: 'Scholarships whose deadline has passed are hidden from the website. You can show them again next year.', confirmLabel: 'Yes, hide them' });
    if (!ok) return;
    try {
      const { data: r } = await api.post('/admin/scholarships/remove-expired');
      toast.success(`${r.count} expired ${r.count === 1 ? 'scholarship was' : 'scholarships were'} hidden from the website.`); load();
    } catch (e) { toast.error(errorMessage(e)); }
  };

  return (
    <div className="space-y-5">
      <PageTitle title="Scholarships" intro="Every listing students see on INUKA. Hidden scholarships stay here, so you can show them again next year."
        action={<Button to="/admin/scholarships/new"><Plus size={18} aria-hidden="true" />Add scholarship</Button>} />
      {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}
      {data?.expiredActive > 0 && (
        <div className="rounded-xl bg-surface border border-danger/30 p-4 flex flex-wrap items-center gap-3">
          <p className="flex-1">{data.expiredActive} visible {data.expiredActive === 1 ? 'scholarship has' : 'scholarships have'} a deadline that has passed.</p>
          <Button variant="outline" onClick={removeExpired}>Hide expired scholarships</Button>
        </div>
      )}
      <div className="flex flex-wrap gap-3">
        <SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search by name, organisation or country" label="Search scholarships" />
        <Select label="Status" value={status} onChange={(v) => { setStatus(v); setPage(1); }} options={[['', 'All'], ['active', 'Visible'], ['inactive', 'Hidden'], ['expired', 'Deadline passed']]} />
      </div>
      {!data ? <ListRowsSkeleton rows={6} /> : (
        <div className="bg-surface rounded-xl border border-line overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-paper text-left text-ink-soft">
                <tr><th className="px-4 py-2.5 font-semibold">Scholarship</th><th className="px-4 py-2.5 font-semibold">Deadline</th><th className="px-4 py-2.5 font-semibold">Refugees</th><th className="px-4 py-2.5 font-semibold">Saved / applied</th><th className="px-4 py-2.5 font-semibold">On website</th><th className="px-4 py-2.5"><span className="sr-only">Edit</span></th></tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.scholarships.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-ink-soft">No scholarship matches.</td></tr>}
                {data.scholarships.map((s) => {
                  const past = s.deadline && new Date(s.deadline) < new Date();
                  return (
                    <tr key={s.id}>
                      <td className="px-4 py-3"><p className="font-semibold">{s.name}{s.isFeatured && <span className="ml-1.5"><Pill tone="brand">Featured</Pill></span>}</p><p className="text-ink-soft">{s.orgName} · {s.hostCountry} · {FUNDING_LABEL[s.fundingType]} · {LEVEL_LABEL[s.level]}</p></td>
                      <td className={`px-4 py-3 whitespace-nowrap ${past ? 'text-danger font-semibold' : 'text-ink-soft'}`}>{s.deadline ? formatDate(s.deadline) : 'Varies'}</td>
                      <td className="px-4 py-3">
                        <label className="inline-flex items-center gap-2 min-h-11 cursor-pointer"><input type="checkbox" className="w-5 h-5 accent-[#07294D]" checked={s.openToRefugees} onChange={() => toggle(s, 'openToRefugees')} />{s.refugeesOnly ? 'Only' : 'Open'}</label>
                      </td>
                      <td className="px-4 py-3 text-ink-soft tabular-nums">{s._count.saves} / {s._count.applications}</td>
                      <td className="px-4 py-3"><label className="inline-flex items-center gap-2 min-h-11 cursor-pointer"><input type="checkbox" className="w-5 h-5 accent-[#07294D]" checked={s.isActive} onChange={() => toggle(s, 'isActive')} />{s.isActive ? 'Visible' : 'Hidden'}</label></td>
                      <td className="px-4 py-3 text-right"><Button variant="ghost" to={`/admin/scholarships/${s.id}`} className="px-3">Edit</Button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 pb-4"><Pager page={data.page} pageSize={data.pageSize} total={data.total} onPage={setPage} /></div>
        </div>
      )}
    </div>
  );
}

const EMPTY = {
  name: '', orgName: '', description: '', hostCountry: '', hostUniversity: '', region: 'Global', fundingType: 'fully_funded', level: 'undergraduate',
  openToRefugees: false, refugeesOnly: false, languageOfStudy: 'English', deadline: '', deadlineNote: '',
  eligibility: '', coverage: '', applicationSteps: '', documentsRequired: [], applyUrl: '', logoUrl: '', isFeatured: false, isActive: true,
};
const toLines = (a) => (Array.isArray(a) ? a.join('\n') : '');
const fromLines = (t) => t.split('\n').map((x) => x.trim()).filter(Boolean);

export function AdminScholarshipForm() {
  const { id } = useParams();
  const isNew = !id || id === 'new';
  const navigate = useNavigate();
  const confirm = useConfirm();
  const toast = useToast();
  const [f, setF] = useState(isNew ? EMPTY : null);
  const [opts, setOpts] = useState(null);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get('/admin/scholarships/options').then((r) => setOpts(r.data));
    if (!isNew) {
      api.get(`/admin/scholarships/${id}`).then(({ data: { scholarship: s } }) => setF({
        ...EMPTY, ...s, hostUniversity: s.hostUniversity || '', deadlineNote: s.deadlineNote || '', logoUrl: s.logoUrl || '',
        deadline: s.deadline ? s.deadline.slice(0, 10) : '', eligibility: toLines(s.eligibility), coverage: toLines(s.coverage),
        applicationSteps: toLines(s.applicationSteps), documentsRequired: Array.isArray(s.documentsRequired) ? s.documentsRequired : [],
      })).catch((e) => setMsg({ tone: 'error', text: errorMessage(e) }));
    }
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!f || !opts) return msg ? <Alert>{msg.text}</Alert> : <ListRowsSkeleton rows={8} />;
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const save = async (e) => {
    e.preventDefault(); setBusy(true); setMsg(null);
    const body = {
      ...f, deadline: f.deadline || null, eligibility: fromLines(f.eligibility), coverage: fromLines(f.coverage), applicationSteps: fromLines(f.applicationSteps),
    };
    delete body.id; delete body.slug; delete body.createdAt; delete body.requirements;
    try {
      if (isNew) { const { data } = await api.post('/admin/scholarships', body); navigate(`/admin/scholarships/${data.scholarship.id}`, { replace: true }); toast.success(body.isActive ? 'Scholarship added. It is on the website now.' : 'Scholarship added (hidden).'); }
      else { await api.put(`/admin/scholarships/${id}`, body); toast.success('Changes saved.'); }
    } catch (err) { setMsg({ tone: 'error', text: errorMessage(err) }); window.scrollTo({ top: 0, behavior: 'smooth' }); } finally { setBusy(false); }
  };
  const remove = async () => {
    const ok = await confirm({ title: `Delete "${f.name}"?`, message: "It is deleted for good and disappears from students' saved lists and application trackers. To keep it for next year, untick \"Visible on the website\" instead.", confirmLabel: 'Yes, delete it', tone: 'danger' });
    if (!ok) return;
    try { await api.delete(`/admin/scholarships/${id}`); toast.success(`"${f.name}" was deleted.`); navigate('/admin/scholarships'); } catch (err) { toast.error(errorMessage(err)); }
  };

  return (
    <div className="space-y-6">
      <BackLink to="/admin/scholarships">All scholarships</BackLink>
      <PageTitle title={isNew ? 'Add a scholarship' : 'Edit scholarship'} intro="Copy the details from the programme's official website. Never guess a deadline." />
      {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}
      <form onSubmit={save} className="space-y-6" noValidate>
        <Card className="space-y-4">
          <h2 className="text-lg font-semibold">Basics</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Scholarship name" value={f.name} onChange={set('name')} />
            <Field label="Organisation" value={f.orgName} onChange={set('orgName')} />
            <Field label="Study country" value={f.hostCountry} onChange={set('hostCountry')} hint='e.g. "Rwanda" or "Multiple (Africa and worldwide)"' />
            <Field label="University (optional)" value={f.hostUniversity} onChange={set('hostUniversity')} />
            <Field as="select" label="Region" value={f.region} onChange={set('region')}>{opts.regions.map((r) => <option key={r}>{r}</option>)}</Field>
            <Field label="Language of study" value={f.languageOfStudy} onChange={set('languageOfStudy')} />
            <Field as="select" label="Funding" value={f.fundingType} onChange={set('fundingType')}>{Object.entries(FUNDING_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Field>
            <Field as="select" label="Study level" value={f.level} onChange={set('level')}>{Object.entries(LEVEL_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Field>
          </div>
          <RichEditor showLabel variant="compact" label="Description" value={f.description} onChange={(html) => setF((x) => ({ ...x, description: html }))} placeholder="What the scholarship is, who it is for and what makes it special." />
          <Field label="Official application link" type="url" value={f.applyUrl} onChange={set('applyUrl')} />
          <Field label="Logo image link (optional)" type="url" value={f.logoUrl} onChange={set('logoUrl')} />
        </Card>
        <Card className="space-y-4">
          <h2 className="text-lg font-semibold">Deadline and refugees</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Deadline (leave empty if it varies)" type="date" value={f.deadline} onChange={set('deadline')} />
            <Field label="Deadline note (optional)" value={f.deadlineNote} onChange={set('deadlineNote')} hint='e.g. "Each partner university sets its own deadline."' />
          </div>
          <div className="flex flex-wrap gap-x-6">
            <label className="flex items-center gap-3 min-h-11"><input type="checkbox" className="w-5 h-5 accent-[#07294D]" checked={f.openToRefugees} onChange={(e) => setF({ ...f, openToRefugees: e.target.checked, refugeesOnly: e.target.checked && f.refugeesOnly })} />Open to refugees</label>
            <label className="flex items-center gap-3 min-h-11"><input type="checkbox" className="w-5 h-5 accent-[#07294D]" checked={f.refugeesOnly} onChange={(e) => setF({ ...f, refugeesOnly: e.target.checked, openToRefugees: e.target.checked || f.openToRefugees })} />Only for refugees</label>
            <label className="flex items-center gap-3 min-h-11"><input type="checkbox" className="w-5 h-5 accent-[#07294D]" checked={f.isFeatured} onChange={set('isFeatured')} />Featured (shown first)</label>
            <label className="flex items-center gap-3 min-h-11"><input type="checkbox" className="w-5 h-5 accent-[#07294D]" checked={f.isActive} onChange={set('isActive')} />Visible on the website</label>
          </div>
        </Card>
        <Card className="space-y-4">
          <h2 className="text-lg font-semibold">Details (one item per line)</h2>
          <Field as="textarea" rows={5} label="Who can apply" value={f.eligibility} onChange={set('eligibility')} />
          <Field as="textarea" rows={5} label="What it covers" value={f.coverage} onChange={set('coverage')} hint="Words like tuition, accommodation, stipend, travel and books feed the 'What it covers' filter." />
          <Field as="textarea" rows={5} label="How to apply (steps)" value={f.applicationSteps} onChange={set('applicationSteps')} />
          <fieldset>
            <legend className="text-sm font-medium mb-1">Extra documents needed <span className="text-ink-soft font-normal">(ID, S4–S6 reports, diploma, photo and personal statement are always on the checklist)</span></legend>
            <div className="grid sm:grid-cols-2 gap-x-4">
              {opts.documents.map((d) => (
                <label key={d.key} className="flex items-start gap-3 py-1.5 min-h-11 cursor-pointer">
                  <input type="checkbox" className="mt-0.5 w-5 h-5 accent-[#07294D]" checked={f.documentsRequired.includes(d.key)}
                    onChange={() => setF({ ...f, documentsRequired: f.documentsRequired.includes(d.key) ? f.documentsRequired.filter((x) => x !== d.key) : [...f.documentsRequired, d.key] })} />
                  <span className="text-sm">{d.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </Card>
        <ActionBar>
          <Button type="submit" loading={busy}>{isNew ? 'Add scholarship' : 'Save changes'}</Button>
          <Button variant="ghost" to="/admin/scholarships">Cancel</Button>
          {!isNew && <Button variant="ghost" className="text-danger ml-auto" onClick={remove}>Delete</Button>}
        </ActionBar>
      </form>
    </div>
  );
}
