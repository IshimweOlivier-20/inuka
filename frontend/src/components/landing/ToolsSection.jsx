import { Link } from 'react-router-dom';
import { ArrowRight, LockOpen, UserRound } from 'lucide-react';
import Reveal from '../ui/Reveal';
import { SectionHeading } from './common';
import { TOOLS } from '../../config/tools';

// Home page: the six "next step" tools, each linking to its explanation on /tools.
export function AccessTag({ access, light }) {
  return access === 'open'
    ? <span className={`inline-flex items-center gap-1 text-[11px] font-semibold rounded-full px-2 py-0.5 ${light ? 'bg-white/10 text-white' : 'bg-success-soft text-success-ink'}`}><LockOpen size={11} aria-hidden="true" />No account needed</span>
    : <span className={`inline-flex items-center gap-1 text-[11px] font-semibold rounded-full px-2 py-0.5 ${light ? 'bg-white/10 text-white' : 'bg-info-soft text-info-ink'}`}><UserRound size={11} aria-hidden="true" />Free account</span>;
}

export default function ToolsSection() {
  return (
    <section id="tools" className="scroll-mt-16 py-16 md:py-20">
      <div className="max-w-[1200px] mx-auto px-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionHeading label="Free tools" title="Plan your next step with confidence"
            intro="Six simple tools that help you choose where to study, avoid scams, prepare strong applications and prove your skills. All free." />
          <Link to="/tools" className="mb-10 inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:text-accent-hover">
            See how each tool works<ArrowRight size={15} aria-hidden="true" />
          </Link>
        </div>
        <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {TOOLS.map((t, i) => (
            <Reveal as="li" key={t.id} delay={(i % 3) * 90}>
              <Link to={`/tools#${t.id}`}
                className="group h-full flex flex-col rounded-md border border-line bg-surface p-5 hover:border-brand hover:shadow-[0_10px_28px_-16px_rgba(7,41,77,0.35)] transition">
                <div className="flex items-start justify-between gap-3">
                  <span className="w-11 h-11 rounded-lg bg-brand text-white flex items-center justify-center group-hover:bg-accent group-hover:text-night transition-colors">
                    <t.icon size={21} aria-hidden="true" />
                  </span>
                  <AccessTag access={t.access} />
                </div>
                <h3 className="mt-4 text-base font-bold text-brand leading-snug">{t.title}</h3>
                <p className="mt-1.5 text-sm text-ink-soft flex-1">{t.short}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand group-hover:text-accent-hover">
                  Learn more<ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </span>
              </Link>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
