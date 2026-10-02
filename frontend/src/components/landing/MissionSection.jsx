import { Link } from 'react-router-dom';
import Reveal from '../ui/Reveal';
import { Button } from '../ui';
import { MISSION_PHOTOS } from '../../config/photos';

// Two real photos: a large one and a small one overlapping its corner.
function MissionPhotos() {
  const { main, small } = MISSION_PHOTOS;
  return (
    <div className="relative pb-10 pr-8 sm:pr-14">
      <figure className="relative rounded-xl overflow-hidden bg-brand-soft aspect-[4/5] sm:aspect-[5/5] lg:aspect-[4/5]">
        <img src={main.src} alt={main.alt} loading="lazy" onError={(e) => { e.currentTarget.style.display = 'none'; }} className="w-full h-full object-cover" />
      </figure>
      <figure className="absolute right-0 bottom-0 w-[42%] rounded-lg overflow-hidden border-[6px] border-surface shadow-[0_20px_40px_-20px_rgba(7,41,77,0.5)] bg-brand-soft aspect-[3/4]">
        <img src={small.src} alt={small.alt} loading="lazy" onError={(e) => { e.currentTarget.style.display = 'none'; }} className="w-full h-full object-cover" />
      </figure>
    </div>
  );
}

export default function MissionSection() {
  return (
    <section id="mission" className="scroll-mt-16 bg-surface py-16 md:py-24 overflow-hidden">
      <div className="max-w-[1200px] mx-auto px-5 grid lg:grid-cols-[1.1fr_1fr] gap-10 lg:gap-16 items-center">
        {/* Photos first (left on desktop, top on phones) */}
        <Reveal className="max-w-xl mx-auto w-full lg:max-w-none">
          <MissionPhotos />
        </Reveal>

        <Reveal delay={150}>
          <p className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.12em] text-brand">
            <span className="w-8 h-1 rounded-full bg-accent" aria-hidden="true" />About INUKA
          </p>
          <h2 className="mt-3 text-brand text-2xl sm:text-3xl md:text-[2.2rem] font-bold leading-[1.15]">
            Talent is everywhere. <span className="bg-[linear-gradient(transparent_64%,var(--color-accent)_64%,var(--color-accent)_92%,transparent_92%)] [box-decoration-break:clone]">Opportunity should be too.</span>
          </h2>
          <p className="mt-5 text-ink-soft">
            Every year, thousands of young people finish secondary school across Africa, including young refugees,
            with the grades and the drive to go further. Many of them are not missing ability. They are missing access:
            to English, to digital skills, to information about scholarships, and to someone who can guide them.
          </p>
          <p className="mt-4 text-ink-soft">
            INUKA brings all of that together in one free place, so a student with a phone and a dream can rise to university.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Button to="/register" className="min-h-12 px-6">Start learning for free</Button>
            <Link to="/news" className="font-semibold text-brand hover:underline">Read our guides →</Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
