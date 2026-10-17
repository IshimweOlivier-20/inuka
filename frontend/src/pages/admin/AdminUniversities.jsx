import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { BadgeCheck, ExternalLink, Pencil, Plus, Trash2, X } from 'lucide-react';
import { Alert, Button, Field, Modal, Pill } from '../../components/ui';
import { ListRowsSkeleton } from '../../components/ui/Skeletons';
import { BackLink, PageTitle, SearchInput } from '../../components/admin/AdminUI';
import { useConfirm, useToast } from '../../context/FeedbackContext';
import { api, errorMessage } from '../../services/api';
import { formatDate } from '../../utils/format';

// University directory management: institutions and their programmes (entry requirements).
// Sample entries are examples; checking them on the official page and ticking "Checked" makes them real data.
const KIND = { public: 'Public university', private: 'Private university', tvet: 'Polytechnic / TVET' };
const AWARD = { bachelor: "Bachelor's", diploma: 'Diploma', certificate: 'Short course' };
const FIELDS = ['Agriculture', 'Business', 'Education', 'Engineering', 'Health', 'Hospitality', 'ICT', 'Law', 'Science', 'Social sciences', 'Arts', 'Other'];

export function AdminUniversities() {
  const [list, setList] = useState(null);
  const [q, setQ] = useState('');
  const [error, setError] = useState('');
  useEffect(() => { document.title = 'Universities — INUKA admin'; api.get('/admin/universities').then((r) => setList(r.data.universities)).catch((e) => setError(errorMessage(e))); }, []);
  const rows = (list || []).filter((u) => !q || `${u.name} ${u.shortName || ''} ${u.city || ''}`.toLowerCase().includes(q.toLowerCase()));
  const samples = (list || []).filter((u) => u.isSample).length;
  return (
    <div className="space-y-5">
      <PageTitle title="Universities" intro="Institutions and programmes used by “See your options” and the public directory. Copy requirements from each official page, then tick “Checked”."
        action={<Button to="/admin/universities/new"><Plus size={18} aria-hidden="true" />Add institution</Button>} />
      {error && <Alert>{error}</Alert>}
      {samples > 0 && <Alert tone="warning">{samples} {samples === 1 ? 'entry is' : 'entries are'} sample data. Sample entries are hidden on the live website until someone checks them against the official page and ticks “Checked”.</Alert>}
      <SearchInput value={q} onChange={setQ} placeholder="Search by name or city" label="Search universities" />
      {!list ? <ListRowsSkeleton rows={6} /> : (
        <div className="bg-surface rounded-xl border border-line overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-paper text-left text-ink-soft"><tr><th className="px-4 py-2.5 font-semibold">Institution</th><th className="px-4 py-2.5 font-semibold">Type</th><th className="px-4 py-2.5 font-semibold">Programmes</th><th className="px-4 py-2.5 font-semibold">Status</th><th className="px-4 py-2.5"><span className="sr-only">Edit</span></th></tr></thead>
            <tbody className="divide-y divide-line">
              {rows.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-ink-soft">No institution matches.</td></tr>}
              {rows.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-3"><p className="font-semibold">{u.name}</p><p className="text-ink-soft">{[u.shortName, u.city].filter(Boolean).join(' · ')}</p></td>
                  <td className="px-4 py-3 text-ink-soft whitespace-nowrap">{KIND[u.kind]}</td>
                  <td className="px-4 py-3 tabular-nums">{u._count.programmes}</td>
                  <td className="px-4 py-3"><div className="flex flex-wrap gap-1">
                    {u.verifiedAt ? <Pill tone="success">Checked {formatDate(u.verifiedAt)}</Pill> : <Pill tone="warning">Not checked</Pill>}
                    {u.isSample && <Pill>Sample</Pill>}{!u.isPublished && <Pill tone="danger">Hidden</Pill>}
                  </div></td>
                  <td className="px-4 py-3 text-right"><Link to={`/admin/universities/${u.id}`} className="font-semibold text-brand hover:underline">Edit</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const EMPTY_UNI = { name: '', shortName: '', kind: 'public', city: '', website: '', about: '', isPublished: true, accessibility: { supportOffice: false, accessibleCampus: false, assistiveTech: false, notes: '' } };
const EMPTY_PROG = { name: '', field: 'Business', award: 'bachelor', durationYears: 4, combinations: [], required: [], minPoints: '', notes: '', applyUrl: '', isPublished: true };

export function AdminUniversity() {
  const { id } = useParams();
  const isNew = id === 'new';
  const navigate = useNavigate();
  const confirm = useConfirm();
  const toast = useToast();
  const [meta, setMeta] = useState(null);
  const [u, setU] = useState(isNew ? EMPTY_UNI : null);
  const [programmes, setProgrammes] = useState([]);
  const [info, setInfo] = useState(null); // { verifiedAt, isSample }
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [prog, setProg] = useState(null); // programme being edited

  const load = () => api.get(`/admin/universities/${id}`).then(({ data }) => {
    const x = data.university;
    setU({ name: x.name, shortName: x.shortName || '', kind: x.kind, city: x.city || '', website: x.website || '', about: x.about || '', isPublished: x.isPublished, accessibility: { ...EMPTY_UNI.accessibility, ...(x.accessibility || {}) } });
    setProgrammes(x.programmes); setInfo({ verifiedAt: x.verifiedAt, isSample: x.isSample, slug: x.slug }); setVerified(false);
  }).catch((e) => setError(errorMessage(e)));
  useEffect(() => { api.get('/admin/universities/meta').then((r) => setMeta(r.data)); if (!isNew) load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k) => (e) => setU({ ...u, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const setA = (k) => (e) => setU({ ...u, accessibility: { ...u.accessibility, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value } });
  const save = async (e) => {
    e.preventDefault(); setBusy(true); setError('');
    try {
      const body = { ...u, ...(verified && { verified: true }) };
      if (isNew) { const { data } = await api.post('/admin/universities', body); toast.success('Institution added. Now add its programmes.'); navigate(`/admin/universities/${data.university.id}`, { replace: true }); }
      else { await api.patch(`/admin/universities/${id}`, body); toast.success('Saved.'); load(); }
    } catch (err) { setError(errorMessage(err)); } finally { setBusy(false); }
  };
  const remove = async () => {
    if (!(await confirm({ title: `Delete ${u.name}?`, message: 'Its programmes are deleted too. This cannot be undone.', confirmLabel: 'Delete', tone: 'danger' }))) return;
    try { await api.delete(`/admin/universities/${id}`); toast.success('Deleted.'); navigate('/admin/universities'); } catch (err) { toast.error(errorMessage(err)); }
  };
  const removeProg = async (p) => {
    if (!(await confirm({ title: `Delete “${p.name}”?`, confirmLabel: 'Delete', tone: 'danger' }))) return;
    try { await api.delete(`/admin/programmes/${p.id}`); setProgrammes((l) => l.filter((x) => x.id !== p.id)); } catch (err) { toast.error(errorMessage(err)); }
  };

  if (!u || !meta) return error ? <Alert>{error}</Alert> : <ListRowsSkeleton rows={6} />;
  return (
    <div className="space-y-5 max-w-4xl">
      <BackLink to="/admin/universities">All universities</BackLink>
      <PageTitle title={isNew ? 'Add institution' : u.name}
        action={info?.slug && <Button variant="ghost" href={`/universities/${info.slug}`} target="_blank" rel="noopener noreferrer" className="text-sm">View on website<ExternalLink size={14} aria-hidden="true" /></Button>} />
      <form onSubmit={save} className="bg-surface border border-line rounded-xl p-5 space-y-4">
        <div className="grid sm:grid-cols-[1fr_160px] gap-3">
          <Field label="Name" value={u.name} onChange={set('name')} required />
          <Field label="Short name" value={u.shortName} onChange={set('shortName')} placeholder="UR" />
        </div>
        <div className="grid sm:grid-cols-3 gap-3">
          <Field as="select" label="Type" value={u.kind} onChange={set('kind')}>{Object.entries(KIND).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Field>
          <Field label="City" value={u.city} onChange={set('city')} />
          <Field label="Official website" value={u.website} onChange={set('website')} placeholder="https://" />
        </div>
        <Field as="textarea" rows={3} label="About (short)" value={u.about} onChange={set('about')} />
        <fieldset className="rounded-lg border border-line p-4">
          <legend className="px-1 text-sm font-semibold">Disability support</legend>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {[['supportOffice', 'Disability support office'], ['accessibleCampus', 'Accessible buildings'], ['assistiveTech', 'Assistive technology']].map(([k, l]) => (
              <label key={k} className="inline-flex items-center gap-2"><input type="checkbox" className="w-4 h-4 accent-[#07294D]" checked={!!u.accessibility[k]} onChange={setA(k)} />{l}</label>
            ))}
          </div>
          <div className="mt-3"><Field label="Notes" value={u.accessibility.notes || ''} onChange={setA('notes')} placeholder="e.g. Sign-language interpreters on request" /></div>
        </fieldset>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <label className="inline-flex items-center gap-2"><input type="checkbox" className="w-4 h-4 accent-[#07294D]" checked={u.isPublished} onChange={set('isPublished')} />Show on the website</label>
          <label className="inline-flex items-center gap-2"><input type="checkbox" className="w-4 h-4 accent-[#07294D]" checked={verified} onChange={(e) => setVerified(e.target.checked)} />
            I checked this against the official page today{info?.verifiedAt && <span className="text-ink-soft">(last checked {formatDate(info.verifiedAt)})</span>}</label>
        </div>
        {info?.isSample && <p className="text-xs text-warning-ink">This is sample data. Ticking “I checked” makes it real data, shown on the live website.</p>}
        {error && <Alert>{error}</Alert>}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-line">
          {!isNew && <Button type="button" variant="ghost" onClick={remove} className="text-danger mr-auto"><Trash2 size={16} aria-hidden="true" />Delete</Button>}
          <Button type="submit" loading={busy}>{isNew ? 'Add institution' : 'Save'}</Button>
        </div>
      </form>

      {!isNew && (
        <section className="bg-surface border border-line rounded-xl">
          <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-line">
            <h2 className="text-base font-semibold">Programmes ({programmes.length})</h2>
            <Button onClick={() => setProg({ ...EMPTY_PROG })} className="!min-h-9 !px-4 text-sm"><Plus size={16} aria-hidden="true" />Add programme</Button>
          </div>
          {programmes.length === 0 ? <p className="px-5 py-6 text-sm text-ink-soft">No programmes yet.</p> : (
            <ul className="divide-y divide-line">
              {programmes.map((p) => (
                <li key={p.id} className="px-5 py-3 flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold">{p.name} {!p.isPublished && <Pill tone="danger">Hidden</Pill>}</p>
                    <p className="text-sm text-ink-soft">{AWARD[p.award]} · {p.field}{p.minPoints ? ` · ${p.minPoints}+ points` : ''}{(p.required || []).length ? ` · ${p.required.map((r) => `${r.subject} ${r.minGrade}`).join(', ')}` : ''}{(p.combinations || []).length ? ` · ${p.combinations.join('/')}` : ''}</p>
                  </div>
                  <div className="flex gap-1">
                    <button type="button" onClick={() => setProg({ ...EMPTY_PROG, ...p, minPoints: p.minPoints ?? '', notes: p.notes || '', applyUrl: p.applyUrl || '' })} className="w-9 h-9 rounded-lg hover:bg-brand-soft inline-flex items-center justify-center" aria-label={`Edit ${p.name}`}><Pencil size={15} /></button>
                    <button type="button" onClick={() => removeProg(p)} className="w-9 h-9 rounded-lg hover:bg-danger-soft hover:text-danger inline-flex items-center justify-center" aria-label={`Delete ${p.name}`}><Trash2 size={15} /></button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
      {prog && <ProgrammeModal meta={meta} value={prog} universityId={id} onClose={() => setProg(null)} onSaved={() => { setProg(null); load(); toast.success('Programme saved.'); }} />}
    </div>
  );
}

function ProgrammeModal({ meta, value, universityId, onClose, onSaved }) {
  const [p, setP] = useState(value);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setP({ ...p, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const setReq = (i, patch) => setP({ ...p, required: p.required.map((r, j) => (j === i ? { ...r, ...patch } : r)) });
  const toggleCombo = (c) => setP({ ...p, combinations: p.combinations.includes(c) ? p.combinations.filter((x) => x !== c) : [...p.combinations, c] });
  const save = async (e) => {
    e.preventDefault(); setBusy(true); setError('');
    const body = { name: p.name, field: p.field, award: p.award, durationYears: p.durationYears === '' ? null : Number(p.durationYears), combinations: p.combinations,
      required: p.required.filter((r) => r.subject), minPoints: p.minPoints === '' ? null : Number(p.minPoints), notes: p.notes, applyUrl: p.applyUrl, isPublished: p.isPublished };
    try {
      if (p.id) await api.patch(`/admin/programmes/${p.id}`, body); else await api.post(`/admin/universities/${universityId}/programmes`, body);
      onSaved();
    } catch (err) { setError(errorMessage(err)); } finally { setBusy(false); }
  };
  return (
    <Modal open onClose={onClose} wide title={p.id ? 'Edit programme' : 'Add programme'}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button type="submit" form="prog-form" loading={busy}>Save programme</Button></>}>
      <form id="prog-form" onSubmit={save} className="space-y-4">
        <Field label="Programme name" value={p.name} onChange={set('name')} required placeholder="Bachelor of Science in Nursing" />
        <div className="grid sm:grid-cols-3 gap-3">
          <Field as="select" label="Award" value={p.award} onChange={set('award')}>{Object.entries(AWARD).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Field>
          <Field as="select" label="Field" value={p.field} onChange={set('field')}>{FIELDS.map((f) => <option key={f}>{f}</option>)}</Field>
          <Field label="Duration (years)" type="number" step="0.25" min="0.25" max="7" value={p.durationYears ?? ''} onChange={set('durationYears')} />
        </div>
        <div>
          <p className="text-sm font-medium mb-1.5">Accepted combinations <span className="text-ink-soft font-normal">(leave empty if any combination is accepted)</span></p>
          <div className="flex flex-wrap gap-1.5">{meta.combinations.map((c) => (
            <button key={c} type="button" onClick={() => toggleCombo(c)} aria-pressed={p.combinations.includes(c)} className={`h-8 px-3 rounded-full border text-xs font-semibold ${p.combinations.includes(c) ? 'bg-brand border-brand text-white' : 'border-line hover:border-brand'}`}>{c}</button>
          ))}</div>
        </div>
        <div>
          <p className="text-sm font-medium mb-1.5">Required subjects and minimum grade</p>
          <ul className="space-y-2">
            {p.required.map((r, i) => (
              <li key={i} className="flex gap-2">
                <select value={r.subject} onChange={(e) => setReq(i, { subject: e.target.value })} className="flex-1 min-h-10 rounded-lg border border-line bg-surface px-3 text-sm" aria-label="Subject">
                  <option value="">Subject…</option>{meta.subjects.map((s) => <option key={s}>{s}</option>)}
                </select>
                <select value={r.minGrade} onChange={(e) => setReq(i, { minGrade: e.target.value })} className="w-24 min-h-10 rounded-lg border border-line bg-surface px-3 text-sm" aria-label="Minimum grade">
                  {meta.grades.map((g) => <option key={g}>{g}</option>)}
                </select>
                <button type="button" onClick={() => setP({ ...p, required: p.required.filter((_, j) => j !== i) })} className="w-10 rounded-lg hover:bg-danger-soft hover:text-danger inline-flex items-center justify-center" aria-label="Remove"><X size={16} /></button>
              </li>
            ))}
          </ul>
          {p.required.length < 5 && <button type="button" onClick={() => setP({ ...p, required: [...p.required, { subject: '', minGrade: 'C' }] })} className="mt-2 text-sm font-semibold text-brand hover:underline inline-flex items-center gap-1"><Plus size={14} aria-hidden="true" />Add a subject</button>}
        </div>
        <div className="grid sm:grid-cols-[160px_1fr] gap-3">
          <Field label="Minimum points (of 18)" type="number" min="0" max="18" value={p.minPoints} onChange={set('minPoints')} />
          <Field label="How to apply (link)" value={p.applyUrl} onChange={set('applyUrl')} placeholder="https://" />
        </div>
        <Field as="textarea" rows={2} label="Notes" value={p.notes} onChange={set('notes')} placeholder="e.g. Admission also needs an interview" />
        <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" className="w-4 h-4 accent-[#07294D]" checked={p.isPublished} onChange={set('isPublished')} />Show on the website</label>
        {error && <Alert>{error}</Alert>}
        <p className="text-xs text-ink-soft flex items-center gap-1"><BadgeCheck size={13} aria-hidden="true" />Copy requirements exactly from the official page.</p>
      </form>
    </Modal>
  );
}
