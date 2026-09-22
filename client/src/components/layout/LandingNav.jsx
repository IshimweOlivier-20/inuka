import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Logo from './Logo';
import { SectionLink } from '../landing/common';
import { NAV_SECTIONS } from '../../config/site';
import { useAuth } from '../../context/AuthContext';

// Home page: transparent at the top (logo + Sign in only); a solid sticky bar with links after scrolling.
// Other public pages (News, articles): pass `solid` to always show the full bar.
export default function LandingNav({ solid = false }) {
  const { user } = useAuth();
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

  const accountLink = user
    ? { to: '/dashboard', label: 'My dashboard' }
    : { to: '/login', label: 'Sign in' };

  return (
    <header className={`fixed inset-x-0 top-0 z-40 transition-[background-color,box-shadow,border-color] duration-300 border-b ${
      scrolled ? 'bg-white/95 backdrop-blur shadow-[0_2px_16px_rgba(26,26,46,0.08)] border-line' : 'bg-transparent border-transparent'}`}>
      <div className={`max-w-[1200px] mx-auto flex items-center justify-between gap-4 px-5 transition-[height] duration-300 ${scrolled ? 'h-16' : 'h-20'}`}>
        <Link to="/" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="INUKA home"><Logo light={!scrolled} size={scrolled ? 'md' : 'lg'} /></Link>

        {scrolled && (
          <nav aria-label="Main" className="nav-pop hidden lg:flex items-center gap-1">
            {NAV_SECTIONS.map((s) => (
              <SectionLink key={s.id} id={s.id} className="min-h-11 px-3.5 inline-flex items-center rounded-lg font-medium text-ink hover:text-forest hover:bg-leaf">{s.label}</SectionLink>
            ))}
          </nav>
        )}

        <div className="flex items-center gap-2">
          <Link to={accountLink.to} className={`min-h-11 px-4 inline-flex items-center rounded-lg font-medium ${scrolled ? 'text-forest hover:bg-leaf' : 'text-white hover:bg-white/10'}`}>{accountLink.label}</Link>
          {scrolled && !user && (
            <Link to="/register" className="nav-pop hidden sm:inline-flex min-h-11 px-5 items-center rounded-lg bg-gold text-ink font-display font-semibold text-[15px] hover:bg-[#E8961A]">Get started</Link>
          )}
          {scrolled && (
            <button onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen} aria-controls="site-menu" aria-label="Menu"
              className="lg:hidden min-w-11 min-h-11 rounded-lg text-2xl text-ink hover:bg-leaf">{menuOpen ? '×' : '☰'}</button>
          )}
        </div>
      </div>

      {scrolled && menuOpen && (
        <nav id="site-menu" aria-label="Main" className="lg:hidden border-t border-line bg-white px-5 pb-4">
          {NAV_SECTIONS.map((s) => (
            <SectionLink key={s.id} id={s.id} onClick={() => setMenuOpen(false)} className="flex items-center min-h-12 font-medium border-b border-line">{s.label}</SectionLink>
          ))}
          {!user && <Link to="/register" className="mt-4 flex items-center justify-center min-h-12 rounded-lg bg-gold text-ink font-display font-semibold">Get started — it's free</Link>}
        </nav>
      )}
    </header>
  );
}
