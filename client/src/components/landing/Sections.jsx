import { useState } from 'react';
import { Link } from 'react-router-dom';
import Reveal from '../ui/Reveal';
import { Button, Pill } from '../ui';
import { Skeleton } from '../ui/Skeletons';
import { Avatar, CATEGORY_LABEL, SampleBadge, SectionHeading } from './common';
import { SITE } from '../../config/site';
import { api, errorMessage } from '../../services/api';
import { formatDate } from '../../utils/format';

/* ---------- Who INUKA is for ---------- */
const AUDIENCES = [
  { icon: '🎓', title: 'High school graduates', text: 'You finished S4, S5 or S6 and want to go to university, but you are not sure where to start.', points: ['Improve your English', 'Learn computer basics', 'Find scholarships you qualify for'] },
  { icon: '🏕️', title: 'Refugee and displaced youth', text: 'You have finished secondary school and want to continue, wherever you live now.', points: ['See refugee-friendly scholarships', 'Know which documents to prepare', 'Get guidance from mentors'] },
  { icon: '🤝', title: 'Mentors', text: 'You work in education or you have been through the process, and you want to help.', points: ['Share your experience', 'Review essays and plans', 'Choose your own hours'] },
];

export function AudienceSection() {
  return (
    <section id="who" className="scroll-mt-16 max-w-[1200px] mx-auto px-5 py-16 md:py-20">
      <Reveal><SectionHeading title="Who INUKA is for" intro="One platform for the whole journey, from your last school exam to your first university day." /></Reveal>
      <div className="grid md:grid-cols-3 gap-5">
        {AUDIENCES.map((a, i) => (
          <Reveal key={a.title} delay={i * 110} className="bg-white rounded-2xl border border-line p-6 flex flex-col">
            <span className="text-4xl" aria-hidden>{a.icon}</span>
            <h3 className="text-xl font-semibold mt-4">{a.title}</h3>
            <p className="text-ink-soft mt-2">{a.text}</p>
            <ul className="mt-4 space-y-2 flex-1">
              {a.points.map((p) => <li key={p} className="flex gap-2"><span className="text-forest font-bold" aria-hidden>✓</span>{p}</li>)}
            </ul>
            <Link to="/register" className="mt-5 text-forest font-semibold hover:underline">{a.title === 'Mentors' ? 'Become a mentor' : 'Start for free'}</Link>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ---------- Scrolling strip of scholarship providers ---------- */
export function ProviderStrip({ providers }) {
  if (!providers?.length) return null;
  const items = [...providers, ...providers]; // doubled for a seamless loop
  return (
    <section className="bg-white border-b border-line py-6 overflow-hidden" aria-label="Scholarship programmes listed on INUKA">
      <p className="text-center text-sm text-ink-soft mb-4 px-5">Find scholarships from programmes like these. INUKA lists them for free; it is not affiliated with them.</p>
      <div className="marquee group relative">
        <ul className="marquee-track flex w-max gap-10 group-hover:[animation-play-state:paused]">
          {items.map((p, i) => (
            <li key={i} aria-hidden={i >= providers.length} className="font-display font-semibold text-lg text-ink/45 whitespace-nowrap">{p}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ---------- Tips ---------- */
export function TipsSection({ tips }) {
  if (tips && !tips.length) return null;
  return (
    <section id="tips" className="scroll-mt-16 bg-leaf py-16 md:py-20">
      <div className="max-w-[1200px] mx-auto px-5">
        <Reveal><SectionHeading title="Tips for a strong application" intro="Small habits make a big difference. Our mentors see these mistakes and wins again and again." /></Reveal>
        <ul className="flex sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-4 overflow-x-auto snap-x snap-mandatory pb-2 -mx-5 px-5 sm:mx-0 sm:px-0">
          {(tips || Array.from({ length: 4 }, () => null)).map((t, i) => (
            <Reveal as="li" key={t?.id ?? i} delay={(i % 4) * 90} className="snap-start shrink-0 w-[78%] sm:w-auto bg-white rounded-xl p-5 border border-forest/10">
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
          <Reveal as="li" key={t.id} delay={i * 110} className="snap-start shrink-0 w-[85%] sm:w-[60%] md:w-auto bg-white rounded-2xl border border-line p-6 flex flex-col">
            <span className="font-display text-6xl leading-none text-gold" aria-hidden>“</span>
            <blockquote className="text-lg -mt-4 flex-1">{t.quote}</blockquote>
            <figcaption className="mt-6 flex items-center gap-3">
              <Avatar name={t.name} photoUrl={t.photoUrl} index={i} size="w-12 h-12 text-base" />
              <span className="flex-1">
                <span className="block font-semibold">{t.name}</span>
                <span className="block text-sm text-ink-soft">{[t.role, t.country].filter(Boolean).join(', ')}</span>
              </span>
              <SampleBadge show={t.isSample} />
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
    <Reveal as="li" delay={(i % 3) * 110} className="group relative bg-paper rounded-2xl border border-line overflow-hidden flex flex-col hover:border-forest/40 transition-colors">
      <div className="h-36 bg-gradient-to-br from-leaf to-[#DDEFE4] flex items-center justify-center text-6xl" aria-hidden>{p.coverEmoji || '📰'}</div>
      <div className="p-5 flex-1 flex flex-col">
        <div className="flex items-center gap-2 text-sm text-ink-soft">
          <Pill tone={p.category === 'news' ? 'amber' : 'forest'}>{CATEGORY_LABEL[p.category] || p.category}</Pill>
          <span>{p.readMinutes} min read</span>
          <SampleBadge show={p.isSample} />
        </div>
        <h3 className="font-semibold text-lg leading-snug mt-3">
          <Link to={`/news/${p.slug}`} className="after:absolute after:inset-0 group-hover:text-forest">{p.title}</Link>
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
    <section id="news" className="scroll-mt-16 bg-white border-y border-line py-16 md:py-20"><div className="max-w-[1200px] mx-auto px-5">
      <Reveal className="flex flex-wrap items-end justify-between gap-4">
        <SectionHeading title="News & guides" intro="Practical guides for your application, and updates from INUKA." />
        <Link to="/news" className="mb-10 text-forest font-semibold hover:underline">See all articles</Link>
      </Reveal>
      <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {posts ? posts.map((p, i) => <PostCard key={p.id} p={p} i={i} />)
          : [0, 1, 2].map((i) => <li key={i} className="bg-white rounded-2xl border border-line overflow-hidden"><Skeleton height={144} borderRadius={0} /><div className="p-5"><Skeleton width={120} /><Skeleton height={22} className="mt-3" /><Skeleton count={2} /></div></li>)}
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
            <Reveal as="li" key={m.id} delay={(i % 4) * 90} className="rounded-2xl bg-white border border-line p-4 sm:p-6 text-center flex flex-col items-center">
              <Avatar name={m.name} photoUrl={m.photoUrl} index={i} size="w-16 h-16 text-xl sm:w-24 sm:h-24 sm:text-2xl" />
              <h3 className="font-semibold sm:text-lg mt-3 sm:mt-4 leading-snug">{m.name}</h3>
              <p className="text-forest font-medium text-sm">{m.role}</p>
              {m.bio && <p className="text-ink-soft text-xs sm:text-sm mt-2 sm:mt-3">{m.bio}</p>}
              <div className="mt-3 flex items-center gap-2">
                {m.linkedinUrl && <a href={m.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-forest font-semibold hover:underline">LinkedIn</a>}
                <SampleBadge show={m.isSample} />
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
  const inner = p.logoUrl
    ? <img src={p.logoUrl} alt={p.name} loading="lazy" className="max-h-12 max-w-[80%] object-contain" />
    : <span className="font-display font-semibold text-ink/70 text-center leading-tight">{p.name}</span>;
  const cls = 'relative h-24 rounded-xl border border-line bg-paper flex items-center justify-center px-4 hover:border-forest/40 transition-colors';
  return (
    <li title={p.description || p.name}>
      {p.websiteUrl
        ? <a href={p.websiteUrl} target="_blank" rel="noopener noreferrer" className={cls}>{inner}</a>
        : <div className={cls}>{inner}</div>}
      {p.isSample && <div className="mt-1.5 text-center"><SampleBadge show /></div>}
    </li>
  );
}

export function PartnersSection({ partners }) {
  const list = partners || [];
  const groups = [['partner', 'Partners'], ['sponsor', 'Sponsors']].map(([k, l]) => [l, list.filter((p) => p.kind === k)]).filter(([, g]) => g.length);
  return (
    <section id="partners" className="scroll-mt-16 bg-white border-t border-line py-16 md:py-20"><div className="max-w-[1200px] mx-auto px-5">
      <Reveal><SectionHeading title="Partners & sponsors" intro="Organisations that help INUKA stay free and reach more young people." /></Reveal>
      {groups.map(([label, g]) => (
        <div key={label} className="mb-8">
          <h3 className="text-sm font-semibold text-ink-soft mb-3">{label}</h3>
          <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">{g.map((p) => <PartnerLogo key={p.id} p={p} />)}</ul>
        </div>
      ))}
      <Reveal className="rounded-2xl bg-ink text-white p-6 md:p-8 flex flex-col md:flex-row md:items-center gap-5">
        <div className="flex-1">
          <h3 className="text-white text-xl font-semibold">Support INUKA</h3>
          <p className="text-white/75 mt-1 max-w-2xl">Universities, NGOs, telecoms and foundations can help: share opportunities, sponsor free data, fund courses, or volunteer mentors.</p>
        </div>
        <Button href={`mailto:${SITE.partnersEmail}?subject=Partnering%20with%20INUKA`} variant="gold">Become a partner</Button>
      </Reveal>
    </div></section>
  );
}

/* ---------- FAQ ---------- */
export function FaqSection({ faq }) {
  if (faq && !faq.length) return null;
  return (
    <section id="faq" className="scroll-mt-16 bg-leaf py-16 md:py-20">
      <div className="max-w-3xl mx-auto px-5">
        <Reveal><SectionHeading title="Questions students ask" align="center" /></Reveal>
        <div className="space-y-3">
          {(faq || [null, null, null]).map((f, i) => f ? (
            <Reveal key={f.id} delay={Math.min(i, 4) * 60}>
              <details className="faq group bg-white rounded-xl border border-forest/10 open:border-forest/30">
                <summary className="flex items-center justify-between gap-4 cursor-pointer list-none px-5 min-h-14 py-3 font-semibold">
                  {f.question}
                  <span className="faq-icon shrink-0 w-8 h-8 rounded-full bg-leaf text-forest flex items-center justify-center text-xl transition-transform group-open:rotate-45" aria-hidden>+</span>
                </summary>
                <p className="px-5 pb-5 text-ink-soft">{f.answer}</p>
              </details>
            </Reveal>
          ) : <Skeleton key={i} height={56} />)}
        </div>
        <p className="text-center mt-8 text-ink-soft">Still have a question? <a href={`mailto:${SITE.contactEmail}`} className="text-forest font-semibold hover:underline">Write to us</a></p>
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
    <section className="bg-forest text-white">
      <div className="max-w-[1200px] mx-auto px-5 py-16 md:py-20 grid md:grid-cols-2 gap-10 items-center">
        <Reveal>
          <h2 className="text-white text-3xl md:text-4xl font-bold max-w-[18ch]">Join INUKA today. It's completely free.</h2>
          <p className="text-white/80 mt-3 max-w-md">Start your first lesson in two minutes. No payment, no card, ever.</p>
          <Button to="/register" variant="gold" className="mt-6 min-h-12 px-6 text-base">Create your free account</Button>
        </Reveal>
        <Reveal delay={120} className="bg-white/10 rounded-2xl p-6">
          <h3 className="text-white text-xl font-semibold">Get scholarship alerts</h3>
          <p className="text-white/75 mt-1 text-[15px]">Not ready to sign up? Get an email when new scholarships and guides are added.</p>
          {state.status === 'done' ? (
            <p role="status" className="mt-4 rounded-lg bg-white text-forest px-4 py-3 font-medium">{state.message}</p>
          ) : (
            <form onSubmit={submit} className="mt-4 flex flex-col sm:flex-row gap-2" noValidate>
              <label htmlFor="alert-email" className="sr-only">Email address</label>
              <input id="alert-email" type="email" required autoComplete="email" placeholder="Your email address" value={email} onChange={(e) => setEmail(e.target.value)}
                className="flex-1 min-h-12 rounded-lg px-4 text-ink bg-white focus:outline-none focus:ring-2 focus:ring-gold" />
              <Button type="submit" variant="gold" loading={state.status === 'busy'} className="min-h-12">Subscribe</Button>
            </form>
          )}
          {state.status === 'error' && <p role="alert" className="mt-2 text-sm text-amber-200">{state.message}</p>}
          <p className="text-white/55 text-xs mt-3">We only email you about new scholarships and guides. We never share your address.</p>
        </Reveal>
      </div>
    </section>
  );
}
