import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Maximize2, X } from 'lucide-react';
import ChatPanel, { AiAvatar } from './ChatPanel';

// Floating INUKA AI bubble, bottom-right, minimised by default (spec 13.2).
export default function ChatBubble() {
  const [open, setOpen] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  return (
    <div className="fixed right-4 bottom-20 md:bottom-6 z-30 flex flex-col items-end gap-3">
      {open && (
        <section role="dialog" aria-label="INUKA AI" className="w-[min(380px,calc(100vw-2rem))] h-[min(560px,calc(100vh-9rem))] bg-paper rounded-2xl border border-line shadow-[0_20px_50px_-20px_rgba(15,30,61,0.45)] flex flex-col overflow-hidden">
          <header className="flex items-center gap-3 px-3 py-2.5 bg-white border-b border-line">
            <AiAvatar size={34} />
            <p className="font-semibold text-sm leading-tight flex-1">INUKA AI<span className="block text-xs font-normal text-ink-soft">Your Learning Guide</span></p>
            <Link to="/ai" onClick={() => setOpen(false)} className="w-10 h-10 rounded-lg hover:bg-brand-soft flex items-center justify-center" aria-label="Open full page"><Maximize2 size={17} /></Link>
            <button type="button" onClick={() => setOpen(false)} className="w-10 h-10 rounded-lg hover:bg-brand-soft flex items-center justify-center" aria-label="Minimise INUKA AI"><X size={19} /></button>
          </header>
          <div className="flex-1 min-h-0"><ChatPanel compact conversationId={conversationId} onConversation={setConversationId} /></div>
        </section>
      )}
      {!open && (
        <button type="button" onClick={() => setOpen(true)} aria-label="Open INUKA AI"
          className="w-14 h-14 rounded-full bg-brand text-white shadow-[0_12px_30px_-10px_rgba(10,108,240,0.7)] flex items-center justify-center hover:bg-brand-dark">
          <AiAvatar size={56} />
        </button>
      )}
    </div>
  );
}
