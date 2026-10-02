import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from 'lucide-react';

// Two helpers used everywhere:
//   const confirm = useConfirm();  if (!(await confirm({ title, message, confirmLabel, tone: 'danger' }))) return;
//   const toast = useToast();      toast.success('Saved.')   toast.error('Something went wrong.')   toast.info('…')
const ConfirmContext = createContext(async () => true);
const ToastContext = createContext({ success() {}, error() {}, info() {} });

export const useConfirm = () => useContext(ConfirmContext);
export const useToast = () => useContext(ToastContext);

export function FeedbackProvider({ children }) {
  const [dialog, setDialog] = useState(null);
  const [toasts, setToasts] = useState([]);

  const confirm = useCallback((opts) => new Promise((resolve) => setDialog({ ...opts, resolve })), []);
  const close = (answer) => { dialog?.resolve(answer); setDialog(null); };

  const push = useCallback((tone, text) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t.slice(-3), { id, tone, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), tone === 'error' ? 7000 : 4500);
  }, []);
  const toast = useRef({ success: (m) => push('success', m), error: (m) => push('error', m), info: (m) => push('info', m) }).current;

  return (
    <ConfirmContext.Provider value={confirm}>
      <ToastContext.Provider value={toast}>
        {children}
        {dialog && <ConfirmDialog {...dialog} onAnswer={close} />}
        <div className="fixed z-[60] top-4 left-1/2 -translate-x-1/2 w-[min(440px,calc(100vw-2rem))] space-y-2 pointer-events-none" aria-live="polite" role="status">
          {toasts.map((t) => <Toast key={t.id} {...t} onClose={() => setToasts((x) => x.filter((y) => y.id !== t.id))} />)}
        </div>
      </ToastContext.Provider>
    </ConfirmContext.Provider>
  );
}

const TONES = {
  success: ['bg-surface border-brand/30', CircleCheck, 'text-brand'],
  error: ['bg-surface border-danger/40', CircleAlert, 'text-danger'],
  info: ['bg-surface border-line', Info, 'text-brand'],
};

function Toast({ tone, text, onClose }) {
  const [cls, Icon, iconCls] = TONES[tone] || TONES.info;
  return (
    <div className={`toast-in pointer-events-auto flex items-start gap-3 rounded-xl border shadow-[0_16px_40px_-18px_rgba(15,30,61,0.5)] px-4 py-3 ${cls}`}>
      <Icon size={20} className={`${iconCls} shrink-0 mt-0.5`} aria-hidden="true" />
      <p className="flex-1 text-[15px] text-ink">{text}</p>
      <button type="button" onClick={onClose} className="-mr-1 -mt-1 w-8 h-8 rounded-lg text-ink-soft hover:bg-brand-soft flex items-center justify-center" aria-label="Close message"><X size={16} /></button>
    </div>
  );
}

// "Are you sure…?" dialog. tone 'danger' for deleting or other actions that cannot be undone.
function ConfirmDialog({ title = 'Are you sure?', message, confirmLabel = 'Yes, continue', cancelLabel = 'Cancel', tone = 'primary', onAnswer }) {
  const ref = useRef(null);
  const yesRef = useRef(null);
  useEffect(() => {
    ref.current?.showModal();
    setTimeout(() => (tone === 'danger' ? ref.current?.querySelector('[data-cancel]') : yesRef.current)?.focus(), 0);
  }, [tone]);
  const danger = tone === 'danger';
  return (
    <dialog ref={ref} onCancel={(e) => { e.preventDefault(); onAnswer(false); }} aria-labelledby="confirm-title"
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl p-0 bg-surface text-ink backdrop:bg-black/50">
      <div className="p-6">
        <div className="flex items-start gap-4">
          <span className={`w-11 h-11 shrink-0 rounded-full flex items-center justify-center ${danger ? 'bg-red-100 text-danger' : 'bg-brand-soft text-brand'}`} aria-hidden="true">
            {danger ? <TriangleAlert size={22} /> : <Info size={22} />}
          </span>
          <div className="min-w-0">
            <h2 id="confirm-title" className="text-lg font-bold">{title}</h2>
            {message && <div className="mt-1.5 text-ink-soft">{message}</div>}
          </div>
        </div>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button type="button" data-cancel onClick={() => onAnswer(false)} className="min-h-11 px-5 rounded-lg font-semibold text-ink hover:bg-brand-soft">{cancelLabel}</button>
          <button ref={yesRef} type="button" onClick={() => onAnswer(true)}
            className={`min-h-11 px-5 rounded-lg font-display font-semibold text-white ${danger ? 'bg-danger hover:bg-red-600' : 'bg-brand hover:bg-brand-dark'}`}>{confirmLabel}</button>
        </div>
      </div>
    </dialog>
  );
}
