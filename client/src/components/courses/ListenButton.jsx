import { useEffect, useState } from 'react';
import { Square, Volume2 } from 'lucide-react';

// Reads the lesson aloud with the browser's built-in text-to-speech (no download needed).
export default function ListenButton({ getText }) {
  const [speaking, setSpeaking] = useState(false);
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  useEffect(() => () => supported && window.speechSynthesis.cancel(), [supported]);
  if (!supported) return null;

  const toggle = () => {
    if (speaking) { window.speechSynthesis.cancel(); setSpeaking(false); return; }
    const u = new SpeechSynthesisUtterance(getText());
    u.lang = 'en-GB';
    u.rate = 0.9; // a little slower for learners
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(u);
    setSpeaking(true);
  };
  return (
    <button onClick={toggle} className="inline-flex items-center gap-2 min-h-11 px-4 rounded-full bg-brand-soft text-brand font-medium hover:bg-brand hover:text-white transition-colors" aria-pressed={speaking}>
      {speaking ? <Square size={16} fill="currentColor" aria-hidden="true" /> : <Volume2 size={18} aria-hidden="true" />}{speaking ? 'Stop listening' : 'Listen to this lesson'}
    </button>
  );
}
