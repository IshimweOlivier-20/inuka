// A real icon (Lucide) on a coloured tile, in INUKA colours.
const TONES = {
  brand: 'bg-brand text-white',
  accent: 'bg-[#0284C7] text-white',
  cyan: 'bg-cyan text-white',
  deep: 'bg-brand-deep text-white',
  ink: 'bg-ink text-white',
  tint: 'bg-brand-soft text-brand',
  soft: 'bg-brand-soft text-brand ring-1 ring-brand/10',
  warm: 'bg-sky-50 text-accent-dark ring-1 ring-accent/30',
  glass: 'bg-white/15 text-white ring-1 ring-white/20',
};
const SIZES = {
  sm: { box: 'w-9 h-9 rounded-lg', icon: 18 },
  md: { box: 'w-12 h-12 rounded-xl', icon: 24 },
  lg: { box: 'w-14 h-14 rounded-2xl', icon: 28 },
  xl: { box: 'w-16 h-16 rounded-2xl', icon: 32 },
};

export default function IconTile({ icon: Icon, tone = 'brand', size = 'md', className = '' }) {
  const s = SIZES[size];
  return (
    <span className={`inline-flex shrink-0 items-center justify-center ${s.box} ${TONES[tone]} ${className}`} aria-hidden="true">
      <Icon size={s.icon} strokeWidth={2} />
    </span>
  );
}
