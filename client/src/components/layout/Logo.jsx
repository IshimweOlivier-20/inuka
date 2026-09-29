// Temporary text wordmark ("INUKA") while the new logo is being designed.
// When the new logo is ready, replace the <span> below with an <img> — every page uses this one component.
//   light:   white text, for dark backgrounds (hero, sidebar, footer)
//   tagline: adds "Rise. Learn. Succeed." underneath
//   size:    'md' (default) | 'lg' | 'xl'
const SIZES = { md: 'text-2xl', lg: 'text-[1.7rem]', xl: 'text-4xl' };

export default function Logo({ light = false, tagline = false, size = 'md', className = '' }) {
  return (
    <span className={`inline-flex flex-col leading-none select-none ${className}`} translate="no">
      <span className={`font-display font-extrabold tracking-[0.06em] transition-[font-size] duration-300 ${SIZES[size] || SIZES.md} ${light ? 'text-white' : 'text-brand-deep'}`}>
        INUKA
      </span>
      {tagline && (
        <span className={`mt-1.5 text-xs font-medium tracking-wide ${light ? 'text-white/70' : 'text-ink-soft'}`}>Rise. Learn. Succeed.</span>
      )}
    </span>
  );
}
