import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Maximize2, RotateCcw, X } from 'lucide-react';
import ChatPanel, { AiAvatar, clearGuestChat } from './ChatPanel';
import { useAuth } from '../../context/AuthContext';

// Floating INUKA AI button, bottom-right, on dashboards and public pages. Free for everyone.
// `className` places it (public pages put it below the share / back-to-top buttons).
export default function ChatBubble({ className = 'right-4 bottom-20 md:bottom-6' }) {
  const { user } = useAuth();
  const student = user?.role === 'student';
  const [open, setOpen] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [resetKey, setResetKey] = useState(0);
  const restart = () => { if (student) setConversationId(null); else clearGuestChat(); setResetKey((k) => k + 1); };

  return (
    <div className={`fixed z-40 flex flex-col items-end gap-3 ${className}`}>
      {open && (
        <section role="dialog" aria-label="INUKA AI" className="w-[min(380px,calc(100vw-2rem))] h-[min(580px,calc(100vh-8rem))] bg-paper rounded-2xl border border-line shadow-[0_20px_50px_-20px_rgba(7,41,77,0.5)] flex flex-col overflow-hidden toast-in">
          <header className="flex items-center gap-3 px-3 py-2.5 bg-brand text-white">
            <span className="rounded-full ring-2 ring-white/70 shrink-0"><AiAvatar size={36} /></span>
            <p className="font-semibold text-sm leading-tight flex-1 text-white">
              INUKA AI — Your Learning Guide
              <span className="block text-xs font-normal text-white/80">Free · available 24/7</span>
            </p>
            <button type="button" onClick={restart} className="w-9 h-9 rounded-lg hover:bg-white/15 flex items-center justify-center" aria-label="New chat" title="New chat"><RotateCcw size={16} /></button>
            {student && <Link to="/ai" onClick={() => setOpen(false)} className="w-9 h-9 rounded-lg hover:bg-white/15 flex items-center justify-center" aria-label="Open full page" title="Open full page"><Maximize2 size={16} /></Link>}
            <button type="button" onClick={() => setOpen(false)} className="w-9 h-9 rounded-lg hover:bg-white/15 flex items-center justify-center" aria-label="Minimise INUKA AI"><X size={18} /></button>
          </header>
          <div className="flex-1 min-h-0">
            <ChatPanel key={resetKey} compact conversationId={conversationId} onConversation={setConversationId} />
          </div>
        </section>
      )}
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label={open ? 'Close INUKA AI' : 'Ask INUKA AI (free)'}
        className="group relative w-14 h-14 rounded-full bg-brand text-white shadow-[0_12px_30px_-10px_rgba(7,41,77,0.7)] flex items-center justify-center hover:bg-brand-dark transition-colors">
        {open ? <X size={24} aria-hidden="true" /> : <AiAvatar size={56} />}
        {!open && <span className="absolute -top-1 -right-1 rounded-full bg-accent text-night text-[10px] font-bold px-1.5 py-0.5 ring-2 ring-white" aria-hidden="true">AI</span>}
        {!open && (
          <span className="pointer-events-none absolute right-[calc(100%+10px)] top-1/2 -translate-y-1/2 whitespace-nowrap rounded-full bg-night text-white text-xs font-semibold px-3 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block">
            Ask INUKA AI · free
          </span>
        )}
      </button>
    </div>
  );
}
