import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Alert, Button, Card, Field, Modal, Pill } from '../../components/ui';
import ApplicationsTable from '../../components/scholarships/ApplicationsTable';
import { CertificateList } from './MyLearning';
import { CountryOptions, LANGUAGES } from '../../utils/countries';
import { useAuth } from '../../context/AuthContext';
import { api, errorMessage } from '../../services/api';
import { formatDate, formatSize } from '../../utils/format';
import { ListRowsSkeleton } from '../../components/ui/Skeletons';
import { CircleCheck, TriangleAlert } from 'lucide-react';
import ProfilePhotoCard from '../../components/auth/ProfilePhotoCard';

const TABS = [['personal', 'Personal information'], ['documents', 'Documents vault'], ['applications', 'My applications'], ['certificates', 'Certificates']];

export default function Profile() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'personal';
  return (
    <div>
      <h1 className="text-3xl font-bold">Profile</h1>
      <div role="tablist" className="flex gap-1 mt-6 border-b border-line overflow-x-auto">
        {TABS.map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setParams({ tab: k })}
            className={`min-h-11 px-4 font-medium whitespace-nowrap border-b-2 -mb-px ${tab === k ? 'border-brand text-brand' : 'border-transparent text-ink-soft hover:text-ink'}`}>{l}</button>
        ))}
      </div>
      <div className="mt-6">
        {tab === 'personal' && <PersonalInfo />}
        {tab === 'documents' && <DocumentVault highlight={params.get('type')} />}
        {tab === 'applications' && <ApplicationsTable />}
        {tab === 'certificates' && <CertificateList />}
      </div>
    </div>
  );
}

function PersonalInfo() {
  const { user, setUser, logout } = useAuth();
  const navigate = useNavigate();
  const [f, setF] = useState({
    firstName: user.firstName, lastName: user.lastName, countryOrigin: user.countryOrigin || '', countryResidence: user.countryResidence || '',
    refugeeStatus: user.refugeeStatus || '', educationLevel: user.educationLevel || '', language: user.language || '', age: user.age ?? '',
  });
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' });
  const [pwMsg, setPwMsg] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const save = async (e) => {
    e.preventDefault(); setBusy(true); setMsg(null);
    try {
      const { data } = await api.patch('/profile', {
        ...f, refugeeStatus: f.refugeeStatus || null, educationLevel: f.educationLevel || null, language: f.language || null, age: f.age === '' ? null : f.age,
      });
      setUser({ ...user, ...data.user });
      setMsg({ tone: 'success', text: 'Your profile has been saved.' });
    } catch (err) { setMsg({ tone: 'error', text: errorMessage(err) }); } finally { setBusy(false); }
  };
  const changePw = async (e) => {
    e.preventDefault(); setPwMsg(null);
    try { await api.post('/profile/password', pw); setPw({ currentPassword: '', newPassword: '' }); setPwMsg({ tone: 'success', text: 'Your password has been changed.' }); }
    catch (err) { setPwMsg({ tone: 'error', text: errorMessage(err) }); }
  };
  const deleteAccount = async () => { await api.delete('/profile'); await logout(); navigate('/'); };

  return (
    <div className="grid lg:grid-cols-[1fr_320px] gap-6 items-start">
      <Card>
        <form onSubmit={save} className="space-y-4" noValidate>
          {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="First name" value={f.firstName} onChange={set('firstName')} />
            <Field label="Last name" value={f.lastName} onChange={set('lastName')} />
          </div>
          <Field label="Email address" value={user.email} disabled hint="Contact the INUKA team to change your email." />
          <div className="grid sm:grid-cols-2 gap-4">
            <Field as="select" label="Country of origin" value={f.countryOrigin} onChange={set('countryOrigin')}><CountryOptions /></Field>
            <Field as="select" label="Country where you live now" value={f.countryResidence} onChange={set('countryResidence')}><CountryOptions /></Field>
          </div>
          <Field as="select" label="Refugee or displaced status" value={f.refugeeStatus} onChange={set('refugeeStatus')}>
            <option value="">Not set</option><option value="yes">Yes</option><option value="no">No</option><option value="prefer_not_to_say">Prefer not to say</option>
          </Field>
          <div className="grid sm:grid-cols-3 gap-4">
            <Field as="select" label="Education level" value={f.educationLevel} onChange={set('educationLevel')}>
              <option value="">Not set</option>{['S4', 'S5', 'S6', 'Other'].map((l) => <option key={l}>{l}</option>)}
            </Field>
            <Field as="select" label="Language at home" value={f.language} onChange={set('language')}>
              <option value="">Not set</option>{LANGUAGES.map((l) => <option key={l}>{l}</option>)}
            </Field>
            <Field label="Age" type="number" value={f.age} onChange={set('age')} />
          </div>
          <p className="text-sm text-ink-soft">Member since {formatDate(user.createdAt)}</p>
          <Button type="submit" loading={busy}>Save changes</Button>
        </form>
      </Card>
      <div className="space-y-6">
        <ProfilePhotoCard />
        <Card>
          <h2 className="font-semibold text-lg mb-3">Change password</h2>
          <form onSubmit={changePw} className="space-y-3" noValidate>
            {pwMsg && <Alert tone={pwMsg.tone}>{pwMsg.text}</Alert>}
            <Field label="Current password" type="password" autoComplete="current-password" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} />
            <Field label="New password" type="password" autoComplete="new-password" value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} />
            <Button type="submit" variant="outline" className="w-full">Change password</Button>
          </form>
        </Card>
        <Card className="border-red-200">
          <h2 className="font-semibold text-lg text-danger mb-2">Delete account</h2>
          <p className="text-sm text-ink-soft mb-3">This removes your progress, documents and applications forever.</p>
          <Button variant="danger" onClick={() => setConfirmDelete(true)} className="w-full">Delete my account</Button>
        </Card>
      </div>
      <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Delete your account?"
        footer={<><Button variant="ghost" onClick={() => setConfirmDelete(false)}>Keep my account</Button><Button variant="danger" onClick={deleteAccount}>Delete forever</Button></>}>
        <p>All your lessons, badges, certificates and uploaded documents will be deleted. This cannot be undone.</p>
      </Modal>
    </div>
  );
}

const STATUS = { required: ['Required', 'red'], if_applicable: ['If applicable', 'grey'], recommended: ['Recommended', 'brand'], if_required: ['If required', 'grey'], optional: ['Optional', 'grey'] };

function DocumentVault({ highlight }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(null);
  const inputs = useRef({});
  const load = () => api.get('/documents').then((r) => setData(r.data)).catch((e) => setError(errorMessage(e)));
  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (data && highlight) document.getElementById(`doc-${highlight}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [data, highlight]);

  const upload = async (type, file) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError('This file is larger than 5 MB. Please choose a smaller file.'); return; }
    setError(''); setUploading(type);
    const body = new FormData();
    body.append('docType', type);
    body.append('file', file);
    try { await api.post('/documents/upload', body); await load(); } catch (e) { setError(errorMessage(e)); } finally { setUploading(null); }
  };
  const view = async (doc) => {
    const win = window.open('', '_blank');
    const r = await api.get(`/documents/${doc.id}/file`, { responseType: 'blob' });
    win.location.href = URL.createObjectURL(r.data);
  };
  const remove = async (doc) => { await api.delete(`/documents/${doc.id}`); load(); };

  if (!data) return error ? <Alert>{error}</Alert> : <ListRowsSkeleton rows={6} label="Loading your documents" />;
  const uploadedRequired = data.types.filter((t) => t.status === 'required' && data.documents.some((d) => d.docType === t.key)).length;
  const totalRequired = data.types.filter((t) => t.status === 'required').length;

  return (
    <div>
      <p className="text-ink-soft mb-4">Keep every document you need for applications here. Files you upload are ticked automatically when you apply for a scholarship. You have <strong className="text-ink">{uploadedRequired} of {totalRequired}</strong> required documents.</p>
      {error && <div className="mb-4"><Alert>{error}</Alert></div>}
      <ul className="space-y-3">
        {data.types.map((t) => {
          const docs = data.documents.filter((d) => d.docType === t.key);
          const [statusLabel, statusTone] = STATUS[t.status];
          const accept = t.formats.map((f) => `.${f}`).join(',');
          return (
            <li key={t.key} id={`doc-${t.key}`} className={`bg-surface rounded-xl border p-4 ${highlight === t.key ? 'border-accent ring-2 ring-accent/40' : 'border-line'}`}>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-48">
                  <p className="font-semibold">{t.label}</p>
                  <p className="text-sm text-ink-soft">{t.formats.map((f) => f.toUpperCase()).join(', ')}, up to 5 MB</p>
                </div>
                <Pill tone={statusTone}>{statusLabel}</Pill>
                {docs.length ? <Pill tone="sky"><CircleCheck size={14} aria-hidden="true" />Uploaded</Pill> : <Pill tone={t.status === 'required' ? 'red' : 'grey'}><TriangleAlert size={14} aria-hidden="true" />Missing</Pill>}
                <input ref={(el) => { inputs.current[t.key] = el; }} type="file" accept={accept} className="sr-only" aria-label={`Upload ${t.label}`}
                  onChange={(e) => { upload(t.key, e.target.files[0]); e.target.value = ''; }} />
                <Button variant={docs.length ? 'ghost' : 'outline'} loading={uploading === t.key} onClick={() => inputs.current[t.key].click()}>
                  {docs.length && t.key !== 'other' ? 'Replace' : 'Upload'}
                </Button>
              </div>
              {docs.map((d) => (
                <div key={d.id} className="mt-3 flex flex-wrap items-center gap-3 rounded-lg bg-paper px-3 py-2 text-sm">
                  <span className="flex-1 min-w-40 truncate font-medium">{d.fileName}</span>
                  <span className="text-ink-soft">{formatSize(d.fileSize)}, {formatDate(d.uploadedAt)}</span>
                  <button onClick={() => view(d)} className="text-brand font-semibold hover:underline min-h-11 px-2">View</button>
                  <button onClick={() => remove(d)} className="text-danger font-semibold hover:underline min-h-11 px-2">Delete</button>
                </div>
              ))}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
