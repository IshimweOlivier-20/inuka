import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Alert, Button, Card, Field, Pill } from '../../components/ui';
import Avatar from '../../components/ui/Avatar';
import { ListRowsSkeleton } from '../../components/ui/Skeletons';
import RichEditor from '../../components/editor/RichEditor';
import { ActionBar, BackLink, PageTitle, Pager, SearchInput, Select } from '../../components/admin/AdminUI';
import { CountryOptions } from '../../utils/countries';
import { useAuth } from '../../context/AuthContext';
import { useConfirm, useToast } from '../../context/FeedbackContext';
import { api, errorMessage } from '../../services/api';
import { formatDate } from '../../utils/format';

const ROLE_TONE = { student: 'brand', mentor: 'cyan', admin: 'grey' };
const cap = (s) => s[0].toUpperCase() + s.slice(1);
const EXPERTISE = ['Scholarship Guidance', 'University Admissions', 'English Language', 'Computer Skills', 'Career Counselling', 'Refugee Rights & Education'];
const LANGS = ['English', 'French', 'Kinyarwanda', 'Kiswahili', 'Kirundi', 'Arabic', 'Portuguese', 'Somali', 'Amharic', 'Other'];

// User management (spec 16.2): list of accounts. Opening or adding an account goes to its own page.
export default function AdminUsers() {
  const [params] = useSearchParams();
  const [q, setQ] = useState(params.get('q') || '');
  const [role, setRole] = useState(params.get('role') || '');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const load = () => api.get('/admin/users', { params: { q, role, status, page } }).then((r) => { setData(r.data); setError(''); }).catch((e) => setError(errorMessage(e)));
  useEffect(() => { document.title = 'Users — INUKA admin'; }, []);
  useEffect(() => { const t = setTimeout(load, q ? 300 : 0); return () => clearTimeout(t); }, [q, role, status, page]); // eslint-disable-line react-hooks/exhaustive-deps
  const filter = (fn) => (v) => { fn(v); setPage(1); };

  return (
    <div className="space-y-5">
      <PageTitle title="Users" intro="Find any student, mentor or admin. Open an account to edit it, suspend it or delete it."
        action={<Button to="/admin/users/new"><Plus size={18} aria-hidden="true" />Add account</Button>} />
      {error && <Alert>{error}</Alert>}
      <div className="flex flex-wrap gap-3">
        <SearchInput value={q} onChange={filter(setQ)} placeholder="Search by name, email or country" label="Search users" />
        <Select label="Role" value={role} onChange={filter(setRole)} options={[['', 'All roles'], ['student', 'Students'], ['mentor', 'Mentors'], ['admin', 'Admins']]} />
        <Select label="Status" value={status} onChange={filter(setStatus)} options={[['', 'Any status'], ['active', 'Active'], ['suspended', 'Suspended'], ['unverified', 'Email not confirmed']]} />
      </div>

      {!data ? <ListRowsSkeleton rows={6} /> : (
        <div className="bg-surface rounded-xl border border-line overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-paper text-left text-ink-soft">
                <tr><th className="px-4 py-2.5 font-semibold">Name</th><th className="px-4 py-2.5 font-semibold">Role</th><th className="px-4 py-2.5 font-semibold">Country</th><th className="px-4 py-2.5 font-semibold">Status</th><th className="px-4 py-2.5 font-semibold">Joined</th><th className="px-4 py-2.5"><span className="sr-only">Actions</span></th></tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.users.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-ink-soft">No user matches these filters.</td></tr>}
                {data.users.map((u) => (
                  <tr key={u.id} className="hover:bg-paper/60">
                    <td className="px-4 py-3"><Link to={`/admin/users/${u.id}`} className="flex items-center gap-3 group"><Avatar user={u} /><span className="min-w-0"><span className="block font-semibold group-hover:underline">{u.firstName} {u.lastName}</span><span className="block text-ink-soft truncate">{u.email}</span></span></Link></td>
                    <td className="px-4 py-3 whitespace-nowrap"><Pill tone={ROLE_TONE[u.role]}>{cap(u.role)}</Pill>{u.role === 'mentor' && !u.mentor?.isApproved && <span className="ml-1"><Pill>Not approved</Pill></span>}{u.refugeeStatus === 'yes' && <span className="ml-1"><Pill tone="sky">Refugee</Pill></span>}</td>
                    <td className="px-4 py-3 text-ink-soft">{u.countryResidence || '—'}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{!u.isActive ? <Pill tone="red">Suspended</Pill> : !u.isVerified ? <Pill>Email not confirmed</Pill> : <Pill tone="brand">Active</Pill>}</td>
                    <td className="px-4 py-3 text-ink-soft whitespace-nowrap">{formatDate(u.createdAt)}</td>
                    <td className="px-4 py-3 text-right"><Button variant="ghost" to={`/admin/users/${u.id}`} className="px-3">Open</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 pb-4"><Pager page={data.page} pageSize={data.pageSize} total={data.total} onPage={setPage} /></div>
        </div>
      )}
    </div>
  );
}

// /admin/users/:id — view and edit one account; suspend, reactivate or delete it.
export function AdminUser() {
  const { id } = useParams();
  if (id === 'new') return <NewUser />;
  return <EditUser id={id} />;
}

function EditUser({ id }) {
  const { user: me } = useAuth();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const toast = useToast();
  const [d, setD] = useState(null);
  const [f, setF] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => api.get(`/admin/users/${id}`).then((r) => {
    setD(r.data);
    const u = r.data.user;
    setF({ firstName: u.firstName, lastName: u.lastName, countryOrigin: u.countryOrigin || '', countryResidence: u.countryResidence || '' });
  }).catch((e) => setError(errorMessage(e)));
  useEffect(() => { load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (error && !d) return <Alert>{error}</Alert>;
  if (!d) return <ListRowsSkeleton rows={5} />;
  const u = d.user;
  const self = u.id === me.id;
  const name = `${u.firstName} ${u.lastName}`;

  const save = async () => {
    setBusy(true);
    try { await api.patch(`/admin/users/${u.id}`, f); toast.success('Changes saved.'); load(); } catch (e) { toast.error(errorMessage(e)); } finally { setBusy(false); }
  };
  const setActive = async (active) => {
    const ok = await confirm(active
      ? { title: `Reactivate ${name}?`, message: 'They will be able to sign in again.', confirmLabel: 'Yes, reactivate' }
      : { title: `Suspend ${name}?`, message: 'They are signed out everywhere and cannot sign in until you reactivate the account. Their data is kept.', confirmLabel: 'Yes, suspend', tone: 'danger' });
    if (!ok) return;
    try { await api.patch(`/admin/users/${u.id}`, { isActive: active }); toast.success(active ? `${u.firstName}'s account is active again.` : `${u.firstName}'s account is suspended.`); load(); } catch (e) { toast.error(errorMessage(e)); }
  };
  const remove = async () => {
    const ok = await confirm({ title: `Delete ${name}'s account?`, message: <>This deletes their progress, documents, applications and sessions <strong>forever</strong>. It cannot be undone.</>, confirmLabel: 'Yes, delete forever', tone: 'danger' });
    if (!ok) return;
    try { await api.delete(`/admin/users/${u.id}`); toast.success(`${name}'s account was deleted.`); navigate('/admin/users'); } catch (e) { toast.error(errorMessage(e)); }
  };

  return (
    <div className="space-y-6">
      <BackLink to="/admin/users">All users</BackLink>
      <div className="flex flex-wrap items-center gap-4">
        <Avatar user={u} size="lg" />
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-[1.75rem] font-bold">{name}</h1>
          <p className="text-ink-soft">{u.email} · joined {formatDate(u.createdAt)}</p>
          <p className="mt-1.5 flex flex-wrap gap-1.5"><Pill tone={ROLE_TONE[u.role]}>{cap(u.role)}</Pill>{!u.isActive && <Pill tone="red">Suspended</Pill>}{!u.isVerified && <Pill>Email not confirmed</Pill>}</p>
        </div>
      </div>
      <dl className="grid grid-cols-3 sm:grid-cols-6 gap-3 text-center">
        {[['Lessons', d.stats.lessons], ['Certificates', d.stats.certificates], ['Saved', d.stats.saved], ['Applications', d.stats.applications], ['Sessions', d.stats.sessions], ['Documents', d.stats.documents]].map(([l, v]) => (
          <div key={l} className="rounded-xl bg-surface border border-line p-3"><dt className="text-xs text-ink-soft">{l}</dt><dd className="text-2xl font-bold">{v}</dd></div>
        ))}
      </dl>
      <Card className="space-y-4">
        <h2 className="text-lg font-semibold">Details</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="First name" value={f.firstName} onChange={(e) => setF({ ...f, firstName: e.target.value })} />
          <Field label="Last name" value={f.lastName} onChange={(e) => setF({ ...f, lastName: e.target.value })} />
          <Field as="select" label="Country of origin" value={f.countryOrigin} onChange={(e) => setF({ ...f, countryOrigin: e.target.value })}><CountryOptions /></Field>
          <Field as="select" label="Country where they live" value={f.countryResidence} onChange={(e) => setF({ ...f, countryResidence: e.target.value })}><CountryOptions /></Field>
        </div>
        <p className="text-sm text-ink-soft">
          {u.refugeeStatus ? `Refugee status: ${u.refugeeStatus.replaceAll('_', ' ')}` : 'Refugee status not shared'}
          {u.educationLevel && ` · Education: ${u.educationLevel}`}{u.language && ` · Language: ${u.language}`}{u.age && ` · Age ${u.age}`}
        </p>
        {u.mentor && <p className="text-sm rounded-lg bg-brand-soft px-3 py-2">Mentor: {u.mentor.title}{u.mentor.org ? `, ${u.mentor.org}` : ''} · {u.mentor.isApproved ? 'approved' : 'not approved yet'}. <Link to="/admin/mentors" className="text-brand font-semibold underline">Mentor approvals</Link></p>}
      </Card>
      <ActionBar>
        <Button onClick={save} loading={busy}>Save changes</Button>
        {!self && (u.isActive
          ? <Button variant="outline" onClick={() => setActive(false)}>Suspend account</Button>
          : <Button variant="outline" onClick={() => setActive(true)}>Reactivate account</Button>)}
        {!self && u.role !== 'admin' && <Button variant="ghost" className="ml-auto text-danger" onClick={remove}>Delete account</Button>}
      </ActionBar>
    </div>
  );
}

// /admin/users/new — create a student, mentor or admin. They set their own password from an email link.
function NewUser() {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const toast = useToast();
  const [f, setF] = useState({ firstName: '', lastName: '', email: '', role: 'student', countryOrigin: '', countryResidence: '' });
  const [m, setM] = useState({ title: '', org: '', bio: '', expertise: [], languages: [] });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [devLink, setDevLink] = useState('');
  useEffect(() => { document.title = 'Add an account — INUKA admin'; }, []);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const toggle = (k, v) => setM({ ...m, [k]: m[k].includes(v) ? m[k].filter((x) => x !== v) : [...m[k], v] });

  const create = async () => {
    if (f.role === 'admin' && !(await confirm({ title: 'Create an admin account?', message: 'Admins can see and change everything on INUKA, including other people\'s accounts. Only continue if you trust this person.', confirmLabel: 'Yes, create admin', tone: 'danger' }))) return;
    setBusy(true); setError('');
    try {
      const { data } = await api.post('/admin/users', { ...f, ...(f.role === 'mentor' && { mentor: m }) });
      toast.success(`Account created for ${f.firstName}. They have been emailed a link to choose a password.`);
      if (data.devSetPasswordUrl) setDevLink(data.devSetPasswordUrl);
      else navigate(`/admin/users/${data.user.id}`);
    } catch (e) { setError(errorMessage(e)); window.scrollTo({ top: 0, behavior: 'smooth' }); } finally { setBusy(false); }
  };

  if (devLink) {
    return (
      <div className="space-y-5 max-w-2xl">
        <BackLink to="/admin/users">All users</BackLink>
        <PageTitle title="Account created" intro={`${f.firstName} will receive an email with a link to choose a password.`} />
        <Alert tone="info">Development mode (no email service yet): <a href={devLink} className="underline font-semibold break-all">set-password link</a>. Copy it to test the account.</Alert>
        <div className="flex gap-3"><Button to="/admin/users">Back to users</Button><Button variant="outline" onClick={() => { setDevLink(''); setF({ ...f, firstName: '', lastName: '', email: '' }); }}>Add another account</Button></div>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      <BackLink to="/admin/users">All users</BackLink>
      <PageTitle title="Add an account" intro="Nobody types a password for the person: they get an email with a link to choose their own (valid for 3 days)." />
      {error && <Alert>{error}</Alert>}
      <Card className="space-y-4">
        <Field as="select" label="Role" value={f.role} onChange={set('role')}>
          <option value="student">Student</option><option value="mentor">Mentor (approved straight away)</option><option value="admin">Admin (full access)</option>
        </Field>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="First name" value={f.firstName} onChange={set('firstName')} />
          <Field label="Last name" value={f.lastName} onChange={set('lastName')} />
        </div>
        <Field label="Email address" type="email" value={f.email} onChange={set('email')} />
        <div className="grid sm:grid-cols-2 gap-4">
          <Field as="select" label="Country of origin (optional)" value={f.countryOrigin} onChange={set('countryOrigin')}><CountryOptions /></Field>
          <Field as="select" label="Country where they live (optional)" value={f.countryResidence} onChange={set('countryResidence')}><CountryOptions /></Field>
        </div>
        {f.role === 'admin' && <Alert tone="info">Admins can see and change everything on INUKA. Only add people you trust.</Alert>}
      </Card>
      {f.role === 'mentor' && (
        <Card className="space-y-4">
          <h2 className="text-lg font-semibold">Mentor profile</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Professional title" value={m.title} onChange={(e) => setM({ ...m, title: e.target.value })} />
            <Field label="Organisation (optional)" value={m.org} onChange={(e) => setM({ ...m, org: e.target.value })} />
          </div>
          <div>
            <p className="text-sm font-medium mb-1.5">Short bio</p>
            <RichEditor variant="compact" label="Short bio" value={m.bio} onChange={(html) => setM((x) => ({ ...x, bio: html }))} />
          </div>
          {[['expertise', 'Areas of expertise', EXPERTISE], ['languages', 'Languages', LANGS]].map(([k, label, opts]) => (
            <fieldset key={k}>
              <legend className="text-sm font-medium mb-1.5">{label}</legend>
              <div className="flex flex-wrap gap-2">
                {opts.map((o) => (
                  <button key={o} type="button" aria-pressed={m[k].includes(o)} onClick={() => toggle(k, o)}
                    className={`min-h-10 px-3 rounded-full border text-sm ${m[k].includes(o) ? 'bg-brand text-white border-brand' : 'bg-surface border-line hover:border-brand'}`}>{o}</button>
                ))}
              </div>
            </fieldset>
          ))}
          <p className="text-xs text-ink-soft">The mentor adds their photo and weekly availability after signing in.</p>
        </Card>
      )}
      <ActionBar>
        <Button onClick={create} loading={busy}>Create account</Button>
        <Button variant="ghost" to="/admin/users">Cancel</Button>
      </ActionBar>
    </div>
  );
}
