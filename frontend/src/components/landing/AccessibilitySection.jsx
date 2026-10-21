import { Link } from 'react-router-dom';
import {
  Accessibility, ALargeSmall, ArrowRight, Building2, Captions, Contrast, GraduationCap, Keyboard, Lock, Mic, Timer, Type, Volume2,
} from 'lucide-react';
import Reveal from '../ui/Reveal';

// Home page: what INUKA offers students with disabilities (and anyone who needs an easier way to read and type).
const FEATURES = [
  [ALargeSmall, 'Bigger text', 'Normal, large or extra-large text on every page.'],
  [Contrast, 'High contrast', 'Darker text and stronger borders for low vision.'],
  [Type, 'Easy-to-read font', 'Letters that are easier to tell apart, for low vision and dyslexia.'],
  [Volume2, 'Read aloud', 'Select any text and listen to it.'],
  [Mic, 'Speak instead of typing', 'Voice typing in INUKA AI, writing practice and exams.'],
  [Captions, 'Transcripts', 'Read the words of lesson recordings, for deaf and hard-of-hearing students.'],
  [Timer, 'Extra exam time', '+25%, +50% or double time in every final exam.'],
  [Keyboard, 'Keyboard friendly', 'Clear focus, big buttons, works with screen readers.'],
];

export default function AccessibilitySection() {
  const open = () => window.dispatchEvent(new Event('inuka-open-a11y'));
  return (
    <section id="accessibility" aria-labelledby="a11y-title" className="scroll-mt-16 bg-brand text-white py-16 md:py-20">
      <div className="max-w-[1200px] mx-auto px-5 grid lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-10 items-start">
        <Reveal>
          <p className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.12em] text-accent">
            <span className="w-8 h-1 rounded-full bg-accent" aria-hidden="true" />Accessibility
          </p>
          <h2 id="a11y-title" className="mt-3 text-2xl sm:text-[2.1rem] font-bold leading-tight !text-white">Made for every learner, including students with disabilities</h2>
          <p className="mt-4 text-white/80 text-[15px] leading-relaxed">
            A disability should never decide who gets to study. On INUKA you can change how every page looks and sounds,
            learn with transcripts and voice typing, get extra time in exams, and find scholarships and universities that
            support students with disabilities.
          </p>
          <ul className="mt-6 space-y-3 text-[15px]">
            <li className="flex gap-3"><GraduationCap size={19} className="text-accent shrink-0 mt-0.5" aria-hidden="true" />
              <span><Link to="/opportunities?disability=yes" className="font-semibold underline-offset-4 hover:underline">Scholarships with disability support</Link><span className="text-white/75">: filter them in one tap.</span></span></li>
            <li className="flex gap-3"><Building2 size={19} className="text-accent shrink-0 mt-0.5" aria-hidden="true" />
              <span><Link to="/universities?accessible=1" className="font-semibold underline-offset-4 hover:underline">Universities with support offices</Link><span className="text-white/75">: accessible buildings and assistive technology.</span></span></li>
            <li className="flex gap-3"><Lock size={19} className="text-accent shrink-0 mt-0.5" aria-hidden="true" />
              <span><span className="font-semibold">Private by default</span><span className="text-white/75">: telling us about a disability is optional, never shown to others, and can be removed any time.</span></span></li>
          </ul>
          <div className="mt-8 flex flex-wrap gap-3">
            <button type="button" onClick={open}
              className="inline-flex items-center gap-2 min-h-11 px-5 rounded bg-accent text-night font-semibold text-[15px] hover:bg-accent-hover">
              <Accessibility size={18} aria-hidden="true" />Try the accessibility settings
            </button>
            <Link to="/tools#accessibility" className="inline-flex items-center gap-1.5 min-h-11 px-4 rounded border border-white/40 text-white font-semibold text-[15px] hover:bg-white/10">
              How it works<ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </Reveal>

        <ul className="grid sm:grid-cols-2 gap-3">
          {FEATURES.map(([Icon, title, text], i) => (
            <Reveal as="li" key={title} delay={(i % 2) * 80} className="rounded-md bg-white/[0.07] border border-white/15 p-4 flex gap-3">
              <span className="w-10 h-10 rounded-lg bg-accent text-night flex items-center justify-center shrink-0"><Icon size={19} aria-hidden="true" /></span>
              <span>
                <span className="block font-semibold text-[15px]">{title}</span>
                <span className="block text-sm text-white/75 mt-0.5">{text}</span>
              </span>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
