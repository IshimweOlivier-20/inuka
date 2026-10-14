import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Check, Heart, Link2, MessageCircle, Search, Share2, Trash2, X } from 'lucide-react';
import { sanitizeRich, plainText } from '../../utils/sanitize';
import PublicShell from '../../components/landing/PublicShell';
import { CATEGORY_LABEL } from '../../components/landing/common';
import { PostCard } from '../../components/landing/Sections';
import { ICONS } from '../../components/landing/socialIcons';
import { Alert, Button } from '../../components/ui';
import { Skeleton } from '../../components/ui/Skeletons';
import { PersonPhoto } from '../../components/mentorship/SessionCard';
import { useAuth } from '../../context/AuthContext';
import { useConfirm, useToast } from '../../context/FeedbackContext';
import { postPhoto } from '../../config/photos';
import { api, errorMessage } from '../../services/api';
import { formatDate } from '../../utils/format';

const TYPES = [['', 'All'], ['guide', 'Guides'], ['news', 'News'], ['story', 'Student stories']];
const ago = (d) => {
  const s = Math.round((Date.now() - new Date(d)) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  if (s < 7 * 86400) return `${Math.floor(s / 86400)} d ago`;
  return formatDate(d);
};
const ROLE_TAG = { mentor: ['Mentor', 'bg-brand-soft text-brand'], admin: ['INUKA team', 'bg-accent text-night'] };

const CardSkeleton = () => (
  <li><Skeleton height={190} borderRadius={16} /><Skeleton width={140} className="mt-4" /><Skeleton height={22} className="mt-2" /><Skeleton count={2} /></li>
);

/* ---------- /news ---------- */
export function NewsList() {
  const [category, setCategory] = useState('');
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('latest');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { document.title = 'News & guides — INUKA'; }, []);
  useEffect(() => { const t = setTimeout(() => setQuery(q.trim()), 300); return () => clearTimeout(t); }, [q]);
  useEffect(() => {
    let alive = true;
    setData(null); setError('');
    api.get('/public/posts', { params: { ...(category && { category }), ...(query && { q: query }), sort } })
      .then((r) => alive && setData(r.data)).catch((e) => alive && setError(errorMessage(e)));
    return () => { alive = false; };
  }, [category, query, sort]);

  const filtered = category || query || sort !== 'latest';
  const posts = data?.posts || [];
  const featured = !filtered ? posts[0] : null;
  const rest = featured ? posts.slice(1) : posts;
  const total = data ? Object.values(data.counts).reduce((a, b) => a + b, 0) : 0;

  return (
    <PublicShell>
      <section className="max-w-[1200px] mx-auto px-5 pt-10 md:pt-14">
        <h1 className="text-3xl md:text-[2.6rem] font-bold leading-tight">News & guides</h1>
        <p className="text-lg text-ink-soft mt-2 max-w-2xl">Step-by-step guides for your scholarship applications, stories from students, and the latest from INUKA.</p>

        {featured && <Featured p={featured} />}

        {/* Filters */}
        <div className="mt-10 flex flex-col lg:flex-row lg:items-center gap-3 border-b border-line pb-4">
          <div role="tablist" aria-label="Type" className="flex gap-1.5 overflow-x-auto -mx-1 px-1 pb-1">
            {TYPES.map(([k, l]) => {
              const n = k ? data?.counts[k] || 0 : total;
              return (
                <button key={k} role="tab" aria-selected={category === k} onClick={() => setCategory(k)}
                  className={`shrink-0 min-h-11 px-4 rounded-full text-[15px] font-semibold border transition-colors ${category === k ? 'bg-brand text-white border-brand' : 'bg-surface border-line text-ink hover:border-brand'}`}>
                  {l}{data && <span className={`ml-1.5 text-xs ${category === k ? 'text-white/75' : 'text-ink-soft'}`}>{n}</span>}
                </button>
              );
            })}
          </div>
          <div className="flex gap-2 lg:ml-auto">
            <label className="relative flex-1 lg:w-72">
              <span className="sr-only">Search articles</span>
              <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-soft" aria-hidden="true" />
              <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search articles" className="w-full min-h-11 rounded-full border border-line bg-surface pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-brand/30" />
            </label>
            <label>
              <span className="sr-only">Sort</span>
              <select value={sort} onChange={(e) => setSort(e.target.value)} className="min-h-11 rounded-full border border-line bg-surface px-4 font-medium">
                <option value="latest">Latest</option><option value="popular">Most liked</option>
              </select>
            </label>
          </div>
        </div>
      </section>

      <section className="max-w-[1200px] mx-auto px-5 py-10 md:py-12">
        {error && <Alert>{error}</Alert>}
        {!data && !error && <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-10" aria-label="Loading articles">{[0, 1, 2].map((i) => <CardSkeleton key={i} />)}</ul>}
        {data && posts.length === 0 && (
          <div className="text-center py-12">
            <p className="font-semibold text-lg">No article matches{query ? ` “${query}”` : ''}.</p>
            <p className="text-ink-soft mt-1">Try another word or another type.</p>
            <Button variant="outline" className="mt-4" onClick={() => { setQ(''); setCategory(''); setSort('latest'); }}>Show all articles</Button>
          </div>
        )}
        {rest.length > 0 && <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-10">{rest.map((p, i) => <PostCard key={p.id} p={p} i={i} />)}</ul>}
      </section>
    </PublicShell>
  );
}

function Featured({ p }) {
  const photo = postPhoto(p);
  return (
    <article className="group relative mt-8 grid md:grid-cols-[1.35fr_1fr] gap-6 md:gap-10 items-center">
      <div className="relative aspect-[16/10] rounded-3xl overflow-hidden bg-brand-soft">
        <img src={photo.src} alt={photo.alt} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
        <span className="absolute left-4 top-4 rounded-full bg-accent text-night px-3 py-1 text-xs font-bold shadow">Latest · {CATEGORY_LABEL[p.category]}</span>
      </div>
      <div>
        <p className="text-sm text-ink-soft">{formatDate(p.publishedAt)} · {p.readMinutes} min read</p>
        <h2 className="mt-2 text-2xl md:text-[2rem] font-bold leading-tight">
          <Link to={`/news/${p.slug}`} className="after:absolute after:inset-0 group-hover:underline decoration-accent decoration-4 underline-offset-[6px]">{p.title}</Link>
        </h2>
        <p className="mt-3 text-ink-soft text-[17px] line-clamp-4">{plainText(p.excerpt)}</p>
        <div className="mt-5 flex items-center gap-5 text-sm text-ink-soft">
          <span>By <b className="text-ink">{p.authorName}</b></span>
          <span className="inline-flex items-center gap-1.5"><Heart size={15} aria-hidden="true" />{p.likes}</span>
          <span className="inline-flex items-center gap-1.5"><MessageCircle size={15} aria-hidden="true" />{p.comments}</span>
        </div>
      </div>
    </article>
  );
}

/* ---------- /news/:slug ---------- */
export function Article() {
  const { slug } = useParams();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const commentsRef = useRef(null);
  useEffect(() => {
    setData(null); setError('');
    window.scrollTo(0, 0);
    api.get(`/public/posts/${slug}`).then((r) => { setData(r.data); document.title = `${r.data.post.title} — INUKA`; })
      .catch((e) => setError(errorMessage(e)));
  }, [slug, user?.id]);

  const html = useMemo(() => (data ? sanitizeRich(data.post.contentHtml) : ''), [data]);
  const photo = data && postPhoto(data.post);
  const setPost = (patch) => setData((d) => ({ ...d, post: { ...d.post, ...patch } }));

  return (
    <PublicShell>
      <article className="max-w-[1100px] mx-auto px-5 py-8 md:py-12">
        <nav aria-label="Breadcrumb" className="text-sm text-ink-soft">
          <Link to="/news" className="text-brand font-semibold hover:underline">News & guides</Link>
          {data && <> <span aria-hidden="true">/</span> <span>{CATEGORY_LABEL[data.post.category]}</span></>}
        </nav>
        {error && <div className="mt-6"><Alert>{error}</Alert><Button to="/news" variant="outline" className="mt-4">See all articles</Button></div>}
        {!data && !error && (
          <div aria-label="Loading article" className="mt-6 max-w-3xl"><Skeleton width={160} /><Skeleton height={44} className="mt-3" /><Skeleton width="50%" /><Skeleton height={360} className="mt-6" borderRadius={24} /><Skeleton count={6} className="mt-4" /></div>
        )}
        {data && (
          <>
            <header className="mt-5 max-w-3xl">
              <h1 className="text-3xl md:text-[2.6rem] font-bold leading-[1.15]">{data.post.title}</h1>
              <p className="text-lg text-ink-soft mt-3">{plainText(data.post.excerpt)}</p>
              <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-4">
                <div className="flex items-center gap-3">
                  <span className="w-11 h-11 rounded-full bg-brand text-white font-display font-bold flex items-center justify-center" aria-hidden="true">{data.post.authorName.split(' ').map((w) => w[0]).join('').slice(0, 2)}</span>
                  <div className="leading-tight"><p className="font-semibold">{data.post.authorName}</p><p className="text-sm text-ink-soft">{formatDate(data.post.publishedAt)} · {data.post.readMinutes} min read</p></div>
                </div>
                <Reactions post={data.post} slug={slug} onChange={setPost} onComments={() => commentsRef.current?.scrollIntoView({ behavior: 'smooth' })} />
              </div>
            </header>

            <figure className="mt-8 rounded-3xl overflow-hidden aspect-[16/8] bg-brand-soft">
              <img src={photo.src} alt={photo.alt} className="w-full h-full object-cover" />
            </figure>

            <div className="mt-10 grid lg:grid-cols-[1fr_300px] gap-10 items-start">
              <div className="min-w-0">
                <div className="lesson-prose" dangerouslySetInnerHTML={{ __html: html }} />
                <div className="mt-10 rounded-2xl border border-line bg-surface p-5 flex flex-wrap items-center gap-4">
                  <p className="font-semibold flex-1 min-w-[180px]">Was this helpful? Like it or share it with a friend who is applying.</p>
                  <Reactions post={data.post} slug={slug} onChange={setPost} onComments={() => commentsRef.current?.scrollIntoView({ behavior: 'smooth' })} />
                </div>
                <section ref={commentsRef} className="mt-12 scroll-mt-24" aria-labelledby="comments-title">
                  <Comments slug={slug} comments={data.comments} count={data.post.comments}
                    onChange={(comments) => setData((d) => ({ ...d, comments, post: { ...d.post, comments: comments.length } }))} />
                </section>
              </div>
              <aside className="lg:sticky lg:top-24 space-y-6">
                {!user && (
                  <div className="rounded-2xl bg-brand text-white p-6">
                    <p className="font-display text-xl font-bold">Ready to start?</p>
                    <p className="mt-2 text-white/85">Free courses, scholarships, mentors and a document vault, all in one place.</p>
                    <Button to="/register" variant="accent" className="mt-4 w-full">Create a free account</Button>
                  </div>
                )}
                {data.more.length > 0 && (
                  <div>
                    <h2 className="text-lg font-bold mb-3">Keep reading</h2>
                    <ul className="space-y-4">
                      {data.more.map((m) => {
                        const ph = postPhoto(m);
                        return (
                          <li key={m.slug}>
                            <Link to={`/news/${m.slug}`} className="group flex gap-3 items-center">
                              <img src={ph.src} alt="" className="w-24 h-20 rounded-xl object-cover shrink-0" loading="lazy" />
                              <span className="min-w-0"><span className="block text-xs font-semibold text-brand">{CATEGORY_LABEL[m.category]}</span><span className="block font-semibold leading-snug group-hover:underline line-clamp-2">{m.title}</span><span className="text-xs text-ink-soft">{m.readMinutes} min read</span></span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </aside>
            </div>
          </>
        )}
      </article>
    </PublicShell>
  );
}

function Reactions({ post, slug, onChange, onComments }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [share, setShare] = useState(false);
  const like = async () => {
    if (!user) { navigate('/login', { state: { from: pathname } }); return; }
    setBusy(true);
    const before = { likedByMe: post.likedByMe, likes: post.likes };
    onChange({ likedByMe: !post.likedByMe, likes: post.likes + (post.likedByMe ? -1 : 1) }); // instant
    try { const { data } = await api.post(`/public/posts/${slug}/like`); onChange({ likedByMe: data.liked, likes: data.likes }); }
    catch (e) { onChange(before); toast.error(errorMessage(e)); } finally { setBusy(false); }
  };
  const btn = 'inline-flex items-center gap-2 min-h-11 px-4 rounded-full border font-semibold text-[15px] transition-colors';
  return (
    <div className="flex flex-wrap items-center gap-2 relative">
      <button type="button" onClick={like} disabled={busy} aria-pressed={post.likedByMe} title={post.likedByMe ? 'Unlike' : 'Like'}
        className={`${btn} ${post.likedByMe ? 'bg-danger-soft border-danger/40 text-danger' : 'bg-surface border-line hover:border-danger/50 hover:text-danger'}`}>
        <Heart size={18} fill={post.likedByMe ? 'currentColor' : 'none'} aria-hidden="true" />{post.likedByMe ? 'Liked' : 'Like'}<span className="tabular-nums opacity-80">{post.likes}</span>
      </button>
      <button type="button" onClick={onComments} className={`${btn} bg-surface border-line hover:border-brand hover:text-brand`}>
        <MessageCircle size={18} aria-hidden="true" />Comment<span className="tabular-nums opacity-80">{post.comments}</span>
      </button>
      <button type="button" onClick={() => setShare(!share)} aria-expanded={share} className={`${btn} bg-surface border-line hover:border-brand hover:text-brand`}>
        <Share2 size={18} aria-hidden="true" />Share
      </button>
      {share && <ShareMenu title={post.title} onClose={() => setShare(false)} />}
    </div>
  );
}

function ShareMenu({ title, onClose }) {
  const url = window.location.href;
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const enc = encodeURIComponent;
  const links = [
    ['whatsapp', 'WhatsApp', `https://wa.me/?text=${enc(`${title} ${url}`)}`, 'bg-[#25D366]'],
    ['facebook', 'Facebook', `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`, 'bg-[#1877F2]'],
    ['x', 'X', `https://twitter.com/intent/tweet?text=${enc(title)}&url=${enc(url)}`, 'bg-black'],
    ['linkedin', 'LinkedIn', `https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}`, 'bg-[#0A66C2]'],
  ];
  const copy = async () => {
    try { await navigator.clipboard.writeText(url); setCopied(true); toast.success('Link copied.'); setTimeout(() => setCopied(false), 2000); }
    catch { toast.error('Could not copy. Please copy the address from your browser.'); }
  };
  useEffect(() => {
    const esc = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', esc); return () => window.removeEventListener('keydown', esc);
  }, [onClose]);
  return (
    <div role="dialog" aria-label="Share this article" className="absolute z-30 top-full mt-2 left-0 sm:left-auto sm:right-0 w-72 rounded-2xl bg-surface border border-line shadow-2xl p-4">
      <div className="flex items-center justify-between"><p className="font-bold">Share this article</p><button type="button" onClick={onClose} aria-label="Close" className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-brand-soft"><X size={16} /></button></div>
      <div className="mt-3 grid grid-cols-4 gap-2">
        {links.map(([k, l, href, bg]) => (
          <a key={k} href={href} target="_blank" rel="noreferrer" className="flex flex-col items-center gap-1.5 text-xs font-medium">
            <span className={`w-11 h-11 rounded-full ${bg} text-white flex items-center justify-center`}><svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">{ICONS[k]}</svg></span>{l}
          </a>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-2 rounded-full border border-line bg-paper pl-3 pr-1 py-1">
        <span className="flex-1 min-w-0 truncate text-xs text-ink-soft">{url}</span>
        <button type="button" onClick={copy} className="shrink-0 inline-flex items-center gap-1 min-h-9 px-3 rounded-full bg-brand text-white text-xs font-semibold">{copied ? <Check size={14} aria-hidden="true" /> : <Link2 size={14} aria-hidden="true" />}{copied ? 'Copied' : 'Copy link'}</button>
      </div>
      {typeof navigator !== 'undefined' && navigator.share && (
        <button type="button" onClick={() => navigator.share({ title, url }).catch(() => {})} className="mt-3 w-full min-h-10 rounded-full bg-brand-soft text-brand text-sm font-semibold">More ways to share…</button>
      )}
    </div>
  );
}

function Comments({ slug, comments, count, onChange }) {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const confirm = useConfirm();
  const toast = useToast();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const send = async (e) => {
    e.preventDefault();
    if (text.trim().length < 2) { setError('Please write your comment.'); return; }
    setBusy(true); setError('');
    try { const { data } = await api.post(`/public/posts/${slug}/comments`, { text: text.trim() }); onChange([data.comment, ...comments]); setText(''); toast.success('Comment posted.'); }
    catch (err) { setError(errorMessage(err)); } finally { setBusy(false); }
  };
  const remove = async (c) => {
    const ok = await confirm({ title: 'Delete this comment?', message: 'It is removed for everyone. This cannot be undone.', confirmLabel: 'Yes, delete', tone: 'danger' });
    if (!ok) return;
    try { await api.delete(`/public/post-comments/${c.id}`); onChange(comments.filter((x) => x.id !== c.id)); toast.success('Comment deleted.'); }
    catch (err) { toast.error(errorMessage(err)); }
  };
  return (
    <>
      <h2 id="comments-title" className="text-2xl font-bold">Comments <span className="text-ink-soft font-normal text-lg">({count})</span></h2>
      {user ? (
        <form onSubmit={send} className="mt-5 flex gap-3">
          <PersonPhoto person={user} className="w-11 h-11 rounded-full shrink-0 text-sm" />
          <div className="flex-1 min-w-0">
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} maxLength={1500} placeholder="Share a question, a tip, or thank the author…" aria-label="Your comment"
              className="w-full rounded-2xl border border-line bg-surface p-4 focus:outline-none focus:ring-2 focus:ring-brand/30" />
            {error && <p className="text-sm text-danger mt-1">{error}</p>}
            <div className="mt-2 flex items-center justify-between gap-3">
              <p className="text-xs text-ink-soft">Be kind. Do not share personal documents or phone numbers.</p>
              <Button type="submit" loading={busy} disabled={!text.trim()}>Post comment</Button>
            </div>
          </div>
        </form>
      ) : (
        <div className="mt-5 rounded-2xl border border-dashed border-line p-5 flex flex-wrap items-center gap-4">
          <p className="flex-1 min-w-[200px] text-ink-soft">Sign in to like articles and join the conversation.</p>
          <Button to="/login" state={{ from: pathname }} variant="outline">Sign in</Button>
          <Button to="/register">Create a free account</Button>
        </div>
      )}
      {comments.length === 0 ? <p className="mt-8 text-ink-soft">No comments yet. Be the first to share your thoughts.</p> : (
        <ul className="mt-8 space-y-6">
          {comments.map((c) => {
            const tag = ROLE_TAG[c.user.role];
            return (
              <li key={c.id} className="flex gap-3">
                <PersonPhoto person={c.user} className="w-11 h-11 rounded-full shrink-0 text-sm" />
                <div className="flex-1 min-w-0">
                  <div className="rounded-2xl rounded-tl-md bg-surface border border-line px-4 py-3">
                    <p className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{c.user.firstName} {c.user.lastName}</span>
                      {tag && <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${tag[1]}`}>{tag[0]}</span>}
                      <span className="text-xs text-ink-soft">{ago(c.createdAt)}</span>
                    </p>
                    <p className="mt-1 whitespace-pre-line break-words">{c.text}</p>
                  </div>
                  {(user?.id === c.user.id || user?.role === 'admin') && (
                    <button type="button" onClick={() => remove(c)} className="mt-1 ml-2 inline-flex items-center gap-1 min-h-9 text-xs font-semibold text-ink-soft hover:text-danger"><Trash2 size={13} aria-hidden="true" />Delete</button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
