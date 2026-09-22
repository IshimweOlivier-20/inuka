import axios from 'axios';

// Access token lives in memory only; the refresh token is an httpOnly cookie set by the server.
let accessToken = null;
let onSignedOut = () => {};

export const setAccessToken = (t) => { accessToken = t; };
export const setSignedOutHandler = (fn) => { onSignedOut = fn; };

export const api = axios.create({ baseURL: '/api', withCredentials: true, timeout: 30000 });

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

let refreshing = null;
export function refreshSession() {
  refreshing ??= api.post('/auth/refresh').then((r) => {
    setAccessToken(r.data.accessToken);
    return r.data;
  }).finally(() => { refreshing = null; });
  return refreshing;
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const isAuthCall = original?.url?.startsWith('/auth/');
    if (error.response?.status === 401 && !original._retried && !isAuthCall) {
      original._retried = true;
      try {
        await refreshSession();
        return api(original);
      } catch {
        setAccessToken(null);
        onSignedOut();
      }
    }
    return Promise.reject(error);
  },
);

// Turn any API error into a sentence we can show the student.
export function errorMessage(err, fallback = 'Something went wrong. Please try again.') {
  if (!err?.response) return 'We could not reach INUKA. Check your internet connection and try again.';
  return err.response.data?.error || fallback;
}
