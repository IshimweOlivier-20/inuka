import {
  Award, BookOpen, FileText, Flame, Globe, GraduationCap, HeartHandshake, Laptop, Mic,
  PenLine, Send, Sprout, Star, Trophy, Wrench,
} from 'lucide-react';

// Achievement badge key -> icon (the database keeps an emoji too, but the app shows these icons).
const MAP = {
  first_step: Sprout,
  streak_7: Flame,
  streak_30: Flame,
  english_starter: BookOpen,
  writer: PenLine,
  essay_master: FileText,
  speaker: Mic,
  scholarship_writer: Trophy,
  tech_starter: Laptop,
  internet_ready: Globe,
  digital_toolbox: Wrench,
  apply_ready: GraduationCap,
  full_english: Star,
  full_computer: Star,
  first_application: Send,
  first_mentor_session: HeartHandshake,
  inuka_graduate: Award,
};

export const badgeIcon = (key) => MAP[key] || Award;

// Round medal: green when earned, grey when locked.
export function BadgeMedal({ badgeKey, earned = true, size = 56 }) {
  const Icon = badgeIcon(badgeKey);
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full ${earned ? 'bg-brand text-white shadow-[0_6px_16px_-6px_rgba(7,41,77,0.6)]' : 'bg-line text-ink-soft'}`}
      style={{ width: size, height: size }} aria-hidden="true">
      <Icon size={Math.round(size * 0.46)} strokeWidth={2.2} />
    </span>
  );
}
