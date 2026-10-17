import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { applyA11y } from '../utils/a11y';
import { api, refreshSession, setAccessToken, setSignedOutHandler } from '../services/api';

const AuthContext = createContext(null);

// Offline use (installed app): remember who was signed in on this device — name and role only, never a password or
// token — so saved lessons can still be opened without internet. Cleared when they sign out.
const OFFLINE_KEY = 'inuka-offline-user';
const rememberUser = (u) => {
  try {
    if (u) localStorage.setItem(OFFLINE_KEY, JSON.stringify({ id: u.id, firstName: u.firstName, lastName: u.lastName, role: u.role, profilePhotoUrl: u.profilePhotoUrl || null }));
    else localStorage.removeItem(OFFLINE_KEY);
  } catch { /* private mode */ }
};
const offlineUser = () => { try { return JSON.parse(localStorage.getItem(OFFLINE_KEY) || 'null'); } catch { return null; } };
const clearOfflineData = () => {
  rememberUser(null);
  try { window.caches?.keys().then((keys) => keys.filter((k) => k.endsWith('-data')).forEach((k) => window.caches.delete(k))); } catch { /* ignore */ }
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const startSession = useCallback((data) => {
    setAccessToken(data.accessToken);
    setUser(data.user);
    rememberUser(data.user);
  }, []);

  useEffect(() => {
    setSignedOutHandler(() => setUser(null));
    refreshSession()
      .then((data) => { setUser(data.user); rememberUser(data.user); })
      .catch((err) => {
        // No internet (not "signed out"): keep the last user so saved lessons open offline.
        const offline = !err?.response && (typeof navigator !== 'undefined' && navigator.onLine === false);
        setUser(offline ? { ...offlineUser(), offline: true } : null);
        if (offline && !offlineUser()) setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    startSession(data);
    return data.user;
  }, [startSession]);

  const logout = useCallback(async () => {
    // Forget lessons saved for offline reading on this device (shared phones/computers).
    clearOfflineData();
    navigator.serviceWorker?.controller?.postMessage({ type: 'clear-user-cache' });
    try { await api.post('/auth/logout'); } catch { /* offline or server down: still sign out on this device */ } finally {
      setAccessToken(null);
      setUser(null);
    }
  }, []);

  // A signed-in user's accessibility settings follow them to every device.
  useEffect(() => { if (user?.accessibility) applyA11y(user.accessibility); }, [user?.accessibility]);

  const value = useMemo(
    () => ({ user, setUser, loading, login, logout, startSession }),
    [user, loading, login, logout, startSession],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
