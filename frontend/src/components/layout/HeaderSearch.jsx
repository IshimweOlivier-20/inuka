import { useEffect, useId, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

const PLACEHOLDER = {
  student: 'Search courses, lessons, scholarships, mentors…',
  mentor: 'Search your sessions, scholarships, courses…',
  admin: 'Search people, courses, lessons, scholarships…',
};

// Search bar at the top of every dashboard. Arrow keys move through results, Enter opens, Esc closes.
// Press "/" anywhere to jump to it.
export default function HeaderSearch() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [q, setQ] = useState('');
  const [groups, setGroups] = useState(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);
  const inputRef = useRef(null);
  const boxRef = useRef(null);
  const listId = useId();

  const items = (groups || []).flatMap((g) => g.items);

  useEffect(() => {
    if (q.trim().length < 2) { setGroups(null); return undefined; }
    let alive = true;
    const t = setTimeout(() => {
      api.get('/search', { params: { q } }).then((r) => { if (alive) { setGroups(r.data.groups); setActive(0); } }).catch(() => alive && setGroups([]));
    }, 220);
    return () => { alive = false; clearTimeout(t); };
  }, [q]);

  useEffect(() => { setOpen(false); setMobileOpen(false); setQ(''); }, [pathname]);
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName) && !document.activeElement?.isContentEditable) {
        e.preventDefault(); setMobileOpen(true); setTimeout(() => inputRef.current?.focus(), 0);
      }
    };
    const onClick = (e) => { if (!boxRef.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onClick); };
  }, []);

  const go = (item) => { if (item) navigate(item.to); };
  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive((a) => Math.min(a + 1, items.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    if (e.key === 'Enter') { e.preventDefault(); go(items[active]); }
    if (e.key === 'Escape') { setOpen(false); setMobileOpen(false); inputRef.current?.blur(); }
  };

  let index = -1;
  const showList = open && q.trim().length >= 2;
  return (
    <>
      <button type="button" onClick={() => { setMobileOpen(true); setTimeout(() => inputRef.current?.focus(), 0); }}
        className="sm:hidden min-w-11 min-h-11 inline-flex items-center justify-center rounded-full hover:bg-brand-soft" aria-label="Search">
        <Search size={22} />
      </button>
      <div ref={boxRef} className={`${mobileOpen ? 'fixed inset-x-0 top-0 z-50 p-3 bg-paper border-b border-line' : 'hidden'} sm:static sm:block sm:p-0 sm:bg-transparent sm:border-0 sm:flex-1 sm:max-w-xl`}>
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft pointer-events-none" aria-hidden="true" />
          <input
            ref={inputRef} type="search" value={q} placeholder={PLACEHOLDER[user?.role] || PLACEHOLDER.student}
            onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} onKeyDown={onKeyDown}
            role="combobox" aria-expanded={showList} aria-controls={listId} aria-autocomplete="list" aria-label="Search INUKA"
            aria-activedescendant={showList && items[active] ? `${listId}-${active}` : undefined}
            className="w-full min-h-11 rounded-full border border-line bg-white pl-10 pr-10 text-[15px] focus:outline-none focus:ring-2 focus:ring-brand"
          />
          {mobileOpen && (
            <button type="button" onClick={() => { setMobileOpen(false); setOpen(false); }} className="sm:hidden absolute right-1 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center" aria-label="Close search"><X size={20} /></button>
          )}
          {showList && (
            <div id={listId} role="listbox" aria-label="Search results"
              className="absolute left-0 right-0 mt-2 max-h-[70vh] overflow-y-auto rounded-xl bg-white border border-line shadow-[0_18px_40px_-20px_rgba(15,30,61,0.45)] z-50">
              {groups === null ? <p className="px-4 py-3 text-sm text-ink-soft">Searching…</p>
                : groups.length === 0 ? <p className="px-4 py-3 text-sm text-ink-soft">Nothing found for “{q}”.</p>
                  : groups.map((g) => (
                    <div key={g.label} role="group" aria-label={g.label} className="py-1">
                      <p className="px-4 pt-2 pb-1 text-xs font-semibold uppercase tracking-wide text-ink-soft">{g.label}</p>
                      {g.items.map((item) => {
                        index += 1;
                        const i = index;
                        return (
                          <div key={`${g.label}-${item.id}`} id={`${listId}-${i}`} role="option" aria-selected={active === i}
                            onMouseEnter={() => setActive(i)} onMouseDown={(e) => { e.preventDefault(); go(item); }}
                            className={`px-4 py-2 cursor-pointer ${active === i ? 'bg-brand-soft' : ''}`}>
                            <p className="font-medium text-[15px] truncate">{item.title}</p>
                            {item.subtitle && <p className="text-xs text-ink-soft truncate">{item.subtitle}</p>}
                          </div>
                        );
                      })}
                    </div>
                  ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
