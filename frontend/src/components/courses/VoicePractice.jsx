import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, RotateCcw, SendHorizontal, Volume2, VolumeX } from 'lucide-react';
import { Button } from '../ui';
import { AiAvatar } from '../ai/ChatPanel';
import { api, errorMessage } from '../../services/api';

// Speaking practice with INUKA AI ("Introducing Yourself").
// FREE: the browser reads INUKA AI's questions aloud (speech synthesis) and, where supported (Chrome, Edge, Android),
// turns the student's voice into text (speech recognition). Students can always type instead.
const Recognition = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;

function speak(text, on) {
  if (!on || typeof window === 'undefined' || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const voices = window.speechSynthesis.getVoices();
  u.voice = voices.find((v) => /en-(GB|US)/i.test(v.lang)) || voices.find((v) => /^en/i.test(v.lang)) || null;
  u.lang = u.voice?.lang || 'en-GB';
  u.rate = 0.9;
  window.speechSynthesis.speak(u);
}

export default function VoicePractice({ lessonId, activity }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [listening, setListening] = useState(false);
  const [voiceOn, setVoiceOn] = useState(true);
  const [mode, setMode] = useState(null);
  const recRef = useRef(null);
  const endRef = useRef(null);

  useEffect(() => () => { recRef.current?.abort?.(); window.speechSynthesis?.cancel(); }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, [messages, busy]);

  const turn = async (history) => {
    setBusy(true); setError('');
    try {
      const { data } = await api.post('/ai/practice', { lessonId, messages: history });
      setMessages([...history, { role: 'assistant', content: data.reply }]);
      setDone(data.done); setMode(data.mode);
      speak(data.reply, voiceOn);
    } catch (e) { setError(errorMessage(e)); }
    finally { setBusy(false); }
  };
  const start = () => { setMessages([]); setDone(false); turn([]); };
  const send = (text) => {
    const t = (text ?? input).trim();
    if (!t || busy) return;
    setInput('');
    turn([...messages, { role: 'user', content: t }]);
  };

  const listen = () => {
    if (!Recognition) return;
    if (listening) { recRef.current?.stop(); return; }
    window.speechSynthesis?.cancel();
    const rec = new Recognition();
    rec.lang = 'en-GB'; rec.interimResults = true; rec.maxAlternatives = 1;
    let finalText = '';
    rec.onresult = (e) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i += 1) {
        if (e.results[i].isFinal) finalText += e.results[i][0].transcript; else interim += e.results[i][0].transcript;
      }
      setInput((finalText + interim).trim());
    };
    rec.onerror = (e) => { setError(e.error === 'not-allowed' ? 'Please allow the microphone in your browser, or type your answer.' : 'I could not hear you. Please try again or type your answer.'); };
    rec.onend = () => { setListening(false); if (finalText.trim()) send(finalText); };
    recRef.current = rec;
    setListening(true);
    rec.start();
  };

  return (
    <section className="mt-10 rounded-xl border border-line bg-surface overflow-hidden" aria-labelledby="ai-voice-title">
      <header className="flex items-center gap-3 px-5 py-4 bg-brand text-white">
        <AiAvatar size={40} />
        <div className="flex-1">
          <h2 id="ai-voice-title" className="text-white text-lg font-semibold leading-tight">Practise speaking with INUKA AI</h2>
          <p className="text-sm text-white/80">Free · INUKA AI asks, you answer out loud{Recognition ? '' : ' (or type)'}.</p>
        </div>
        <button type="button" onClick={() => { setVoiceOn((v) => !v); window.speechSynthesis?.cancel(); }} aria-pressed={voiceOn}
          className="w-10 h-10 rounded-lg hover:bg-white/15 flex items-center justify-center" aria-label={voiceOn ? 'Turn voice off' : 'Turn voice on'} title={voiceOn ? 'Voice on' : 'Voice off'}>
          {voiceOn ? <Volume2 size={20} /> : <VolumeX size={20} />}
        </button>
      </header>
      <div className="p-5">
        <p className="text-[15px]">{activity.task}</p>
        {!messages.length && !busy ? (
          <Button onClick={start} className="mt-4"><Mic size={18} aria-hidden="true" />Start the conversation</Button>
        ) : (
          <>
            <ol className="mt-4 space-y-3 max-h-[420px] overflow-y-auto pr-1" aria-live="polite">
              {messages.map((m, i) => (m.role === 'assistant' ? (
                <li key={i} className="flex items-start gap-3">
                  <AiAvatar size={32} />
                  <div className="rounded-2xl rounded-tl-sm bg-brand-soft px-4 py-2.5 text-[15px] max-w-[85%]">
                    {m.content}
                    <button type="button" onClick={() => speak(m.content, true)} className="ml-2 align-middle text-brand hover:text-brand-dark" aria-label="Listen again"><Volume2 size={16} /></button>
                  </div>
                </li>
              ) : (
                <li key={i} className="flex justify-end"><div className="rounded-2xl rounded-tr-sm bg-brand text-white px-4 py-2.5 text-[15px] max-w-[85%]">{m.content}</div></li>
              )))}
              {busy && <li className="text-sm text-ink-soft pl-11" role="status">INUKA AI is thinking…</li>}
              <li ref={endRef} />
            </ol>
            {!done ? (
              <form onSubmit={(e) => { e.preventDefault(); send(); }} className="mt-4 flex items-end gap-2">
                {Recognition && (
                  <button type="button" onClick={listen} disabled={busy} aria-pressed={listening}
                    className={`w-12 h-12 shrink-0 rounded-full flex items-center justify-center text-white transition-colors ${listening ? 'bg-danger animate-pulse' : 'bg-brand hover:bg-brand-dark'}`}
                    aria-label={listening ? 'Stop recording' : 'Answer by speaking'} title={listening ? 'Stop' : 'Speak'}>
                    {listening ? <MicOff size={20} /> : <Mic size={20} />}
                  </button>
                )}
                <label className="flex-1">
                  <span className="sr-only">Your answer</span>
                  <input value={input} onChange={(e) => setInput(e.target.value)} disabled={busy}
                    placeholder={listening ? 'Listening… speak now' : Recognition ? 'Press the microphone and speak, or type here' : 'Type your answer'}
                    className="w-full min-h-12 rounded-lg border border-line bg-surface px-3 focus:outline-none focus:ring-2 focus:ring-brand" />
                </label>
                <button type="submit" disabled={!input.trim() || busy} aria-label="Send answer"
                  className="w-12 h-12 shrink-0 rounded-lg bg-accent text-night flex items-center justify-center disabled:opacity-40 hover:bg-accent-hover"><SendHorizontal size={20} /></button>
              </form>
            ) : (
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <p className="text-sm font-semibold text-success-ink">Practice finished. Well done!</p>
                <Button variant="outline" onClick={start}><RotateCcw size={16} aria-hidden="true" />Practise again</Button>
              </div>
            )}
          </>
        )}
        {error && <p role="alert" className="mt-3 text-sm rounded-lg bg-danger-soft text-danger-ink px-3 py-2">{error}</p>}
        <p className="mt-3 text-xs text-ink-soft">
          {mode === 'basic' ? 'Free basic mode: a set of practice questions. ' : mode === 'ai' ? 'AI speaking partner. ' : ''}
          Your voice is turned into text by your browser and is not recorded by INUKA.
        </p>
      </div>
    </section>
  );
}
