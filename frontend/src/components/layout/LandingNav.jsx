import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { ChevronDown, Menu, X } from 'lucide-react';
import Logo from './Logo';
import { SectionLink } from '../landing/common';
import { Mail, MapPin, Phone } from 'lucide-react';
import { NAV_ITEMS, SITE } from '../../config/site';
import { ICONS } from '../landing/socialIcons';
import { useAuth } from '../../context/AuthContext';
import { homeFor } from '../../config/roles';
import ThemeToggle from './ThemeToggle';

const linkBase = 'min-h-11 px-3.5 inline-flex items-center gap-1 font-medium text-[15px] transition-colors';
const linkIdle = 'text-brand hover:text-accent-hover';
const linkActive = 'text-accent-hover';

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
        <div className="nav-pop absolute right-0 mt-2 w-60 rounded-xl bg-surface border border-line shadow-[0_16px_40px_-16px_rgba(26,26,46,0.3)] p-2">
          {item.children.map((c) => (
            <SectionLink key={c.id} id={c.id} onClick={() => setOpen(false)}
              className="flex items-center min-h-11 px-3 rounded text-brand hover:bg-brand-soft hover:text-accent-hover font-medium">{c.label}</SectionLink>
          ))}
        </div>
      )}
    </div>
  );
}

// Thin dark bar above the navbar (home page, large screens): contact details, social links, sign in / register.
function TopBar({ user, account }) {
  const social = Object.entries(SITE.social).filter(([, url]) => url);
  return (
    <div className="hidden md:block bg-night text-white/80 text-[13px]">
      <div className="max-w-[1200px] mx-auto px-5 h-10 flex items-center gap-5">
        <a href={`mailto:${SITE.contactEmail}`} className="inline-flex items-center gap-2 hover:text-white"><Mail size={14} aria-hidden="true" />{SITE.contactEmail}</a>
        {SITE.phone && <a href={`tel:${SITE.phone.replace(/\s/g, '')}`} className="inline-flex items-center gap-2 hover:text-white border-l border-white/15 pl-5"><Phone size={14} aria-hidden="true" />{SITE.phone}</a>}
        {SITE.address?.lines?.length > 0 && <span className="hidden lg:inline-flex items-center gap-2 border-l border-white/15 pl-5"><MapPin size={14} aria-hidden="true" />{SITE.address.lines.join(', ')}</span>}
        <div className="ml-auto flex items-center gap-4">
          {social.length > 0 && (
            <span className="inline-flex items-center gap-3">
              Follow us:
              {social.map(([name, url]) => (
                <a key={name} href={url} target="_blank" rel="noopener noreferrer" aria-label={`INUKA on ${name}`} className="hover:text-white">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">{ICONS[name]}</svg>
                </a>
              ))}
            </span>
          )}
          <span className={`${social.length ? 'border-l border-white/15 pl-4' : ''}`}>
            {user ? <Link to={account.to} className="hover:text-white">My dashboard</Link>
              : <><Link to="/login" className="hover:text-white">Sign in</Link> / <Link to="/register" className="hover:text-white">Register</Link></>}
          </span>
        </div>
      </div>
    </div>
  );
}

// Home page: a thin contact bar on top, then the white navbar. The contact bar slides away once you scroll.
// `solid`: always show the full navbar with links. `topBar`: show the contact bar until the page is scrolled.
export default function LandingNav({ solid = false, topBar = false }) {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const [scrolledPast, setScrolledPast] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const scrolled = solid || scrolledPast;

  useEffect(() => {
    if (solid && !topBar) return;
    const onScroll = () => setScrolledPast(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [solid, topBar]);
  useEffect(() => { if (!scrolled) setMenuOpen(false); }, [scrolled]);
  useEffect(() => { setMenuOpen(false); }, [pathname]);

  const account = user ? { to: homeFor(user), label: 'My dashboard' } : { to: '/login', label: 'Sign in' };
  const close = () => setMenuOpen(false);

  return (
    <header className={`fixed inset-x-0 top-0 z-40 transition-[background-color,box-shadow,border-color,transform] duration-300 border-b ${
      scrolled ? 'bg-surface/95 backdrop-blur shadow-[0_2px_16px_rgba(26,26,46,0.08)] border-line' : 'bg-transparent border-transparent'} ${
      topBar && scrolledPast ? 'md:-translate-y-10' : ''}`}>
      {topBar && <TopBar user={user} account={account} />}
      <div className={`max-w-[1200px] mx-auto flex items-center justify-between gap-4 px-5 transition-[height] duration-300 ${scrolled ? 'h-16' : 'h-20'}`}>
        <Link to="/" onClick={() => pathname === '/' && window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="INUKA home">
          <Logo size={scrolled ? 'md' : 'lg'} />
        </Link>

        {scrolled && (
          <nav aria-label="Main" className="nav-pop hidden lg:flex items-center gap-0.5">
            {NAV_ITEMS.map((item) => (item.children ? <Dropdown key={item.label} item={item} /> : <NavItem key={item.label} item={item} />))}
          </nav>
        )}

        <div className="flex items-center gap-1 sm:gap-2">
          <ThemeToggle />
          <Link to={account.to} className={`min-h-11 px-4 inline-flex items-center font-medium text-brand hover:text-accent-hover`}>{account.label}</Link>
          {scrolled && !user && (
            <Link to="/register" className="nav-pop hidden sm:inline-flex min-h-11 px-6 items-center rounded bg-accent text-night font-semibold text-[15px] hover:bg-accent-hover">Get started</Link>
          )}
          {scrolled && (
            <button onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen} aria-controls="site-menu" aria-label="Menu"
              className="lg:hidden min-w-11 min-h-11 rounded-lg text-ink hover:bg-brand-soft inline-flex items-center justify-center">{menuOpen ? <X size={24} /> : <Menu size={24} />}</button>
          )}
        </div>
      </div>

      {/* Mobile / tablet menu */}
      {scrolled && menuOpen && (
        <nav id="site-menu" aria-label="Main" className="lg:hidden border-t border-line bg-surface px-5 pb-5 max-h-[calc(100vh-4rem)] overflow-y-auto">
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
            <Link key={item.label} to={item.to} onClick={close} className="flex items-center min-h-12 font-medium text-brand hover:text-accent-hover border-b border-line">{item.label}</Link>
          ) : (
            <SectionLink key={item.label} id={item.id} onClick={close} className="flex items-center min-h-12 font-medium text-brand hover:text-accent-hover border-b border-line">{item.label}</SectionLink>
          )))}
          {!user && <Link to="/register" onClick={close} className="mt-5 flex items-center justify-center min-h-12 rounded bg-accent text-night font-semibold">Get started — it's free</Link>}
        </nav>
      )}
    </header>
  );
}
