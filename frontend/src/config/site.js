import {
  Accessibility, BadgeCheck, BookOpen, Building2, ChartNoAxesColumn, CircleHelp, Compass, GraduationCap, Handshake, Info, ListOrdered, Newspaper, ShieldCheck, Sparkles, Target, UsersRound,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────
//  INUKA contact details and social media.
//  Edit this file to change what appears in the footer.
// ─────────────────────────────────────────────────────────────
export const SITE = {
  contactEmail: 'hello.inuka@gmail.com',
  partnersEmail: 'hello.inuka@gmail.com',

  // Leave phone empty ('') to hide it.
  phone: '',                      // e.g. '+250 788 000 000'

  address: {
    lines: ['Kigali, Rwanda'],     // e.g. ['KG 7 Ave, Kacyiru', 'Kigali, Rwanda']
    // Optional link that opens the address in Google Maps. Leave empty to show plain text.
    mapUrl: 'https://www.google.com/maps/search/?api=1&query=Kigali%2C%20Rwanda',
  },

  // Put your real page links here. Until a link is added, its icon is shown
  // but does nothing (and a reminder appears on hover while developing).
  social: {
    facebook: '',   // e.g. 'https://www.facebook.com/yourpage'
    instagram: '',  // e.g. 'https://www.instagram.com/yourpage'
    x: '',          // e.g. 'https://x.com/yourpage'
    linkedin: '',   // e.g. 'https://www.linkedin.com/company/yourpage'
    whatsapp: '',   // e.g. 'https://wa.me/250788000000'
    youtube: '',    // e.g. 'https://www.youtube.com/@yourchannel'
  },
};

// Navbar links. `to` opens a page, `id` scrolls to a section of the home page, `children` makes a dropdown.
// `icon` is shown in the phone menu.
export const NAV_ITEMS = [
  { to: '/learn', label: 'Courses', icon: BookOpen },
  { to: '/opportunities', label: 'Opportunities', icon: GraduationCap },
  {
    label: 'Tools',
    icon: Sparkles,
    children: [
      { to: '/tools', label: 'All free tools', icon: Sparkles },
      { to: '/next-step', label: 'See your options (S6 results)', icon: Compass },
      { to: '/universities', label: 'Universities & colleges', icon: Building2 },
      { to: '/scam-check', label: 'Scholarship scam checker', icon: ShieldCheck },
      { to: '/verify', label: 'Verify a certificate', icon: BadgeCheck },
    ],
  },
  { to: '/news', label: 'News', icon: Newspaper },
  {
    label: 'About',
    icon: Info,
    children: [
      { id: 'mission', label: 'Our mission', icon: Target },
      { id: 'how-it-works', label: 'How it works', icon: ListOrdered },
      { id: 'accessibility', label: 'Accessibility', icon: Accessibility },
      { id: 'impact', label: 'Our impact', icon: ChartNoAxesColumn },
      { id: 'team', label: 'Our team', icon: UsersRound },
      { id: 'partners', label: 'Partners & sponsors', icon: Handshake },
      { id: 'faq', label: 'FAQ', icon: CircleHelp },
    ],
  },
];

// "Our impact" section on the home page.
// These are GOALS, and the page labels them as goals. Change the numbers and the year to your real targets.
// Live numbers (scholarships, courses, lessons, students) are shown underneath automatically from the database.
export const IMPACT = {
  goalYear: 2027,
  goals: [
    { value: 20000, label: 'students learning on INUKA' },
    { value: 1500, label: 'scholarships listed' },
    { value: 6000, label: 'mentor sessions held' },
    { value: 50, label: 'countries reached' },
  ],
};
