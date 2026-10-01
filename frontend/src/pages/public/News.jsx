import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import DOMPurify from 'dompurify';
import PublicShell from '../../components/landing/PublicShell';
import { CATEGORY_LABEL } from '../../components/landing/common';
import { PostCard } from '../../components/landing/Sections';
import { Button, Pill } from '../../components/ui';
import { Skeleton } from '../../components/ui/Skeletons';
import { api, errorMessage } from '../../services/api';
import { formatDate } from '../../utils/format';
import IconTile from '../../components/ui/IconTile';
import { CATEGORY_ICON, Newspaper } from '../../components/landing/categoryIcons';

const FILTERS = [['', 'All'], ['guide', 'Guides'], ['news', 'News']];

export function NewsList() {
  const [category, setCategory] = useState('');
  const [posts, setPosts] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    setPosts(null);
    document.title = 'News & guides — INUKA';
    api.get('/public/posts', { params: category ? { category } : {} })
      .then((r) => setPosts(r.data.posts)).catch((e) => setError(errorMessage(e)));
  }, [category]);

  return (
    <PublicShell>
      <section className="bg-brand-soft border-b border-line">
        <div className="max-w-[1200px] mx-auto px-5 py-12 md:py-16">
          <h1 className="text-4xl font-bold">News & guides</h1>
          <p className="text-lg text-ink-soft mt-2 max-w-2xl">Step-by-step guides for your scholarship applications, and the latest updates from INUKA.</p>
          <div role="tablist" className="flex gap-2 mt-6">
            {FILTERS.map(([k, l]) => (
              <button key={k} role="tab" aria-selected={category === k} onClick={() => setCategory(k)}
                className={`min-h-11 px-5 rounded-full font-medium border ${category === k ? 'bg-brand text-white border-brand' : 'bg-white border-line hover:border-brand'}`}>{l}</button>
            ))}
          </div>
        </div>
      </section>
      <section className="max-w-[1200px] mx-auto px-5 py-12">
        {error && <p role="alert" className="text-danger">{error}</p>}
        {!posts && !error && (
          <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5" aria-label="Loading articles">
            {[0, 1, 2].map((i) => <li key={i} className="bg-white rounded-2xl border border-line overflow-hidden"><Skeleton height={144} borderRadius={0} /><div className="p-5"><Skeleton width={120} /><Skeleton height={22} className="mt-3" /><Skeleton count={2} /></div></li>)}
          </ul>
        )}
        {posts && posts.length === 0 && <p className="text-ink-soft">No articles here yet. Check back soon.</p>}
        {posts && posts.length > 0 && <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">{posts.map((p, i) => <PostCard key={p.id} p={p} i={i} />)}</ul>}
      </section>
    </PublicShell>
  );
}

export function Article() {
  const { slug } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    setData(null); setError('');
    window.scrollTo(0, 0);
    api.get(`/public/posts/${slug}`).then((r) => { setData(r.data); document.title = `${r.data.post.title} — INUKA`; })
      .catch((e) => setError(errorMessage(e)));
  }, [slug]);

  return (
    <PublicShell>
      <article className="max-w-3xl mx-auto px-5 py-10 md:py-14">
        <Link to="/news" className="text-sm text-brand hover:underline">← All news & guides</Link>
        {error && <div className="mt-6"><p role="alert" className="text-danger">{error}</p><Button to="/news" variant="outline" className="mt-4">See all articles</Button></div>}
        {!data && !error && (
          <div aria-label="Loading article" className="mt-6"><Skeleton width={160} /><Skeleton height={44} className="mt-3" /><Skeleton width="50%" /><Skeleton height={200} className="mt-6" /><Skeleton count={6} className="mt-4" /></div>
        )}
        {data && (
          <>
            <header className="mt-6">
              <div className="flex flex-wrap items-center gap-2 text-sm text-ink-soft">
                <Pill tone={data.post.category === 'news' ? 'cyan' : 'brand'}>{CATEGORY_LABEL[data.post.category] || data.post.category}</Pill>
                <span>{data.post.readMinutes} min read</span>
              </div>
              <h1 className="text-3xl md:text-[2.6rem] font-bold mt-3 leading-tight">{data.post.title}</h1>
              <p className="text-lg text-ink-soft mt-3">{data.post.excerpt}</p>
              <p className="text-sm text-ink-soft mt-4">By {data.post.authorName}, {formatDate(data.post.publishedAt)}</p>
            </header>
            <div className="mt-8 h-44 rounded-2xl bg-gradient-to-br from-brand-soft to-[#D6E8FD] flex items-center justify-center" aria-hidden="true"><IconTile icon={CATEGORY_ICON[data.post.category] || Newspaper} tone={data.post.category === 'news' ? 'accent' : 'brand'} size="xl" /></div>
            <div className="lesson-prose mt-8" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(data.post.contentHtml) }} />

            <aside className="mt-10 rounded-2xl bg-brand text-white p-6 flex flex-col sm:flex-row sm:items-center gap-4">
              <p className="flex-1 text-lg"><strong className="font-display">Ready to start?</strong> Free courses, scholarships and a document vault, all in one place.</p>
              <Button to="/register" variant="accent">Create a free account</Button>
            </aside>

            {data.more.length > 0 && (
              <section className="mt-12">
                <h2 className="text-xl font-semibold mb-4">Keep reading</h2>
                <ul className="space-y-3">
                  {data.more.map((m) => (
                    <li key={m.slug}>
                      <Link to={`/news/${m.slug}`} className="flex items-center gap-4 rounded-xl bg-white border border-line p-4 hover:border-brand/40">
                        <IconTile icon={CATEGORY_ICON[m.category] || Newspaper} tone={m.category === 'news' ? 'accent' : 'brand'} size="md" />
                        <span className="flex-1"><span className="block font-semibold">{m.title}</span><span className="text-sm text-ink-soft">{CATEGORY_LABEL[m.category]}, {m.readMinutes} min read</span></span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </article>
    </PublicShell>
  );
}
