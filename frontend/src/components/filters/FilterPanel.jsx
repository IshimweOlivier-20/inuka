import { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown, Search, SlidersHorizontal, X } from 'lucide-react';

/* A collapsible filter group ("Funding", "Region" …). */
export function FilterGroup({ title, hint, defaultOpen = true, selectedCount = 0, children }) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  return (
    <section className="border-b border-line last:border-b-0 py-4">
      <h3>
        <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls={id}
          className="w-full min-h-11 flex items-center justify-between gap-3 text-left font-semibold text-ink">
          <span className="flex items-center gap-2">
            {title}
            {selectedCount > 0 && <span className="min-w-5 h-5 px-1.5 rounded-full bg-brand text-white text-xs font-bold inline-flex items-center justify-center">{selectedCount}</span>}
          </span>
          <ChevronDown size={18} className={`text-ink-soft transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
        </button>
      </h3>
      {open && (
        <div id={id} role="group" aria-label={title} className="mt-1">
          {hint && <p className="text-xs text-ink-soft mb-2">{hint}</p>}
          <div className="space-y-0.5">{children}</div>
        </div>
      )}
    </section>
  );
}

function OptionRow({ type, name, label, count, checked, onChange }) {
  const disabled = count === 0 && !checked;
  return (
    <label className={`flex items-center gap-3 min-h-10 rounded-lg px-2 -mx-2 ${disabled ? 'opacity-45 cursor-not-allowed' : 'cursor-pointer hover:bg-brand-soft'}`}>
      <input type={type} name={name} checked={checked} disabled={disabled} onChange={onChange}
        className="w-[18px] h-[18px] shrink-0 accent-[#0A6CF0] cursor-[inherit]" />
      <span className={`flex-1 text-[15px] ${checked ? 'font-semibold text-ink' : 'text-ink'}`}>{label}</span>
      {count !== undefined && (
        <>
          <span className="text-sm text-ink-soft tabular-nums" aria-hidden="true">{count}</span>
          <span className="sr-only">, {count} {count === 1 ? 'result' : 'results'}</span>
        </>
      )}
    </label>
  );
}

export const CheckOption = (props) => <OptionRow type="checkbox" {...props} />;
export const RadioOption = (props) => <OptionRow type="radio" {...props} />;

/* Long lists (e.g. countries): shows the first few, with "Show all" and a quick find box. */
export function LongOptionList({ options, limit = 6, renderOption, findLabel = 'Find' }) {
  const [expanded, setExpanded] = useState(false);
  const [find, setFind] = useState('');
  const fold = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const filtered = find ? options.filter((o) => fold(o.label).includes(fold(find))) : options;
  const shown = expanded || find ? filtered : filtered.slice(0, limit);
  return (
    <>
      {options.length > limit + 2 && (expanded || find) && (
        <label className="relative block mb-2">
          <span className="sr-only">{findLabel}</span>
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" aria-hidden="true" />
          <input value={find} onChange={(e) => setFind(e.target.value)} placeholder={findLabel}
            className="w-full min-h-10 rounded-lg border border-line bg-surface pl-9 pr-3 text-sm" />
        </label>
      )}
      {shown.map(renderOption)}
      {find && filtered.length === 0 && <p className="text-sm text-ink-soft py-2">No match.</p>}
      {options.length > limit && !find && (
        <button type="button" onClick={() => setExpanded(!expanded)} className="mt-1 min-h-10 text-sm font-semibold text-brand hover:underline">
          {expanded ? 'Show fewer' : `Show all ${options.length}`}
        </button>
      )}
    </>
  );
}

/* Removable chips for every active filter, plus "Clear all". */
export function ActiveChips({ chips, onClearAll }) {
  if (!chips.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="Active filters">
      {chips.map((c) => (
        <button key={c.key} type="button" onClick={c.onRemove}
          className="inline-flex items-center gap-1.5 min-h-9 rounded-full bg-brand-soft border border-brand/20 pl-3 pr-2 text-sm font-medium text-brand hover:bg-brand hover:text-white transition-colors"
          aria-label={`Remove filter: ${c.label}`}>
          {c.label}<X size={15} aria-hidden="true" />
        </button>
      ))}
      <button type="button" onClick={onClearAll} className="min-h-9 px-2 text-sm font-semibold text-ink-soft hover:text-danger hover:underline">Clear all</button>
    </div>
  );
}

/* Sidebar wrapper on desktop. */
export function FilterSidebar({ activeCount, onClearAll, children }) {
  return (
    <aside className="hidden lg:block sticky top-20 self-start max-h-[calc(100vh-6rem)] overflow-y-auto overscroll-contain pr-3 -mr-3" aria-label="Filters">
      <div className="flex items-center justify-between gap-3 pb-2">
        <h2 className="text-lg font-bold flex items-center gap-2"><SlidersHorizontal size={18} className="text-brand" aria-hidden="true" />Filters</h2>
        {activeCount > 0 && <button type="button" onClick={onClearAll} className="text-sm font-semibold text-brand hover:underline">Clear all</button>}
      </div>
      <div className="rounded-2xl bg-surface border border-line px-4">{children}</div>
    </aside>
  );
}

/* "Filters" button shown on phones and tablets. */
export function FilterButton({ activeCount, onClick }) {
  return (
    <button type="button" onClick={onClick}
      className="lg:hidden inline-flex items-center gap-2 min-h-11 px-4 rounded-lg border-2 border-brand text-brand font-semibold">
      <SlidersHorizontal size={18} aria-hidden="true" />Filters
      {activeCount > 0 && <span className="min-w-5 h-5 px-1.5 rounded-full bg-brand text-white text-xs font-bold inline-flex items-center justify-center">{activeCount}</span>}
    </button>
  );
}

/* Bottom sheet with the same filters on phones and tablets. */
export function FilterSheet({ open, onClose, onClearAll, resultLabel, children }) {
  const ref = useRef(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog ref={ref} onClose={onClose} onCancel={onClose} aria-label="Filters"
      onClick={(e) => e.target === ref.current && onClose()}
      className="lg:hidden m-0 mt-auto w-full max-w-full max-h-[88vh] rounded-t-3xl border-0 p-0 bg-paper backdrop:bg-black/50">
      {open && (
        <div className="flex flex-col max-h-[88vh]">
          <div className="flex items-center justify-between px-5 pt-3 pb-2">
            <span className="absolute left-1/2 -translate-x-1/2 top-2 w-10 h-1.5 rounded-full bg-line" aria-hidden="true" />
            <h2 className="text-lg font-bold mt-2">Filters</h2>
            <button type="button" onClick={onClose} className="w-11 h-11 -mr-2 rounded-full hover:bg-brand-soft inline-flex items-center justify-center" aria-label="Close filters"><X size={22} /></button>
          </div>
          <div className="overflow-y-auto px-5"><div className="rounded-2xl bg-surface border border-line px-4">{children}</div></div>
          <div className="flex items-center gap-3 px-5 py-4 border-t border-line bg-surface">
            <button type="button" onClick={onClearAll} className="min-h-12 px-4 font-semibold text-ink-soft hover:text-danger">Clear all</button>
            <button type="button" onClick={onClose} className="flex-1 min-h-12 rounded-lg bg-brand text-white font-display font-semibold">{resultLabel}</button>
          </div>
        </div>
      )}
    </dialog>
  );
}

export function SortSelect({ value, onChange, options }) {
  return (
    <label className="inline-flex items-center gap-2 text-sm">
      <span className="font-medium text-ink-soft whitespace-nowrap">Sort by</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="min-h-11 rounded-lg border border-line bg-surface px-3 font-medium">
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  );
}
