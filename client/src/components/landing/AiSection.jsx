import Reveal from '../ui/Reveal';
import { Button } from '../ui';

// Capability pills that orbit the INUKA AI core. Positions are % of the orbit box.
const PILLS = [
  { label: 'Available 24/7', icon: '🌙', style: { top: '6%', left: '4%' }, d: '0s' },
  { label: 'Scholarship guidance', icon: '🎓', style: { top: '10%', right: '0%' }, d: '0.6s' },
  { label: 'Essay feedback', icon: '✍️', style: { top: '44%', left: '-2%' }, d: '1.2s' },
  { label: 'Document checklist', icon: '📄', style: { top: '52%', right: '-4%' }, d: '0.3s' },
  { label: 'English help', icon: '🗣️', style: { bottom: '6%', left: '12%' }, d: '0.9s' },
  { label: 'Computer help', icon: '💻', style: { bottom: '10%', right: '8%' }, d: '1.5s' },
];

const CAN_DO = [
  'Find scholarships that fit your level and situation',
  'Get feedback on your personal statement',
  'Know exactly which documents to prepare',
  'Ask English grammar and vocabulary questions',
  'Get step-by-step help with online application forms',
  'Simple English, patient answers, any time of day',
];

function AiOrbit() {
  return (
    <div className="ai-orbit relative w-full max-w-[34rem] mx-auto aspect-square" aria-hidden="true">
      {/* rings */}
      <div className="absolute inset-0 rounded-full border border-forest/10" />
      <div className="absolute inset-[9%] rounded-full border border-forest/10 bg-white/40" />
      <div className="absolute inset-[20%] rounded-full bg-white/70 shadow-[0_20px_60px_-25px_rgba(0,101,47,0.35)]" />
      <div className="absolute inset-[29%] rounded-full bg-white shadow-[inset_0_2px_12px_rgba(0,101,47,0.08)]" />

      {/* light sweep turning around the core */}
      <div className="ai-sweep absolute inset-[9%] rounded-full" />

      {/* two thin arcs travelling in opposite directions */}
      <svg className="ai-spin absolute inset-[3%] w-[94%] h-[94%]" viewBox="0 0 100 100">
        <defs>
          <linearGradient id="arcA" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#03A01F" stopOpacity="0" /><stop offset="1" stopColor="#03A01F" /></linearGradient>
        </defs>
        <path d="M50 1 A49 49 0 0 1 99 50" fill="none" stroke="url(#arcA)" strokeWidth="0.7" strokeLinecap="round" />
      </svg>
      <svg className="ai-spin-reverse absolute inset-[14%] w-[72%] h-[72%]" viewBox="0 0 100 100">
        <path d="M50 99 A49 49 0 0 1 1 50" fill="none" stroke="#FAAC00" strokeWidth="0.9" strokeLinecap="round" />
        <circle cx="1" cy="50" r="1.6" fill="#FAAC00" />
      </svg>

      {/* glowing core */}
      <div className="ai-core absolute inset-[34%] rounded-full bg-gradient-to-br from-sprout via-forest to-[#00401D] flex items-center justify-center">
        <svg viewBox="0 0 64 64" className="w-1/2 h-1/2">
          <path d="M32 50 C32 38 33 28 34 20" stroke="#fff" strokeWidth="4" strokeLinecap="round" fill="none" />
          <path d="M34 24 c8 -9 18 -9 21 -4 -8 8 -15 8 -21 4z" fill="#fff" />
          <path d="M33 33 c-8 -7 -16 -6 -18 -1 7 6 13 6 18 1z" fill="#fff" opacity=".85" />
          <path d="M50 8 l1.6 4.4 4.4 1.6 -4.4 1.6 -1.6 4.4 -1.6 -4.4 -4.4 -1.6 4.4 -1.6z" fill="#FAAC00" />
        </svg>
      </div>

      {/* capability pills */}
      {PILLS.map((p) => (
        <span key={p.label} style={{ ...p.style, animationDelay: p.d }}
          className="ai-pill absolute inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-white/85 backdrop-blur border border-white shadow-[0_8px_24px_-8px_rgba(0,64,29,0.25)] px-3 py-1.5 sm:px-4 sm:py-2 text-[11px] sm:text-sm font-semibold text-forest">
          <span>{p.icon}</span>{p.label}
        </span>
      ))}
    </div>
  );
}

function ChatPreview() {
  return (
    <div className="rounded-2xl bg-white border border-line shadow-[0_24px_60px_-30px_rgba(0,64,29,0.45)] overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-line">
        <span className="relative w-10 h-10 rounded-full bg-gradient-to-br from-sprout to-forest flex items-center justify-center" aria-hidden="true">
          <svg viewBox="0 0 64 64" className="w-7 h-7">
            <path d="M32 50 C32 38 33 28 34 20" stroke="#fff" strokeWidth="4" strokeLinecap="round" fill="none" />
            <path d="M34 24 c8 -9 18 -9 21 -4 -8 8 -15 8 -21 4z" fill="#fff" />
            <path d="M33 33 c-8 -7 -16 -6 -18 -1 7 6 13 6 18 1z" fill="#fff" opacity=".85" />
          </svg>
        </span>
        <div className="flex-1">
          <p className="font-semibold leading-tight">INUKA AI</p>
          <p className="text-xs text-ink-soft">Your learning guide</p>
        </div>
        <span className="rounded-full bg-amber-100 text-amber-900 px-2.5 py-0.5 text-xs font-semibold">Preview</span>
      </div>
      <div className="px-5 py-5 space-y-3 bg-paper text-[15px]">
        <p className="max-w-[85%] rounded-2xl rounded-tl-sm bg-white border border-line px-4 py-2.5">Hi! I'm INUKA AI. I can help you find scholarships, improve your English, or prepare your application. What do you need?</p>
        <p className="max-w-[80%] ml-auto rounded-2xl rounded-tr-sm bg-forest text-white px-4 py-2.5">Which documents do I need for a scholarship?</p>
        <div className="max-w-[90%] rounded-2xl rounded-tl-sm bg-white border border-line px-4 py-3">
          <p>Good question! Most applications ask for:</p>
          <ul className="mt-2 space-y-1">
            {['Your S4, S5 and S6 reports', 'National ID or passport', 'Your diploma', 'A personal statement', 'Your UNHCR card, if you are a refugee'].map((d) => (
              <li key={d} className="flex gap-2"><span className="text-sprout font-bold" aria-hidden="true">✓</span>{d}</li>
            ))}
          </ul>
          <p className="mt-2 text-ink-soft text-sm">Always check the official website of each scholarship.</p>
        </div>
      </div>
      <div className="px-5 py-3 border-t border-line flex flex-wrap gap-2">
        {['Find a scholarship', 'Help with my essay', 'English question'].map((q) => (
          <span key={q} className="rounded-full border border-forest/25 text-forest px-3 py-1 text-sm font-medium">{q}</span>
        ))}
      </div>
    </div>
  );
}

export default function AiSection() {
  return (
    <section id="inuka-ai" className="ai-section scroll-mt-16 relative overflow-hidden py-16 md:py-24">
      <div className="relative max-w-[1200px] mx-auto px-5">
        <Reveal><AiOrbit /></Reveal>

        <Reveal className="mt-10 text-center max-w-3xl mx-auto">
          <span className="inline-flex items-center gap-2 rounded-full bg-gold/15 text-gold-dark border border-gold/30 px-3 py-1 text-sm font-semibold">Coming soon</span>
          <h2 className="mt-4 text-4xl md:text-[3.25rem] font-bold leading-[1.08] tracking-tight">
            Meet INUKA AI, <span className="text-forest">your guide that never sleeps</span>
          </h2>
          <p className="mt-5 text-lg text-ink-soft">
            Ask anything about scholarships, English, computers or university applications.
            INUKA AI answers in simple, clear English, day or night, and points you to official sources when it matters.
          </p>
        </Reveal>

        <div className="mt-12 grid lg:grid-cols-2 gap-10 items-center">
          <Reveal>
            <ul className="space-y-4">
              {CAN_DO.map((c) => (
                <li key={c} className="flex gap-3 text-lg">
                  <span className="mt-0.5 w-7 h-7 shrink-0 rounded-lg bg-forest text-white flex items-center justify-center text-sm font-bold" aria-hidden="true">✓</span>
                  {c}
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Button to="/register" className="min-h-12 px-6">Create your free account</Button>
              <span className="text-ink-soft">Be first to try it when it launches.</span>
            </div>
          </Reveal>
          <Reveal delay={150}><ChatPreview /></Reveal>
        </div>
      </div>
    </section>
  );
}
