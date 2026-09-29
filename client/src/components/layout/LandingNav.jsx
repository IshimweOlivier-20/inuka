import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { ChevronDown, Menu, X } from 'lucide-react';
import Logo from './Logo';
import { SectionLink } from '../landing/common';
import { NAV_ITEMS } from '../../config/site';
import { useAuth } from '../../context/AuthContext';

const linkBase = 'min-h-11 px-3.5 inline-flex items-center gap-1 rounded-lg font-medium transition-colors';
const linkIdle = 'text-ink hover:text-brand hover:bg-brand-soft';
const linkActive = 'text-brand bg-brand-soft';

function NavItem({ item, onNavigate }) {
  if (item.to) {
    return <NavLink to={item.to} onClick={onNavigate} className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkIdle}`}>{item.label}</NavLink>;
  }
  return <SectionLink id={item.id} onClick={onNavigate} className={`${linkBase} ${linkIdle}`}>{item.label}</SectionLink>;
}

// "About" dropdown: opens on click, closes on outside click or Escape.
function Dropdown({ item }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)} aria-expanded={open} aria-haspopup="true" className={`${linkBase} ${open ? linkActive : linkIdle}`}>
        {item.label}<ChevronDown size={16} className={`transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      {open && (
        <div className="nav-pop absolute right-0 mt-2 w-60 rounded-xl bg-white border border-line shadow-[0_16px_40px_-16px_rgba(26,26,46,0.3)] p-2">
          {item.children.map((c) => (
            <SectionLink key={c.id} id={c.id} onClick={() => setOpen(false)}
              className="flex items-center min-h-11 px-3 rounded-lg text-ink hover:bg-brand-soft hover:text-brand font-medium">{c.label}</SectionLink>
          ))}
        </div>
      )}
    </div>
  );
}

// Home page: transparent at the top (logo + sign in only); a solid sticky bar with links after scrolling.
// Other public pages: pass `solid` to always show the full bar.
export default function LandingNav({ solid = false }) {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const [scrolledPast, setScrolledPast] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const scrolled = solid || scrolledPast;

  useEffect(() => {
    if (solid) return;
    const onScroll = () => setScrolledPast(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [solid]);
  useEffect(() => { if (!scrolled) setMenuOpen(false); }, [scrolled]);
  useEffect(() => { setMenuOpen(false); }, [pathname]);

  const account = user ? { to: '/dashboard', label: 'My dashboard' } : { to: '/login', label: 'Sign in' };
  const close = () => setMenuOpen(false);

  return (
    <header className={`fixed inset-x-0 top-0 z-40 transition-[background-color,box-shadow,border-color] duration-300 border-b ${
      scrolled ? 'bg-white/95 backdrop-blur shadow-[0_2px_16px_rgba(26,26,46,0.08)] border-line' : 'bg-transparent border-transparent'}`}>
      <div className={`max-w-[1200px] mx-auto flex items-center justify-between gap-4 px-5 transition-[height] duration-300 ${scrolled ? 'h-16' : 'h-20'}`}>
        <Link to="/" onClick={() => pathname === '/' && window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="INUKA home">
          <Logo size={scrolled ? 'md' : 'lg'} />
        </Link>

        {scrolled && (
          <nav aria-label="Main" className="nav-pop hidden lg:flex items-center gap-0.5">
            {NAV_ITEMS.map((item) => (item.children ? <Dropdown key={item.label} item={item} /> : <NavItem key={item.label} item={item} />))}
          </nav>
        )}

        <div className="flex items-center gap-2">
          <Link to={account.to} className={`min-h-11 px-4 inline-flex items-center rounded-lg font-medium text-brand hover:bg-brand-soft`}>{account.label}</Link>
          {scrolled && !user && (
            <Link to="/register" className="nav-pop hidden sm:inline-flex min-h-11 px-5 items-center rounded-lg bg-brand text-white font-display font-semibold text-[15px] hover:bg-brand-dark">Get started</Link>
          )}
          {scrolled && (
            <button onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen} aria-controls="site-menu" aria-label="Menu"
              className="lg:hidden min-w-11 min-h-11 rounded-lg text-ink hover:bg-brand-soft inline-flex items-center justify-center">{menuOpen ? <X size={24} /> : <Menu size={24} />}</button>
          )}
        </div>
      </div>

      {/* Mobile / tablet menu */}
      {scrolled && menuOpen && (
        <nav id="site-menu" aria-label="Main" className="lg:hidden border-t border-line bg-white px-5 pb-5 max-h-[calc(100vh-4rem)] overflow-y-auto">
          {NAV_ITEMS.map((item) => (item.children ? (
            <div key={item.label} className="pt-4">
              <p className="text-xs font-semibold text-ink-soft mb-1">{item.label}</p>
              <div className="grid grid-cols-2 gap-x-3">
                {item.children.map((c) => (
                  <SectionLink key={c.id} id={c.id} onClick={close} className="flex items-center min-h-11 text-ink font-medium">{c.label}</SectionLink>
                ))}
              </div>
            </div>
          ) : item.to ? (
            <Link key={item.label} to={item.to} onClick={close} className="flex items-center min-h-12 font-medium border-b border-line">{item.label}</Link>
          ) : (
            <SectionLink key={item.label} id={item.id} onClick={close} className="flex items-center min-h-12 font-medium border-b border-line">{item.label}</SectionLink>
          )))}
          {!user && <Link to="/register" onClick={close} className="mt-5 flex items-center justify-center min-h-12 rounded-lg bg-brand text-white font-display font-semibold">Get started — it's free</Link>}
        </nav>
      )}
    </header>
  );
}
