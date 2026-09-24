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
    <section className="bg-leaf border-b border-line">
      <div className="max-w-[1200px] mx-auto px-5 py-12 md:py-16">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">{title}</h1>
        {intro && <p className="text-lg text-ink-soft mt-3 max-w-2xl">{intro}</p>}
        {children}
      </div>
    </section>
  );
}
