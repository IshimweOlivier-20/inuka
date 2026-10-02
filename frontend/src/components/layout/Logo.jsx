// INUKA logo (open book, growing sprout and rising sun). Image files are in frontend/public/brand/.
// Every page uses this one component, so changing it here changes the logo everywhere.
//   light:    white version, for dark backgrounds (footer, dashboard sidebar)
//   tagline:  adds "Rise. Learn. Succeed." under INUKA
//   markOnly: only the book + sprout + sun symbol (e.g. collapsed sidebar)
//   size:     'sm' | 'md' (default) | 'lg' | 'xl'
const HEIGHTS = {
  plain: { sm: 'h-7', md: 'h-10', lg: 'h-12', xl: 'h-16' },
  tagline: { sm: 'h-9', md: 'h-12', lg: 'h-14', xl: 'h-20' },
  mark: { sm: 'h-7', md: 'h-9', lg: 'h-11', xl: 'h-16' },
};

export default function Logo({ light = false, tagline = false, markOnly = false, size = 'md', className = '' }) {
  const kind = markOnly ? 'mark' : tagline ? 'tagline' : 'plain';
  const file = markOnly ? 'inuka-mark' : tagline ? 'inuka-logo-tagline' : 'inuka-logo';
  const h = HEIGHTS[kind][size] || HEIGHTS[kind].md;
  const cls = `${h} w-auto select-none transition-[height] duration-300`;
  return (
    <span className={`inline-flex items-center ${className}`} translate="no">
      {light ? (
        <img src={`/brand/${file}-white.png`} alt="INUKA" className={cls} draggable="false" />
      ) : (
        <>
          {/* Dark-blue logo on light pages; the white one when dark mode is on */}
          <img src={`/brand/${file}.png`} alt="INUKA" className={`${cls} dark:hidden`} draggable="false" />
          <img src={`/brand/${file}-white.png`} alt="" aria-hidden="true" className={`${cls} hidden dark:block`} draggable="false" />
        </>
      )}
    </span>
  );
}

// Kept for older imports: the small square symbol.
export function LogoMark({ size = 32, light = false, className = '' }) {
  return <img src={`/brand/inuka-mark${light ? '-white' : ''}.png`} alt="" aria-hidden="true" style={{ height: size }} className={`w-auto ${className}`} />;
}
