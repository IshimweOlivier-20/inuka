import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import ChatBubble from '../ai/ChatBubble';
import { Suspense, useEffect, useState } from 'react';
import Logo from './Logo';
import Avatar from '../ui/Avatar';
import NotificationBell from './NotificationBell';
import HeaderSearch from './HeaderSearch';
import ThemeToggle from './ThemeToggle';
import { useAuth } from '../../context/AuthContext';
import { PageSkeleton } from '../ui/Skeletons';
import { LogOut, Menu, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { MOBILE_TABS, ROLE_LABEL, ROLE_NAV, homeFor } from '../../config/roles';

// true/false as the device goes online/offline
function useOnline() {
  const [on, setOn] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  useEffect(() => {
    const up = () => setOn(true); const down = () => setOn(false);
    window.addEventListener('online', up); window.addEventListener('offline', down);
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', down); };
  }, []);
  return on;
}

// One layout for all three dashboards; the sidebar links depend on the role (see config/roles.js).

export default function AppLayout() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const online = useOnline();
  // Desktop: the sidebar can be collapsed to icons only (spec 6.1). Remembered on this device.
  const [collapsed, setCollapsed] = useState(() => { try { return localStorage.getItem('inuka-sidebar') === 'collapsed'; } catch { return false; } });
  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    try { localStorage.setItem('inuka-sidebar', next ? 'collapsed' : 'open'); } catch { /* private mode: not remembered */ }
  };
  const label = collapsed ? 'md:sr-only' : '';
  const role = user?.role || 'student';
  const NAV = ROLE_NAV[role] || ROLE_NAV.student;
  const isStudent = role === 'student';

  const linkCls = ({ isActive }) =>
    `flex items-center gap-3 min-h-11 px-4 rounded-lg font-medium transition-colors ${collapsed ? 'md:justify-center md:px-0' : ''} ${isActive
      ? 'bg-brand-soft text-brand font-semibold shadow-[inset_4px_0_0_var(--color-accent)]'
      : 'text-ink-soft hover:bg-brand-soft hover:text-brand'}`;

  return (
    <div className={`min-h-screen transition-[padding] ${collapsed ? 'md:pl-[76px]' : 'md:pl-60'}`}>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-2 focus:p-3 focus:bg-surface">Skip to content</a>

      {/* Desktop sidebar / mobile drawer */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-60 ${collapsed ? 'md:w-[76px]' : ''} bg-surface border-r border-line flex flex-col transition-[transform,width] md:translate-x-0 ${menuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className={`px-5 py-5 ${collapsed ? 'md:px-0 md:text-center' : ''}`}>
          <span className={collapsed ? 'md:hidden' : ''}><Logo /></span>
          {collapsed && <span className="hidden md:inline-flex" aria-label="INUKA"><Logo markOnly /></span>}
          {!isStudent && <p className={`mt-2 text-xs font-semibold uppercase tracking-wider text-ink-soft ${label}`}>{ROLE_LABEL[role]} dashboard</p>}
        </div>
        <nav className="flex-1 px-3 space-y-1" aria-label="Main">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={linkCls} onClick={() => setMenuOpen(false)} title={collapsed ? n.label : undefined}>
              <n.icon size={20} strokeWidth={2} aria-hidden="true" className="shrink-0" /><span className={label}>{n.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-line space-y-1">
          <button type="button" onClick={toggleCollapsed} aria-expanded={!collapsed} title={collapsed ? 'Expand sidebar' : undefined}
            className={`hidden md:flex w-full items-center gap-3 min-h-11 px-4 rounded-lg text-ink-soft hover:bg-brand-soft hover:text-brand font-medium ${collapsed ? 'justify-center px-0' : ''}`}>
            {collapsed ? <PanelLeftOpen size={20} aria-hidden="true" /> : <PanelLeftClose size={20} aria-hidden="true" />}
            <span className={label}>{collapsed ? 'Expand sidebar' : 'Collapse sidebar'}</span>
          </button>
          <Link to="/logout" title={collapsed ? 'Log out' : undefined}
            className={`w-full flex items-center gap-3 min-h-11 px-4 rounded-lg text-ink-soft hover:bg-[#FDECEC] hover:text-danger font-medium ${collapsed ? 'md:justify-center md:px-0' : ''}`}>
            <LogOut size={20} aria-hidden="true" className="shrink-0" /><span className={label}>Log out</span>
          </Link>
        </div>
      </aside>
      {menuOpen && <div className="fixed inset-0 z-30 bg-black/40 md:hidden" onClick={() => setMenuOpen(false)} aria-hidden />}

      <header className="sticky top-0 z-20 bg-paper/95 backdrop-blur border-b border-line">
        <div className="flex items-center justify-between gap-3 h-16 px-4 md:px-8 max-w-[1200px] mx-auto">
          <button className="md:hidden min-w-11 min-h-11 inline-flex items-center justify-center" onClick={() => setMenuOpen(true)} aria-label="Open menu"><Menu size={24} /></button>
          <HeaderSearch />
          <div className="flex items-center gap-2 shrink-0 ml-auto sm:ml-0">
            <ThemeToggle />
            <NotificationBell />
            <NavLink to={isStudent ? '/profile' : homeFor(user)} className="flex items-center gap-2 min-h-11 pl-1 pr-3 rounded-full hover:bg-brand-soft">
              <Avatar user={user} />
              <span className="hidden sm:block font-medium">{user?.firstName}</span>
            </NavLink>
          </div>
        </div>
      </header>

      {!online && (
        <p role="status" className="bg-warning-soft text-warning-ink text-sm font-semibold text-center px-4 py-2 border-b border-warning/30">
          You are offline. You can read lessons you opened before; other pages need internet.
        </p>
      )}

      <main id="main" className={`px-4 md:px-8 py-6 md:py-8 ${isStudent ? 'pb-24' : 'pb-10'} md:pb-8 max-w-[1200px] mx-auto`}>
        <Suspense fallback={<PageSkeleton />}><Outlet /></Suspense>
      </main>

      {/* INUKA AI floating bubble (free) on every dashboard page except the full chat (spec 13.2) */}
      {pathname !== '/ai' && <ChatBubble className={isStudent ? 'right-4 bottom-20 md:bottom-6' : 'right-4 bottom-6'} />}

      {/* Mobile bottom tab bar (students) */}
      {isStudent && (
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-20 bg-surface border-t border-line grid grid-cols-5" aria-label="Quick">
        {NAV.filter((n) => MOBILE_TABS.includes(n.to)).map((n) => (
          <NavLink key={n.to} to={n.to} className={({ isActive }) => `flex flex-col items-center justify-center min-h-14 text-[11px] ${isActive ? 'text-brand font-semibold' : 'text-ink-soft'}`}>
            <n.icon size={22} strokeWidth={2} aria-hidden="true" />{n.label.replace('My ', '')}
          </NavLink>
        ))}
      </nav>
      )}
    </div>
  );
}
