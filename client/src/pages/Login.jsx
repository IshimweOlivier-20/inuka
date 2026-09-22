import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import AuthShell from './AuthShell';
import { Alert, Button, Field } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { api, errorMessage } from '../services/api';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
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
      navigate(location.state?.from || (user.role === 'admin' ? '/admin' : '/dashboard'), { replace: true });
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
    <AuthShell title="Welcome back" subtitle="Sign in to continue learning.">
      <form onSubmit={submit} className="space-y-4" noValidate>
        {error && <Alert>{error} {unverified && <button type="button" onClick={resend} className="underline font-semibold">Send the link again</button>}</Alert>}
        {info && <Alert tone="success">{info}</Alert>}
        <Field label="Email address" type="email" autoComplete="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <Field label="Password" type="password" autoComplete="current-password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <div className="text-right -mt-2"><Link to="/forgot-password" className="text-sm text-forest hover:underline">Forgot password?</Link></div>
        <Button type="submit" loading={busy} className="w-full">Sign in</Button>
      </form>
      <p className="mt-6 text-center text-ink-soft">New to INUKA? <Link to="/register" className="text-forest font-semibold hover:underline">Create a free account</Link></p>
    </AuthShell>
  );
}
