// ─────────────────────────────────────────────────────────────
//  INUKA contact details and social media.
//  Edit this file to change what appears in the footer.
// ─────────────────────────────────────────────────────────────
export const SITE = {
  contactEmail: 'hello@inuka.app',
  partnersEmail: 'partners@inuka.app',

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

// Navbar links: `id` scrolls to a section of the home page, `to` opens another page.
export const NAV_SECTIONS = [
  { id: 'how-it-works', label: 'How it works' },
  { id: 'inuka-ai', label: 'INUKA AI' },
  { id: 'impact', label: 'Our impact' },
  { to: '/news', label: 'News' },
  { id: 'faq', label: 'FAQ' },
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
