import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { homeFor } from '../../config/roles';
import { api, errorMessage } from '../../services/api';
import { Alert } from '../ui';

// "Sign in with Google" / "Sign up with Google" (spec 4.2 and 4.4), using Google Identity Services.
// Shows nothing until GOOGLE_CLIENT_ID is set in backend/.env.
let configPromise;
let scriptPromise;
const getConfig = () => (configPromise ??= api.get('/auth/config').then((r) => r.data).catch(() => ({})));
const loadScript = () => (scriptPromise ??= new Promise((resolve, reject) => {
  const s = document.createElement('script');
  s.src = 'https://accounts.google.com/gsi/client';
  s.async = true;
  s.onload = resolve;
  s.onerror = reject;
  document.head.appendChild(s);
}));

export default function GoogleButton({ text = 'signin_with', role, from, divider = 'or use your email' }) {
  const ref = useRef(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const { startSession } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    let alive = true;
    (async () => {
      const { googleClientId } = await getConfig();
      if (!googleClientId || !alive) return;
      try { await loadScript(); } catch { return; } // offline or blocked: just hide the button
      if (!alive || !window.google?.accounts?.id) return;
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: async ({ credential }) => {
          setError('');
          try {
            const { data } = await api.post('/auth/google', { credential, role });
            startSession(data);
            navigate(data.isNew ? '/dashboard?welcome=1' : (from || homeFor(data.user)), { replace: true });
          } catch (e) { setError(errorMessage(e)); }
        },
      });
      setReady(true);
    })();
    return () => { alive = false; };
  }, [role, from]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!ready || !ref.current) return;
    ref.current.innerHTML = '';
    window.google.accounts.id.renderButton(ref.current, {
      theme: 'outline', size: 'large', shape: 'rectangular', text, logo_alignment: 'center',
      width: Math.min(ref.current.offsetWidth || 360, 400),
    });
  }, [ready, text]);

  if (!ready) return null;
  return (
    <div className="mb-5">
      {error && <div className="mb-3"><Alert>{error}</Alert></div>}
      <div ref={ref} className="w-full flex justify-center min-h-11" />
      <div className="flex items-center gap-3 mt-5 text-sm text-ink-soft" aria-hidden="true">
        <span className="h-px flex-1 bg-line" />{divider}<span className="h-px flex-1 bg-line" />
      </div>
    </div>
  );
}
