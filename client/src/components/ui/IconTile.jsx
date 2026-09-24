// A real icon (Lucide) on a coloured tile, in INUKA colours.
const TONES = {
  forest: 'bg-forest text-white',
  gold: 'bg-gold text-ink',
  sprout: 'bg-sprout text-white',
  sky: 'bg-[#3B82C4] text-white',
  ink: 'bg-ink text-white',
  leaf: 'bg-leaf text-forest',
  soft: 'bg-leaf text-forest ring-1 ring-forest/10',
  amber: 'bg-amber-50 text-gold-dark ring-1 ring-gold/30',
  glass: 'bg-white/15 text-white ring-1 ring-white/20',
};
const SIZES = {
  sm: { box: 'w-9 h-9 rounded-lg', icon: 18 },
  md: { box: 'w-12 h-12 rounded-xl', icon: 24 },
  lg: { box: 'w-14 h-14 rounded-2xl', icon: 28 },
  xl: { box: 'w-16 h-16 rounded-2xl', icon: 32 },
};

export default function IconTile({ icon: Icon, tone = 'forest', size = 'md', className = '' }) {
  const s = SIZES[size];
  return (
    <span className={`inline-flex shrink-0 items-center justify-center ${s.box} ${TONES[tone]} ${className}`} aria-hidden="true">
      <Icon size={s.icon} strokeWidth={2} />
    </span>
  );
}
