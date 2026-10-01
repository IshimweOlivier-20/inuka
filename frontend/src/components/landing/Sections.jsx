import { looksLikeHtml, sanitizeRich } from '../../utils/sanitize';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import Reveal from '../ui/Reveal';
import { Button, Pill } from '../ui';
import { Skeleton } from '../ui/Skeletons';
import { Avatar, CATEGORY_LABEL, SectionHeading } from './common';
import { SITE } from '../../config/site';
import { api, errorMessage } from '../../services/api';
import { formatDate } from '../../utils/format';
import { Check, Earth, GraduationCap, HeartHandshake } from 'lucide-react';
import IconTile from '../ui/IconTile';
import { CATEGORY_ICON, Newspaper } from './categoryIcons';

/* ---------- Who INUKA is for ---------- */
const AUDIENCES = [
  { icon: GraduationCap, tone: 'brand', title: 'High school graduates', text: 'You finished S4, S5 or S6 and want to go to university, but you are not sure where to start.', points: ['Improve your English', 'Learn computer basics', 'Find scholarships you qualify for'] },
  { icon: Earth, tone: 'accent', title: 'Refugee and displaced youth', text: 'You have finished secondary school and want to continue, wherever you live now.', points: ['See refugee-friendly scholarships', 'Know which documents to prepare', 'Get guidance from mentors'] },
  { icon: HeartHandshake, tone: 'cyan', title: 'Mentors', text: 'You work in education or you have been through the process, and you want to help.', points: ['Share your experience', 'Review essays and plans', 'Choose your own hours'] },
];

export function AudienceSection() {
  return (
    <section id="who" className="scroll-mt-16 max-w-[1200px] mx-auto px-5 py-16 md:py-20">
      <Reveal><SectionHeading title="Who INUKA is for" intro="One platform for the whole journey, from your last school exam to your first university day." /></Reveal>
      <div className="grid md:grid-cols-3 gap-5">
        {AUDIENCES.map((a, i) => (
          <Reveal key={a.title} delay={i * 110} className="bg-surface rounded-2xl border border-line p-6 flex flex-col">
            <IconTile icon={a.icon} tone={a.tone} size="lg" />
            <h3 className="text-xl font-semibold mt-4">{a.title}</h3>
            <p className="text-ink-soft mt-2">{a.text}</p>
            <ul className="mt-4 space-y-2 flex-1">
              {a.points.map((p) => <li key={p} className="flex items-start gap-2"><Check size={18} strokeWidth={3} className="text-cyan mt-1 shrink-0" aria-hidden="true" />{p}</li>)}
            </ul>
            <Link to="/register" className="mt-5 text-brand font-semibold hover:underline">{a.title === 'Mentors' ? 'Become a mentor' : 'Start for free'}</Link>
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
        <Reveal><SectionHeading title="Tips for a strong application" intro="Small habits make a big difference. Our mentors see these mistakes and wins again and again." /></Reveal>
        <ul className="flex sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-4 overflow-x-auto snap-x snap-mandatory pb-2 -mx-5 px-5 sm:mx-0 sm:px-0">
          {(tips || Array.from({ length: 4 }, () => null)).map((t, i) => (
            <Reveal as="li" key={t?.id ?? i} delay={(i % 4) * 90} className="snap-start shrink-0 w-[78%] sm:w-auto bg-surface rounded-xl p-5 border border-brand/10">
              {t ? (<>
                <span className="text-3xl" aria-hidden>{t.icon}</span>
                <h3 className="font-semibold mt-3">{t.title}</h3>
                <p className="text-ink-soft text-[15px] mt-1">{t.body}</p>
              </>) : <><Skeleton circle width={36} height={36} /><Skeleton width="60%" className="mt-3" /><Skeleton count={3} /></>}
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ---------- Testimonials ---------- */
export function TestimonialsSection({ testimonials }) {
  if (!testimonials?.length) return null; // hidden until there are real stories (samples are removed in production)
  return (
    <section id="stories" className="scroll-mt-16 max-w-[1200px] mx-auto px-5 py-16 md:py-20">
      <Reveal><SectionHeading title="Stories from our community" intro="In their own words: students and mentors who use INUKA." /></Reveal>
      <ul className="flex md:grid md:grid-cols-3 gap-5 overflow-x-auto snap-x snap-mandatory pb-2 -mx-5 px-5 md:mx-0 md:px-0">
        {testimonials.map((t, i) => (
          <Reveal as="li" key={t.id} delay={i * 110} className="snap-start shrink-0 w-[85%] sm:w-[60%] md:w-auto bg-surface rounded-2xl border border-line p-6 flex flex-col">
            <span className="font-display text-6xl leading-none text-accent" aria-hidden>“</span>
            <blockquote className="text-lg -mt-4 flex-1">{t.quote}</blockquote>
            <figcaption className="mt-6 flex items-center gap-3">
              <Avatar name={t.name} photoUrl={t.photoUrl} index={i} size="w-12 h-12 text-base" />
              <span className="flex-1">
                <span className="block font-semibold">{t.name}</span>
                <span className="block text-sm text-ink-soft">{[t.role, t.country].filter(Boolean).join(', ')}</span>
              </span>
            </figcaption>
          </Reveal>
        ))}
      </ul>
    </section>
  );
}

/* ---------- News & guides ---------- */
export function PostCard({ p, i = 0 }) {
  return (
    <Reveal as="li" delay={(i % 3) * 110} className="group relative bg-paper rounded-2xl border border-line overflow-hidden flex flex-col hover:border-brand/40 transition-colors">
      <div className="h-36 bg-gradient-to-br from-brand-soft to-[#D6E8FD] dark:to-[#1E3A66] flex items-center justify-center" aria-hidden="true"><IconTile icon={CATEGORY_ICON[p.category] || Newspaper} tone={p.category === 'news' ? 'accent' : 'brand'} size="xl" /></div>
      <div className="p-5 flex-1 flex flex-col">
        <div className="flex items-center gap-2 text-sm text-ink-soft">
          <Pill tone={p.category === 'news' ? 'cyan' : 'brand'}>{CATEGORY_LABEL[p.category] || p.category}</Pill>
          <span>{p.readMinutes} min read</span>
        </div>
        <h3 className="font-semibold text-lg leading-snug mt-3">
          <Link to={`/news/${p.slug}`} className="after:absolute after:inset-0 group-hover:text-brand">{p.title}</Link>
        </h3>
        <p className="text-ink-soft text-[15px] mt-2 flex-1">{p.excerpt}</p>
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
        <SectionHeading title="News & guides" intro="Practical guides for your application, and updates from INUKA." />
        <Link to="/news" className="mb-10 text-brand font-semibold hover:underline">See all articles</Link>
      </Reveal>
      <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {posts ? posts.map((p, i) => <PostCard key={p.id} p={p} i={i} />)
          : [0, 1, 2].map((i) => <li key={i} className="bg-surface rounded-2xl border border-line overflow-hidden"><Skeleton height={144} borderRadius={0} /><div className="p-5"><Skeleton width={120} /><Skeleton height={22} className="mt-3" /><Skeleton count={2} /></div></li>)}
      </ul>
    </div></section>
  );
}

/* ---------- Team ---------- */
export function TeamSection({ team }) {
  if (!team?.length) return null;
  return (
    <section id="team" className="scroll-mt-16 py-16 md:py-20">
      <div className="max-w-[1200px] mx-auto px-5">
        <Reveal><SectionHeading title="The people behind INUKA" intro="A small team working to make higher education reachable for every young African." /></Reveal>
        <ul className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
          {team.map((m, i) => (
            <Reveal as="li" key={m.id} delay={(i % 4) * 90} className="rounded-2xl bg-surface border border-line p-4 sm:p-6 text-center flex flex-col items-center">
              <Avatar name={m.name} photoUrl={m.photoUrl} index={i} size="w-16 h-16 text-xl sm:w-24 sm:h-24 sm:text-2xl" />
              <h3 className="font-semibold sm:text-lg mt-3 sm:mt-4 leading-snug">{m.name}</h3>
              <p className="text-brand font-medium text-sm">{m.role}</p>
              {m.bio && <p className="text-ink-soft text-xs sm:text-sm mt-2 sm:mt-3">{m.bio}</p>}
              <div className="mt-3 flex items-center gap-2">
                {m.linkedinUrl && <a href={m.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-brand font-semibold hover:underline">LinkedIn</a>}
              </div>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ---------- Partners & sponsors ---------- */
function PartnerLogo({ p }) {
  const [logoOk, setLogoOk] = useState(!!p.logoUrl);
  const inner = logoOk
    ? <img src={p.logoUrl} alt={p.name} loading="lazy" onError={() => setLogoOk(false)}
        className="max-h-12 sm:max-h-14 max-w-[78%] w-auto object-contain grayscale opacity-70 transition duration-300 group-hover:grayscale-0 group-hover:opacity-100" />
    : <span className="font-display font-semibold text-ink/55 text-center leading-tight text-[15px] transition-colors group-hover:text-brand">{p.name}</span>;
  const cls = 'group h-24 sm:h-28 flex items-center justify-center px-4 rounded-2xl border border-line bg-surface transition hover:border-brand/30 hover:shadow-[0_10px_30px_-18px_rgba(7, 44, 107,0.45)]';
  return (
    <li className="w-[calc(50%-0.5rem)] sm:w-48" title={p.description || p.name}>
      {p.websiteUrl
        ? <a href={p.websiteUrl} target="_blank" rel="noopener noreferrer" aria-label={`${p.name} (opens their website)`} className={cls}>{inner}</a>
        : <div className={cls}>{inner}</div>}
    </li>
  );
}

export function PartnersSection({ partners }) {
  const list = partners || [];
  const groups = [['partner', 'Partners'], ['sponsor', 'Sponsors']].map(([k, l]) => [l, list.filter((p) => p.kind === k)]).filter(([, g]) => g.length);
  return (
    <section id="partners" className="scroll-mt-16 bg-surface border-t border-line py-16 md:py-20"><div className="max-w-[1200px] mx-auto px-5">
      <Reveal><SectionHeading title="Partners & sponsors" intro="Organisations that help INUKA stay free and reach more young people." align="center" /></Reveal>
      {groups.map(([label, g]) => (
        <Reveal key={label} className="mb-10">
          <h3 className="text-center text-sm font-semibold text-ink-soft mb-4">{label}</h3>
          <ul className="flex flex-wrap justify-center gap-4">
            {g.map((p) => <PartnerLogo key={p.id} p={p} />)}
          </ul>
        </Reveal>
      ))}
      <Reveal className="rounded-2xl bg-ink text-white p-6 md:p-8 flex flex-col md:flex-row md:items-center gap-5">
        <div className="flex-1">
          <h3 className="text-white text-xl font-semibold">Support INUKA</h3>
          <p className="text-white/75 mt-1 max-w-2xl">Universities, NGOs, telecoms and foundations can help: share opportunities, sponsor free data, fund courses, or volunteer mentors.</p>
        </div>
        <Button href={`mailto:${SITE.partnersEmail}?subject=Partnering%20with%20INUKA`} variant="accent">Become a partner</Button>
      </Reveal>
    </div></section>
  );
}

/* ---------- FAQ ---------- */
export function FaqSection({ faq }) {
  if (faq && !faq.length) return null;
  return (
    <section id="faq" className="scroll-mt-16 bg-brand-soft py-16 md:py-20">
      <div className="max-w-[1200px] mx-auto px-5">
        <Reveal><SectionHeading title="Questions students ask" align="center" /></Reveal>
        <div className="space-y-3">
          {(faq || [null, null, null]).map((f, i) => f ? (
            <Reveal key={f.id} delay={Math.min(i, 4) * 60}>
              <details className="faq group bg-surface rounded-xl border border-brand/10 open:border-brand/30">
                <summary className="flex items-center justify-between gap-4 cursor-pointer list-none px-5 sm:px-6 min-h-16 py-3 font-semibold text-lg">
                  {f.question}
                  <span className="faq-icon shrink-0 w-8 h-8 rounded-full bg-brand-soft text-brand flex items-center justify-center text-xl transition-transform group-open:rotate-45" aria-hidden>+</span>
                </summary>
                {looksLikeHtml(f.answer)
                  ? <div className="rich-content px-5 sm:px-6 pb-5 text-ink-soft max-w-4xl" dangerouslySetInnerHTML={{ __html: sanitizeRich(f.answer) }} />
                  : <p className="px-5 sm:px-6 pb-5 text-ink-soft max-w-4xl">{f.answer}</p>}
              </details>
            </Reveal>
          ) : <Skeleton key={i} height={56} />)}
        </div>
        <p className="text-center mt-8 text-ink-soft">Still have a question? <a href={`mailto:${SITE.contactEmail}`} className="text-brand font-semibold hover:underline">Write to us</a></p>
      </div>
    </section>
  );
}

/* ---------- Final call to action + scholarship alerts ---------- */
export function JoinSection() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState({ status: 'idle', message: '' });
  const submit = async (e) => {
    e.preventDefault();
    setState({ status: 'busy', message: '' });
    try {
      await api.post('/public/subscribe', { email });
      setState({ status: 'done', message: 'Thank you! We will email you when new scholarships and guides are added.' });
      setEmail('');
    } catch (err) {
      setState({ status: 'error', message: errorMessage(err) });
    }
  };
  return (
    <section className="bg-brand text-white">
      <div className="max-w-[1200px] mx-auto px-5 py-16 md:py-20 grid md:grid-cols-2 gap-10 items-center">
        <Reveal>
          <h2 className="text-white text-3xl md:text-4xl font-bold max-w-[18ch]">Join INUKA today. It's completely free.</h2>
          <p className="text-white/80 mt-3 max-w-md">Start your first lesson in two minutes. No payment, no card, ever.</p>
          <Button to="/register" variant="accent" className="mt-6 min-h-12 px-6 text-base">Create your free account</Button>
        </Reveal>
        <Reveal delay={120} className="bg-white/10 rounded-2xl p-6">
          <h3 className="text-white text-xl font-semibold">Get scholarship alerts</h3>
          <p className="text-white/75 mt-1 text-[15px]">Not ready to sign up? Get an email when new scholarships and guides are added.</p>
          {state.status === 'done' ? (
            <p role="status" className="mt-4 rounded-lg bg-surface text-brand px-4 py-3 font-medium">{state.message}</p>
          ) : (
            <form onSubmit={submit} className="mt-4 flex flex-col sm:flex-row gap-2" noValidate>
              <label htmlFor="alert-email" className="sr-only">Email address</label>
              <input id="alert-email" type="email" required autoComplete="email" placeholder="Your email address" value={email} onChange={(e) => setEmail(e.target.value)}
                className="flex-1 min-h-12 rounded-lg px-4 text-ink bg-surface focus:outline-none focus:ring-2 focus:ring-accent" />
              <Button type="submit" variant="accent" loading={state.status === 'busy'} className="min-h-12">Subscribe</Button>
            </form>
          )}
          {state.status === 'error' && <p role="alert" className="mt-2 text-sm text-red-200">{state.message}</p>}
          <p className="text-white/55 text-xs mt-3">We only email you about new scholarships and guides. We never share your address.</p>
        </Reveal>
      </div>
    </section>
  );
}
