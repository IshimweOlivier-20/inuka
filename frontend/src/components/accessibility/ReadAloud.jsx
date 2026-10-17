import { useEffect, useState } from 'react';
import { Square, Volume2 } from 'lucide-react';
import { loadA11y } from '../../utils/a11y';

// "Read aloud" setting: select any text on any page and a small Listen button appears.
// Uses the browser's own voice (free, works offline on most phones).
export default function ReadAloud() {
  const [on, setOn] = useState(() => loadA11y().readAloud);
  const [pos, setPos] = useState(null);
  const [text, setText] = useState('');
  const [speaking, setSpeaking] = useState(false);
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  useEffect(() => {
    const onChange = (e) => setOn(!!e.detail.readAloud);
    window.addEventListener('inuka-a11y', onChange);
    return () => window.removeEventListener('inuka-a11y', onChange);
  }, []);

  useEffect(() => {
    if (!on || !supported) { setPos(null); return undefined; }
    const show = () => {
      setTimeout(() => {
        const sel = window.getSelection();
        const t = sel?.toString().trim() || '';
        if (t.length < 2 || !sel.rangeCount) { if (!window.speechSynthesis.speaking) setPos(null); return; }
        const r = sel.getRangeAt(0).getBoundingClientRect();
        setText(t.slice(0, 4000));
        setPos({ top: Math.max(8, r.top - 44), left: Math.min(window.innerWidth - 120, Math.max(8, r.left + r.width / 2 - 50)) });
      }, 10);
    };
    document.addEventListener('mouseup', show);
    document.addEventListener('keyup', show);
    document.addEventListener('touchend', show);
    return () => { document.removeEventListener('mouseup', show); document.removeEventListener('keyup', show); document.removeEventListener('touchend', show); };
  }, [on, supported]);

  useEffect(() => () => supported && window.speechSynthesis.cancel(), [supported]);

  if (!on || !supported || !pos) return null;
  const speak = () => {
    window.speechSynthesis.cancel();
    if (speaking) { setSpeaking(false); setPos(null); return; }
    const u = new SpeechSynthesisUtterance(text);
    u.lang = document.documentElement.lang || 'en';
    u.rate = 0.95;
    u.onend = () => { setSpeaking(false); setPos(null); };
    setSpeaking(true);
    window.speechSynthesis.speak(u);
  };
  return (
    <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={speak}
      style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 80 }}
      className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full bg-brand text-white text-sm font-semibold shadow-lg hover:bg-brand-dark">
      {speaking ? <Square size={14} fill="currentColor" aria-hidden="true" /> : <Volume2 size={15} aria-hidden="true" />}
      {speaking ? 'Stop' : 'Listen'}
    </button>
  );
}
