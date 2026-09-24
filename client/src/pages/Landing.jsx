import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import LandingNav from '../components/layout/LandingNav';
import { Button } from '../components/ui';
import Reveal from '../components/ui/Reveal';
import SiteFooter from '../components/landing/SiteFooter';
import HeroSlider from '../components/landing/HeroSlider';
import MissionSection from '../components/landing/MissionSection';
import ImpactSection from '../components/landing/ImpactSection';
import AiSection from '../components/landing/AiSection';
import {
  AudienceSection, FaqSection, JoinSection, PartnersSection,
  TeamSection, TestimonialsSection,
} from '../components/landing/Sections';
import { api } from '../services/api';
import { BadgeCheck, BookOpen, GraduationCap, ListChecks } from 'lucide-react';
import IconTile from '../components/ui/IconTile';
import { Skeleton } from '../components/ui/Skeletons';

const STEPS = [
  { title: 'Learn', text: 'Take free English and computer courses made for beginners. Short lessons, simple words, audio support.' },
  { title: 'Discover', text: 'Find scholarships in Africa and around the world, filtered for your level and your situation.' },
  { title: 'Apply', text: 'Get your documents ready, get help from a mentor, and apply with confidence.' },
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

  return (
    <div id="top" className="bg-paper">
      <LandingNav />

      {/* Hero */}
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

      {/* Numbers bar under the hero (live from the database) */}
      <section className="bg-white border-b border-line" aria-label="INUKA in numbers">
        <dl className="max-w-[1200px] mx-auto px-5 py-7 grid grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            [GraduationCap, 'forest', data?.stats?.scholarshipCount, 'Scholarships listed'],
            [BookOpen, 'gold', data?.stats?.courseCount, 'Free courses'],
            [ListChecks, 'sprout', data?.stats?.lessonCount, 'Lessons'],
            [BadgeCheck, 'sky', 'Free', 'For every student, forever'],
          ].map(([icon, tone, value, label], i) => (
            <Reveal key={label} delay={i * 80} className="flex items-center gap-4">
              <IconTile icon={icon} tone={tone} size="md" />
              <div>
                <dt className="sr-only">{label}</dt>
                <dd className="font-display text-2xl sm:text-3xl font-bold text-ink leading-none">
                  {value ?? (failed ? '—' : <Skeleton width={48} height={28} />)}
                </dd>
                <dd className="text-sm text-ink-soft mt-1">{label}</dd>
              </div>
            </Reveal>
          ))}
        </dl>
      </section>

      <MissionSection />
      <AudienceSection />

      {/* How it works */}
      <section id="how-it-works" className="scroll-mt-16 bg-white border-y border-line py-16 md:py-20">
        <div className="max-w-[1200px] mx-auto px-5">
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
        </div>
      </section>

      <ImpactSection />
      <AiSection />
      <TestimonialsSection testimonials={data?.testimonials} />
      <TeamSection team={data?.team} />
      <PartnersSection partners={data?.partners} />
      <FaqSection faq={failed ? [] : data?.faq} />
      <JoinSection />
      <SiteFooter />
    </div>
  );
}
