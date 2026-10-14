import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Camera, Check, CheckCheck, Clock3, Download, FileText, MessagesSquare, Mic, MoreHorizontal, Paperclip,
  RotateCcw, Search, SendHorizontal, Trash2, X,
} from 'lucide-react';
import { Alert } from '../../components/ui';
import { ListRowsSkeleton } from '../../components/ui/Skeletons';
import { PersonPhoto } from '../../components/mentorship/SessionCard';
import { useAuth } from '../../context/AuthContext';
import { useConfirm, useToast } from '../../context/FeedbackContext';
import { api, errorMessage } from '../../services/api';

// Messages between students and mentors: conversation list + chat (pictures, files, voice notes).
const POLL_MS = 4000;
const dayLabel = (d) => {
  const x = new Date(d); const t = new Date();
  const diff = Math.round((new Date(t.toDateString()) - new Date(x.toDateString())) / 864e5);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return x.toLocaleDateString('en-GB', { weekday: diff < 7 ? 'long' : undefined, day: 'numeric', month: 'long', year: x.getFullYear() === t.getFullYear() ? undefined : 'numeric' });
};
const clock = (d) => new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const listTime = (d) => {
  const x = new Date(d); const diff = Math.round((new Date(new Date().toDateString()) - new Date(x.toDateString())) / 864e5);
  if (diff === 0) return clock(d);
  if (diff === 1) return 'Yesterday';
  if (diff < 7) return x.toLocaleDateString('en-GB', { weekday: 'short' });
  return x.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' });
};
const sizeText = (n) => (n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
const subtitle = (p) => (p.role === 'mentor' ? [p.mentor?.title, p.mentor?.org].filter(Boolean).join(', ') : 'Student');
const preview = (c, me) => {
  const l = c.last;
  if (!l) return 'No messages yet';
  if (l.kind === 'system') return l.text;
  const what = l.text || (l.file?.type.startsWith('image/') ? 'Photo' : l.file?.type.startsWith('audio/') ? 'Voice message' : l.file?.name || 'File');
  return l.senderId === me ? `You: ${what}` : what;
};

export default function Messages() {
  const { id } = useParams();
  const { user } = useAuth();
  const [list, setList] = useState(null);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const loadList = useCallback(() => api.get('/conversations').then((r) => setList(r.data.conversations)).catch((e) => setError(errorMessage(e))), []);
  useEffect(() => { document.title = 'Messages — INUKA'; loadList(); const t = setInterval(loadList, 15000); return () => clearInterval(t); }, [loadList]);
  const shown = (list || []).filter((c) => !q || `${c.with.firstName} ${c.with.lastName}`.toLowerCase().includes(q.toLowerCase()));
  const student = user?.role === 'student';

  return (
    <div className={`-mx-4 md:-mx-8 -mt-6 md:-mt-8 ${student ? '-mb-24' : '-mb-10'} md:-mb-8 flex bg-surface md:border-x border-line
      ${student ? 'h-[calc(100dvh-8rem)]' : 'h-[calc(100dvh-4rem)]'} md:h-[calc(100dvh-4rem)]`}>
      {/* Conversations */}
      <aside className={`${id ? 'hidden md:flex' : 'flex'} w-full md:w-[340px] shrink-0 flex-col border-r border-line`} aria-label="Conversations">
        <div className="px-4 pt-5 pb-3">
          <h1 className="text-2xl font-bold flex items-center gap-2"><MessagesSquare size={24} className="text-brand" aria-hidden="true" />Messages</h1>
          <label className="relative block mt-3">
            <span className="sr-only">Search conversations</span>
            <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-soft" aria-hidden="true" />
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name" className="w-full min-h-11 rounded-full bg-paper border border-line pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-brand/30" />
          </label>
        </div>
        <div className="flex-1 overflow-y-auto">
          {error && <div className="p-4"><Alert>{error}</Alert></div>}
          {!list ? <div className="p-4"><ListRowsSkeleton rows={5} /></div> : shown.length === 0 ? (
            <div className="px-6 py-10 text-center text-ink-soft">
              <p className="font-semibold text-ink">{q ? 'Nobody with that name' : 'No messages yet'}</p>
              <p className="mt-1 text-sm">{student ? 'After you book a session, you can message your mentor here.' : 'When a student books you, you can message them here.'}</p>
              {student && !q && <Link to="/mentorship" className="inline-block mt-3 text-brand font-semibold underline min-h-11 leading-[44px]">Find a mentor</Link>}
            </div>
          ) : (
            <ul>
              {shown.map((c) => (
                <li key={c.id}>
                  <Link to={`/messages/${c.id}`} aria-current={c.id === id ? 'page' : undefined}
                    className={`flex items-center gap-3 px-4 py-3 border-b border-line/60 transition-colors ${c.id === id ? 'bg-brand-soft' : 'hover:bg-paper'}`}>
                    <PersonPhoto person={c.with} className="w-14 h-14 rounded-full shrink-0 text-lg" />
                    <span className="flex-1 min-w-0">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="font-bold truncate">{c.with.firstName} {c.with.lastName}</span>
                        <span className={`text-xs shrink-0 tabular-nums ${c.unread ? 'text-brand font-bold' : 'text-ink-soft'}`}>{c.last ? listTime(c.last.createdAt) : ''}</span>
                      </span>
                      <span className="flex items-center justify-between gap-2 mt-0.5">
                        <span className={`text-sm truncate ${c.unread ? 'text-ink font-semibold' : 'text-ink-soft'} ${c.last?.kind === 'system' ? 'italic' : ''}`}>{preview(c, user?.id)}</span>
                        {c.unread > 0 && <span className="min-w-5 h-5 px-1.5 rounded-full bg-brand text-white text-[11px] font-bold flex items-center justify-center shrink-0" aria-label={`${c.unread} unread`}>{c.unread}</span>}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>

      {/* Chat */}
      <section className={`${id ? 'flex' : 'hidden md:flex'} flex-1 min-w-0 flex-col`}>
        {id ? <Chat key={id} id={id} onChange={loadList} /> : (
          <div className="m-auto text-center px-6 text-ink-soft">
            <span className="mx-auto w-20 h-20 rounded-full bg-brand-soft text-brand flex items-center justify-center"><MessagesSquare size={36} aria-hidden="true" /></span>
            <p className="mt-4 font-semibold text-ink">Choose a conversation</p>
            <p className="text-sm mt-1">Messages are private between you and the other person.</p>
          </div>
        )}
      </section>
    </div>
  );
}

function Chat({ id, onChange }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const toast = useToast();
  const [conv, setConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState('');
  const [text, setText] = useState('');
  const [file, setFile] = useState(null);
  const [menu, setMenu] = useState(false);
  const [search, setSearch] = useState(null); // null = closed
  const [rec, setRec] = useState(null); // { recorder, chunks, started }
  const [recNow, setRecNow] = useState(0);
  const listRef = useRef(null);
  const cursor = useRef(null);
  const stick = useRef(true);
  const fileInput = useRef(null);
  const camInput = useRef(null);
  const box = useRef(null);

  const scrollDown = () => requestAnimationFrame(() => { const el = listRef.current; if (el) el.scrollTop = el.scrollHeight; });
  const merge = (incoming) => setMessages((old) => {
    const known = new Set(old.map((m) => m.id));
    const add = incoming.filter((m) => !known.has(m.id));
    return add.length ? [...old, ...add] : old;
  });

  useEffect(() => {
    let alive = true;
    api.get(`/conversations/${id}/messages`).then((r) => {
      if (!alive) return;
      setConv(r.data.conversation); setMessages(r.data.messages);
      cursor.current = r.data.messages.at(-1)?.createdAt || r.data.serverTime;
      scrollDown(); onChange?.();
    }).catch((e) => setError(errorMessage(e)));
    const t = setInterval(async () => {
      if (document.hidden || !cursor.current) return;
      try {
        const r = await api.get(`/conversations/${id}/messages`, { params: { after: cursor.current } });
        if (!alive) return;
        setConv(r.data.conversation);
        if (r.data.messages.length) {
          cursor.current = r.data.messages.at(-1).createdAt;
          merge(r.data.messages);
          if (stick.current) scrollDown();
          onChange?.();
        }
      } catch { /* offline: try again on the next tick */ }
    }, POLL_MS);
    return () => { alive = false; clearInterval(t); };
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (!rec) return undefined; const t = setInterval(() => setRecNow(Date.now()), 250); return () => clearInterval(t); }, [rec]);

  const send = async (payload = {}) => {
    const body = { text: payload.text ?? text.trim(), file: payload.file ?? file };
    if (!body.text && !body.file) return;
    const temp = { id: `tmp-${Date.now()}`, kind: 'text', text: body.text, senderId: user.id, createdAt: new Date().toISOString(), pending: true,
      file: body.file ? { name: body.file.name, type: body.file.type, size: body.file.size, local: URL.createObjectURL(body.file) } : null, retry: body };
    setMessages((m) => [...m, temp]); setText(''); setFile(null); stick.current = true; scrollDown();
    if (box.current) box.current.style.height = '';
    try {
      let r;
      if (body.file) {
        const fd = new FormData();
        fd.append('text', body.text || '');
        fd.append('file', body.file, body.file.name);
        r = await api.post(`/conversations/${id}/messages`, fd);
      } else r = await api.post(`/conversations/${id}/messages`, { text: body.text });
      const real = { ...r.data.message, localFile: temp.file?.local };
      setMessages((m) => (m.some((x) => x.id === real.id) ? m.filter((x) => x.id !== temp.id) : m.map((x) => (x.id === temp.id ? real : x))));
      cursor.current = real.createdAt > (cursor.current || '') ? real.createdAt : cursor.current;
      onChange?.();
    } catch (e) {
      setMessages((m) => m.map((x) => (x.id === temp.id ? { ...x, pending: false, failed: errorMessage(e) } : x)));
    }
  };
  const retry = (m) => { setMessages((all) => all.filter((x) => x.id !== m.id)); send(m.retry); };

  const pick = (e) => {
    const f = e.target.files?.[0]; e.target.value = '';
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) { toast.error('This file is bigger than 10 MB. Please choose a smaller one.'); return; }
    setFile(f); box.current?.focus();
  };

  const startRec = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') { toast.error('Voice messages do not work in this browser. Please type your message.'); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];
      recorder.ondataavailable = (ev) => ev.data.size && chunks.push(ev.data);
      recorder.start();
      setRec({ recorder, chunks, started: Date.now(), stream }); setRecNow(Date.now());
    } catch { toast.error('Please allow the microphone to record a voice message.'); }
  };
  const stopRec = (keep) => {
    if (!rec) return;
    const { recorder, chunks, stream } = rec;
    recorder.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      if (keep && chunks.length) {
        const type = (recorder.mimeType || 'audio/webm').split(';')[0];
        const ext = type.includes('mp4') ? 'm4a' : type.includes('ogg') ? 'ogg' : 'webm';
        send({ text: '', file: new File(chunks, `voice-message.${ext}`, { type }) });
      }
    };
    recorder.stop(); setRec(null);
  };

  const exportChat = async () => {
    setMenu(false);
    try {
      const r = await api.get(`/conversations/${id}/export`, { responseType: 'blob' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(r.data);
      a.download = `inuka-chat-${conv.with.firstName.toLowerCase()}.txt`;
      a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      toast.success('Chat downloaded.');
    } catch (e) { toast.error(errorMessage(e)); }
  };
  const clearChat = async () => {
    setMenu(false);
    const ok = await confirm({ title: 'Clear this chat?', message: `The messages disappear from your screen only. ${conv.with.firstName} still has them.`, confirmLabel: 'Yes, clear chat', tone: 'danger' });
    if (!ok) return;
    try { await api.post(`/conversations/${id}/clear`); setMessages([]); toast.success('Chat cleared.'); onChange?.(); } catch (e) { toast.error(errorMessage(e)); }
  };

  const shown = useMemo(() => {
    if (!search) return messages;
    const s = search.toLowerCase();
    return messages.filter((m) => (m.text || '').toLowerCase().includes(s) || (m.file?.name || '').toLowerCase().includes(s));
  }, [messages, search]);

  if (error) return <div className="p-6"><Alert>{error}</Alert></div>;
  if (!conv) return <div className="p-6"><ListRowsSkeleton rows={6} /></div>;
  const other = conv.with;
  const readAt = conv.otherReadAt ? new Date(conv.otherReadAt) : null;
  const sessionsLink = user.role === 'student' ? '/mentorship?tab=sessions' : '/mentor/sessions';
  const next = conv.sessions?.find((s) => ['pending', 'confirmed'].includes(s.status) && new Date(s.scheduledAt) > Date.now() - 3600e3);

  return (
    <>
      <header className="flex items-center gap-2 px-3 sm:px-5 h-[72px] border-b border-line shrink-0">
        <button type="button" onClick={() => navigate('/messages')} className="md:hidden w-11 h-11 -ml-1 rounded-full flex items-center justify-center hover:bg-brand-soft" aria-label="Back to conversations"><ArrowLeft size={22} /></button>
        <PersonPhoto person={other} className="w-11 h-11 rounded-full shrink-0 text-base" />
        <div className="flex-1 min-w-0 ml-1">
          <h2 className="font-bold text-lg leading-tight truncate">{other.firstName} {other.lastName}</h2>
          <p className="text-xs text-ink-soft truncate">{subtitle(other)}</p>
        </div>
        <button type="button" onClick={() => setSearch(search === null ? '' : null)} aria-pressed={search !== null} aria-label="Search in this chat" className="w-11 h-11 rounded-full flex items-center justify-center hover:bg-brand-soft"><Search size={21} /></button>
        <div className="relative">
          <button type="button" onClick={() => setMenu(!menu)} aria-expanded={menu} aria-label="Chat options" className="w-11 h-11 rounded-full flex items-center justify-center hover:bg-brand-soft"><span className="w-7 h-7 rounded-full border-2 border-ink flex items-center justify-center"><MoreHorizontal size={15} /></span></button>
          {menu && (
            <div role="menu" className="absolute right-0 top-12 z-20 w-52 rounded-2xl bg-surface border border-line shadow-xl py-2">
              <Link role="menuitem" to={sessionsLink} className="flex items-center gap-3 px-4 py-2.5 hover:bg-brand-soft"><Clock3 size={17} aria-hidden="true" />Sessions</Link>
              <button role="menuitem" type="button" onClick={exportChat} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-brand-soft"><Download size={17} aria-hidden="true" />Export chat</button>
              <button role="menuitem" type="button" onClick={clearChat} className="w-full flex items-center gap-3 px-4 py-2.5 text-danger hover:bg-danger-soft"><Trash2 size={17} aria-hidden="true" />Clear chat</button>
            </div>
          )}
        </div>
      </header>
      {search !== null && (
        <div className="px-4 py-2 border-b border-line bg-paper flex items-center gap-2">
          <Search size={16} className="text-ink-soft" aria-hidden="true" />
          <input autoFocus value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search messages" aria-label="Search messages" className="flex-1 bg-transparent min-h-9 focus:outline-none" />
          <span className="text-xs text-ink-soft">{search ? `${shown.length} found` : ''}</span>
          <button type="button" onClick={() => setSearch(null)} aria-label="Close search" className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-brand-soft"><X size={16} /></button>
        </div>
      )}
      {next && (
        <Link to={user.role === 'student' ? `/mentorship/sessions/${next.id}` : '/mentor/sessions'} className="flex items-center gap-2 px-4 py-2 text-sm bg-brand-soft/60 border-b border-line text-brand hover:bg-brand-soft">
          <Clock3 size={15} aria-hidden="true" /><span className="truncate"><b>{next.status === 'pending' ? 'Requested' : 'Next session'}:</b> {next.topic}, {dayLabel(next.scheduledAt)} at {clock(next.scheduledAt)}</span>
        </Link>
      )}

      <div ref={listRef} onScroll={(e) => { const el = e.currentTarget; stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120; }}
        className="flex-1 overflow-y-auto px-3 sm:px-6 py-4" aria-live="polite" aria-label={`Messages with ${other.firstName}`}>
        {shown.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center text-ink-soft px-6">
            <PersonPhoto person={other} className="w-20 h-20 rounded-full text-2xl" />
            <p className="mt-3 font-semibold text-ink">{search ? 'No message matches your search' : `Say hello to ${other.firstName}`}</p>
            {!search && <p className="text-sm mt-1 max-w-xs">Ask a question, share your essay or a document. Only the two of you can see these messages.</p>}
          </div>
        )}
        {shown.map((m, i) => {
          const prev = shown[i - 1];
          const newDay = !prev || new Date(prev.createdAt).toDateString() !== new Date(m.createdAt).toDateString();
          const mine = m.senderId === user.id;
          const grouped = !newDay && prev && prev.kind !== 'system' && prev.senderId === m.senderId && new Date(m.createdAt) - new Date(prev.createdAt) < 5 * 60000;
          return (
            <div key={m.id}>
              {newDay && <p className="my-4 text-center"><span className="inline-block rounded-md bg-paper border border-line px-2.5 py-1 text-[11px] font-semibold text-ink-soft">{dayLabel(m.createdAt)}</span></p>}
              {m.kind === 'system' ? (
                <p className="my-3 text-center"><span className="inline-block max-w-[90%] rounded-lg bg-paper border border-line px-3 py-1.5 text-xs text-ink-soft">{m.text}</span></p>
              ) : (
                <Bubble m={m} mine={mine} grouped={grouped} read={mine && readAt && readAt >= new Date(m.createdAt)} convId={id} onRetry={() => retry(m)} highlight={search} />
              )}
            </div>
          );
        })}
      </div>

      {/* Composer */}
      <div className="shrink-0 border-t border-line px-3 sm:px-5 py-3 bg-surface">
        {file && (
          <div className="mb-2 flex items-center gap-3 rounded-2xl bg-paper border border-line p-2 pr-3">
            {file.type.startsWith('image/') ? <img src={URL.createObjectURL(file)} alt="" className="w-12 h-12 rounded-xl object-cover" /> : <span className="w-12 h-12 rounded-xl bg-brand-soft text-brand flex items-center justify-center"><FileText size={22} aria-hidden="true" /></span>}
            <span className="flex-1 min-w-0"><span className="block text-sm font-semibold truncate">{file.name}</span><span className="block text-xs text-ink-soft">{sizeText(file.size)} · add a message or press send</span></span>
            <button type="button" onClick={() => setFile(null)} aria-label="Remove file" className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-brand-soft"><X size={16} /></button>
          </div>
        )}
        {rec ? (
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => stopRec(false)} aria-label="Cancel recording" className="w-12 h-12 rounded-full flex items-center justify-center text-danger hover:bg-danger-soft"><Trash2 size={20} /></button>
            <div className="flex-1 min-h-12 rounded-full border-2 border-danger/40 bg-danger-soft/40 flex items-center gap-3 px-4">
              <span className="w-2.5 h-2.5 rounded-full bg-danger animate-pulse" aria-hidden="true" />
              <span className="font-semibold tabular-nums" role="timer">{Math.floor((recNow - rec.started) / 60000)}:{String(Math.floor(((recNow - rec.started) / 1000) % 60)).padStart(2, '0')}</span>
              <span className="text-sm text-ink-soft truncate">Recording a voice message…</span>
            </div>
            <button type="button" onClick={() => stopRec(true)} aria-label="Send voice message" className="w-12 h-12 rounded-full bg-brand text-white flex items-center justify-center shadow-md hover:bg-brand-dark"><SendHorizontal size={20} /></button>
          </div>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex items-end gap-2.5">
            <div className="flex-1 min-w-0 flex items-end rounded-[26px] border-2 border-line focus-within:border-brand bg-surface pl-2 pr-1.5 transition-colors">
              <textarea ref={box} rows={1} value={text} placeholder="Type a message"
                onChange={(e) => { setText(e.target.value); e.target.style.height = ''; e.target.style.height = `${Math.min(e.target.scrollHeight, 140)}px`; }}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && window.matchMedia('(min-width: 768px)').matches) { e.preventDefault(); send(); } }}
                aria-label={`Message to ${other.firstName}`} className="flex-1 min-w-0 resize-none bg-transparent px-2 py-3 max-h-36 focus:outline-none" />
              <input ref={fileInput} type="file" className="sr-only" tabIndex={-1} accept="image/*,.pdf,.docx" onChange={pick} />
              <input ref={camInput} type="file" className="sr-only" tabIndex={-1} accept="image/*" capture="environment" onChange={pick} />
              <button type="button" onClick={() => fileInput.current?.click()} aria-label="Attach a picture or document" className="w-10 h-10 mb-1 rounded-full flex items-center justify-center text-brand hover:bg-brand-soft"><Paperclip size={19} /></button>
              <button type="button" onClick={() => camInput.current?.click()} aria-label="Take a photo" className="w-10 h-10 mb-1 rounded-full flex items-center justify-center text-brand hover:bg-brand-soft"><Camera size={19} /></button>
            </div>
            {text.trim() || file ? (
              <button type="submit" aria-label="Send" className="w-[52px] h-[52px] shrink-0 rounded-full bg-brand text-white flex items-center justify-center shadow-[0_8px_20px_-8px_rgba(7,41,77,0.7)] hover:bg-brand-dark"><SendHorizontal size={21} /></button>
            ) : (
              <button type="button" onClick={startRec} aria-label="Record a voice message" className="w-[52px] h-[52px] shrink-0 rounded-full bg-brand text-white flex items-center justify-center shadow-[0_8px_20px_-8px_rgba(7,41,77,0.7)] hover:bg-brand-dark"><Mic size={21} /></button>
            )}
          </form>
        )}
      </div>
    </>
  );
}

function mark(text, q) {
  if (!q || !text) return text;
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return text;
  return <>{text.slice(0, i)}<mark className="bg-accent text-night rounded-sm">{text.slice(i, i + q.length)}</mark>{text.slice(i + q.length)}</>;
}

function Bubble({ m, mine, grouped, read, convId, onRetry, highlight }) {
  const linkify = (t) => t.split(/(https?:\/\/[^\s]+)/g).map((part, i) => (/^https?:\/\//.test(part)
    ? <a key={i} href={part} target="_blank" rel="noreferrer" className="underline break-all">{part}</a> : <span key={i}>{mark(part, highlight)}</span>));
  const isImage = m.file?.type?.startsWith('image/');
  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'} ${grouped ? 'mt-1' : 'mt-3'}`}>
      <div className={`max-w-[82%] sm:max-w-[70%] rounded-[22px] ${isImage && !m.text ? 'p-1.5' : 'px-4 py-2.5'} shadow-sm
        ${mine ? `bg-brand text-white ${grouped ? '' : 'rounded-br-md'}` : `bg-brand-soft text-ink ${grouped ? '' : 'rounded-bl-md'}`}
        ${m.failed ? 'opacity-80 ring-2 ring-danger' : ''}`}>
        {m.file && <Attachment m={m} convId={convId} mine={mine} />}
        {m.text && <p className={`whitespace-pre-wrap break-words text-[15px] leading-relaxed ${m.file ? 'mt-2 px-1' : ''}`}>{linkify(m.text)}</p>}
        <p className={`flex items-center justify-end gap-1 text-[11px] mt-1 ${isImage && !m.text ? 'px-2 pb-0.5' : ''} ${mine ? 'text-white/75' : 'text-ink-soft'}`}>
          {clock(m.createdAt)}
          {mine && (m.pending ? <Clock3 size={13} aria-label="Sending" /> : m.failed ? null : read
            ? <CheckCheck size={15} className="text-accent" aria-label="Read" /> : <Check size={15} aria-label="Sent" />)}
        </p>
        {m.failed && (
          <button type="button" onClick={onRetry} className="mt-1 inline-flex items-center gap-1 text-xs font-semibold underline">
            <RotateCcw size={12} aria-hidden="true" />Not sent. Tap to try again
          </button>
        )}
      </div>
    </div>
  );
}

// Files are private: they are loaded with the user's sign-in, then shown.
const blobCache = new Map();
function useFileUrl(m, convId) {
  const [url, setUrl] = useState(m.file?.local || m.localFile || blobCache.get(m.id) || null);
  useEffect(() => {
    if (url || m.pending || !m.file) return;
    let alive = true;
    api.get(`/conversations/${convId}/files/${m.id}`, { responseType: 'blob' }).then((r) => {
      const u = URL.createObjectURL(r.data); blobCache.set(m.id, u);
      if (alive) setUrl(u);
    }).catch(() => {});
    return () => { alive = false; };
  }, [m.id, convId, url, m.pending, m.file]);
  return url;
}

function Attachment({ m, convId, mine }) {
  const url = useFileUrl(m, convId);
  const [zoom, setZoom] = useState(false);
  const t = m.file.type || '';
  if (t.startsWith('image/')) {
    return (
      <>
        <button type="button" onClick={() => url && setZoom(true)} className="block" aria-label={`Open picture ${m.file.name}`}>
          {url ? <img src={url} alt={m.file.name} className="rounded-[18px] max-h-72 w-auto max-w-full sm:max-w-[320px] object-cover" />
            : <span className="block w-56 h-40 rounded-[18px] bg-white/20 animate-pulse" />}
        </button>
        {zoom && (
          <div role="dialog" aria-label={m.file.name} className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4" onClick={() => setZoom(false)}>
            <img src={url} alt={m.file.name} className="max-h-full max-w-full rounded-lg" />
            <button type="button" className="absolute top-4 right-4 w-11 h-11 rounded-full bg-white/15 text-white flex items-center justify-center" aria-label="Close"><X /></button>
          </div>
        )}
      </>
    );
  }
  if (t.startsWith('audio/')) {
    return (
      <div className="flex items-center gap-2 min-w-[220px]">
        <Mic size={18} className={mine ? 'text-accent' : 'text-brand'} aria-hidden="true" />
        {url ? <audio controls src={url} preload="metadata" className="h-10 w-full max-w-[240px]"><track kind="captions" /></audio> : <span className="text-sm">Loading voice message…</span>}
      </div>
    );
  }
  return (
    <a href={url || undefined} download={m.file.name} className={`flex items-center gap-3 rounded-2xl p-2 pr-3 ${mine ? 'bg-white/10 hover:bg-white/20' : 'bg-surface hover:bg-paper'}`}>
      <span className={`w-10 h-10 rounded-xl flex items-center justify-center ${mine ? 'bg-white/15' : 'bg-brand-soft text-brand'}`}><FileText size={20} aria-hidden="true" /></span>
      <span className="min-w-0"><span className="block text-sm font-semibold truncate max-w-[180px]">{m.file.name}</span><span className={`block text-xs ${mine ? 'text-white/70' : 'text-ink-soft'}`}>{sizeText(m.file.size || 0)} · Download</span></span>
    </a>
  );
}
