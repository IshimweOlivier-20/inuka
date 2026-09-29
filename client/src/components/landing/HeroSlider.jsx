import { useCallback, useEffect, useRef, useState } from 'react';
import { HERO_SLIDES } from './HeroSlides';

const INTERVAL = 5000; // ms per slide
const prefersReducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// slides: [{ key, caption, Art }]. Defaults to the home page story.
// onLight: true when the slideshow sits on a white background (dark caption and dots, white shapes tinted pale blue).
export default function HeroSlider({ slides = HERO_SLIDES, label = 'What you can do with INUKA', onLight = false }) {
  const [index, setIndex] = useState(0);
  // People who prefer less motion start paused; they can still press play or use the dots.
  const [paused, setPaused] = useState(prefersReducedMotion);
  const [hovered, setHovered] = useState(false);
  const [hidden, setHidden] = useState(false);
  const touchX = useRef(null);
  const count = slides.length;
  const running = !paused && !hovered && !hidden;

  const go = useCallback((i) => setIndex((i + count) % count), [count]);

  useEffect(() => {
    if (!running) return;
    const t = setTimeout(() => go(index + 1), INTERVAL);
    return () => clearTimeout(t);
  }, [index, running, go]);

  // Stop when the browser tab is not visible (saves battery and data).
  useEffect(() => {
    const onVis = () => setHidden(document.hidden);
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  // Swipe on phones
  const onTouchStart = (e) => { touchX.current = e.touches[0].clientX; };
  const onTouchEnd = (e) => {
    if (touchX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    if (Math.abs(dx) > 40) go(index + (dx < 0 ? 1 : -1));
    touchX.current = null;
  };

  return (
    <section
      className={`w-full max-w-md ${onLight ? 'slides-on-light' : ''}`}
      aria-roledescription="carousel"
      aria-label={label}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setHovered(false); }}
    >
      <div className="relative aspect-[420/360]" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        {slides.map(({ key, Art }, i) => (
          <div
            key={key}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${count}`}
            aria-hidden={i !== index}
            className={`hero-slide absolute inset-0 transition-[opacity,transform] duration-700 ease-out ${
              i === index ? 'is-active opacity-100 scale-100' : 'opacity-0 scale-[0.96] pointer-events-none'}`}
          >
            <Art />
          </div>
        ))}
      </div>

      {/* Caption for the current slide */}
      <div className="relative h-8 mt-2 text-center" aria-live={running ? 'off' : 'polite'}>
        {slides.map(({ key, caption }, i) => (
          <p key={key} className={`absolute inset-0 font-display font-semibold text-lg ${onLight ? 'text-ink' : 'text-white'} transition-[opacity,transform] duration-500 ${
            i === index ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`} aria-hidden={i !== index}>
            {caption}
          </p>
        ))}
      </div>

      {/* Controls */}
      <div className="mt-3 flex items-center justify-center gap-1">
        {slides.map(({ key, caption }, i) => (
          <button key={key} onClick={() => go(i)} aria-label={`Show slide ${i + 1}: ${caption}`} aria-current={i === index}
            className="group min-w-8 min-h-11 flex items-center justify-center">
            <span className={`relative block h-2 rounded-full overflow-hidden transition-all duration-300 ${i === index ? `w-10 ${onLight ? 'bg-brand/15' : 'bg-white/30'}` : `w-2 ${onLight ? 'bg-brand/25 group-hover:bg-brand/50' : 'bg-white/40 group-hover:bg-white/70'}`}`}>
              {i === index && (
                <span key={`${index}-${running}`} className={`absolute inset-y-0 left-0 bg-accent rounded-full ${running ? 'slide-progress' : 'w-full'}`}
                  style={{ animationDuration: `${INTERVAL}ms` }} />
              )}
            </span>
          </button>
        ))}
        <button onClick={() => setPaused(!paused)} aria-label={paused ? 'Play slideshow' : 'Pause slideshow'}
          className={`ml-2 w-11 h-11 rounded-full flex items-center justify-center ${onLight ? 'text-ink-soft hover:text-ink hover:bg-brand-soft' : 'text-white/80 hover:text-white hover:bg-white/10'}`}>
          {paused ? (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M4 2.5v11l9-5.5z" /></svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><rect x="3" y="2.5" width="3.5" height="11" rx="1" /><rect x="9.5" y="2.5" width="3.5" height="11" rx="1" /></svg>
          )}
        </button>
      </div>
    </section>
  );
}
