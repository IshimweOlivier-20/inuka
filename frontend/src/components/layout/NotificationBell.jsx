import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { timeAgo } from '../../utils/format';

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState({ notifications: [], unread: 0 });
  const ref = useRef(null);
  const navigate = useNavigate();

  const load = () => api.get('/notifications').then((r) => setData(r.data)).catch(() => {});
  useEffect(() => {
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    const close = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const openItem = async (n) => {
    if (!n.isRead) await api.patch(`/notifications/${n.id}/read`).catch(() => {});
    setOpen(false);
    load();
    if (n.link) navigate(n.link);
  };
  const markAll = async () => { await api.patch('/notifications/read-all'); load(); };

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)} className="relative min-w-11 min-h-11 rounded-full hover:bg-brand-soft flex items-center justify-center"
        aria-label={`Notifications${data.unread ? `, ${data.unread} unread` : ''}`} aria-expanded={open}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>
        {data.unread > 0 && <span className="absolute top-1 right-1 min-w-5 h-5 px-1 rounded-full bg-danger text-white text-xs font-bold flex items-center justify-center">{data.unread > 9 ? '9+' : data.unread}</span>}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] bg-white rounded-xl shadow-lg border border-line z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-line">
            <span className="font-display font-semibold">Notifications</span>
            {data.unread > 0 && <button onClick={markAll} className="text-sm text-brand hover:underline">Mark all as read</button>}
          </div>
          <ul className="max-h-96 overflow-y-auto">
            {data.notifications.length === 0 && <li className="px-4 py-6 text-sm text-ink-soft text-center">No notifications yet. Complete a lesson to earn your first badge.</li>}
            {data.notifications.map((n) => (
              <li key={n.id}>
                <button onClick={() => openItem(n)} className={`w-full text-left px-4 py-3 border-b border-line last:border-0 hover:bg-paper ${n.isRead ? '' : 'bg-brand-soft/60'}`}>
                  <p className="text-sm">{n.message}</p>
                  <p className="text-xs text-ink-soft mt-0.5">{timeAgo(n.createdAt)}</p>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
