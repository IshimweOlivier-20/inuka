import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Award, BookOpen, Bot, ChevronLeft, ChevronRight, GraduationCap, HeartHandshake, ListChecks, ShieldCheck } from 'lucide-react';

// Navy panel that overlaps the bottom of the home hero: a title on the left and a row of
// coloured cards (courses, lessons, scholarships…) with live numbers. Arrows slide the row.
const fmt = (n) => (n == null ? '…' : n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K+` : String(n));

export default function PlatformPanel({ stats }) {
  const s = stats || {};
  const cards = [
    { to: '/learn', icon: BookOpen, label: 'Courses', value: fmt(s.courseCount), tone: 'text-green' },
    { to: '/learn', icon: ListChecks, label: 'Lessons', value: fmt(s.lessonCount), tone: 'text-coral' },
    { to: '/opportunities', icon: GraduationCap, label: 'Scholarships', value: fmt(s.scholarshipCount), tone: 'text-blue' },
    { to: '/opportunities?refugees=open', icon: ShieldCheck, label: 'Open to refugees', value: fmt(s.refugeeScholarshipCount), tone: 'text-accent-hover' },
    { to: '/register', icon: HeartHandshake, label: 'Mentors', value: s.mentorCount >= 10 ? fmt(s.mentorCount) : 'Free', tone: 'text-green' },
    { to: '/register', icon: Bot, label: 'INUKA AI', value: '24/7', tone: 'text-coral' },
    { to: '/learn', icon: Award, label: 'Certificates', value: 'Free', tone: 'text-blue' },
  ];

  const track = useRef(null);
  const [edge, setEdge] = useState({ start: true, end: false });
  const update = () => {
    const el = track.current;
    if (!el) return;
    setEdge({ start: el.scrollLeft < 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 });
  };
  useEffect(() => {
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  const slide = (dir) => {
    const el = track.current;
    const card = el?.querySelector('li');
    if (!el || !card) return;
    el.scrollBy({ left: dir * (card.offsetWidth + 16) * (window.innerWidth >= 1024 ? 3 : 1), behavior: 'smooth' });
  };

  const Arrow = ({ dir, disabled }) => (
    <button type="button" onClick={() => slide(dir)} disabled={disabled} aria-label={dir < 0 ? 'Previous cards' : 'Next cards'}
      className="shrink-0 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white hover:text-night disabled:opacity-30 disabled:hover:bg-white/10 disabled:hover:text-white transition-colors">
      {dir < 0 ? <ChevronLeft size={20} aria-hidden="true" /> : <ChevronRight size={20} aria-hidden="true" />}
    </button>
  );

  return (
    <section className="relative z-10 -mt-24 md:-mt-28 px-5" aria-labelledby="platform-title">
      <div className="max-w-[1100px] mx-auto bg-night rounded-lg shadow-[0_34px_70px_-34px_rgba(7,41,77,0.75)] px-6 py-8 sm:px-10 sm:py-10 grid lg:grid-cols-[230px_1fr] gap-7 lg:gap-8 items-center">
        <h2 id="platform-title" className="text-white text-xl sm:text-2xl font-bold leading-snug">
          One place to <span className="text-accent">learn, apply</span> and grow
        </h2>

        <div className="flex items-center gap-3 min-w-0">
          <span className="hidden sm:block"><Arrow dir={-1} disabled={edge.start} /></span>
          <ul ref={track} onScroll={update}
            className="flex-1 min-w-0 flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {cards.map(({ to, icon: Icon, label, value, tone }) => (
              <li key={label} className="snap-start shrink-0 w-[46%] sm:w-[31%] lg:w-[calc((100%-2rem)/3)]">
                <Link to={to}
                  className="group h-full bg-white text-night rounded-xl px-4 py-6 flex flex-col items-center justify-center text-center hover:-translate-y-1 hover:shadow-[0_16px_30px_-14px_rgba(0,0,0,0.6)] transition-[transform,box-shadow] duration-300">
                  <Icon size={32} strokeWidth={1.6} aria-hidden="true" className={`${tone} transition-transform duration-300 group-hover:scale-110`} />
                  <span className="mt-3 font-display text-xl font-bold leading-none tabular-nums">{value}</span>
                  <span className="mt-1.5 text-sm font-semibold text-[#5F6670]">{label}</span>
                </Link>
              </li>
            ))}
          </ul>
          <span className="hidden sm:block"><Arrow dir={1} disabled={edge.end} /></span>
        </div>
      </div>
    </section>
  );
}
