import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, ShieldCheck } from 'lucide-react';
import Logo from '../layout/Logo';
import { Alert, Button } from '../ui';
import { useAuth } from '../../context/AuthContext';
import { api, errorMessage } from '../../services/api';

// Shown before the dashboard to anyone who has not accepted the current Terms of Use and Privacy Policy:
// people who signed up with Google, accounts made before the checkbox existed, and everyone after the Terms change.
const POINTS = [
  'INUKA is free. We never ask you to pay for a course, a mentor or a scholarship.',
  'We keep your account details, your learning progress and the files you upload, only to run INUKA for you.',
  'We never sell your information. Mentors see only what they need to help you.',
  'You can delete your account and your data at any time from your Profile.',
  'Be respectful: no harassment, no scams, no sharing other people’s private details.',
];

export default function TermsConsent() {
  const { user, setUser } = useAuth();
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const again = !!user.termsAcceptedAt; // accepted an older version
  useEffect(() => { document.title = 'Terms of Use and Privacy Policy — INUKA'; }, []);

  const accept = async () => {
    setBusy(true); setError('');
    try { const { data } = await api.post('/auth/accept-terms', { accept: true }); setUser(data.user); }
    catch (e) { setError(errorMessage(e)); setBusy(false); }
  };

  return (
    <main className="min-h-screen bg-paper flex items-start sm:items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="flex justify-center mb-6"><Logo /></div>
        <section className="bg-surface border border-line rounded-xl p-6 sm:p-7" aria-labelledby="terms-title">
          <h1 id="terms-title" className="text-xl font-bold flex items-center gap-2"><ShieldCheck size={22} className="text-brand" aria-hidden="true" />
            {again ? 'Our Terms have changed' : `Welcome, ${user.firstName}!`}
          </h1>
          <p className="text-sm text-ink-soft mt-2">
            {again ? 'We updated our Terms of Use and Privacy Policy. Please read and accept them to keep using INUKA.' : 'Before you start, please read and accept how INUKA works and how we protect your information.'}
          </p>
          <ul className="mt-4 space-y-2 text-sm">
            {POINTS.map((p) => <li key={p} className="flex gap-2"><span className="w-1.5 h-1.5 rounded-full bg-brand mt-2 shrink-0" aria-hidden="true" />{p}</li>)}
          </ul>
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm font-semibold">
            <Link to="/terms" target="_blank" className="text-brand underline underline-offset-2 inline-flex items-center gap-1">Read the Terms of Use<ExternalLink size={13} aria-hidden="true" /></Link>
            <Link to="/privacy" target="_blank" className="text-brand underline underline-offset-2 inline-flex items-center gap-1">Read the Privacy Policy<ExternalLink size={13} aria-hidden="true" /></Link>
          </div>
          <label className="mt-5 flex items-start gap-3 rounded-lg border border-line p-3 cursor-pointer has-[:checked]:border-brand has-[:checked]:bg-brand-soft/50">
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 w-5 h-5 shrink-0 accent-brand" />
            <span className="text-sm">I have read and I agree to the INUKA <strong>Terms of Use</strong> and <strong>Privacy Policy</strong>.</span>
          </label>
          {error && <div className="mt-3"><Alert>{error}</Alert></div>}
          <div className="mt-5 flex flex-col-reverse sm:flex-row sm:justify-between gap-2">
            <Button variant="ghost" to="/logout">Not now, sign out</Button>
            <Button onClick={accept} loading={busy} disabled={!agree}>Accept and continue</Button>
          </div>
        </section>
      </div>
    </main>
  );
}
