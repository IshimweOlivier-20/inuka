import { useEffect, useRef, useState } from 'react';
import Reveal from '../ui/Reveal';
import { IMPACT } from '../../config/site';
import { STATS_PHOTO } from '../../config/photos';

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// 20000 -> "20K", 6000 -> "6K", 1500 -> "1,500", 50 -> "50"
export function formatStat(n) {
  if (n >= 1000 && n % 1000 === 0) return `${n / 1000}K`;
  if (n >= 10000) return `${Math.round(n / 1000)}K`;
  return n.toLocaleString('en-US');
}

// Counts up from 0 the first time the number scrolls into view.
function CountUp({ value, suffix = '+' }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(reducedMotion() ? value : 0);
  useEffect(() => {
    if (reducedMotion() || !ref.current) return;
    let frame;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const start = performance.now();
      const duration = 1600;
      const tick = (now) => {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        // round to a "nice" step so 20K counts 1K, 2K... rather than odd numbers
        const step = value >= 10000 ? 1000 : value >= 1000 ? 50 : 1;
        setShown(t === 1 ? value : Math.round((value * eased) / step) * step);
        if (t < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    }, { threshold: 0.4 });
    io.observe(ref.current);
    return () => { io.disconnect(); cancelAnimationFrame(frame); };
  }, [value]);
  return (
    <span ref={ref} aria-label={`${formatStat(value)}${suffix}`}>
      <span aria-hidden="true">{formatStat(shown)}{suffix}</span>
    </span>
  );
}

export default function ImpactSection() {
  const [photoOk, setPhotoOk] = useState(true);
  return (
    <section id="impact" className="scroll-mt-16 relative isolate overflow-hidden bg-night text-white py-20 md:py-28">
      {photoOk && <img src={STATS_PHOTO.src} alt="" loading="lazy" onError={() => setPhotoOk(false)} className="absolute inset-0 -z-20 w-full h-full object-cover" />}
      <div className="absolute inset-0 -z-10 bg-[rgba(7,41,77,0.86)]" aria-hidden="true" />
      <div className="max-w-[1200px] mx-auto px-5">
        <Reveal className="text-center">
          <p className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.12em] text-accent"><span className="w-8 h-1 rounded-full bg-accent" aria-hidden="true" />Where INUKA is going</p>
          <h2 className="mt-2 text-white text-xl md:text-2xl font-bold">Our goals for {IMPACT.goalYear}</h2>
        </Reveal>
        <dl className="mt-12 grid grid-cols-2 lg:grid-cols-4 gap-y-12 gap-x-6">
          {IMPACT.goals.map((g, i) => (
            <Reveal key={g.label} delay={i * 110} className="text-center flex flex-col items-center">
              <dt className="sr-only">{g.label}</dt>
              <dd className="font-body font-bold text-white text-4xl sm:text-5xl leading-none"><CountUp value={g.value} /></dd>
              <dd aria-hidden="true" className="mt-4 w-16 h-[3px] rounded-full bg-accent" />
              <dd className="mt-4 font-body font-semibold text-white text-base sm:text-lg leading-snug max-w-[18ch]">{g.label}</dd>
            </Reveal>
          ))}
        </dl>
      </div>
    </section>
  );
}
