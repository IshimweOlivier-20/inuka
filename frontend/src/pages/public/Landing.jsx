import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import LandingNav from '../../components/layout/LandingNav';
import Reveal from '../../components/ui/Reveal';
import SiteFooter from '../../components/landing/SiteFooter';
import PhotoHero from '../../components/landing/PhotoHero';
import PlatformPanel from '../../components/landing/PlatformPanel';
import FeaturedCourses from '../../components/landing/FeaturedCourses';
import MissionSection from '../../components/landing/MissionSection';
import ImpactSection from '../../components/landing/ImpactSection';
import ToolsSection from '../../components/landing/ToolsSection';
import AccessibilitySection from '../../components/landing/AccessibilitySection';
import {
  AudienceSection, FaqSection, JoinSection, PartnersSection,
  TeamSection, TestimonialsSection,
} from '../../components/landing/Sections';
import { api } from '../../services/api';

const STEPS = [
  { title: 'Learn', text: 'Take free English and computer courses made for beginners. Short lessons, simple words, audio with transcripts, and a certificate anyone can verify.' },
  { title: 'Discover', text: 'Type your S6 results to see the universities, colleges and scholarships that fit you, including second-chance paths and options for refugees.' },
  { title: 'Prepare & apply', text: 'Follow your readiness score, upload your documents, get letters from your teachers, check offers for scams and apply with a mentor’s help.' },
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
      <LandingNav solid />

      <PhotoHero />
      <PlatformPanel stats={data?.stats} />

      <MissionSection />
      <FeaturedCourses />
      <AudienceSection />
      <ToolsSection />
      <AccessibilitySection />

      {/* How it works */}
      <section id="how-it-works" className="scroll-mt-16 bg-surface border-y border-line py-16 md:py-20">
        <div className="max-w-[1200px] mx-auto px-5">
          <Reveal as="h2" className="text-2xl sm:text-[2.1rem] font-bold text-brand mb-10">How INUKA works</Reveal>
          <ol className="grid md:grid-cols-3 gap-8">
            {STEPS.map((s, i) => (
              <Reveal as="li" key={s.title} delay={i * 120} className="relative pl-16">
                <span className="absolute left-0 top-0 w-11 h-11 rounded-full bg-accent text-night font-display font-bold text-lg flex items-center justify-center">{i + 1}</span>
                <h3 className="text-lg font-bold text-brand mb-1.5">{s.title}</h3>
                <p className="text-ink-soft text-[15px]">{s.text}</p>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      <ImpactSection />
      <TestimonialsSection testimonials={data?.testimonials} />
      <TeamSection team={data?.team} />
      <PartnersSection partners={data?.partners} />
      <FaqSection faq={failed ? [] : data?.faq} />
      <JoinSection />
      <SiteFooter />
    </div>
  );
}
