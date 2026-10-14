import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '../services/api';

// Number of unread messages (menu badge). Checked every 20 seconds and when the page changes.
export function useUnreadMessages(enabled) {
  const [n, setN] = useState(0);
  const { pathname } = useLocation();
  useEffect(() => {
    if (!enabled) return undefined;
    let alive = true;
    const check = () => { if (!document.hidden) api.get('/messages/unread').then((r) => alive && setN(r.data.unread)).catch(() => {}); };
    check();
    const t = setInterval(check, 20000);
    return () => { alive = false; clearInterval(t); };
  }, [enabled, pathname]);
  return n;
}
