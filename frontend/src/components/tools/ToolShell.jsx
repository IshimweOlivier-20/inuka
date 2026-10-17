import PublicShell from '../landing/PublicShell';

// Compact header + public layout for INUKA's free tools (Next step, Universities, Scam checker, Verify).
// Kept small on purpose: titles text-2xl/3xl, intro 15px.
export function ToolHeader({ icon: Icon, eyebrow, title, intro, children }) {
  return (
    <section className="bg-brand text-white">
      <div className="max-w-[1200px] mx-auto px-5 py-8 md:py-10">
        {eyebrow && (
          <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-accent">
            {Icon && <Icon size={14} aria-hidden="true" />}{eyebrow}
          </p>
        )}
        <h1 className="mt-1.5 text-2xl md:text-3xl font-bold !text-white">{title}</h1>
        {intro && <p className="text-[15px] text-white/80 mt-2 max-w-2xl">{intro}</p>}
        {children}
      </div>
    </section>
  );
}

export default function ToolShell({ header, children, narrow }) {
  return (
    <PublicShell>
      {header}
      <div className={`${narrow ? 'max-w-3xl' : 'max-w-[1200px]'} mx-auto px-5 py-8 text-[15px]`}>{children}</div>
    </PublicShell>
  );
}

// Dashboard page title in the same small style as the other dashboard pages.
export function DashTitle({ title, intro, action }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold">{title}</h1>
        {intro && <p className="text-ink-soft mt-1 max-w-3xl">{intro}</p>}
      </div>
      {action}
    </div>
  );
}
