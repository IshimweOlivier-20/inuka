import { useEffect, useRef, useState } from 'react';
import { ChevronUp, Copy, Mail, Share2, X as Close } from 'lucide-react';
import { ICONS } from './socialIcons';

// Floating buttons on the right of public pages:
//   • Back to top, with a ring that fills as you scroll down the page (scroll progress)
//   • Share this page (the phone's own share sheet when available, otherwise WhatsApp, Facebook, X, LinkedIn, email, copy link)
const R = 26;
const CIRC = 2 * Math.PI * R;

const Brand = ({ name }) => <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">{ICONS[name]}</svg>;

export default function FloatingActions() {
  const [progress, setProgress] = useState(0);
  const [showTop, setShowTop] = useState(false);
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [scrolling, setScrolling] = useState(false); // true while scrolling, false ~2 s after it stops
  const [holding, setHolding] = useState(false);     // mouse over / keyboard focus keeps it visible
  const boxRef = useRef(null);
  const idleRef = useRef(0);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const y = window.scrollY;
      setProgress(max > 0 ? Math.min(1, y / max) : 0);
      setShowTop(y > 400);
    };
    const onResize = () => { if (!frame) frame = requestAnimationFrame(update); };
    const onScroll = () => {
      onResize();
      setScrolling(true);
      clearTimeout(idleRef.current);
      idleRef.current = setTimeout(() => setScrolling(false), 2000); // hide 2 seconds after scrolling stops
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onResize); cancelAnimationFrame(frame); clearTimeout(idleRef.current); };
  }, []);

  // Close the share menu on outside click or Escape
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (!boxRef.current?.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('pointerdown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const visible = showTop && (scrolling || holding);
  const reduceMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const toTop = () => window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });

  const share = async () => {
    const data = { title: document.title, text: 'Free courses, scholarships and mentors for African students and refugees.', url: window.location.href };
    // Phones: use the built-in share sheet (WhatsApp, Telegram, SMS…)
    if (navigator.share && window.matchMedia?.('(pointer: coarse)').matches) {
      try { await navigator.share(data); return; } catch (e) { if (e?.name === 'AbortError') return; }
    }
    setOpen((o) => !o);
  };

  const url = typeof window !== 'undefined' ? encodeURIComponent(window.location.href) : '';
  const title = typeof document !== 'undefined' ? encodeURIComponent(document.title) : '';
  const links = [
    ['WhatsApp', <Brand name="whatsapp" key="w" />, `https://wa.me/?text=${title}%20${url}`],
    ['Facebook', <Brand name="facebook" key="f" />, `https://www.facebook.com/sharer/sharer.php?u=${url}`],
    ['X', <Brand name="x" key="x" />, `https://twitter.com/intent/tweet?url=${url}&text=${title}`],
    ['LinkedIn', <Brand name="linkedin" key="l" />, `https://www.linkedin.com/sharing/share-offsite/?url=${url}`],
    ['Email', <Mail size={17} key="e" />, `mailto:?subject=${title}&body=${url}`],
  ];
  const copy = async () => {
    try { await navigator.clipboard.writeText(window.location.href); } catch { /* old browsers */ }
    setCopied(true); setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div ref={boxRef} className="fixed right-4 sm:right-6 bottom-5 sm:bottom-6 z-30 flex flex-col items-center gap-3 sm:gap-4">
      {/* Back to top + scroll progress ring */}
      <button type="button" onClick={toTop} aria-label={`Back to top (${Math.round(progress * 100)}% of the page read)`}
        tabIndex={showTop ? 0 : -1} aria-hidden={!showTop}
        onMouseEnter={() => setHolding(true)} onMouseLeave={() => setHolding(false)} onFocus={() => setHolding(true)} onBlur={() => setHolding(false)}
        className={`relative w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-surface text-brand flex items-center justify-center shadow-[0_8px_24px_-8px_rgba(7,41,77,0.35)] hover:text-brand-dark transition-[opacity,transform] duration-500 ${
          visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3 pointer-events-none'}`}>
        <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 60 60" aria-hidden="true">
          <circle cx="30" cy="30" r={R} fill="none" stroke="var(--color-line)" strokeWidth="3" />
          <circle cx="30" cy="30" r={R} fill="none" stroke="var(--color-accent)" strokeWidth="3.5" strokeLinecap="round"
            strokeDasharray={CIRC} strokeDashoffset={CIRC * (1 - progress)} />
        </svg>
        <ChevronUp size={26} strokeWidth={2.4} aria-hidden="true" className="relative" />
      </button>

      {/* Share */}
      <div className="relative">
        {open && (
          <div role="menu" aria-label="Share this page"
            className="absolute right-0 bottom-[calc(100%+12px)] w-56 bg-surface border border-line rounded-2xl p-2 shadow-[0_20px_50px_-20px_rgba(7,41,77,0.45)] toast-in">
            <div className="flex items-center justify-between px-2 pt-1 pb-2">
              <p className="font-display font-semibold text-sm">Share this page</p>
              <button type="button" onClick={() => setOpen(false)} className="w-8 h-8 rounded-lg hover:bg-paper flex items-center justify-center text-ink-soft" aria-label="Close"><Close size={16} /></button>
            </div>
            {links.map(([name, icon, href]) => (
              <a key={name} role="menuitem" href={href} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)}
                className="flex items-center gap-3 min-h-11 px-3 rounded-lg text-[15px] hover:bg-brand-soft hover:text-brand">
                <span className="w-5 flex justify-center text-brand">{icon}</span>{name}
              </a>
            ))}
            <button type="button" role="menuitem" onClick={copy}
              className="w-full flex items-center gap-3 min-h-11 px-3 rounded-lg text-[15px] hover:bg-brand-soft hover:text-brand">
              <span className="w-5 flex justify-center text-brand"><Copy size={17} /></span>{copied ? 'Link copied!' : 'Copy link'}
            </button>
          </div>
        )}
        <button type="button" onClick={share} aria-label="Share this page" aria-haspopup="menu" aria-expanded={open}
          className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 border-brand flex items-center justify-center shadow-[0_10px_26px_-8px_rgba(7,41,77,0.6)] transition-colors active:bg-surface active:text-brand ${
            open ? 'bg-surface text-brand' : 'bg-brand text-white hover:bg-brand-dark hover:border-brand-dark'}`}>
          <Share2 size={24} aria-hidden="true" />
        </button>
      </div>
      <span className="sr-only" aria-live="polite">{copied ? 'Link copied' : ''}</span>
    </div>
  );
}
