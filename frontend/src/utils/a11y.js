// Accessibility settings: one tap to make INUKA easier to see, read and use.
// Saved in this browser (works before signing in) and, for signed-in users, in their account
// (PUT /api/profile/accessibility) so the same settings follow them to any phone or computer.
const KEY = 'inuka-a11y';
export const A11Y_DEFAULT = { textSize: 'normal', contrast: false, readableFont: false, reduceMotion: false, underlineLinks: false, readAloud: false };

export function loadA11y() {
  try { return { ...A11Y_DEFAULT, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { return { ...A11Y_DEFAULT }; }
}

let fontLoaded = false;
function loadReadableFont() {
  if (fontLoaded) return;
  fontLoaded = true;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&display=swap';
  document.head.appendChild(link);
}

export function applyA11y(settings, { save = true } = {}) {
  const s = { ...A11Y_DEFAULT, ...(settings || {}) };
  const h = document.documentElement;
  if (s.textSize === 'normal') delete h.dataset.text; else h.dataset.text = s.textSize;
  h.classList.toggle('a11y-contrast', !!s.contrast);
  h.classList.toggle('a11y-font', !!s.readableFont);
  h.classList.toggle('a11y-motion', !!s.reduceMotion);
  h.classList.toggle('a11y-links', !!s.underlineLinks);
  if (s.readableFont) loadReadableFont();
  if (save) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* private mode */ } }
  window.dispatchEvent(new CustomEvent('inuka-a11y', { detail: s }));
  return s;
}

export const a11yActiveCount = (s) => ['contrast', 'readableFont', 'reduceMotion', 'underlineLinks', 'readAloud'].filter((k) => s[k]).length + (s.textSize !== 'normal' ? 1 : 0);
