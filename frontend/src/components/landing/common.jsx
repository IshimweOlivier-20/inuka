import { Link, useLocation } from 'react-router-dom';

// Links to a section of the home page, from any public page.
export function SectionLink({ id, className = '', onClick, children, ...props }) {
  const { pathname } = useLocation();
  const handle = (e) => {
    onClick?.(e);
    if (pathname === '/') {
      e.preventDefault();
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
      window.history.replaceState(null, '', `/#${id}`);
    }
  };
  return <Link to={{ pathname: '/', hash: `#${id}` }} onClick={handle} className={className} {...props}>{children}</Link>;
}

// label: small yellow-marked word above the heading (e.g. "Our courses"), like the reference design.
export function SectionHeading({ title, intro, align = 'left', light, label }) {
  return (
    <div className={`mb-10 max-w-2xl ${align === 'center' ? 'mx-auto text-center' : ''}`}>
      {label && (
        <p className={`inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.12em] mb-3 ${light ? 'text-accent' : 'text-brand'}`}>
          <span className="w-8 h-1 rounded-full bg-accent" aria-hidden="true" />{label}
        </p>
      )}
      <h2 className={`text-2xl sm:text-[2.1rem] font-bold leading-tight ${light ? 'text-white' : 'text-brand'}`}>{title}</h2>
      {intro && <p className={`mt-3 ${light ? 'text-white/80' : 'text-ink-soft'}`}>{intro}</p>}
    </div>
  );
}

const AVATAR_TONES = ['bg-brand text-white', 'bg-[#2E5A88] text-white', 'bg-cyan text-white', 'bg-[#2E5A88] text-white', 'bg-[#2E5A88] text-white'];
export function Avatar({ name, photoUrl, size = 'w-14 h-14 text-lg', index = 0 }) {
  if (photoUrl) return <img src={photoUrl} alt="" loading="lazy" className={`${size} rounded-full object-cover`} />;
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
  return <span aria-hidden="true" className={`${size} shrink-0 rounded-full font-display font-semibold flex items-center justify-center ${AVATAR_TONES[index % AVATAR_TONES.length]}`}>{initials}</span>;
}

export const CATEGORY_LABEL = { news: 'News', guide: 'Guide', story: 'Story' };
