import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Headphones, Laptop, ListChecks } from 'lucide-react';
import Reveal from '../ui/Reveal';
import { SectionHeading } from './common';
import { api } from '../../services/api';
import { plainText } from '../../utils/sanitize';
import { coursePhoto } from '../../config/photos';

// "Featured courses" on the home page: the first six published courses as cards.
// Style idea from the reference theme: coloured picture area, a yellow subject badge, a round yellow "Free" badge.
const SUBJECT = {
  english: { label: 'English', Icon: BookOpen },
  computer: { label: 'Computer skills', Icon: Laptop },
};

const BANDS = ['bg-brand', 'bg-green', 'bg-blue', 'bg-coral'];

// Mix the subjects (English, Computer, English…) so the row is not all one subject.
function pick(courses) {
  const en = courses.filter((c) => c.category === 'english');
  const pc = courses.filter((c) => c.category !== 'english');
  const out = [];
  while ((en.length || pc.length) && out.length < 6) { if (en.length) out.push(en.shift()); if (pc.length && out.length < 6) out.push(pc.shift()); }
  return out;
}

function CourseCard({ c, i }) {
  const sub = SUBJECT[c.category] || SUBJECT.english;
  const band = BANDS[i % BANDS.length];
  const lessons = c.lessons?.length ?? 0;
  const [broken, setBroken] = useState(false);
  const photo = broken ? null : coursePhoto(c);
  return (
    <Link to={`/learn?q=${encodeURIComponent(c.title)}`}
      className="group h-full flex flex-col bg-surface rounded-lg border border-line overflow-hidden hover:-translate-y-1 hover:shadow-[0_22px_40px_-24px_rgba(7,41,77,0.45)] transition-[transform,box-shadow] duration-300">
      <div className={`relative h-48 ${photo ? 'bg-brand-soft' : band} flex items-center justify-center`}>
        {photo
          ? (
            <span className="absolute inset-0 overflow-hidden">
              <img src={photo} alt="" loading="lazy" onError={() => setBroken(true)}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
            </span>
          )
          : (
            <>
              {/* soft dot pattern */}
              <span className="absolute inset-0 opacity-[0.14] [background-image:radial-gradient(#fff_1.5px,transparent_1.5px)] [background-size:18px_18px]" aria-hidden="true" />
              <sub.Icon size={64} strokeWidth={1.4} className="relative text-white transition-transform duration-300 group-hover:scale-110" aria-hidden="true" />
            </>
          )}
        <span className="absolute top-4 left-4 rounded-md bg-accent text-night text-sm font-semibold px-3 py-1">{sub.label}</span>
        <span className="absolute -bottom-7 right-5 w-14 h-14 rounded-full bg-accent text-night font-display font-bold text-sm flex items-center justify-center shadow-[0_8px_20px_-8px_rgba(0,0,0,0.35)]">Free</span>
      </div>
      <div className="flex-1 flex flex-col px-6 pt-8 pb-6">
        <p className="text-sm text-ink-soft">Course {c.track} · {c.level}</p>
        <h3 className="mt-1.5 text-lg font-bold text-brand leading-snug group-hover:underline decoration-2 underline-offset-4">{c.title}</h3>
        <p className="mt-2 text-[15px] text-ink-soft line-clamp-2 flex-1">{plainText(c.description)}</p>
        <div className="mt-5 pt-4 border-t border-line flex items-center gap-4 text-sm text-ink-soft">
          <span className="inline-flex items-center gap-1.5"><ListChecks size={16} aria-hidden="true" />{lessons} lessons</span>
          <span className="inline-flex items-center gap-1.5"><Headphones size={16} aria-hidden="true" />Audio</span>
          <ArrowRight size={18} className="ml-auto text-brand transition-transform group-hover:translate-x-1" aria-hidden="true" />
        </div>
      </div>
    </Link>
  );
}

export default function FeaturedCourses() {
  const [courses, setCourses] = useState(null);
  useEffect(() => { api.get('/public/courses').then((r) => setCourses(r.data.courses)).catch(() => setCourses([])); }, []);
  if (courses && courses.length === 0) return null;

  return (
    <section id="courses" className="scroll-mt-16 bg-paper py-16 md:py-24">
      <div className="max-w-[1200px] mx-auto px-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <Reveal><SectionHeading label="Our courses" title="Featured courses" intro="Short lessons in simple English. Listen to every lesson, take a quiz, and earn a free certificate." /></Reveal>
          <Link to="/learn" className="mb-10 inline-flex items-center gap-2 min-h-12 px-6 rounded bg-brand text-white font-semibold hover:bg-brand-dark">
            See all courses<ArrowRight size={18} aria-hidden="true" />
          </Link>
        </div>
        <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {(courses ? pick(courses) : Array.from({ length: 3 }, () => null)).map((c, i) => (
            <Reveal as="li" key={c?.id || i} delay={(i % 3) * 100}>
              {c ? <CourseCard c={c} i={i} /> : <div className="h-[380px] rounded-lg bg-surface border border-line animate-pulse" />}
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
