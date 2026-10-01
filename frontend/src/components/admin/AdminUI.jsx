import { ChevronLeft, ChevronRight, Search } from 'lucide-react';

// Small building blocks shared by the admin pages.

export function PageTitle({ title, intro, action }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-3xl font-bold">{title}</h1>
        {intro && <p className="text-ink-soft mt-1 max-w-3xl">{intro}</p>}
      </div>
      {action}
    </div>
  );
}

export function SearchInput({ value, onChange, placeholder, label = 'Search' }) {
  return (
    <label className="relative flex-1 min-w-[220px]">
      <span className="sr-only">{label}</span>
      <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" aria-hidden="true" />
      <input type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full min-h-11 rounded-lg border border-line bg-surface pl-10 pr-3" />
    </label>
  );
}

export function Select({ label, value, onChange, options }) {
  return (
    <label className="inline-flex flex-col text-sm">
      <span className="sr-only">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={label} className="min-h-11 rounded-lg border border-line bg-surface px-3 font-medium">
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  );
}

export function Pager({ page, pageSize, total, onPage }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return <p className="text-sm text-ink-soft mt-3">{total} {total === 1 ? 'result' : 'results'}</p>;
  return (
    <div className="flex items-center justify-between gap-3 mt-4 text-sm">
      <span className="text-ink-soft">{(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}</span>
      <div className="flex gap-1">
        <button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)} className="w-11 h-11 rounded-lg border border-line bg-surface disabled:opacity-40 flex items-center justify-center" aria-label="Previous page"><ChevronLeft size={18} /></button>
        <button type="button" disabled={page >= pages} onClick={() => onPage(page + 1)} className="w-11 h-11 rounded-lg border border-line bg-surface disabled:opacity-40 flex items-center justify-center" aria-label="Next page"><ChevronRight size={18} /></button>
      </div>
    </div>
  );
}

// Simple bar chart (SVG). data: [{ label, value }]
export function BarChart({ data, label, height = 160 }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const w = 100 / data.length;
  return (
    <figure className="min-w-0">
      <svg viewBox={`0 0 100 ${height / 2}`} preserveAspectRatio="none" className="w-full" style={{ height }} role="img" aria-label={label}>
        {[0.25, 0.5, 0.75, 1].map((f) => <line key={f} x1="0" x2="100" y1={(height / 2) * (1 - f)} y2={(height / 2) * (1 - f)} stroke="var(--color-line)" strokeWidth="0.3" vectorEffect="non-scaling-stroke" />)}
        {data.map((d, i) => {
          const h = (d.value / max) * (height / 2 - 2);
          return <rect key={i} x={i * w + w * 0.18} width={w * 0.64} y={height / 2 - h} height={Math.max(h, d.value ? 0.6 : 0)} rx="0.8" fill="#0A6CF0"><title>{`${d.label}: ${d.value}`}</title></rect>;
        })}
      </svg>
      <div className="flex text-[11px] text-ink-soft mt-1">
        {data.map((d, i) => <span key={i} className={`flex-1 min-w-0 text-center truncate ${data.length > 8 && i % 2 ? 'invisible sm:visible' : ''}`} aria-hidden="true">{d.short ?? d.label}</span>)}
      </div>
      <figcaption className="sr-only">{data.map((d) => `${d.label}: ${d.value}`).join(', ')}</figcaption>
    </figure>
  );
}

// Horizontal bars for rankings. rows: [{ label, value, sub? }]
export function RankBars({ rows, empty = 'No data yet.' }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (!rows.length || rows.every((r) => !r.value)) return <p className="text-sm text-ink-soft">{empty}</p>;
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.label}>
          <div className="flex justify-between gap-3 text-sm"><span className="truncate min-w-0">{r.label}</span><span className="shrink-0 whitespace-nowrap font-semibold tabular-nums">{r.value}{r.sub && <span className="font-normal text-ink-soft"> {r.sub}</span>}</span></div>
          <div className="h-2 mt-1 rounded-full bg-line overflow-hidden"><div className="h-full bg-brand rounded-full" style={{ width: `${(r.value / max) * 100}%` }} /></div>
        </li>
      ))}
    </ul>
  );
}
