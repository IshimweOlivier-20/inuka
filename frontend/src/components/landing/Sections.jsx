import { looksLikeHtml, plainText, sanitizeRich } from '../../utils/sanitize';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Reveal from '../ui/Reveal';
import { Button, Pill } from '../ui';
import { Skeleton } from '../ui/Skeletons';
import { CATEGORY_LABEL, SectionHeading } from './common';
import { SITE } from '../../config/site';
import { api, errorMessage } from '../../services/api';
import { formatDate } from '../../utils/format';
import { Check, ChevronLeft, ChevronRight, Earth, GraduationCap, HeartHandshake, Quote, Send } from 'lucide-react';
import { AUDIENCE_PHOTOS, FAQ_PHOTO, samplePhoto } from '../../config/photos';
import { ICONS } from './socialIcons';
import IconTile from '../ui/IconTile';
import { CATEGORY_ICON, Newspaper } from './categoryIcons';
import RichText from '../../components/ui/RichText';

/* ---------- Who INUKA is for: photo, title, text, button ---------- */
const AUDIENCES = [
  { key: 'graduates', title: 'High school graduates', text: 'You finished S4, S5 or S6 and want to go to university, but you are not sure where to start. Improve your English, learn computer basics and find scholarships you qualify for.', cta: 'Start for free', to: '/register' },
  { key: 'refugees', title: 'Refugee and displaced youth', text: 'You have finished secondary school and want to continue, wherever you live now. See refugee-friendly scholarships, know which documents to prepare and get guidance.', cta: 'Start for free', to: '/register' },
  { key: 'mentors', title: 'Mentors', text: 'You work in education or you have been through the process, and you want to help. Share your experience, review essays and plans, and choose your own hours.', cta: 'Become a mentor', to: '/register?role=mentor' },
];

function AudiencePhoto({ photo }) {
  const [ok, setOk] = useState(true);
  return (
    <div className="aspect-[16/10] overflow-hidden bg-brand-soft">
      {ok && <img src={photo.src} alt={photo.alt} loading="lazy" onError={() => setOk(false)}
        className="w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-110" />}
    </div>
  );
}

export function AudienceSection() {
  return (
    <section id="who" className="scroll-mt-16 max-w-[1200px] mx-auto px-5 py-16 md:py-20">
      <Reveal><SectionHeading label="Who it's for" title="Who INUKA is for" intro="One platform for the whole journey, from your last school exam to your first university day." /></Reveal>
      <div className="grid md:grid-cols-3 gap-6">
        {AUDIENCES.map((a, i) => (
          <Reveal key={a.key} delay={i * 110} className="group bg-surface rounded-lg border border-line overflow-hidden flex flex-col shadow-[0_2px_10px_-6px_rgba(7,41,77,0.12)] hover:shadow-[0_18px_36px_-22px_rgba(7,41,77,0.45)] transition-shadow duration-300">
            <AudiencePhoto photo={AUDIENCE_PHOTOS[a.key]} />
            <div className="p-6 flex flex-col flex-1">
              <h3 className="text-lg font-bold text-brand">{a.title}</h3>
              <p className="text-ink-soft text-[15px] mt-2 flex-1">{a.text}</p>
              <div className="mt-6 pt-5 border-t border-line">
                <Link to={a.to} className="group/btn w-full min-h-11 inline-flex items-center justify-center gap-2 rounded border-2 border-brand text-brand font-semibold text-[15px] hover:bg-brand hover:text-white transition-colors">
                  {a.cta}<ChevronRight size={18} aria-hidden="true" className="transition-transform group-hover/btn:translate-x-0.5" />
                </Link>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ---------- Tips ---------- */
export function TipsSection({ tips }) {
  if (tips && !tips.length) return null;
  return (
    <section id="tips" className="scroll-mt-16 bg-brand-soft py-16 md:py-20">
      <div className="max-w-[1200px] mx-auto px-5">
        <Reveal><SectionHeading label="Tips" title="Tips for a strong application" intro="Small habits make a big difference. Our mentors see these mistakes and wins again and again." /></Reveal>
        <ul className="flex sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-4 overflow-x-auto snap-x snap-mandatory pb-2 -mx-5 px-5 sm:mx-0 sm:px-0">
          {(tips || Array.from({ length: 4 }, () => null)).map((t, i) => (
            <Reveal as="li" key={t?.id ?? i} delay={(i % 4) * 90} className="snap-start shrink-0 w-[78%] sm:w-auto bg-surface rounded-xl p-5 border border-brand/10">
              {t ? (<>
                <span className="text-3xl" aria-hidden>{t.icon}</span>
                <h3 className="font-semibold mt-3">{t.title}</h3>
                <RichText html={t.body} className="text-ink-soft text-[15px] mt-1" />
              </>) : <><Skeleton circle width={36} height={36} /><Skeleton width="60%" className="mt-3" /><Skeleton count={3} /></>}
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ---------- Testimonials: one story at a time, round photo, arrows ---------- */
function StoryPhoto({ t }) {
  const src = samplePhoto('testimonials', t);
  const [ok, setOk] = useState(!!src);
  return (
    <div className="relative w-44 h-44 sm:w-52 sm:h-52 shrink-0">
      <span className="absolute -top-5 -left-6 w-full h-full rounded-full bg-brand-soft" aria-hidden="true" />
      <span className="absolute -top-2 -left-2 w-full h-full rounded-full border-2 border-brand/15" aria-hidden="true" />
      <div className="relative w-full h-full rounded-full overflow-hidden border-[6px] border-surface shadow-[0_18px_40px_-20px_rgba(7,41,77,0.5)] bg-night">
        {ok
          ? <img src={src} alt={t.name} loading="lazy" onError={() => setOk(false)} className="w-full h-full object-cover" />
          : <span className="w-full h-full flex items-center justify-center font-display font-bold text-5xl text-white" aria-hidden="true">{t.name.split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase()}</span>}
      </div>
    </div>
  );
}

export function TestimonialsSection({ testimonials }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const n = testimonials?.length || 0;
  useEffect(() => {
    if (paused || n < 2 || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;
    const id = setInterval(() => setI((x) => (x + 1) % n), 7000);
    return () => clearInterval(id);
  }, [paused, n]);
  if (!n) return null; // hidden until there are real stories (samples are removed in production)
  const go = (d) => setI((x) => (x + d + n) % n);
  const Arrow = ({ dir }) => (
    <button type="button" onClick={() => go(dir)} aria-label={dir < 0 ? 'Previous story' : 'Next story'}
      className="shrink-0 w-12 h-12 rounded-full bg-surface border border-line text-brand shadow-[0_8px_20px_-10px_rgba(7,41,77,0.45)] flex items-center justify-center hover:bg-accent hover:border-accent hover:text-night transition-colors">
      {dir < 0 ? <ChevronLeft size={22} aria-hidden="true" /> : <ChevronRight size={22} aria-hidden="true" />}
    </button>
  );
  return (
    <section id="stories" className="scroll-mt-16 bg-surface py-16 md:py-24" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className="max-w-[1100px] mx-auto px-5">
        <Reveal><SectionHeading label="Testimonials" title="Stories from our community" intro="See what students and mentors are saying about INUKA." align="center" /></Reveal>
        <div className="flex items-center gap-3 sm:gap-6" aria-roledescription="carousel" aria-label="Stories">
          {n > 1 && <span className="hidden sm:block"><Arrow dir={-1} /></span>}
          <div className="flex-1 grid">
            {testimonials.map((t, k) => (
              <figure key={t.id} aria-hidden={k !== i} aria-roledescription="slide" aria-label={`${k + 1} of ${n}`}
                className={`[grid-area:1/1] flex flex-col md:flex-row items-center gap-8 md:gap-14 transition-opacity duration-700 ${k === i ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                <StoryPhoto t={t} />
                <div className="text-center md:text-left">
                  <Quote size={34} className="text-brand/20 mx-auto md:mx-0" aria-hidden="true" />
                  <RichText as="blockquote" html={t.quote} className="mt-2 text-base sm:text-lg italic text-ink-soft leading-relaxed" />
                  <figcaption className="mt-5">
                    <span className="block font-display text-lg font-bold text-brand">{t.name}</span>
                    <span className="block text-sm text-ink-soft">{[t.role, t.country].filter(Boolean).join(', ')}</span>
                  </figcaption>
                </div>
              </figure>
            ))}
          </div>
          {n > 1 && <span className="hidden sm:block"><Arrow dir={1} /></span>}
        </div>
        {n > 1 && (
          <div className="mt-10 flex justify-center items-center gap-2.5">
            <span className="sm:hidden mr-3"><Arrow dir={-1} /></span>
            {testimonials.map((t, k) => (
              <button key={t.id} type="button" onClick={() => setI(k)} aria-label={`Show story ${k + 1} of ${n}`} aria-current={k === i}
                className={`h-2.5 rounded-full transition-all duration-300 ${k === i ? 'w-6 bg-accent' : 'w-2.5 bg-line hover:bg-accent/60'}`} />
            ))}
            <span className="sm:hidden ml-3"><Arrow dir={1} /></span>
          </div>
        )}
      </div>
    </section>
  );
}

/* ---------- News & guides ---------- */
export function PostCard({ p, i = 0 }) {
  return (
    <Reveal as="li" delay={(i % 3) * 110} className="group relative bg-paper rounded-lg border border-line overflow-hidden flex flex-col hover:border-brand/40 transition-colors">
      <div className="h-36 bg-brand-soft flex items-center justify-center" aria-hidden="true"><IconTile icon={CATEGORY_ICON[p.category] || Newspaper} tone={p.category === 'news' ? 'accent' : 'brand'} size="xl" /></div>
      <div className="p-5 flex-1 flex flex-col">
        <div className="flex items-center gap-2 text-sm text-ink-soft">
          <Pill tone={p.category === 'news' ? 'cyan' : 'brand'}>{CATEGORY_LABEL[p.category] || p.category}</Pill>
          <span>{p.readMinutes} min read</span>
        </div>
        <h3 className="font-semibold text-lg leading-snug mt-3">
          <Link to={`/news/${p.slug}`} className="after:absolute after:inset-0 group-hover:text-brand">{p.title}</Link>
        </h3>
        <p className="text-ink-soft text-[15px] mt-2 flex-1">{plainText(p.excerpt)}</p>
        {p.publishedAt && <p className="text-sm text-ink-soft mt-4">{formatDate(p.publishedAt)}</p>}
      </div>
    </Reveal>
  );
}

export function NewsSection({ posts }) {
  if (posts && !posts.length) return null;
  return (
    <section id="news" className="scroll-mt-16 bg-surface border-y border-line py-16 md:py-20"><div className="max-w-[1200px] mx-auto px-5">
      <Reveal className="flex flex-wrap items-end justify-between gap-4">
        <SectionHeading label="Latest" title="News & guides" intro="Practical guides for your application, and updates from INUKA." />
        <Link to="/news" className="mb-10 text-brand font-semibold hover:underline">See all articles</Link>
      </Reveal>
      <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {posts ? posts.map((p, i) => <PostCard key={p.id} p={p} i={i} />)
          : [0, 1, 2].map((i) => <li key={i} className="bg-surface rounded-lg border border-line overflow-hidden"><Skeleton height={144} borderRadius={0} /><div className="p-5"><Skeleton width={120} /><Skeleton height={22} className="mt-3" /><Skeleton count={2} /></div></li>)}
      </ul>
    </div></section>
  );
}

/* ---------- Team: photo cards that slide one by one ---------- */
const TEAM_SOCIAL = [['facebookUrl', 'facebook', 'Facebook'], ['xUrl', 'x', 'X'], ['linkedinUrl', 'linkedin', 'LinkedIn'], ['instagramUrl', 'instagram', 'Instagram']];

function TeamCard({ m }) {
  const src = samplePhoto('team', m);
  const [photoOk, setPhotoOk] = useState(!!src);
  const initials = m.name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
  // Social links: real links when added in the admin; placeholder icons on sample members so the design shows.
  const links = TEAM_SOCIAL.filter(([k]) => m[k] || m.isSample);
  return (
    <article className="relative h-full">
      <div className="relative aspect-[5/6] rounded-md overflow-hidden bg-night">
        {photoOk
          ? <img src={src} alt={`${m.name}, ${m.role}`} loading="lazy" onError={() => setPhotoOk(false)} className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover/team:scale-110 group-hover/team:rotate-1" />
          : <span className="w-full h-full flex items-center justify-center font-display font-bold text-5xl text-white/90 transition-transform duration-700 group-hover/team:scale-110" aria-hidden="true">{initials}</span>}
        <span className="absolute inset-0 bg-night/0 transition-colors duration-500 group-hover/team:bg-night/25" aria-hidden="true" />
      </div>
      <div className="absolute left-1/2 -translate-x-1/2 bottom-5 w-[76%] bg-surface rounded-md shadow-[0_12px_30px_-14px_rgba(7,41,77,0.45)] px-3 py-3 text-center">
        <h3 className="font-display text-base sm:text-[1.05rem] font-bold text-brand leading-snug transition-colors group-hover/team:text-accent-hover group-focus-within/team:text-accent-hover">{m.name}</h3>
        <p className="text-ink-soft text-sm">{m.role}</p>
        {links.length > 0 && (
          <div className="grid grid-rows-[0fr] opacity-0 transition-[grid-template-rows,opacity] duration-300 group-hover/team:grid-rows-[1fr] group-hover/team:opacity-100 group-focus-within/team:grid-rows-[1fr] group-focus-within/team:opacity-100 [@media(hover:none)]:grid-rows-[1fr] [@media(hover:none)]:opacity-100">
            <div className="overflow-hidden">
              <div className="pt-2 flex justify-center gap-3.5">
                {links.map(([k, icon, label]) => {
                  const svg = <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">{ICONS[icon]}</svg>;
                  return m[k]
                    ? <a key={k} href={m[k]} target="_blank" rel="noopener noreferrer" aria-label={`${m.name} on ${label}`} className="text-brand hover:text-accent-hover">{svg}</a>
                    : <span key={k} className="text-brand cursor-default" title={`${label} (add the link in Admin → Website content → Team)`}>{svg}</span>;
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </article>
  );
}

export function TeamSection({ team }) {
  const track = useRef(null);
  const [paused, setPaused] = useState(false);
  const [edge, setEdge] = useState({ start: true, end: false });
  const update = () => {
    const el = track.current;
    if (el) setEdge({ start: el.scrollLeft < 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 });
  };
  // One card at a time
  const step = (dir) => {
    const el = track.current;
    const card = el?.querySelector('li');
    if (!el || !card) return;
    if (dir > 0 && el.scrollLeft + el.clientWidth >= el.scrollWidth - 4) el.scrollTo({ left: 0, behavior: 'smooth' }); // back to the first
    else el.scrollBy({ left: dir * (card.offsetWidth + 24), behavior: 'smooth' });
  };
  useEffect(() => {
    update();
    if (paused || !team || team.length < 2 || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;
    const t = setInterval(() => step(1), 4500);
    return () => clearInterval(t);
  }, [paused, team]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!team?.length) return null;
  const Arrow = ({ dir, disabled }) => (
    <button type="button" onClick={() => step(dir)} disabled={disabled} aria-label={dir < 0 ? 'Previous team member' : 'Next team member'}
      className="w-12 h-12 rounded bg-brand text-white flex items-center justify-center hover:bg-accent hover:text-night disabled:opacity-30 disabled:hover:bg-brand disabled:hover:text-white transition-colors">
      {dir < 0 ? <ChevronLeft size={22} aria-hidden="true" /> : <ChevronRight size={22} aria-hidden="true" />}
    </button>
  );
  return (
    <section id="team" className="scroll-mt-16 py-16 md:py-24 overflow-hidden" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
      <div className="max-w-[1200px] mx-auto px-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <Reveal><SectionHeading label="Our team" title="Meet the people behind INUKA" intro="A small team working to make higher education reachable for every young African." /></Reveal>
          {team.length > 1 && <div className="flex gap-2 mb-10"><Arrow dir={-1} disabled={edge.start} /><Arrow dir={1} /></div>}
        </div>
        <ul ref={track} onScroll={update} aria-label="Team members"
          className="flex gap-6 overflow-x-auto snap-x snap-mandatory scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {team.map((m) => (
            <li key={m.id} className="group/team snap-start shrink-0 w-[82%] sm:w-[calc((100%-1.5rem)/2)] lg:w-[calc((100%-3rem)/3)]">
              <TeamCard m={m} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ---------- Partners & sponsors: logos sliding one by one ---------- */
function PartnerLogo({ p }) {
  const [logoOk, setLogoOk] = useState(!!p.logoUrl);
  const inner = logoOk
    ? <img src={p.logoUrl} alt={p.name} loading="lazy" onError={() => setLogoOk(false)} className="max-h-20 max-w-full w-auto object-contain transition-transform duration-300 group-hover:scale-105" />
    : <span className="font-display font-semibold text-brand/60 text-center leading-tight">{p.name}</span>;
  const cls = 'group h-32 flex items-center justify-center px-6';
  return p.websiteUrl
    ? <a href={p.websiteUrl} target="_blank" rel="noopener noreferrer" aria-label={`${p.name} (opens their website)`} title={plainText(p.description) || p.name} className={cls}>{inner}</a>
    : <div className={cls} title={plainText(p.description) || p.name}>{inner}</div>;
}

function LogoSlider({ items }) {
  const [perView, setPerView] = useState(5);
  const [i, setI] = useState(0);
  const [animate, setAnimate] = useState(true);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    const fit = () => setPerView(window.innerWidth >= 1024 ? 5 : window.innerWidth >= 640 ? 3 : 2);
    fit(); window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);
  const n = items.length;
  const slides = n > perView;
  useEffect(() => {
    if (!slides || paused || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;
    const t = setInterval(() => { setAnimate(true); setI((x) => x + 1); }, 2800);
    return () => clearInterval(t);
  }, [slides, paused]);
  // After sliding past the last logo, jump back to the start without animation (the list is repeated, so it looks endless).
  useEffect(() => {
    if (i < n) return undefined;
    const t = setTimeout(() => { setAnimate(false); setI(0); }, 700);
    return () => clearTimeout(t);
  }, [i, n]);
  const list = slides ? [...items, ...items.slice(0, perView)] : items;
  return (
    <div className="overflow-hidden" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <ul className={`flex ${slides ? '' : 'justify-center flex-wrap'} ${animate ? 'transition-transform duration-700 ease-in-out' : ''}`}
        style={slides ? { transform: `translateX(-${(i * 100) / perView}%)` } : undefined}>
        {list.map((p, k) => (
          <li key={`${p.id}-${k}`} className="shrink-0" style={{ width: `${100 / perView}%` }} aria-hidden={k >= n || undefined}>
            <PartnerLogo p={p} />
          </li>
        ))}
      </ul>
    </div>
  );
}

export function PartnersSection({ partners }) {
  const list = partners || [];
  return (
    <section id="partners" className="scroll-mt-16 relative bg-paper border-t border-line py-16 md:py-20 overflow-hidden">
      <span className="pointer-events-none absolute right-10 top-10 w-40 h-28 opacity-40 [background-image:radial-gradient(var(--color-line)_2px,transparent_2px)] [background-size:16px_16px]" aria-hidden="true" />
      <span className="pointer-events-none absolute left-1/3 bottom-6 w-48 h-24 opacity-50 [background-image:radial-gradient(#cfe0f5_2px,transparent_2px)] [background-size:18px_18px]" aria-hidden="true" />
      <div className="relative max-w-[1200px] mx-auto px-5">
        <Reveal><SectionHeading label="Partners" title="Partners & sponsors" intro="Organisations that help INUKA stay free and reach more young people." align="center" /></Reveal>
        {list.length > 0 && <Reveal><LogoSlider items={list} /></Reveal>}
      </div>
    </section>
  );
}

/* ---------- FAQ: questions on the left, photo on the right ---------- */
export function FaqSection({ faq }) {
  const [photoOk, setPhotoOk] = useState(true);
  if (faq && !faq.length) return null;
  return (
    <section id="faq" className="scroll-mt-16 bg-paper py-16 md:py-24">
      <div className="max-w-[1200px] mx-auto px-5 grid lg:grid-cols-[1.2fr_1fr] gap-10 lg:gap-14 items-start">
        <div>
          <Reveal><SectionHeading label="FAQ" title="Questions students ask" intro="Short answers to what students ask us most. Click a question to open it." /></Reveal>
          <div className="space-y-3">
            {(faq || [null, null, null]).map((f, i) => f ? (
              <Reveal key={f.id} delay={Math.min(i, 4) * 60}>
                <details className="faq group bg-surface rounded-md border border-line open:border-accent open:shadow-[0_10px_26px_-18px_rgba(7,41,77,0.4)]">
                  <summary className="flex items-center justify-between gap-4 cursor-pointer list-none px-5 sm:px-6 min-h-14 py-3 font-display font-semibold text-base text-brand">
                    {f.question}
                    <span className="faq-icon shrink-0 w-8 h-8 rounded bg-brand-soft text-brand flex items-center justify-center text-xl transition-[transform,background-color] group-open:rotate-45 group-open:bg-accent group-open:text-night" aria-hidden>+</span>
                  </summary>
                  {looksLikeHtml(f.answer)
                    ? <div className="rich-content px-5 sm:px-6 pb-5 text-ink-soft" dangerouslySetInnerHTML={{ __html: sanitizeRich(f.answer) }} />
                    : <p className="px-5 sm:px-6 pb-5 text-ink-soft">{f.answer}</p>}
                </details>
              </Reveal>
            ) : <Skeleton key={i} height={56} />)}
          </div>
          <p className="mt-8 text-ink-soft">Still have a question? <a href="#ask" className="text-brand font-semibold hover:text-accent-hover">Send it to us</a></p>
        </div>
        <Reveal delay={150} className="relative hidden md:block lg:sticky lg:top-24">
          <span className="absolute -top-4 -right-4 w-28 h-28 rounded-md bg-accent" aria-hidden="true" />
          <span className="absolute -bottom-4 -left-4 w-24 h-24 rounded-md border-4 border-brand/15" aria-hidden="true" />
          <div className="relative rounded-md overflow-hidden aspect-[4/5] bg-brand-soft">
            {photoOk && <img src={FAQ_PHOTO.src} alt={FAQ_PHOTO.alt} loading="lazy" onError={() => setPhotoOk(false)} className="w-full h-full object-cover" />}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------- Join INUKA + scholarship alerts / question form ---------- */
export function JoinSection() {
  const empty = { email: '', message: '', alerts: true, website: '' };
  const [f, setF] = useState(empty);
  const [state, setState] = useState({ status: 'idle', message: '' });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    setState({ status: 'busy', message: '' });
    try {
      const { data } = await api.post('/public/contact', f);
      const parts = [data.subscribed && 'we will email you when new scholarships and guides are added', data.messageSaved && 'we received your message and will reply by email'].filter(Boolean);
      setState({ status: 'done', message: `Thank you! ${parts.join(', and ')}.`.replace('! w', '! W') });
      setF(empty);
    } catch (err) {
      setState({ status: 'error', message: errorMessage(err) });
    }
  };
  const input = 'w-full min-h-11 rounded border border-line bg-surface px-4 text-ink placeholder:text-ink-soft/70 focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/15';
  return (
    <section id="ask" className="scroll-mt-16 bg-surface border-t border-line">
      <div className="max-w-[1200px] mx-auto px-5 py-14 md:py-16 grid lg:grid-cols-[1fr_1fr] gap-10 lg:gap-14 items-center">
        <Reveal>
          <h2 className="text-brand text-2xl sm:text-[2rem] font-bold leading-tight max-w-[18ch]">Join INUKA today. It's completely free.</h2>
          <p className="text-ink-soft mt-4 max-w-lg">
            Start your first lesson in two minutes. No payment, no card, ever. Learn English and computer skills at your own pace,
            save the scholarships that fit you, and get help from a mentor when you are ready to apply.
          </p>
          <Button to="/register" className="mt-7 min-h-12 px-8 text-base">Create your free account</Button>
        </Reveal>

        <Reveal delay={120} className="rounded-md overflow-hidden bg-surface border border-line shadow-[0_24px_60px_-30px_rgba(7,41,77,0.45)]">
          <div className="bg-accent px-6 py-5 text-center">
            <h3 className="font-display text-night text-xl font-bold">Get scholarship alerts</h3>
            <p className="text-night/80 mt-1 text-[15px]">Not ready to sign up? Get an email when new scholarships and guides are added.</p>
          </div>
          <div className="px-6 sm:px-8 py-6">
            {state.status === 'done' ? (
              <div role="status" className="text-center py-4">
                <span className="mx-auto w-12 h-12 rounded-full bg-green text-white flex items-center justify-center"><Check size={24} strokeWidth={3} aria-hidden="true" /></span>
                <p className="mt-3 font-semibold text-brand">{state.message}</p>
                <button type="button" onClick={() => setState({ status: 'idle', message: '' })} className="mt-3 text-brand font-semibold hover:text-accent-hover">Send another message</button>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-3" noValidate>
                <label className="block"><span className="sr-only">Your email address</span><input className={input} type="email" placeholder="Your email address" autoComplete="email" value={f.email} onChange={set('email')} required /></label>
                <label className="block"><span className="sr-only">Your message (optional)</span><textarea className={`${input} py-2.5 h-20 resize-none`} placeholder="Your message (optional): ask us anything" value={f.message} onChange={set('message')} /></label>
                {/* Hidden from people; catches spam bots */}
                <input type="text" name="website" value={f.website} onChange={set('website')} tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
                <label className="flex items-start gap-3 text-[15px] text-ink-soft cursor-pointer">
                  <input type="checkbox" className="mt-1 w-5 h-5 accent-[#07294D]" checked={f.alerts} onChange={set('alerts')} />
                  Also email me when new scholarships and guides are added
                </label>
                {state.status === 'error' && <p role="alert" className="text-sm text-danger">{state.message}</p>}
                <Button type="submit" variant="dark" loading={state.status === 'busy'} className="w-full min-h-11"><Send size={18} aria-hidden="true" />Submit</Button>
                <p className="text-xs text-ink-soft text-center">We only use your email to answer you. We never share it.</p>
              </form>
            )}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
