import { useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { FormPanel } from './AuthShell';
import GoogleButton from '../../components/auth/GoogleButton';
import { Alert, Button, Field } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { homeFor } from '../../config/roles';
import { api, errorMessage } from '../../services/api';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const as = params.get('as') === 'mentor' ? 'mentor' : 'student'; // Student Login / Mentor Login (spec 4.4)
  const googleMessage = {
    off: 'Google sign-in is not switched on yet. Please use your email and password.',
    cancelled: 'Google sign-in was cancelled. You can try again or use your email.',
    failed: 'Google sign-in did not work. Please try again or use your email and password.',
    unverified: 'Your Google account email is not confirmed. Please use your email and password.',
    suspended: 'This account has been suspended. Contact the INUKA team for help.',
  }[params.get('google')];
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [unverified, setUnverified] = useState(false);
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setInfo(''); setBusy(true);
    try {
      const user = await login(form.email, form.password);
      navigate(location.state?.from || homeFor(user), { replace: true });
    } catch (err) {
      setError(errorMessage(err));
      setUnverified(err.response?.data?.details?.code === 'unverified');
    } finally { setBusy(false); }
  };

  const resend = async () => {
    const { data } = await api.post('/auth/resend-verification', { email: form.email });
    setInfo('We sent a new confirmation link. Check your inbox.');
    if (data.devVerifyUrl) setInfo(<>Development mode: <a className="underline" href={data.devVerifyUrl}>open your confirmation link</a>.</>);
  };

  return (
    <FormPanel title="Sign in" subtitle={as === 'mentor' ? 'Sign in to your mentor dashboard.' : 'Sign in to continue learning.'}>
      <div className="grid grid-cols-2 gap-2 p-1 bg-paper rounded-lg mb-5" role="tablist" aria-label="Sign in as">
        {[['student', 'Student login'], ['mentor', 'Mentor login']].map(([k, label]) => (
          <button key={k} type="button" role="tab" aria-selected={as === k}
            onClick={() => setParams(k === 'mentor' ? { as: 'mentor' } : {}, { replace: true, state: location.state })}
            className={`min-h-11 rounded-md font-medium ${as === k ? 'bg-surface shadow-sm text-brand' : 'text-ink-soft hover:text-ink'}`}>
            {label}
          </button>
        ))}
      </div>
      {googleMessage && <div className="mb-4"><Alert>{googleMessage}</Alert></div>}
      {as === 'student' && <GoogleButton label="Sign in with Google" from={location.state?.from} />}
      <form onSubmit={submit} className="space-y-4" noValidate>
        {error && <Alert>{error} {unverified && <button type="button" onClick={resend} className="underline font-semibold">Send the link again</button>}</Alert>}
        {info && <Alert tone="success">{info}</Alert>}
        <Field label="Email address" type="email" autoComplete="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <Field label="Password" type="password" autoComplete="current-password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <div className="text-right -mt-2"><Link to="/forgot-password" className="text-sm text-brand hover:underline">Forgot password?</Link></div>
        <Button type="submit" loading={busy} className="w-full">Sign in</Button>
      </form>

    </FormPanel>
  );
}
