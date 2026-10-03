import { ChevronLeft, ChevronRight, LayoutGrid, List } from 'lucide-react';

// Shared by the Courses and Scholarships pages.
// "Grid  [▦] [☰]" switch at the top right of the results.
export function ViewSwitch({ view, onChange, label = 'Show results as' }) {
  const btn = (key, Icon, label) => (
    <button type="button" onClick={() => onChange(key)} aria-pressed={view === key} aria-label={label} title={label}
      className={`w-11 h-11 rounded-md border focus-visible:outline-brand flex items-center justify-center transition-colors ${
        view === key ? 'border-brand text-brand bg-surface' : 'border-line text-[#B5BCC6] bg-surface hover:text-brand'}`}>
      <Icon size={20} aria-hidden="true" />
    </button>
  );
  return (
    <div className="flex items-center gap-2" role="group" aria-label={label}>
      <span className="font-semibold text-brand mr-1">{view === 'list' ? 'List' : 'Grid'}</span>
      {btn('grid', LayoutGrid, 'Grid view')}
      {btn('list', List, 'List view')}
    </div>
  );
}

// Round page buttons: (‹) 1 2 3 (›)
export function Pagination({ page, pages, onChange, label = 'Pages' }) {
  if (pages < 2) return null;
  const base = 'w-12 h-12 rounded-full flex items-center justify-center text-[17px] transition-colors focus-visible:outline-brand';
  const idle = `${base} border border-line bg-surface text-brand hover:border-brand hover:bg-brand-soft`;
  return (
    <nav aria-label={label} className="mt-10 flex justify-center gap-3">
      {page > 1 && <button type="button" onClick={() => onChange(page - 1)} className={idle} aria-label="Previous page"><ChevronLeft size={20} aria-hidden="true" /></button>}
      {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
        <button key={n} type="button" onClick={() => onChange(n)} aria-current={n === page ? 'page' : undefined} aria-label={`Page ${n}`}
          className={n === page ? `${base} bg-brand text-white` : idle}>{n}</button>
      ))}
      {page < pages && <button type="button" onClick={() => onChange(page + 1)} className={idle} aria-label="Next page"><ChevronRight size={20} aria-hidden="true" /></button>}
    </nav>
  );
}

