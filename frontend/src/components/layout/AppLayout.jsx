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
import { useUnreadMessages } from '../../hooks/useUnreadMessages';
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
  const unread = useUnreadMessages(role === 'student' || role === 'mentor');

  // Dashboards use a slightly smaller type scale than the public website.
  useEffect(() => {
    document.documentElement.classList.add('dash');
    return () => document.documentElement.classList.remove('dash');
  }, []);

  // Active link = a tab in the page colour that "comes out" of the dark sidebar (curved corners, see .side-tab in index.css).
  const linkCls = ({ isActive }) =>
    `side-link group relative flex items-center gap-3.5 min-h-12 pl-4 pr-3 rounded-l-full font-medium transition-colors ${collapsed ? 'md:justify-center md:pl-0 md:pr-0 md:ml-1.5' : ''} ${isActive
      ? 'side-tab bg-paper text-brand font-semibold'
      : 'text-white/75 hover:text-white hover:bg-white/10 rounded-r-full mr-3'}`;

  return (
    <div className={`min-h-screen transition-[padding] ${collapsed ? 'md:pl-[96px]' : 'md:pl-[264px]'}`}>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-2 focus:p-3 focus:bg-surface">Skip to content</a>

      {/* Desktop sidebar (floating dark panel) / mobile drawer */}
      <aside className={`side fixed z-40 inset-y-0 left-0 md:inset-y-3 md:left-3 w-64 ${collapsed ? 'md:w-[80px]' : 'md:w-[244px]'} bg-night md:rounded-[28px] flex flex-col shadow-[0_20px_50px_-20px_rgba(7,41,77,0.55)] transition-[transform,width] duration-300 md:translate-x-0 ${menuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className={`flex items-center gap-2 pl-6 pr-4 pt-6 pb-5 ${collapsed ? 'md:justify-center md:px-0' : ''}`}>
          <span className={collapsed ? 'md:hidden' : ''}><Logo light size="md" /></span>
          {collapsed && <span className="hidden md:inline-flex" aria-label="INUKA"><Logo light markOnly size="sm" /></span>}
        </div>
        {!isStudent && <p className={`-mt-3 mb-3 pl-6 text-[11px] font-semibold tracking-wide text-accent ${label}`}>{ROLE_LABEL[role]} dashboard</p>}
        <nav className="flex-1 pl-3 space-y-1.5 overflow-y-auto overflow-x-hidden py-6" aria-label="Main">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={linkCls} onClick={() => setMenuOpen(false)} title={collapsed ? n.label : undefined}>
              <span className="relative shrink-0">
                <n.icon size={20} strokeWidth={2} aria-hidden="true" />
                {n.badge && unread > 0 && collapsed && <span className="hidden md:block absolute -top-1 -right-1.5 w-2.5 h-2.5 rounded-full bg-accent ring-2 ring-night" aria-hidden="true" />}
              </span>
              <span className={`${label} flex-1 text-[0.95rem]`}>{n.label}</span>
              {n.badge && unread > 0 && <span className={`min-w-5 h-5 px-1.5 rounded-full bg-accent text-night text-[11px] font-bold flex items-center justify-center ${collapsed ? 'md:hidden' : ''}`} aria-label={`${unread} unread`}>{unread > 99 ? '99+' : unread}</span>}
            </NavLink>
          ))}
        </nav>
        <div className="px-3 pb-4 pt-3 space-y-1">
          <Link to="/logout" title={collapsed ? 'Log out' : undefined}
            className={`flex items-center gap-3.5 min-h-12 px-4 rounded-full text-white/75 hover:text-white hover:bg-white/10 font-medium ${collapsed ? 'md:justify-center md:px-0' : ''}`}>
            <LogOut size={20} aria-hidden="true" className="shrink-0" /><span className={`${label} text-[0.95rem]`}>Log out</span>
          </Link>
          <button type="button" onClick={toggleCollapsed} aria-expanded={!collapsed} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={`hidden md:flex mt-2 w-11 h-11 rounded-full bg-paper text-brand items-center justify-center shadow-md hover:bg-accent transition-colors ${collapsed ? 'mx-auto' : 'ml-auto mr-1'}`}>
            {collapsed ? <PanelLeftOpen size={19} aria-hidden="true" /> : <PanelLeftClose size={19} aria-hidden="true" />}
          </button>
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
      {pathname !== '/ai' && !/^\/(messages|mentorship\/(book|sessions))/.test(pathname) && <ChatBubble className={isStudent ? 'right-4 bottom-20 md:bottom-6' : 'right-4 bottom-6'} />}

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
