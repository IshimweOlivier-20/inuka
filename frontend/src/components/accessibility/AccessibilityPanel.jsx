import { useEffect, useRef, useState } from 'react';
import { Accessibility, Check, Contrast, Link2, Pause, Type, Volume2, ALargeSmall } from 'lucide-react';
import { Alert, Modal } from '../ui';
import { useAuth } from '../../context/AuthContext';
import { api, errorMessage } from '../../services/api';
import { A11Y_DEFAULT, a11yActiveCount, applyA11y, loadA11y } from '../../utils/a11y';

const TOGGLES = [
  ['contrast', 'High contrast', 'Darker text and stronger borders.', Contrast],
  ['readableFont', 'Easy-to-read font', 'Letters that are easier to tell apart (Atkinson Hyperlegible).', Type],
  ['underlineLinks', 'Underline links', 'See every link clearly.', Link2],
  ['reduceMotion', 'Stop animations', 'No moving pictures or sliding effects.', Pause],
  ['readAloud', 'Read aloud', 'Select any text and press Listen.', Volume2],
];
const SIZES = [['normal', 'Normal'], ['large', 'Large'], ['xlarge', 'Extra large']];
export const DISABILITIES = [['visual', 'Seeing (low vision, blind)'], ['hearing', 'Hearing (deaf, hard of hearing)'], ['physical', 'Moving or using hands'], ['learning', 'Reading or learning (e.g. dyslexia)'], ['other', 'Something else']];
const EXTRA = [[0, 'None'], [25, '+25%'], [50, '+50%'], [100, 'Double time']];

// Saves to the account (debounced) when signed in; always saves on this device.
function useA11ySettings() {
  const { user, setUser } = useAuth();
  const [s, setS] = useState(() => ({ ...A11Y_DEFAULT, ...loadA11y(), ...(user?.accessibility || {}) }));
  const [error, setError] = useState('');
  const timer = useRef();
  const save = (next) => {
    setS(next);
    applyA11y(next);
    if (!user || user.offline) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try { const { data } = await api.put('/profile/accessibility', { accessibility: next }); setUser((u) => ({ ...u, ...data.user })); setError(''); } catch (e) { setError(errorMessage(e)); }
    }, 600);
  };
  useEffect(() => () => clearTimeout(timer.current), []);
  return { s, save, error };
}

export function AccessibilitySettings() {
  const { s, save, error } = useA11ySettings();
  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-semibold mb-2 flex items-center gap-1.5"><ALargeSmall size={16} className="text-brand" aria-hidden="true" />Text size</p>
        <div role="radiogroup" aria-label="Text size" className="grid grid-cols-3 gap-2">
          {SIZES.map(([k, l], i) => (
            <button key={k} type="button" role="radio" aria-checked={s.textSize === k} onClick={() => save({ ...s, textSize: k })}
              className={`h-12 rounded-lg border font-semibold transition-colors ${s.textSize === k ? 'border-brand bg-brand text-white' : 'border-line bg-surface hover:border-brand'}`}>
              <span style={{ fontSize: [13, 15, 17][i] }}>Aa</span> <span className="text-xs ml-1">{l}</span>
            </button>
          ))}
        </div>
      </div>
      <ul className="divide-y divide-line border border-line rounded-lg bg-surface">
        {TOGGLES.map(([k, l, hint, Icon]) => (
          <li key={k}>
            <label className="flex items-center gap-3 px-3 py-2.5 cursor-pointer">
              <span className="w-8 h-8 rounded-lg bg-brand-soft text-brand flex items-center justify-center shrink-0"><Icon size={16} aria-hidden="true" /></span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-semibold">{l}</span>
                <span className="block text-xs text-ink-soft">{hint}</span>
              </span>
              <input type="checkbox" className="sr-only peer" checked={!!s[k]} onChange={(e) => save({ ...s, [k]: e.target.checked })} />
              <span aria-hidden="true" className="relative w-10 h-6 rounded-full bg-line peer-checked:bg-success transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-brand after:absolute after:top-0.5 after:left-0.5 after:w-5 after:h-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-4" />
            </label>
          </li>
        ))}
      </ul>
      <div className="flex items-center justify-between gap-3">
        <button type="button" onClick={() => save({ ...A11Y_DEFAULT })} className="text-sm font-semibold text-brand hover:underline">Reset to normal</button>
        <span className="text-xs text-ink-soft">Saved automatically</span>
      </div>
      {error && <Alert>{error}</Alert>}
    </div>
  );
}

// Header button (dashboards and public site)
export function AccessibilityButton({ className = '' }) {
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(() => a11yActiveCount(loadA11y()));
  useEffect(() => {
    const on = (e) => setCount(a11yActiveCount(e.detail));
    window.addEventListener('inuka-a11y', on);
    return () => window.removeEventListener('inuka-a11y', on);
  }, []);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label="Accessibility settings" title="Accessibility"
        className={`relative min-w-11 min-h-11 rounded-lg inline-flex items-center justify-center hover:bg-brand-soft ${className}`}>
        <Accessibility size={20} aria-hidden="true" />
        {count > 0 && <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-success text-white text-[10px] font-bold flex items-center justify-center"><Check size={10} strokeWidth={3} aria-hidden="true" /></span>}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Accessibility">
        <p className="text-sm text-ink-soft mb-4">Make INUKA easier to see, read and use. Your choices stay on this device{' '}and in your account when you are signed in.</p>
        <AccessibilitySettings />
      </Modal>
    </>
  );
}

// Profile tab: the same settings plus exam extra time and (optional, private) disability information.
export function AccessibilityTab() {
  const { user, setUser } = useAuth();
  const [extra, setExtra] = useState(user?.extraTimePercent || 0);
  const [dis, setDis] = useState(user?.disabilities || []);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const saveMore = async () => {
    setBusy(true); setMsg(null);
    try {
      const { data } = await api.put('/profile/accessibility', { extraTimePercent: extra, disabilities: dis });
      setUser((u) => ({ ...u, ...data.user }));
      setMsg({ tone: 'success', text: 'Saved.' });
    } catch (e) { setMsg({ tone: 'error', text: errorMessage(e) }); } finally { setBusy(false); }
  };
  const toggle = (k) => setDis((d) => (d.includes(k) ? d.filter((x) => x !== k) : [...d, k]));
  return (
    <div className="grid lg:grid-cols-2 gap-6 items-start">
      <section className="bg-surface border border-line rounded-md p-5">
        <h2 className="text-base font-semibold">Display and reading</h2>
        <p className="text-sm text-ink-soft mt-0.5 mb-4">You can also open these from the <Accessibility size={14} className="inline -mt-0.5" aria-label="accessibility" /> button at the top of every page.</p>
        <AccessibilitySettings />
      </section>
      <section className="bg-surface border border-line rounded-md p-5 space-y-5">
        <div>
          <h2 className="text-base font-semibold">Extra time in exams</h2>
          <p className="text-sm text-ink-soft mt-0.5 mb-3">If you need more time because of a disability or because you read slowly in English, choose it here. It applies to every final exam.</p>
          <div role="radiogroup" aria-label="Extra time" className="flex flex-wrap gap-2">
            {EXTRA.map(([v, l]) => (
              <button key={v} type="button" role="radio" aria-checked={extra === v} onClick={() => setExtra(v)}
                className={`h-10 px-4 rounded-full border text-sm font-semibold ${extra === v ? 'bg-brand border-brand text-white' : 'border-line bg-surface hover:border-brand'}`}>{l}</button>
            ))}
          </div>
        </div>
        <div>
          <h2 className="text-base font-semibold">Disability information <span className="text-xs font-normal text-ink-soft">(optional and private)</span></h2>
          <p className="text-sm text-ink-soft mt-0.5 mb-3">Only used to show scholarships and universities with disability support first. It is never shown to mentors or other students, and you can remove it any time.</p>
          <div className="grid sm:grid-cols-2 gap-2">
            {DISABILITIES.map(([k, l]) => (
              <label key={k} className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm cursor-pointer ${dis.includes(k) ? 'border-brand bg-brand-soft' : 'border-line'}`}>
                <input type="checkbox" checked={dis.includes(k)} onChange={() => toggle(k)} className="w-4 h-4 accent-[#07294D]" />{l}
              </label>
            ))}
          </div>
        </div>
        {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}
        <div className="flex gap-3">
          <button type="button" onClick={saveMore} disabled={busy} className="h-10 px-5 rounded bg-accent text-night font-semibold text-sm hover:bg-accent-hover disabled:opacity-50">{busy ? 'Saving…' : 'Save'}</button>
          {dis.length > 0 && <button type="button" onClick={() => setDis([])} className="text-sm font-semibold text-brand hover:underline">Remove my disability information</button>}
        </div>
      </section>
    </div>
  );
}
