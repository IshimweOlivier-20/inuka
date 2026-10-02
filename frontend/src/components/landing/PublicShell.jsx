import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import LandingNav from '../layout/LandingNav';
import SiteFooter from './SiteFooter';

// Layout for public pages (Courses, Opportunities, News): solid navbar + footer.
export default function PublicShell({ children }) {
  return (
    <div className="bg-paper min-h-screen flex flex-col">
      <LandingNav solid />
      <main className="flex-1 pt-16">{children}</main>
      <SiteFooter />
    </div>
  );
}

// Page header band used by public pages.
export function PublicHeader({ title, intro, children }) {
  return (
    <section className="bg-brand-soft border-b border-line">
      <div className="max-w-[1200px] mx-auto px-5 py-12 md:py-16">
        <h1 className="text-3xl md:text-4xl font-bold">{title}</h1>
        {intro && <p className="text-lg text-ink-soft mt-3 max-w-2xl">{intro}</p>}
        {children}
      </div>
    </section>
  );
}

// Blue hero for public catalogue pages: title, search, quick facts on the left.
// On the right: `showcase` (a slider of real courses or scholarships).
export function PageHero({ title, intro, search, facts, showcase }) {
  const [value, setValue] = useState(search?.value || '');
  useEffect(() => { setValue(search?.value || ''); }, [search?.value]);
  // Update results while typing (after a short pause), and jump to them on Enter.
  useEffect(() => {
    if (!search || value === (search.value || '')) return undefined;
    const t = setTimeout(() => search.onChange(value), 350);
    return () => clearTimeout(t);
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps
  const submit = (e) => {
    e.preventDefault();
    search.onChange(value);
    search.onSubmit?.();
  };

  return (
    <section className="bg-brand text-white overflow-hidden">
      <div className="max-w-[1200px] mx-auto px-5 pt-10 pb-12 md:py-14 grid md:grid-cols-[1.15fr_1fr] gap-8 md:gap-10 items-center">
        <div className="hero-copy">
          <h1 className="text-white text-3xl sm:text-[2.6rem] font-bold leading-[1.12]">{title}</h1>
          <p className="mt-4 text-white/85 max-w-[46ch]">{intro}</p>
          {search && (
            <form role="search" onSubmit={submit} className="mt-7 flex gap-2 max-w-xl">
              <label className="relative flex-1">
                <span className="sr-only">{search.label}</span>
                <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-soft pointer-events-none" aria-hidden="true" />
                <input type="search" value={value} onChange={(e) => setValue(e.target.value)} placeholder={search.placeholder}
                  className="w-full min-h-14 rounded-xl bg-surface text-ink pl-12 pr-4 text-base shadow-[0_10px_30px_-12px_rgba(0,0,0,0.45)] focus:outline-none focus:ring-4 focus:ring-white/60" />
              </label>
              <button type="submit" className="min-h-14 px-5 sm:px-7 rounded-xl bg-white text-brand font-display font-semibold hover:bg-brand-soft">Search</button>
            </form>
          )}
          {facts && (
            <ul className="mt-6 flex flex-wrap gap-2">
              {facts.map(([Icon, label], i) => (
                <li key={i} className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/15 px-3.5 py-1.5 text-sm font-medium">
                  <Icon size={16} className="text-white/80" aria-hidden="true" />
                  {label ?? <span className="inline-block w-24 h-3.5 rounded bg-white/20 animate-pulse" aria-label="Loading" />}
                </li>
              ))}
            </ul>
          )}
        </div>
        {showcase && <div className="flex justify-center md:justify-end">{showcase}</div>}
      </div>
    </section>
  );
}
