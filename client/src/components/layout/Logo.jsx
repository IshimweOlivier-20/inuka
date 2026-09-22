// The official INUKA logo (files in client/public/brand).
// - light: white lettering, for dark backgrounds (green hero, sidebar, footer)
// - tagline: include "Rise. Learn. Succeed."
// WebP for modern browsers, PNG fallback. Width/height are set so the page does not jump while loading.

const SIZES = {
  plain: { w: 274, h: 96 },     // logo.png / logo-light.png
  tagline: { w: 343, h: 120 },  // logo-tagline.png / logo-tagline-light.png
};

export default function Logo({ light = false, tagline = false, size, className = '' }) {
  const base = `/brand/logo${tagline ? '-tagline' : ''}${light ? '-light' : ''}`;
  const { w, h } = SIZES[tagline ? 'tagline' : 'plain'];
  // size: 'md' (40px, default) | 'lg' (48px); tagline versions are 56px
  const height = tagline ? 'h-14' : size === 'lg' ? 'h-12' : 'h-10';
  return (
    <picture>
      <source srcSet={`${base}.webp`} type="image/webp" />
      <img src={`${base}.png`} width={w} height={h} alt="INUKA" decoding="async"
        className={`${height} w-auto select-none transition-[height] duration-300 ${className}`} draggable="false" />
    </picture>
  );
}

// The icon only (book, sprout and sun), e.g. for certificates.
export function LogoMark({ size = 40, className = '' }) {
  return (
    <picture>
      <source srcSet="/brand/logo-icon.webp" type="image/webp" />
      <img src="/brand/logo-icon.png" width={size} height={size} alt="" aria-hidden="true" className={className} draggable="false" />
    </picture>
  );
}
