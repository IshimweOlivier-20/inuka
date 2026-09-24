import { useEffect, useRef, useState } from 'react';
import Reveal from '../ui/Reveal';
import { IMPACT } from '../../config/site';

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
  return (
    <section id="impact" className="impact-band scroll-mt-16 relative overflow-hidden text-white py-16 md:py-24">
      <div className="relative max-w-[1200px] mx-auto px-5">
        <Reveal className="max-w-2xl">
          <h2 className="text-white text-3xl md:text-4xl font-bold">Where INUKA is going</h2>
          <p className="mt-3 text-lg text-white/75">Our goals for {IMPACT.goalYear}. Every number is a young person closer to university.</p>
        </Reveal>

        <dl className="mt-12 grid grid-cols-2 lg:grid-cols-4">
          {IMPACT.goals.map((g, i) => (
            <Reveal key={g.label} delay={i * 110}
              className={`py-6 lg:py-2 pr-4 border-white/15 ${i % 2 === 0 ? 'pl-0' : 'pl-5 border-l'} ${i === 0 ? 'lg:pl-0' : 'lg:pl-7 lg:border-l'} ${i >= 2 ? 'border-t lg:border-t-0' : ''}`}>
              <dt className="sr-only">{g.label}</dt>
              <dd className="font-display font-bold text-gold text-5xl sm:text-6xl tracking-tight leading-none"><CountUp value={g.value} /></dd>
              <dd className="mt-3 text-white/80 text-base sm:text-lg leading-snug">{g.label}</dd>
            </Reveal>
          ))}
        </dl>

      </div>
    </section>
  );
}
