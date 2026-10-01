import { useEffect, useState } from 'react';
import { MessageSquarePlus, Trash2 } from 'lucide-react';
import ChatPanel, { AiAvatar } from '../../components/ai/ChatPanel';
import { api } from '../../services/api';
import { timeAgo } from '../../utils/format';

// Full-page INUKA AI (spec 13.2), with saved conversations (spec 13.6).
export default function InukaAI() {
  const [conversations, setConversations] = useState([]);
  const [active, setActive] = useState(null);
  const [chatKey, setChatKey] = useState(0);
  const load = () => api.get('/ai/conversations').then((r) => setConversations(r.data.conversations)).catch(() => {});
  useEffect(() => { document.title = 'INUKA AI — INUKA'; load(); }, []);

  const startNew = () => { setActive(null); setChatKey((k) => k + 1); };
  const remove = async (id) => {
    if (!window.confirm('Delete this conversation?')) return;
    await api.delete(`/ai/conversations/${id}`);
    if (active === id) startNew();
    load();
  };

  return (
    <div className="grid lg:grid-cols-[260px_1fr] gap-6 h-[calc(100vh-9rem)] min-h-[520px]">
      <aside className="hidden lg:flex flex-col bg-surface rounded-2xl border border-line overflow-hidden" aria-label="Your conversations">
        <div className="p-3 border-b border-line">
          <button type="button" onClick={startNew} className="w-full min-h-11 rounded-lg bg-brand text-white font-semibold inline-flex items-center justify-center gap-2 hover:bg-brand-dark">
            <MessageSquarePlus size={18} aria-hidden="true" />New conversation
          </button>
        </div>
        <ul className="flex-1 overflow-y-auto p-2 space-y-1">
          {conversations.length === 0 && <li className="p-3 text-sm text-ink-soft">Your conversations are saved here.</li>}
          {conversations.map((c) => (
            <li key={c.id} className={`group flex items-center rounded-lg ${active === c.id ? 'bg-brand-soft' : 'hover:bg-paper'}`}>
              <button type="button" onClick={() => setActive(c.id)} className="flex-1 min-w-0 text-left px-3 py-2">
                <span className="block text-sm font-medium truncate">{c.title || 'Conversation'}</span>
                <span className="block text-xs text-ink-soft">{timeAgo(c.updatedAt)}</span>
              </button>
              <button type="button" onClick={() => remove(c.id)} aria-label={`Delete conversation: ${c.title || 'Conversation'}`}
                className="w-10 h-10 shrink-0 rounded-lg text-ink-soft opacity-60 group-hover:opacity-100 hover:text-danger flex items-center justify-center"><Trash2 size={16} /></button>
            </li>
          ))}
        </ul>
      </aside>
      <section className="flex flex-col bg-paper rounded-2xl border border-line overflow-hidden min-h-0">
        <header className="flex items-center gap-3 px-4 py-3 bg-surface border-b border-line">
          <AiAvatar size={40} />
          <div className="min-w-0">
            <h1 className="text-lg font-bold leading-tight">INUKA AI — Your Learning Guide</h1>
            <p className="text-xs text-ink-soft">Scholarships, English, computer skills and university applications</p>
          </div>
          <button type="button" onClick={startNew} className="lg:hidden ml-auto w-11 h-11 rounded-lg hover:bg-brand-soft flex items-center justify-center" aria-label="New conversation"><MessageSquarePlus size={20} /></button>
        </header>
        <div className="flex-1 min-h-0">
          <ChatPanel key={`${active || 'new'}-${chatKey}`} conversationId={active} onConversation={(id) => { setActive(id); load(); }} />
        </div>
      </section>
    </div>
  );
}
