import { useEffect, useState } from 'react';
import { api } from '../../services/api';

// "Continue with Google" (spec 4.2: sign up with Google, skip the form; spec 4.4: sign in with Google).
// Google's own sign-in page opens, then the person comes back signed in. New people become students.
// Needs GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in backend/.env. Until then, in development, the button
// shows how to switch it on; in production it stays hidden.
let configPromise;
const getConfig = () => (configPromise ??= api.get('/auth/config').then((r) => r.data).catch(() => ({})));

const GoogleG = () => (
  <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.5l6.7-6.7C35.6 2.4 30.2 0 24 0 14.6 0 6.6 5.4 2.7 13.2l7.8 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.1 24.6c0-1.6-.1-3.1-.4-4.6H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.4 5.8c4.3-4 6.9-9.9 6.9-17.1z" />
    <path fill="#FBBC05" d="M10.5 28.7c-.5-1.4-.8-3-.8-4.7s.3-3.2.8-4.7l-7.8-6.1C1 16.6 0 20.2 0 24s1 7.4 2.7 10.8l7.8-6.1z" />
    <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.8c-2.1 1.4-4.8 2.3-8.5 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.8 6.1C6.6 42.6 14.6 48 24 48z" />
  </svg>
);

export default function GoogleButton({ label = 'Continue with Google', from, divider = 'or use your email' }) {
  const [cfg, setCfg] = useState(null);
  const [hint, setHint] = useState(false);
  useEffect(() => { let alive = true; getConfig().then((c) => alive && setCfg(c)); return () => { alive = false; }; }, []);
  if (!cfg || (!cfg.google && !cfg.showGoogleSetupHint)) return null;

  const go = () => {
    if (!cfg.google) { setHint(true); return; }
    window.location.href = `/api/auth/google/start${from ? `?from=${encodeURIComponent(from)}` : ''}`;
  };
  return (
    <div className="mb-4">
      <button type="button" onClick={go}
        className="w-full min-h-11 rounded border-2 border-line bg-surface hover:border-brand/50 hover:bg-brand-soft inline-flex items-center justify-center gap-3 font-semibold text-[15px] text-ink transition-colors">
        <GoogleG />{label}
      </button>
      {hint && (
        <p className="mt-2 text-xs rounded-lg bg-paper border border-line px-3 py-2 text-ink-soft" role="status">
          Google sign-in is not switched on yet. To switch it on, add <code>GOOGLE_CLIENT_ID</code> and <code>GOOGLE_CLIENT_SECRET</code> to backend/.env (README section 12). This note only shows while developing.
        </p>
      )}
      <div className="flex items-center gap-3 mt-4 text-sm text-ink-soft" aria-hidden="true">
        <span className="h-px flex-1 bg-line" />{divider}<span className="h-px flex-1 bg-line" />
      </div>
    </div>
  );
}
