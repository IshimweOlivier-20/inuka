import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Accessibility, ArrowRight, ChevronDown, LayoutDashboard, LogIn, Menu, X } from 'lucide-react';
import Logo from './Logo';
import { SectionLink } from '../landing/common';
import { Mail, MapPin, Phone } from 'lucide-react';
import { NAV_ITEMS, SITE } from '../../config/site';
import { ICONS } from '../landing/socialIcons';
import { useAuth } from '../../context/AuthContext';
import { homeFor } from '../../config/roles';
import ThemeToggle from './ThemeToggle';
import { AccessibilityButton } from '../accessibility/AccessibilityPanel';

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
        <div className="nav-pop absolute right-0 mt-2 w-72 rounded-xl bg-surface border border-line shadow-[0_16px_40px_-16px_rgba(26,26,46,0.3)] p-2">
          {item.children.map((c) => (c.to
            ? <Link key={c.to} to={c.to} onClick={() => setOpen(false)} className="flex items-center min-h-11 px-3 rounded text-brand hover:bg-brand-soft hover:text-accent-hover font-medium">{c.label}</Link>
            : <SectionLink key={c.id} id={c.id} onClick={() => setOpen(false)}
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

// Phone / tablet menu: a drawer from the right. One link per line with an icon, the current page highlighted,
// "Tools" and "About" fold open (the group of the current page starts open), then display settings and sign in.
function MobileMenu({ open, onClose, user, account }) {
  const { pathname, hash } = useLocation();
  const groupOf = () => NAV_ITEMS.find((i) => i.children?.some((c) => (c.to && c.to === pathname) || (c.id && pathname === '/' && hash === `#${c.id}`)))?.label;
  const [openGroup, setOpenGroup] = useState(groupOf);
  const panel = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    setOpenGroup(groupOf() || null);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden'; // the page behind does not scroll
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    setTimeout(() => panel.current?.querySelector('button, a')?.focus(), 30);
    return () => { document.body.style.overflow = prev; document.removeEventListener('keydown', onKey); };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!open) return null;

  const row = 'flex items-center gap-3 min-h-12 px-3 rounded-lg text-[15px] font-medium transition-colors';
  const idle = 'text-ink hover:bg-brand-soft';
  const active = 'bg-brand-soft text-brand font-semibold shadow-[inset_3px_0_0_var(--color-accent)]';
  const Icon = ({ icon: I, on }) => (I ? <I size={18} className={on ? 'text-brand' : 'text-ink-soft'} aria-hidden="true" /> : null);
  const isOn = (c) => (c.to ? pathname === c.to || (c.to !== '/' && pathname.startsWith(`${c.to}/`)) : pathname === '/' && hash === `#${c.id}`);

  // Rendered on <body>: the header's blur would otherwise squeeze the drawer into the header bar.
  return createPortal(
    <div className="lg:hidden fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Menu">
      <button type="button" aria-label="Close menu" onClick={onClose} className="absolute inset-0 bg-night/50 backdrop-blur-[2px] toast-in" />
      <div ref={panel} id="site-menu" className="absolute right-0 top-0 h-full w-[86%] max-w-sm bg-surface shadow-2xl flex flex-col drawer-in">
        <div className="flex items-center justify-between h-16 px-4 border-b border-line shrink-0">
          <Link to="/" onClick={onClose} aria-label="INUKA home"><Logo size="md" /></Link>
          <button type="button" onClick={onClose} aria-label="Close menu" className="w-11 h-11 rounded-lg text-ink hover:bg-brand-soft inline-flex items-center justify-center"><X size={22} /></button>
        </div>

        <nav aria-label="Main" className="flex-1 overflow-y-auto px-3 py-3">
          <ul className="space-y-0.5">
            {NAV_ITEMS.map((item) => {
              if (!item.children) {
                const on = isOn(item);
                return (
                  <li key={item.label}>
                    {item.to
                      ? <Link to={item.to} onClick={onClose} aria-current={on ? 'page' : undefined} className={`${row} ${on ? active : idle}`}><Icon icon={item.icon} on={on} />{item.label}</Link>
                      : <SectionLink id={item.id} onClick={onClose} className={`${row} ${idle}`}><Icon icon={item.icon} />{item.label}</SectionLink>}
                  </li>
                );
              }
              const expanded = openGroup === item.label;
              const hasActive = item.children.some(isOn);
              return (
                <li key={item.label}>
                  <button type="button" onClick={() => setOpenGroup(expanded ? null : item.label)} aria-expanded={expanded}
                    className={`${row} w-full ${hasActive ? 'text-brand font-semibold' : 'text-ink'} hover:bg-brand-soft`}>
                    <Icon icon={item.icon} on={hasActive} />{item.label}
                    <ChevronDown size={17} className={`ml-auto text-ink-soft transition-transform ${expanded ? 'rotate-180' : ''}`} aria-hidden="true" />
                  </button>
                  {expanded && (
                    <ul className="ml-5 pl-3 border-l border-line my-1 space-y-0.5">
                      {item.children.map((c) => {
                        const on = isOn(c);
                        const cls = `flex items-center gap-2.5 min-h-11 px-3 rounded-lg text-sm font-medium ${on ? active : 'text-ink-soft hover:text-ink hover:bg-brand-soft'}`;
                        return (
                          <li key={c.to || c.id}>
                            {c.to
                              ? <Link to={c.to} onClick={onClose} aria-current={on ? 'page' : undefined} className={cls}><Icon icon={c.icon} on={on} />{c.label}</Link>
                              : <SectionLink id={c.id} onClick={onClose} className={cls}><Icon icon={c.icon} on={on} />{c.label}</SectionLink>}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>

          <div className="mt-4 pt-4 border-t border-line">
            <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-ink-soft mb-1">Display</p>
            <button type="button" onClick={() => { onClose(); window.dispatchEvent(new Event('inuka-open-a11y')); }} className={`${row} ${idle} w-full`}>
              <Accessibility size={18} className="text-ink-soft" aria-hidden="true" />Accessibility settings
            </button>
            <div className={`${row} justify-between`}>
              <span className="text-ink">Dark mode</span>
              <ThemeToggle className="-mr-1" />
            </div>
          </div>
        </nav>

        <div className="shrink-0 border-t border-line p-4 space-y-2 bg-paper">
          {user ? (
            <Link to={account.to} onClick={onClose} className="flex items-center justify-center gap-2 min-h-11 rounded bg-brand text-white font-semibold text-[15px] hover:bg-brand-dark">
              <LayoutDashboard size={17} aria-hidden="true" />My dashboard
            </Link>
          ) : (
            <>
              <Link to="/register" onClick={onClose} className="flex items-center justify-center gap-2 min-h-11 rounded bg-accent text-night font-semibold text-[15px] hover:bg-accent-hover">
                Get started, it's free<ArrowRight size={16} aria-hidden="true" />
              </Link>
              <Link to="/login" onClick={onClose} className="flex items-center justify-center gap-2 min-h-11 rounded border border-brand text-brand font-semibold text-[15px] hover:bg-brand-soft">
                <LogIn size={16} aria-hidden="true" />Sign in
              </Link>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
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
          {/* On phones and tablets these move into the menu (only the button hides; its settings window still works) */}
          <AccessibilityButton className={`rounded-full text-ink-soft hover:text-ink ${scrolled ? '!hidden lg:!inline-flex' : ''}`} />
          <ThemeToggle className={scrolled ? '!hidden lg:!inline-flex' : ''} />
          <Link to={account.to} className={`min-h-11 px-3 sm:px-4 whitespace-nowrap items-center font-medium text-brand hover:text-accent-hover ${scrolled ? 'hidden sm:inline-flex' : 'inline-flex'}`}>{account.label}</Link>
          {scrolled && !user && (
            <Link to="/register" className="nav-pop hidden sm:inline-flex min-h-11 px-6 items-center rounded bg-accent text-night font-semibold text-[15px] hover:bg-accent-hover">Get started</Link>
          )}
          {scrolled && (
            <button onClick={() => setMenuOpen(true)} aria-expanded={menuOpen} aria-controls="site-menu" aria-label="Open menu"
              className="lg:hidden min-w-11 min-h-11 rounded-lg text-brand hover:bg-brand-soft inline-flex items-center justify-center"><Menu size={24} /></button>
          )}
        </div>
      </div>

      {/* Phones and tablets: a side drawer */}
      {scrolled && <MobileMenu open={menuOpen} onClose={close} user={user} account={account} />}
    </header>
  );
}
