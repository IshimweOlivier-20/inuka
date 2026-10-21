import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, Clock, Sparkles, Users } from 'lucide-react';
import { Button } from '../../components/ui';
import ToolShell, { ToolHeader } from '../../components/tools/ToolShell';
import { AccessTag } from '../../components/landing/ToolsSection';
import { useAuth } from '../../context/AuthContext';
import { TOOLS, TOOL_FAQ } from '../../config/tools';

// /tools — what each of INUKA's six tools does, who it is for and how to use it.
function ToolCta({ tool, signedInStudent }) {
  const { cta } = tool;
  if (cta.action === 'a11y') {
    return <Button onClick={() => window.dispatchEvent(new Event('inuka-open-a11y'))} className="!min-h-10 !px-4 text-sm w-full">{cta.label}<ArrowRight size={15} aria-hidden="true" /></Button>;
  }
  if (tool.access === 'account' && !signedInStudent) {
    return <Button to="/register" state={{ from: cta.to }} className="!min-h-10 !px-4 text-sm w-full">Create a free account<ArrowRight size={15} aria-hidden="true" /></Button>;
  }
  return <Button to={cta.to} className="!min-h-10 !px-4 text-sm w-full">{cta.label}<ArrowRight size={15} aria-hidden="true" /></Button>;
}

export default function ToolsOverview() {
  const { user } = useAuth();
  const student = user?.role === 'student';
  const { hash } = useLocation();
  useEffect(() => {
    document.title = 'Free tools — INUKA';
    if (hash) setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
  }, [hash]);

  return (
    <ToolShell header={
      <ToolHeader icon={Sparkles} eyebrow="Free tools" title="Everything you need for your next step"
        intro="Choose where to study, check if a scholarship is real, see how ready your application is, get recommendation letters and prove your skills. Free, simple, and made for S6 leavers and refugees.">
        <nav aria-label="Tools on this page" className="mt-5 flex flex-wrap gap-2">
          {TOOLS.map((t) => (
            <a key={t.id} href={`#${t.id}`} onClick={(e) => { e.preventDefault(); document.getElementById(t.id)?.scrollIntoView({ behavior: 'smooth' }); window.history.replaceState(null, '', `#${t.id}`); }}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-semibold">
              <t.icon size={13} aria-hidden="true" />{t.title}
            </a>
          ))}
        </nav>
      </ToolHeader>
    }>
      <div className="space-y-5">
        {TOOLS.map((t, i) => (
          <section key={t.id} id={t.id} aria-labelledby={`${t.id}-title`} className="scroll-mt-24 bg-surface border border-line rounded-md overflow-hidden">
            <div className="grid lg:grid-cols-[minmax(0,1fr)_300px]">
              <div className="p-5 md:p-6">
                <div className="flex items-center gap-3">
                  <span className="w-10 h-10 rounded-lg bg-brand text-white flex items-center justify-center shrink-0"><t.icon size={19} aria-hidden="true" /></span>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">Tool {i + 1} of {TOOLS.length}</p>
                    <h2 id={`${t.id}-title`} className="text-lg font-bold text-brand leading-tight">{t.title}</h2>
                  </div>
                </div>
                <p className="mt-3 text-[15px] leading-relaxed">{t.what}</p>
                <h3 className="mt-4 text-sm font-semibold">How it works</h3>
                <ol className="mt-2 grid sm:grid-cols-3 gap-2">
                  {t.steps.map((s, n) => (
                    <li key={s} className="flex gap-2 rounded-lg bg-paper border border-line px-3 py-2 text-sm">
                      <span className="w-5 h-5 rounded-full bg-accent text-night text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">{n + 1}</span>{s}
                    </li>
                  ))}
                </ol>
              </div>
              <aside className="border-t lg:border-t-0 lg:border-l border-line bg-paper p-5 md:p-6 flex flex-col gap-3">
                <AccessTag access={t.access} />
                <p className="flex gap-2 text-sm"><Users size={16} className="text-brand shrink-0 mt-0.5" aria-hidden="true" /><span><span className="font-semibold">For: </span>{t.who}</span></p>
                <p className="flex gap-2 text-sm"><Clock size={16} className="text-brand shrink-0 mt-0.5" aria-hidden="true" /><span><span className="font-semibold">Time: </span>{t.time}</span></p>
                <div className="mt-auto pt-2 flex flex-col gap-2">
                  <ToolCta tool={t} signedInStudent={student} />
                  {t.more && <Link to={t.more.to} className="text-sm font-semibold text-brand hover:underline text-center">{t.more.label}</Link>}
                </div>
              </aside>
            </div>
          </section>
        ))}
      </div>

      <section aria-labelledby="tools-faq" className="mt-10">
        <h2 id="tools-faq" className="text-lg font-bold text-brand">Questions about the tools</h2>
        <div className="mt-3 divide-y divide-line border border-line rounded-md bg-surface">
          {TOOL_FAQ.map(([q, a]) => (
            <details key={q} className="group px-5 py-3.5">
              <summary className="cursor-pointer list-none flex items-center justify-between gap-3 text-[15px] font-semibold">
                {q}<span className="text-brand text-lg leading-none transition-transform group-open:rotate-45" aria-hidden="true">+</span>
              </summary>
              <p className="mt-2 text-sm text-ink-soft leading-relaxed">{a}</p>
            </details>
          ))}
        </div>
      </section>

      {!user && (
        <div className="mt-10 rounded-md bg-brand text-white p-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-bold text-base">Get the full INUKA experience</p>
            <p className="text-sm text-white/80 mt-0.5">Free courses, your readiness score, recommendation letters and mentors, in one free account.</p>
          </div>
          <Button to="/register" className="!min-h-10 text-sm">Create my free account</Button>
        </div>
      )}
    </ToolShell>
  );
}
