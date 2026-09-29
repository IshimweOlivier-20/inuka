import IconTile from './IconTile';
import { useEffect, useId, useRef } from 'react';
import { Link } from 'react-router-dom';

const variants = {
  primary: 'bg-brand text-white hover:bg-brand-dark',
  accent: 'bg-white text-brand-deep hover:bg-brand-soft',
  outline: 'border-2 border-brand text-brand hover:bg-brand-soft',
  ghost: 'text-brand hover:bg-brand-soft',
  danger: 'bg-danger text-white hover:bg-red-600',
};

export function Button({ variant = 'primary', to, href, className = '', loading, children, ...props }) {
  const cls = `inline-flex items-center justify-center gap-2 min-h-11 px-5 rounded-lg font-display font-semibold text-[15px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${className}`;
  if (to) return <Link to={to} className={cls} {...props}>{children}</Link>;
  if (href) return <a href={href} className={cls} {...props}>{children}</a>;
  return (
    <button className={cls} disabled={loading || props.disabled} {...props}>
      {loading && <Spinner small />}
      {children}
    </button>
  );
}

export function Spinner({ small, label = 'Loading' }) {
  return (
    <span role="status" aria-label={label}
      className={`inline-block animate-spin rounded-full border-2 border-current border-t-transparent ${small ? 'w-4 h-4' : 'w-8 h-8 text-brand'}`} />
  );
}

export function PageLoader() {
  return <div className="flex justify-center py-24"><Spinner /></div>;
}

export function Field({ label, error, hint, as = 'input', children, className = '', ...props }) {
  const id = useId();
  const Tag = as;
  const base = `w-full min-h-11 rounded-lg border bg-white px-3 py-2 text-base text-ink focus:outline-none focus:ring-2 focus:ring-brand/40 ${error ? 'border-danger' : 'border-line'}`;
  return (
    <div className={className}>
      <label htmlFor={id} className="block mb-1.5 text-sm font-medium text-ink">{label}</label>
      <Tag id={id} className={base} aria-invalid={!!error} aria-describedby={error ? `${id}-err` : undefined} {...props}>
        {children}
      </Tag>
      {hint && !error && <p className="mt-1 text-sm text-ink-soft">{hint}</p>}
      {error && <p id={`${id}-err`} className="mt-1 text-sm text-danger">{error}</p>}
    </div>
  );
}

export function Alert({ tone = 'error', children }) {
  const tones = {
    error: 'bg-red-50 text-red-800 border-red-200',
    success: 'bg-brand-soft text-brand border-brand/20',
    info: 'bg-brand-soft text-brand-deep border-brand/20',
  };
  return <div role={tone === 'error' ? 'alert' : 'status'} className={`rounded-lg border px-4 py-3 text-sm ${tones[tone]}`}>{children}</div>;
}

export function Card({ className = '', children, ...props }) {
  return <div className={`bg-white rounded-xl border border-line p-5 ${className}`} {...props}>{children}</div>;
}

export function ProgressBar({ value, label, tone = 'accent' }) {
  const v = Math.max(0, Math.min(100, value || 0));
  return (
    <div>
      {label && <div className="flex justify-between text-sm mb-1"><span className="text-ink-soft">{label}</span><span className="font-semibold">{v}%</span></div>}
      <div className="h-2.5 bg-line rounded-full overflow-hidden" role="progressbar" aria-valuenow={v} aria-valuemin={0} aria-valuemax={100} aria-label={label || 'Progress'}>
        <div className={`h-full rounded-full transition-[width] duration-500 ${tone === 'accent' ? 'bg-accent' : 'bg-brand'}`} style={{ width: `${v}%` }} />
      </div>
    </div>
  );
}

export function Pill({ tone = 'grey', children }) {
  const tones = {
    sky: 'bg-sky-100 text-sky-800',
    red: 'bg-red-100 text-red-800',
    cyan: 'bg-cyan-50 text-cyan border border-cyan/30',
    grey: 'bg-gray-100 text-ink-soft',
    brand: 'bg-brand-soft text-brand',
  };
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${tones[tone]}`}>{children}</span>;
}

export function Modal({ open, onClose, title, children, footer, wide }) {
  const ref = useRef(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog ref={ref} onClose={onClose} onCancel={onClose}
      className={`m-auto w-[calc(100%-1.5rem)] ${wide ? 'max-w-3xl' : 'max-w-xl'} rounded-2xl p-0 backdrop:bg-ink/50 max-h-[92vh]`}>
      {open && (
        <div className="flex flex-col max-h-[92vh]">
          <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-3 border-b border-line">
            <h2 className="text-lg font-semibold">{title}</h2>
            <button onClick={onClose} className="min-w-11 min-h-11 -mr-3 -mt-2 text-2xl text-ink-soft hover:text-ink" aria-label="Close">×</button>
          </div>
          <div className="px-6 py-4 overflow-y-auto">{children}</div>
          {footer && <div className="px-6 py-4 border-t border-line bg-paper flex flex-wrap gap-3 justify-end">{footer}</div>}
        </div>
      )}
    </dialog>
  );
}

export function EmptyState({ icon, title, children, action }) {
  return (
    <div className="text-center py-12 px-4">
      {icon && <IconTile icon={icon} tone="soft" size="xl" className="mb-4" />}
      <h3 className="text-lg font-semibold mb-1">{title}</h3>
      <p className="text-ink-soft max-w-md mx-auto mb-5">{children}</p>
      {action}
    </div>
  );
}
