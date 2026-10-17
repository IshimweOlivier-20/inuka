import VoiceInputButton from '../ui/VoiceInput';
import { Fragment, useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { SendHorizontal, Sprout } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api, errorMessage } from '../../services/api';

// The INUKA AI chat, used by the full student page (/ai), the floating bubble on dashboards and on public pages.
//   • Students: conversations are saved (/api/ai/...).
//   • Visitors, mentors and admins: the INUKA Assistant (/api/assistant/...). The chat is kept only in this browser tab.
// Both use the INUKA agent on the server: it looks up real scholarships, deadlines and courses, and is free to use
// ("AI" mode with a free AI service, or the built-in "basic" mode when no AI key is set).

// Spec 13.3: quick-start buttons on first open (exact labels).
const STUDENT_STARTS = [
  ['Find a Scholarship', 'Which scholarships could I apply for with my profile? Please explain simply.'],
  ['Help with My Essay', 'Can you help me improve my personal statement? I will paste it in my next message.'],
  ['What Documents Do I Need?', 'What documents do I need to apply to university and for scholarships?'],
  ['English Grammar Question', 'I have an English grammar question.'],
  ['Computer Help', 'I need help with a computer task.'],
];
const GUEST_STARTS = [
  ['Scholarships for refugees', 'Show me fully funded scholarships open to refugees.'],
  ['Deadlines this month', 'Which scholarships close this month?'],
  ['Which course first?', 'Which English course should I start with?'],
  ['Documents I need', 'What documents do I need to apply for scholarships?'],
  ['Is INUKA free?', 'Is INUKA free?'],
];
export const QUICK_STARTS = STUDENT_STARTS;
const STORE = 'inuka-assistant-chat';

export function AiAvatar({ size = 36 }) {
  return (
    <span className="shrink-0 rounded-full bg-brand text-white flex items-center justify-center" style={{ width: size, height: size }} aria-hidden="true">
      <Sprout size={size * 0.55} className="ai-sprout" />
    </span>
  );
}

// **bold** and [links](/path) inside one line. Internal links use the router; outside links open in a new tab.
function Inline({ text, onNavigate }) {
  const parts = text.split(/(\[[^\]]+\]\([^)\s]+\)|\*\*[^*]+\*\*)/g);
  return parts.map((p, i) => {
    const link = p.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
    if (link) {
      const [, label, href] = link;
      const cls = 'font-semibold text-brand underline decoration-accent decoration-2 underline-offset-2 hover:text-brand-dark';
      if (href.startsWith('/')) return <Link key={i} to={href} onClick={onNavigate} className={cls}>{label}</Link>;
      if (/^https?:\/\//.test(href)) return <a key={i} href={href} target="_blank" rel="noopener noreferrer" className={cls}>{label}</a>;
      return <Fragment key={i}>{label}</Fragment>;
    }
    if (p.startsWith('**') && p.endsWith('**') && p.length > 4) return <strong key={i}>{p.slice(2, -2)}</strong>;
    return <Fragment key={i}>{p}</Fragment>;
  });
}

// Paragraphs, "- " lists and numbered lists. Builds React elements (no HTML injection).
export function Rich({ text, onNavigate }) {
  const blocks = String(text || '').split(/\n{2,}/);
  return blocks.map((block, i) => {
    const lines = block.split('\n').filter((l) => l.trim());
    if (lines.length && lines.every((l) => /^\s*[-*•]\s+/.test(l))) {
      return <ul key={i} className="list-disc pl-5 space-y-1 my-2">{lines.map((l, j) => <li key={j}><Inline text={l.replace(/^\s*[-*•]\s+/, '')} onNavigate={onNavigate} /></li>)}</ul>;
    }
    if (lines.length && lines.every((l) => /^\s*\d+[.)]\s+/.test(l))) {
      return <ol key={i} className="list-decimal pl-5 space-y-1 my-2">{lines.map((l, j) => <li key={j}><Inline text={l.replace(/^\s*\d+[.)]\s+/, '')} onNavigate={onNavigate} /></li>)}</ol>;
    }
    return <p key={i} className="my-2 first:mt-0 last:mb-0">{lines.map((l, j) => <Fragment key={j}>{j > 0 && <br />}<Inline text={l.replace(/^#+\s*/, '')} onNavigate={onNavigate} /></Fragment>)}</p>;
  });
}

const loadGuest = () => { try { return JSON.parse(sessionStorage.getItem(STORE) || '[]'); } catch { return []; } };

export default function ChatPanel({ conversationId, onConversation, compact = false, onNavigate }) {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const student = user?.role === 'student';
  const [messages, setMessages] = useState(() => (student ? [] : loadGuest()));
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState(null); // { mode: 'ai'|'basic', provider }
  const [convId, setConvId] = useState(conversationId || null);
  const endRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => { api.get(student ? '/ai/status' : '/assistant/status').then((r) => setStatus(r.data)).catch(() => {}); }, [student]);
  useEffect(() => {
    if (!student) return;
    setConvId(conversationId || null);
    setError('');
    if (!conversationId) { setMessages([]); return; }
    api.get(`/ai/conversations/${conversationId}`).then((r) => setMessages(r.data.messages)).catch((e) => setError(errorMessage(e)));
  }, [conversationId, student]);
  // Visitors: keep the chat while they move between pages (this browser tab only).
  useEffect(() => { if (!student) { try { sessionStorage.setItem(STORE, JSON.stringify(messages.slice(-30))); } catch { /* private mode */ } } }, [messages, student]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [messages, busy]);

  const send = async (text) => {
    const message = (text ?? input).trim();
    if (!message || busy) return;
    setInput(''); setError(''); setBusy(true);
    const mine = { id: `u${Date.now()}`, role: 'user', content: message };
    setMessages((m) => [...m, mine]);
    try {
      let reply;
      if (student) {
        const { data } = await api.post('/ai/chat', { message, conversationId: convId || undefined });
        reply = data.reply;
        if (!convId) { setConvId(data.conversationId); onConversation?.(data.conversationId); }
      } else {
        const history = [...messages, mine].slice(-12).map(({ role, content }) => ({ role, content }));
        const { data } = await api.post('/assistant/chat', { messages: history, page: pathname });
        reply = data.reply;
      }
      setMessages((m) => [...m, { id: `a${Date.now()}`, role: 'assistant', content: reply }]);
    } catch (e) {
      setError(errorMessage(e));
      setMessages((m) => m.filter((x) => x.id !== mine.id));
      setInput(message);
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  };

  const onKey = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } };
  const starts = student ? STUDENT_STARTS : GUEST_STARTS;
  // Spec 13.3 greeting (exact wording when we know the name).
  const hello = user
    ? `Hi ${user.firstName}! I'm INUKA AI. I'm here to help you find scholarships, improve your English, or guide you through university applications. What can I help you with today?`
    : "Hi! I'm INUKA AI. I'm here to help you find scholarships, improve your English, or guide you through university applications. What can I help you with today?";

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4" aria-live="polite">
        <div className="flex items-start gap-3">
          <AiAvatar />
          <div className="rounded-2xl rounded-tl-sm bg-brand-soft px-4 py-3 text-[15px] max-w-[85%]">{hello}</div>
        </div>
        {messages.length === 0 && (
          <div className="flex flex-wrap gap-2 pl-12">
            {starts.map(([label, prompt]) => (
              <button key={label} type="button" onClick={() => send(prompt)} disabled={busy}
                className="min-h-10 px-3 rounded-full border border-brand/30 bg-surface text-sm font-medium text-brand hover:bg-brand-soft hover:border-brand">{label}</button>
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
            <div className="rounded-2xl rounded-tl-sm bg-surface border border-line px-4 py-3 text-[15px] max-w-[85%] break-words"><Rich text={m.content} onNavigate={onNavigate} /></div>
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
        {error && <p className="text-sm rounded-lg bg-danger-soft text-danger-ink px-3 py-2" role="alert">{error}</p>}
        <div ref={endRef} />
      </div>
      <form onSubmit={(e) => { e.preventDefault(); send(); }} className="border-t border-line p-3 flex items-end gap-2 bg-surface">
        <label className="flex-1">
          <span className="sr-only">Message INUKA AI</span>
          <textarea ref={inputRef} rows={compact ? 1 : 2} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={onKey}
            placeholder="Ask about scholarships, courses, documents…"
            className="w-full resize-none rounded-xl border border-line bg-surface px-3 py-2.5 max-h-40 focus:outline-none focus:ring-2 focus:ring-brand" />
        </label>
        <span className="mb-1"><VoiceInputButton onText={(t) => setInput((v) => (v ? `${v} ${t}` : t))} /></span>
        <button type="submit" disabled={!input.trim() || busy} aria-label="Send"
          className="w-11 h-11 shrink-0 rounded-xl bg-accent text-night flex items-center justify-center disabled:opacity-40 hover:bg-accent-hover">
          <SendHorizontal size={20} aria-hidden="true" />
        </button>
      </form>
      <p className="px-3 pb-2 text-xs text-ink-soft text-center bg-surface">
        <span className="font-semibold text-success-ink">Free</span>
        {status && <> · {status.mode === 'ai' ? `AI answers${status.provider ? ` by ${status.provider}` : ''}` : 'Basic mode'}</>}
        {' · '}Check deadlines on the official website. Never share passwords or ID numbers.
        {!compact && <> <Link to="/privacy#ai" className="underline">Privacy</Link></>}
      </p>
    </div>
  );
}

export function clearGuestChat() { try { sessionStorage.removeItem(STORE); } catch { /* ignore */ } }
