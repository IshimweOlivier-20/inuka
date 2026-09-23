import { Link } from 'react-router-dom';
import Reveal from '../ui/Reveal';
import { Button } from '../ui';
import { Person, Sparkle } from './HeroSlides';

const GOLD = '#FAAC00';
const FOREST = '#00652F';
const SPROUT = '#03A01F';
const PAPER = '#F9FAFB';
const INK = '#1A1A2E';
const SKY = '#3B82C4';

// Three young people celebrating together on a hill under the INUKA sun.
function HappyYouthArt() {
  return (
    <svg viewBox="0 96 480 296" className="mission-art w-full" role="img"
      aria-label="Three happy young people on a hill: one celebrating with arms raised, one holding an open book, one holding a phone showing a green tick">
      {/* warm glow and sun arc, like the INUKA logo */}
      <circle cx="240" cy="235" r="135" fill="#FFF4D6" />
      <path d="M52 340 A190 190 0 0 1 428 340" fill="none" stroke={GOLD} strokeWidth="14" strokeLinecap="round" />

      {/* centre: arms raised in celebration (drawn behind the body) */}
      <path d="M200 232 L162 142" stroke={GOLD} strokeWidth="26" strokeLinecap="round" />
      <path d="M280 232 L318 142" stroke={GOLD} strokeWidth="26" strokeLinecap="round" />
      <circle cx="160" cy="134" r="14" fill="#5E3A22" />
      <circle cx="320" cy="134" r="14" fill="#5E3A22" />
      <Person x={240} y={178} s={1.05} skin="#5E3A22" hair="puff" shirt={GOLD} />

      <Person x={112} y={214} s={0.9} skin="#7A4A2C" hair="short" shirt={SKY} />
      <Person x={368} y={214} s={0.9} skin="#8D5A3B" hair="wrap" shirt={SPROUT} />

      {/* rounded hill they stand on */}
      <ellipse cx="240" cy="378" rx="200" ry="9" fill="#000" opacity=".08" />
      <path d="M16 352 C40 300 150 266 240 266 C330 266 440 300 464 352 C380 384 100 384 16 352 Z" fill={FOREST} />
      <path d="M44 360 C130 326 350 326 436 360 C360 382 120 382 44 360 Z" fill="#004D23" />

      {/* forearms reaching to the book and the phone */}
      <path d="M60 282 L72 314" stroke={SKY} strokeWidth="17" strokeLinecap="round" />
      <path d="M164 282 L152 314" stroke={SKY} strokeWidth="17" strokeLinecap="round" />
      <path d="M326 284 L358 336" stroke={SPROUT} strokeWidth="17" strokeLinecap="round" />

      {/* open book held by the left student */}
      <path d="M70 300 c14 -8 28 -8 42 2 c14 -10 28 -10 42 -2 v34 c-14 -8 -28 -8 -42 2 c-14 -10 -28 -10 -42 -2z" fill={PAPER} />
      <path d="M112 302 v34" stroke={FOREST} strokeWidth="2" />
      <path d="M80 312 c10 -4 20 -4 28 0 M80 322 c10 -4 20 -4 28 0 M116 312 c10 -4 20 -4 28 0 M116 322 c10 -4 20 -4 28 0" stroke={FOREST} strokeOpacity=".35" strokeWidth="2" fill="none" />
      <ellipse cx="72" cy="318" rx="9" ry="7" fill="#7A4A2C" />
      <ellipse cx="152" cy="318" rx="9" ry="7" fill="#7A4A2C" />

      {/* phone held by the right student */}
      <rect x="352" y="282" width="40" height="64" rx="8" fill={INK} />
      <rect x="356" y="290" width="32" height="46" rx="4" fill="#E8F6EC" />
      <circle cx="372" cy="312" r="10" fill={SPROUT} />
      <path d="M367 312 l4 4 l7 -8" stroke={PAPER} strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <ellipse cx="360" cy="342" rx="10" ry="7" fill="#8D5A3B" />

      {/* sprout growing on the hill */}
      <path d="M240 330 c0 -14 2 -24 2 -24" stroke={GOLD} strokeWidth="4" strokeLinecap="round" fill="none" />
      <path d="M242 310 c10 -8 20 -6 22 0 -9 7 -16 6 -22 0z M241 318 c-10 -7 -18 -5 -20 1 8 5 14 4 20 -1z" fill={GOLD} />

      <Sparkle x={190} y={112} r={6} />
      <Sparkle x={310} y={112} r={5} color={SPROUT} />
      <Sparkle x={42} y={170} r={5} />
      <Sparkle x={444} y={160} r={6} color={SPROUT} />
    </svg>
  );
}

export default function MissionSection() {
  return (
    <section id="mission" className="scroll-mt-16 bg-white py-16 md:py-24 overflow-hidden">
      <div className="max-w-[1200px] mx-auto px-5 grid lg:grid-cols-[1.1fr_1fr] gap-10 lg:gap-16 items-center">
        {/* Illustration first (left on desktop, top on phones): the opposite of the hero */}
        <Reveal className="max-w-xl mx-auto w-full lg:max-w-none">
          <HappyYouthArt />
        </Reveal>

        <Reveal delay={150}>
          <span className="block w-14 h-1.5 rounded-full bg-gold" aria-hidden="true" />
          <h2 className="mt-5 text-3xl sm:text-4xl md:text-[2.9rem] font-bold leading-[1.1] tracking-tight">
            Talent is everywhere. <span className="text-forest">Opportunity should be too.</span>
          </h2>
          <p className="mt-6 text-lg text-ink-soft">
            Every year, thousands of young people finish secondary school across Africa, including young refugees,
            with the grades and the drive to go further. Many of them are not missing ability. They are missing access:
            to English, to digital skills, to information about scholarships, and to someone who can guide them.
          </p>
          <p className="mt-4 text-lg text-ink-soft">
            INUKA brings all of that together in one free place, so a student with a phone and a dream can rise to university.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Button to="/register" className="min-h-12 px-6">Start learning for free</Button>
            <Link to="/news" className="font-semibold text-forest hover:underline">Read our guides →</Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
