import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff } from 'lucide-react';

// Speak instead of typing (browser speech recognition: free, Chrome/Edge/Android).
// Hidden on browsers without it. `onText` receives each finished sentence.
const Recognition = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;
export const voiceSupported = !!Recognition;

export default function VoiceInputButton({ onText, lang = 'en-US', className = '', label = 'Speak instead of typing' }) {
  const [on, setOn] = useState(false);
  const [error, setError] = useState('');
  const rec = useRef(null);
  useEffect(() => () => rec.current?.abort(), []);
  if (!Recognition) return null;

  const toggle = () => {
    setError('');
    if (on) { rec.current?.stop(); return; }
    const r = new Recognition();
    r.lang = lang; r.interimResults = false; r.continuous = true;
    r.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i += 1) if (e.results[i].isFinal) onText(e.results[i][0].transcript.trim());
    };
    r.onerror = (e) => setError(e.error === 'not-allowed' ? 'Please allow the microphone.' : 'Could not hear you. Try again.');
    r.onend = () => setOn(false);
    rec.current = r;
    try { r.start(); setOn(true); } catch { setOn(false); }
  };

  return (
    <span className="relative inline-flex">
      <button type="button" onClick={toggle} aria-pressed={on} aria-label={on ? 'Stop listening' : label} title={on ? 'Stop listening' : label}
        className={`w-9 h-9 rounded-full inline-flex items-center justify-center transition-colors ${on ? 'bg-danger text-white animate-pulse' : 'bg-brand-soft text-brand hover:bg-brand hover:text-white'} ${className}`}>
        {on ? <MicOff size={16} aria-hidden="true" /> : <Mic size={16} aria-hidden="true" />}
      </button>
      {(on || error) && <span role="status" className={`absolute bottom-full right-0 mb-1.5 whitespace-nowrap text-[11px] rounded px-2 py-0.5 ${error ? 'bg-danger text-white' : 'bg-night text-white'}`}>{error || 'Listening… speak now'}</span>}
    </span>
  );
}
