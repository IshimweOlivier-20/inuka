import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Suspense, useState } from 'react';
import Logo from './Logo';
import NotificationBell from './NotificationBell';
import { useAuth } from '../../context/AuthContext';
import { PageSkeleton } from '../ui/Skeletons';

// Sidebar navigation (spec 6.1)
export const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: '🏠' },
  { to: '/courses', label: 'Courses', icon: '📚' },
  { to: '/scholarships', label: 'Scholarships', icon: '🎓' },
  { to: '/my-learning', label: 'My Learning', icon: '📖' },
  { to: '/mentorship', label: 'Mentorship', icon: '🤝' },
  { to: '/ai', label: 'INUKA AI', icon: '🤖' },
  { to: '/profile', label: 'Profile', icon: '👤' },
];
const MOBILE_TABS = ['/dashboard', '/courses', '/scholarships', '/my-learning', '/profile'];

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const signOut = async () => { await logout(); navigate('/'); };

  const linkCls = ({ isActive }) =>
    `flex items-center gap-3 min-h-11 px-4 rounded-lg font-medium transition-colors ${isActive ? 'bg-white/15 text-white shadow-[inset_3px_0_0_var(--color-gold)]' : 'text-white/80 hover:bg-white/10 hover:text-white'}`;

  return (
    <div className="min-h-screen md:pl-60">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-2 focus:p-3 focus:bg-white">Skip to content</a>

      {/* Desktop sidebar / mobile drawer */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-60 bg-forest flex flex-col transition-transform md:translate-x-0 ${menuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="px-5 py-5"><Logo light /></div>
        <nav className="flex-1 px-3 space-y-1" aria-label="Main">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} className={linkCls} onClick={() => setMenuOpen(false)}>
              <span aria-hidden>{n.icon}</span>{n.label}
            </NavLink>
          ))}
          {user?.role === 'admin' && <NavLink to="/admin" className={linkCls} onClick={() => setMenuOpen(false)}><span aria-hidden>🛠️</span>Admin</NavLink>}
        </nav>
        <div className="p-3 border-t border-white/10">
          <button onClick={signOut} className="w-full flex items-center gap-3 min-h-11 px-4 rounded-lg text-white/80 hover:bg-white/10 hover:text-white font-medium">
            <span aria-hidden>🚪</span>Log out
          </button>
        </div>
      </aside>
      {menuOpen && <div className="fixed inset-0 z-30 bg-ink/40 md:hidden" onClick={() => setMenuOpen(false)} aria-hidden />}

      <header className="sticky top-0 z-20 bg-paper/95 backdrop-blur border-b border-line">
        <div className="flex items-center justify-between h-16 px-4 md:px-8 max-w-[1200px] mx-auto">
          <button className="md:hidden min-w-11 min-h-11 text-2xl" onClick={() => setMenuOpen(true)} aria-label="Open menu">☰</button>
          <span className="hidden md:block" />
          <div className="flex items-center gap-2">
            <NotificationBell />
            <NavLink to="/profile" className="flex items-center gap-2 min-h-11 pl-1 pr-3 rounded-full hover:bg-leaf">
              <span className="w-9 h-9 rounded-full bg-gold text-ink font-display font-semibold flex items-center justify-center">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </span>
              <span className="hidden sm:block font-medium">{user?.firstName}</span>
            </NavLink>
          </div>
        </div>
      </header>

      <main id="main" className="px-4 md:px-8 py-6 md:py-8 pb-24 md:pb-8 max-w-[1200px] mx-auto">
        <Suspense fallback={<PageSkeleton />}><Outlet /></Suspense>
      </main>

      {/* Mobile bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-20 bg-white border-t border-line grid grid-cols-5" aria-label="Quick">
        {NAV.filter((n) => MOBILE_TABS.includes(n.to)).map((n) => (
          <NavLink key={n.to} to={n.to} className={({ isActive }) => `flex flex-col items-center justify-center min-h-14 text-[11px] ${isActive ? 'text-forest font-semibold' : 'text-ink-soft'}`}>
            <span className="text-lg" aria-hidden>{n.icon}</span>{n.label.replace('My ', '')}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
