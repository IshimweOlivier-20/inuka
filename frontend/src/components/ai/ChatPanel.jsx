import { Fragment, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { SendHorizontal, Sprout } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api, errorMessage } from '../../services/api';

// Spec 13.3: quick-start buttons on first open.
export const QUICK_STARTS = [
  ['Find a Scholarship', 'Which scholarships could I apply for with my profile? Please explain simply.'],
  ['Help with My Essay', 'Can you help me improve my personal statement? I will paste it in my next message.'],
  ['What Documents Do I Need?', 'What documents do I need to apply to university and for scholarships?'],
  ['English Grammar Question', 'I have an English grammar question.'],
  ['Computer Help', 'I need help with a computer task.'],
];

export function AiAvatar({ size = 36 }) {
  return (
    <span className="shrink-0 rounded-full bg-brand text-white flex items-center justify-center" style={{ width: size, height: size }} aria-hidden="true">
      <Sprout size={size * 0.55} className="ai-sprout" />
    </span>
  );
}

// Very small formatter: paragraphs, "- " lists, numbered lists and **bold**. Builds React elements (no HTML injection).
function Rich({ text }) {
  const bold = (line) => line.split(/(\*\*[^*]+\*\*)/g).map((part, i) => (
    part.startsWith('**') && part.endsWith('**') ? <strong key={i}>{part.slice(2, -2)}</strong> : <Fragment key={i}>{part}</Fragment>
  ));
  const blocks = text.split(/\n{2,}/);
  return blocks.map((block, i) => {
    const lines = block.split('\n').filter((l) => l.trim());
    if (lines.length && lines.every((l) => /^\s*[-*•]\s+/.test(l))) {
      return <ul key={i} className="list-disc pl-5 space-y-1 my-2">{lines.map((l, j) => <li key={j}>{bold(l.replace(/^\s*[-*•]\s+/, ''))}</li>)}</ul>;
    }
    if (lines.length && lines.every((l) => /^\s*\d+[.)]\s+/.test(l))) {
      return <ol key={i} className="list-decimal pl-5 space-y-1 my-2">{lines.map((l, j) => <li key={j}>{bold(l.replace(/^\s*\d+[.)]\s+/, ''))}</li>)}</ol>;
    }
    return <p key={i} className="my-2 first:mt-0 last:mb-0">{lines.map((l, j) => <Fragment key={j}>{j > 0 && <br />}{bold(l.replace(/^#+\s*/, ''))}</Fragment>)}</p>;
  });
}

// The chat itself. Used by the full page (/ai) and the floating bubble.
export default function ChatPanel({ conversationId, onConversation, compact = false }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [providerName, setProviderName] = useState(null);
  const [convId, setConvId] = useState(conversationId || null);
  const endRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => { api.get('/ai/status').then((r) => { setEnabled(r.data.enabled); setProviderName(r.data.provider); }).catch(() => {}); }, []);
  useEffect(() => {
    setConvId(conversationId || null);
    setError('');
    if (!conversationId) { setMessages([]); return; }
    api.get(`/ai/conversations/${conversationId}`).then((r) => setMessages(r.data.messages)).catch((e) => setError(errorMessage(e)));
  }, [conversationId]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [messages, busy]);

  const send = async (text) => {
    const message = (text ?? input).trim();
    if (!message || busy) return;
    setInput(''); setError(''); setBusy(true);
    setMessages((m) => [...m, { id: `u${Date.now()}`, role: 'user', content: message }]);
    try {
      const { data } = await api.post('/ai/chat', { message, conversationId: convId || undefined });
      setMessages((m) => [...m, { id: `a${Date.now()}`, role: 'assistant', content: data.reply }]);
      if (!convId) { setConvId(data.conversationId); onConversation?.(data.conversationId); }
    } catch (e) {
      setError(errorMessage(e));
      setMessages((m) => m.slice(0, -1));
      setInput(message);
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  };

  const onKey = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } };

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4" aria-live="polite">
        <div className="flex items-start gap-3">
          <AiAvatar />
          <div className="rounded-2xl rounded-tl-sm bg-brand-soft px-4 py-3 text-[15px] max-w-[85%]">
            Hi {user.firstName}! I&apos;m INUKA AI. I&apos;m here to help you find scholarships, improve your English, or guide you through university applications. What can I help you with today?
          </div>
        </div>
        {messages.length === 0 && enabled && (
          <div className="flex flex-wrap gap-2 pl-12">
            {QUICK_STARTS.map(([label, prompt]) => (
              <button key={label} type="button" onClick={() => send(prompt)} disabled={busy}
                className="min-h-10 px-3 rounded-full border border-brand/40 bg-surface text-sm font-medium text-brand hover:bg-brand-soft">{label}</button>
            ))}
          </div>
        )}
        {messages.map((m) => (m.role === 'user' ? (
          <div key={m.id} className="flex justify-end">
            <div className="rounded-2xl rounded-tr-sm bg-brand text-white px-4 py-3 text-[15px] max-w-[85%] whitespace-pre-line break-words">{m.content}</div>
          </div>
        ) : (
          <div key={m.id} className="flex items-start gap-3">
            <AiAvatar />
            <div className="rounded-2xl rounded-tl-sm bg-surface border border-line px-4 py-3 text-[15px] max-w-[85%] break-words"><Rich text={m.content} /></div>
          </div>
        )))}
        {busy && (
          <div className="flex items-center gap-3" role="status">
            <AiAvatar />
            <span className="rounded-2xl bg-surface border border-line px-4 py-3 inline-flex gap-1" aria-label="INUKA AI is typing">
              {[0, 1, 2].map((i) => <span key={i} className="typing-dot w-2 h-2 rounded-full bg-brand" style={{ animationDelay: `${i * 0.2}s` }} />)}
            </span>
          </div>
        )}
        {!enabled && (
          <p className="text-sm rounded-lg bg-paper border border-line px-3 py-2">
            INUKA AI is not switched on yet. Meanwhile, a mentor can help you: <Link to="/mentorship" className="text-brand font-semibold underline">book a free session</Link>.
          </p>
        )}
        {error && <p className="text-sm text-danger" role="alert">{error}</p>}
        <div ref={endRef} />
      </div>
      <form onSubmit={(e) => { e.preventDefault(); send(); }} className="border-t border-line p-3 flex items-end gap-2 bg-surface">
        <label className="flex-1">
          <span className="sr-only">Message INUKA AI</span>
          <textarea ref={inputRef} rows={compact ? 1 : 2} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={onKey} disabled={!enabled}
            placeholder={enabled ? 'Ask anything about scholarships, English or computers…' : 'INUKA AI is not switched on yet'}
            className="w-full resize-none rounded-xl border border-line px-3 py-2.5 max-h-40 focus:outline-none focus:ring-2 focus:ring-brand" />
        </label>
        <button type="submit" disabled={!input.trim() || busy || !enabled} aria-label="Send"
          className="w-11 h-11 shrink-0 rounded-xl bg-brand text-white flex items-center justify-center disabled:opacity-40 hover:bg-brand-dark">
          <SendHorizontal size={20} aria-hidden="true" />
        </button>
      </form>
      <p className="px-3 pb-2 text-xs text-ink-soft text-center bg-surface">
        {compact ? 'Never share passwords or ID numbers.' : <>INUKA AI can make mistakes. Check deadlines on the official website. Never share passwords or ID numbers.{providerName && ` Answers by ${providerName}.`} <Link to="/privacy#ai" className="underline">Privacy</Link></>}
      </p>
    </div>
  );
}
