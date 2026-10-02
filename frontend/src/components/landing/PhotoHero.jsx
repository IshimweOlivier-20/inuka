import { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { HERO_PHOTOS } from '../../config/photos';
import { useAuth } from '../../context/AuthContext';
import { homeFor } from '../../config/roles';

// Home page hero: full-width photos of young Africans that slowly fade from one to the next,
// a dark navy shade on the left so the text is easy to read, and two buttons.
// Photos are set in src/config/photos.js.
export default function PhotoHero() {
  const { user } = useAuth();
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [failed, setFailed] = useState({});
  const photos = HERO_PHOTOS.filter((_, i) => !failed[i]);

  useEffect(() => {
    if (paused || HERO_PHOTOS.length < 2) return undefined;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;
    const t = setInterval(() => setActive((a) => (a + 1) % HERO_PHOTOS.length), 7000);
    return () => clearInterval(t);
  }, [paused]);

  // Skip photos that could not load
  const shown = failed[active] ? HERO_PHOTOS.findIndex((_, i) => !failed[i]) : active;

  return (
    <section className="relative isolate bg-night text-white overflow-hidden min-h-[560px] md:min-h-[640px] lg:min-h-[calc(100vh-4rem)] max-h-[900px] flex items-center"
      aria-label="Welcome to INUKA" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      {/* Photos */}
      <div className="absolute inset-0 -z-10" aria-hidden={photos.length === 0}>
        {HERO_PHOTOS.map((p, i) => (
          <figure key={p.src} className={`hero-photo absolute inset-0 transition-opacity duration-[1400ms] ${i === shown ? 'is-active opacity-100' : 'opacity-0'}`} aria-hidden={i !== shown}>
            {!failed[i] && (
              <img src={p.src} alt={p.alt} loading={i === 0 ? 'eager' : 'lazy'} fetchPriority={i === 0 ? 'high' : 'auto'}
                onError={() => setFailed((f) => ({ ...f, [i]: true }))}
                className="w-full h-full object-cover" style={{ objectPosition: p.focus || 'center' }} />
            )}
          </figure>
        ))}
        {/* Shade: strong on the left (behind the text), light on the right (faces stay visible) */}
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(7,41,77,0.62)_0%,rgba(7,41,77,0.45)_40%,rgba(7,41,77,0.12)_75%,rgba(7,41,77,0)_100%)] max-md:bg-[linear-gradient(180deg,rgba(7,41,77,0.35)_0%,rgba(7,41,77,0.65)_100%)]" />
      </div>

      <div className="w-full max-w-[1200px] mx-auto px-5 pt-28 pb-36 md:pt-32 md:pb-44">
        <div className="hero-copy max-w-[620px]">
          <h1 className="text-white text-[2.2rem] sm:text-5xl lg:text-[3.3rem] font-bold leading-[1.15] [text-shadow:0_2px_16px_rgba(0,0,0,0.25)]">
            Your future<br />starts here.
          </h1>
          <p className="mt-5 text-base sm:text-lg text-white max-w-[44ch] [text-shadow:0_1px_10px_rgba(0,0,0,0.3)]">
            Learn English, build computer skills, find scholarships and meet mentors. Made for African high school graduates and refugees.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            {user ? (
              <Link to={homeFor(user)} className="inline-flex items-center gap-2 min-h-11 px-6 rounded-[4px] font-semibold text-[15px] transition-colors bg-accent text-night hover:bg-accent-hover">
                My dashboard<ArrowRight size={16} aria-hidden="true" />
              </Link>
            ) : (
              <>
                <Link to="/register" className="inline-flex items-center gap-2 min-h-11 px-6 rounded-[4px] font-semibold text-[15px] transition-colors bg-accent text-night hover:bg-accent-hover">
                  Get started<ArrowRight size={16} aria-hidden="true" />
                </Link>
                <Link to="/learn" className="inline-flex items-center gap-2 min-h-11 px-6 rounded-[4px] font-semibold text-[15px] transition-colors bg-white text-night hover:bg-[#EEF3F9]">
                  Our courses
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

    </section>
  );
}
