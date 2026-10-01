import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import AuthShell from './AuthShell';
import { Alert, Button, Field, PageLoader } from '../../components/ui';
import { api, errorMessage } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export function VerifyEmail() {
  const [params] = useSearchParams();
  const { startSession } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const ran = useRef(false);
  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    api.post('/auth/verify-email', { token: params.get('token') })
      .then(({ data }) => { startSession(data); navigate('/dashboard?welcome=1', { replace: true }); })
      .catch((err) => setError(errorMessage(err)));
  }, [params, startSession, navigate]);
  if (!error) return <AuthShell title="Confirming your email…"><PageLoader /></AuthShell>;
  return (
    <AuthShell title="We could not confirm your email">
      <Alert>{error}</Alert>
      <Button to="/login" className="w-full mt-6">Go to sign in</Button>
    </AuthShell>
  );
}

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setError('');
    try { await api.post('/auth/forgot-password', { email }); setSent(true); } catch (err) { setError(errorMessage(err)); } finally { setBusy(false); }
  };
  return (
    <AuthShell title="Reset your password" subtitle="Enter your email and we will send you a reset link.">
      {sent ? <Alert tone="success">If an account exists for {email}, a reset link is on its way. It works for 1 hour.</Alert> : (
        <form onSubmit={submit} className="space-y-4" noValidate>
          {error && <Alert>{error}</Alert>}
          <Field label="Email address" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Button type="submit" loading={busy} className="w-full">Send reset link</Button>
        </form>
      )}
      <p className="mt-6 text-center"><Link to="/login" className="text-brand hover:underline">Back to sign in</Link></p>
    </AuthShell>
  );
}

export function ResetPassword() {
  const [params] = useSearchParams();
  const [pw, setPw] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setError('');
    try { await api.post('/auth/reset-password', { token: params.get('token'), password: pw }); setDone(true); } catch (err) { setError(errorMessage(err)); } finally { setBusy(false); }
  };
  return (
    <AuthShell title="Choose a new password">
      {done ? (<><Alert tone="success">Your password has been changed.</Alert><Button to="/login" className="w-full mt-6">Sign in</Button></>) : (
        <form onSubmit={submit} className="space-y-4" noValidate>
          {error && <Alert>{error}</Alert>}
          <Field label="New password" type="password" autoComplete="new-password" hint="At least 8 characters, including one number." value={pw} onChange={(e) => setPw(e.target.value)} />
          <Button type="submit" loading={busy} className="w-full">Save new password</Button>
        </form>
      )}
    </AuthShell>
  );
}
