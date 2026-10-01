import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import ChatBubble from '../ai/ChatBubble';
import { Suspense, useState } from 'react';
import Logo from './Logo';
import Avatar from '../ui/Avatar';
import NotificationBell from './NotificationBell';
import HeaderSearch from './HeaderSearch';
import ThemeToggle from './ThemeToggle';
import { useAuth } from '../../context/AuthContext';
import { PageSkeleton } from '../ui/Skeletons';
import { LogOut, Menu, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { MOBILE_TABS, ROLE_LABEL, ROLE_NAV, homeFor } from '../../config/roles';

// One layout for all three dashboards; the sidebar links depend on the role (see config/roles.js).

export default function AppLayout() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
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
    `flex items-center gap-3 min-h-11 px-4 rounded-lg font-medium transition-colors ${collapsed ? 'md:justify-center md:px-0' : ''} ${isActive ? 'bg-white/15 text-white shadow-[inset_3px_0_0_var(--color-accent)]' : 'text-white/80 hover:bg-white/10 hover:text-white'}`;

  return (
    <div className={`min-h-screen transition-[padding] ${collapsed ? 'md:pl-[76px]' : 'md:pl-60'}`}>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-2 focus:p-3 focus:bg-surface">Skip to content</a>

      {/* Desktop sidebar / mobile drawer */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-60 ${collapsed ? 'md:w-[76px]' : ''} bg-brand-deep flex flex-col transition-[transform,width] md:translate-x-0 ${menuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className={`px-5 py-5 ${collapsed ? 'md:px-0 md:text-center' : ''}`}>
          <span className={collapsed ? 'md:hidden' : ''}><Logo light /></span>
          {collapsed && <span className="hidden md:inline font-display font-extrabold text-2xl text-white" aria-label="INUKA">I</span>}
          {!isStudent && <p className={`mt-2 text-xs font-semibold uppercase tracking-wider text-white/60 ${label}`}>{ROLE_LABEL[role]} dashboard</p>}
        </div>
        <nav className="flex-1 px-3 space-y-1" aria-label="Main">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={linkCls} onClick={() => setMenuOpen(false)} title={collapsed ? n.label : undefined}>
              <n.icon size={20} strokeWidth={2} aria-hidden="true" className="shrink-0" /><span className={label}>{n.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-white/10 space-y-1">
          <button type="button" onClick={toggleCollapsed} aria-expanded={!collapsed} title={collapsed ? 'Expand sidebar' : undefined}
            className={`hidden md:flex w-full items-center gap-3 min-h-11 px-4 rounded-lg text-white/80 hover:bg-white/10 hover:text-white font-medium ${collapsed ? 'justify-center px-0' : ''}`}>
            {collapsed ? <PanelLeftOpen size={20} aria-hidden="true" /> : <PanelLeftClose size={20} aria-hidden="true" />}
            <span className={label}>{collapsed ? 'Expand sidebar' : 'Collapse sidebar'}</span>
          </button>
          <Link to="/logout" title={collapsed ? 'Log out' : undefined}
            className={`w-full flex items-center gap-3 min-h-11 px-4 rounded-lg text-white/80 hover:bg-white/10 hover:text-white font-medium ${collapsed ? 'md:justify-center md:px-0' : ''}`}>
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

      <main id="main" className={`px-4 md:px-8 py-6 md:py-8 ${isStudent ? 'pb-24' : 'pb-10'} md:pb-8 max-w-[1200px] mx-auto`}>
        <Suspense fallback={<PageSkeleton />}><Outlet /></Suspense>
      </main>

      {/* INUKA AI floating bubble on every student page except the full chat (spec 13.2) */}
      {isStudent && pathname !== '/ai' && <ChatBubble />}

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
