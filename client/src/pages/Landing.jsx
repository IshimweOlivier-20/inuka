import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import LandingNav from '../components/layout/LandingNav';
import { Button, Pill } from '../components/ui';
import Reveal from '../components/ui/Reveal';
import { FeaturedScholarshipsSkeleton, Skeleton } from '../components/ui/Skeletons';
import SiteFooter from '../components/landing/SiteFooter';
import HeroSlider from '../components/landing/HeroSlider';
import {
  AudienceSection, FaqSection, JoinSection, NewsSection, PartnersSection,
  ProviderStrip, TeamSection, TestimonialsSection, TipsSection,
} from '../components/landing/Sections';
import { api } from '../services/api';
import { FUNDING_LABEL, deadlineTone } from '../utils/format';

const STEPS = [
  { title: 'Learn', text: 'Take free English and computer courses made for beginners. Short lessons, simple words, audio support.' },
  { title: 'Discover', text: 'Find scholarships in Africa and around the world, filtered for your level and your situation.' },
  { title: 'Apply', text: 'Get your documents ready, get help from a mentor, and apply with confidence.' },
];

const FEATURES = [
  ['🤖', 'INUKA AI', 'Ask questions any time, day or night.'],
  ['📖', 'English courses', 'From your first words to a strong personal statement.'],
  ['💻', 'Computer skills', 'Email, Google Docs, uploading files, video calls.'],
  ['🎓', 'Scholarship search', 'Filter by region, level, funding and refugee eligibility.'],
  ['🗂️', 'Document vault', 'Keep your ID, reports and letters in one safe place.'],
  ['📈', 'Progress tracker', 'See your streak, badges and certificates.'],
  ['🤝', 'Mentors', 'Book a session with someone who has done it before.'],
  ['📱', 'Works on any phone', 'Built for slow connections and small screens.'],
];

export default function Landing() {
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);
  const { hash } = useLocation();
  useEffect(() => { api.get('/public/landing').then((r) => setData(r.data)).catch(() => setFailed(true)); }, []);
  // Arriving from another page with a link like /#faq: scroll there once the sections exist.
  useEffect(() => {
    if (!hash || (!data && !failed)) return;
    const t = setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth' }), 50);
    return () => clearTimeout(t);
  }, [hash, data, failed]);
  const stats = data?.stats;

  return (
    <div id="top" className="bg-paper">
      <LandingNav />

      <section className="bg-gradient-to-br from-forest to-[#0F4424] text-white pt-32 pb-16 md:pt-40 md:pb-24">
        <div className="max-w-[1200px] mx-auto px-5 grid md:grid-cols-[1.1fr_1fr] gap-10 items-center">
          <div className="hero-copy">
            <h1 className="text-white text-[2.6rem] sm:text-6xl font-bold leading-[1.05] tracking-tight">Your future<br />starts here.</h1>
            <p className="mt-6 text-lg sm:text-xl text-white/85 max-w-[34ch]">
              Learn English, build computer skills, find scholarships and meet mentors. Made for African high school graduates and refugees. Always free.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button to="/register" variant="gold" className="text-base px-6 min-h-12">Get started — it's free</Button>
              <Button to="/login" variant="ghost" className="text-white hover:bg-white/10 min-h-12 border-2 border-white/40">Sign in</Button>
            </div>
            <p className="mt-6 text-sm text-white/70">“Inuka” means <em>rise up</em> in Kiswahili.</p>
          </div>
          <div className="flex justify-center"><HeroSlider /></div>
        </div>
      </section>

      <section className="border-b border-line bg-white">
        <dl className="max-w-[1200px] mx-auto px-5 py-6 grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          {[
            [stats?.scholarshipCount, 'Scholarships listed'],
            [stats?.courseCount, 'Courses'],
            [stats?.lessonCount, 'Lessons'],
            ['Free', 'For every student, forever'],
          ].map(([v, l], i) => (
            <Reveal key={l} delay={i * 80}>
              <dt className="sr-only">{l}</dt>
              <dd className="font-display text-3xl font-bold text-forest">
                {v ?? (failed ? '—' : <Skeleton width={56} height={36} />)}
              </dd>
              <dd className="text-sm text-ink-soft">{l}</dd>
            </Reveal>
          ))}
        </dl>
      </section>

      <ProviderStrip providers={data?.providers} />
      <AudienceSection />

      <section id="how-it-works" className="scroll-mt-16 bg-white border-y border-line py-16 md:py-20"><div className="max-w-[1200px] mx-auto px-5">
        <Reveal as="h2" className="text-3xl font-bold mb-10">How INUKA works</Reveal>
        <ol className="grid md:grid-cols-3 gap-8">
          {STEPS.map((s, i) => (
            <Reveal as="li" key={s.title} delay={i * 120} className="relative pl-16">
              <span className="absolute left-0 top-0 w-12 h-12 rounded-full bg-gold text-ink font-display font-bold text-xl flex items-center justify-center">{i + 1}</span>
              <h3 className="text-xl font-semibold mb-2">{s.title}</h3>
              <p className="text-ink-soft">{s.text}</p>
            </Reveal>
          ))}
        </ol>
      </div></section>

      <section id="features" className="scroll-mt-16 bg-leaf py-16 md:py-20">
        <div className="max-w-[1200px] mx-auto px-5">
          <Reveal as="h2" className="text-3xl font-bold mb-10">Everything in one place</Reveal>
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-8">
            {FEATURES.map(([icon, t, d], i) => (
              <Reveal as="li" key={t} delay={(i % 4) * 90} className="flex gap-4">
                <span className="text-3xl" aria-hidden>{icon}</span>
                <div><h3 className="font-semibold">{t}</h3><p className="text-ink-soft text-[15px]">{d}</p></div>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      {!(data && !data.featured.length) && !failed && (
        <section id="scholarships" className="scroll-mt-16 max-w-[1200px] mx-auto px-5 py-16 md:py-20">
          <Reveal className="flex flex-wrap items-end justify-between gap-4 mb-8">
            <h2 className="text-3xl font-bold">Scholarships you can find on INUKA</h2>
            <Link to="/register" className="text-forest font-semibold hover:underline">Sign up to see all of them</Link>
          </Reveal>
          {!data ? <FeaturedScholarshipsSkeleton /> : (
            <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.featured.map((s, i) => {
                const d = deadlineTone(s.deadline);
                return (
                  <Reveal as="li" key={s.id} delay={(i % 3) * 100} className="bg-white rounded-xl border border-line p-5">
                    <h3 className="font-semibold text-lg leading-snug">{s.name}</h3>
                    <p className="text-sm text-ink-soft mt-1">{s.orgName}, {s.hostCountry}</p>
                    <div className="flex flex-wrap gap-2 mt-4">
                      <Pill tone={s.fundingType === 'fully_funded' ? 'green' : 'amber'}>{FUNDING_LABEL[s.fundingType]}</Pill>
                      {s.openToRefugees && <Pill tone="teal">Open to refugees ✓</Pill>}
                      <Pill tone={d.tone}>{d.text}</Pill>
                    </div>
                  </Reveal>
                );
              })}
            </ul>
          )}
        </section>
      )}

      <TipsSection tips={data?.tips} />
      <TestimonialsSection testimonials={data?.testimonials} />
      <NewsSection posts={failed ? [] : data?.posts} />
      <TeamSection team={data?.team} />
      <PartnersSection partners={data?.partners} />
      <FaqSection faq={failed ? [] : data?.faq} />
      <JoinSection />
      <SiteFooter />
    </div>
  );
}
