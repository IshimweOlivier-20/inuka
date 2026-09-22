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

// Sections linked from the navbar (ids on the home page)
export const NAV_SECTIONS = [
  { id: 'how-it-works', label: 'How it works' },
  { id: 'scholarships', label: 'Scholarships' },
  { id: 'tips', label: 'Tips' },
  { id: 'news', label: 'News' },
  { id: 'faq', label: 'FAQ' },
];
