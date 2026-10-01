import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Alert, Button, Field, Modal, Pill } from '../../components/ui';
import Avatar from '../../components/ui/Avatar';
import { ListRowsSkeleton } from '../../components/ui/Skeletons';
import { PageTitle, Pager, SearchInput, Select } from '../../components/admin/AdminUI';
import { CountryOptions } from '../../utils/countries';
import { useAuth } from '../../context/AuthContext';
import { api, errorMessage } from '../../services/api';
import { formatDate } from '../../utils/format';

const ROLE_TONE = { student: 'brand', mentor: 'cyan', admin: 'grey' };
const cap = (s) => s[0].toUpperCase() + s.slice(1);

// User management (spec 16.2): view, edit, suspend or delete student and mentor accounts.
export default function AdminUsers() {
  const [params] = useSearchParams();
  const [q, setQ] = useState(params.get('q') || '');
  const [role, setRole] = useState(params.get('role') || '');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [open, setOpen] = useState(null);

  const load = () => api.get('/admin/users', { params: { q, role, status, page } }).then((r) => { setData(r.data); setError(''); }).catch((e) => setError(errorMessage(e)));
  useEffect(() => { document.title = 'Users — INUKA admin'; }, []);
  useEffect(() => { const t = setTimeout(load, q ? 300 : 0); return () => clearTimeout(t); }, [q, role, status, page]); // eslint-disable-line react-hooks/exhaustive-deps
  const filter = (fn) => (v) => { fn(v); setPage(1); };

  return (
    <div className="space-y-5">
      <PageTitle title="Users" intro="Find any student, mentor or admin. Open an account to edit it, suspend it or delete it." />
      {notice && <Alert tone="success">{notice}</Alert>}
      {error && <Alert>{error}</Alert>}
      <div className="flex flex-wrap gap-3">
        <SearchInput value={q} onChange={filter(setQ)} placeholder="Search by name, email or country" label="Search users" />
        <Select label="Role" value={role} onChange={filter(setRole)} options={[['', 'All roles'], ['student', 'Students'], ['mentor', 'Mentors'], ['admin', 'Admins']]} />
        <Select label="Status" value={status} onChange={filter(setStatus)} options={[['', 'Any status'], ['active', 'Active'], ['suspended', 'Suspended'], ['unverified', 'Email not confirmed']]} />
      </div>

      {!data ? <ListRowsSkeleton rows={6} /> : (
        <div className="bg-white rounded-xl border border-line overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-paper text-left text-ink-soft">
                <tr><th className="px-4 py-2.5 font-semibold">Name</th><th className="px-4 py-2.5 font-semibold">Role</th><th className="px-4 py-2.5 font-semibold">Country</th><th className="px-4 py-2.5 font-semibold">Status</th><th className="px-4 py-2.5 font-semibold">Joined</th><th className="px-4 py-2.5"><span className="sr-only">Actions</span></th></tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.users.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-ink-soft">No user matches these filters.</td></tr>}
                {data.users.map((u) => (
                  <tr key={u.id} className="hover:bg-paper/60">
                    <td className="px-4 py-3"><div className="flex items-center gap-3"><Avatar user={u} /><div className="min-w-0"><p className="font-semibold">{u.firstName} {u.lastName}</p><p className="text-ink-soft truncate">{u.email}</p></div></div></td>
                    <td className="px-4 py-3 whitespace-nowrap"><Pill tone={ROLE_TONE[u.role]}>{cap(u.role)}</Pill>{u.role === 'mentor' && !u.mentor?.isApproved && <span className="ml-1"><Pill>Not approved</Pill></span>}{u.refugeeStatus === 'yes' && <span className="ml-1"><Pill tone="sky">Refugee</Pill></span>}</td>
                    <td className="px-4 py-3 text-ink-soft">{u.countryResidence || '—'}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{!u.isActive ? <Pill tone="red">Suspended</Pill> : !u.isVerified ? <Pill>Email not confirmed</Pill> : <Pill tone="brand">Active</Pill>}</td>
                    <td className="px-4 py-3 text-ink-soft whitespace-nowrap">{formatDate(u.createdAt)}</td>
                    <td className="px-4 py-3 text-right"><Button variant="ghost" onClick={() => setOpen(u.id)} className="px-3">Open</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 pb-4"><Pager page={data.page} pageSize={data.pageSize} total={data.total} onPage={setPage} /></div>
        </div>
      )}
      {open && <UserDialog id={open} onClose={() => setOpen(null)} onChanged={(t) => { setNotice(t); setOpen(null); load(); }} />}
    </div>
  );
}

function UserDialog({ id, onClose, onChanged }) {
  const { user: me } = useAuth();
  const [d, setD] = useState(null);
  const [f, setF] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    api.get(`/admin/users/${id}`).then((r) => {
      setD(r.data);
      const u = r.data.user;
      setF({ firstName: u.firstName, lastName: u.lastName, countryOrigin: u.countryOrigin || '', countryResidence: u.countryResidence || '' });
    }).catch((e) => setError(errorMessage(e)));
  }, [id]);

  const act = async (fn, text) => {
    setBusy(true); setError('');
    try { await fn(); onChanged(text); } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  };
  const u = d?.user;
  const self = u?.id === me.id;
  return (
    <Modal open onClose={onClose} wide title={u ? `${u.firstName} ${u.lastName}` : 'User'}
      footer={u && (
        <>
          {u.role !== 'admin' && !self && (confirmDelete ? (
            <Button variant="danger" loading={busy} onClick={() => act(() => api.delete(`/admin/users/${u.id}`), `${u.firstName} ${u.lastName}'s account was deleted.`)}>Yes, delete forever</Button>
          ) : <Button variant="ghost" className="text-danger mr-auto" onClick={() => setConfirmDelete(true)}>Delete account</Button>)}
          {!self && (u.isActive
            ? <Button variant="outline" loading={busy} onClick={() => act(() => api.patch(`/admin/users/${u.id}`, { isActive: false }), `${u.firstName}'s account is suspended. They have been signed out.`)}>Suspend</Button>
            : <Button variant="outline" loading={busy} onClick={() => act(() => api.patch(`/admin/users/${u.id}`, { isActive: true }), `${u.firstName}'s account is active again.`)}>Reactivate</Button>)}
          <Button loading={busy} onClick={() => act(() => api.patch(`/admin/users/${u.id}`, f), 'Changes saved.')}>Save changes</Button>
        </>
      )}>
      {error && <div className="mb-4"><Alert>{error}</Alert></div>}
      {!u ? <ListRowsSkeleton rows={4} /> : (
        <div className="space-y-5">
          {confirmDelete && <Alert>This deletes {u.firstName}&apos;s progress, documents, applications and sessions. It cannot be undone.</Alert>}
          <div className="flex items-center gap-4">
            <Avatar user={u} size="xl" />
            <div>
              <p className="text-ink-soft">{u.email}</p>
              <p className="text-sm mt-1 flex flex-wrap gap-1.5"><Pill tone={ROLE_TONE[u.role]}>{cap(u.role)}</Pill>{!u.isActive && <Pill tone="red">Suspended</Pill>}{!u.isVerified && <Pill>Email not confirmed</Pill>}{u.googleId && <Pill>Google sign-in</Pill>}</p>
              <p className="text-sm text-ink-soft mt-1">Joined {formatDate(u.createdAt)}</p>
            </div>
          </div>
          <dl className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center">
            {[['Lessons', d.stats.lessons], ['Certificates', d.stats.certificates], ['Saved', d.stats.saved], ['Applications', d.stats.applications], ['Sessions', d.stats.sessions], ['Documents', d.stats.documents]].map(([l, v]) => (
              <div key={l} className="rounded-lg bg-paper border border-line p-2"><dt className="text-xs text-ink-soft">{l}</dt><dd className="text-lg font-bold">{v}</dd></div>
            ))}
          </dl>
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
          {u.mentor && <p className="text-sm rounded-lg bg-brand-soft px-3 py-2">Mentor: {u.mentor.title}{u.mentor.org ? `, ${u.mentor.org}` : ''} · {u.mentor.isApproved ? 'approved' : 'not approved yet'}. Manage approval on the Mentors page.</p>}
        </div>
      )}
    </Modal>
  );
}
