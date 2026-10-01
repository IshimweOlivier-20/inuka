import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

const KEY = 'inuka-theme';
const current = () => document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
const saved = () => { try { return localStorage.getItem(KEY); } catch { return null; } };

export function applyTheme(theme, remember = true) {
  const root = document.documentElement;
  root.classList.add('theme-switching');
  root.setAttribute('data-theme', theme);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0B1220' : '#0A6CF0');
  if (remember) { try { localStorage.setItem(KEY, theme); } catch { /* private mode: not remembered */ } }
  setTimeout(() => root.classList.remove('theme-switching'), 300);
  window.dispatchEvent(new CustomEvent('inuka-theme', { detail: theme }));
}

// Sun / moon button. Follows the device setting until the person chooses, then remembers their choice.
export default function ThemeToggle({ className = '', onDark = false }) {
  const [theme, setTheme] = useState(current);
  useEffect(() => {
    const sync = (e) => setTheme(e.detail);
    window.addEventListener('inuka-theme', sync);
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    const follow = (e) => { if (!saved()) applyTheme(e.matches ? 'dark' : 'light', false); };
    mq?.addEventListener?.('change', follow);
    return () => { window.removeEventListener('inuka-theme', sync); mq?.removeEventListener?.('change', follow); };
  }, []);
  const next = theme === 'dark' ? 'light' : 'dark';
  return (
    <button type="button" onClick={() => applyTheme(next)} aria-label={`Switch to ${next} mode`} title={`Switch to ${next} mode`}
      className={`min-w-11 min-h-11 inline-flex items-center justify-center rounded-full transition-colors ${onDark ? 'text-white/85 hover:text-white hover:bg-white/10' : 'text-ink-soft hover:text-ink hover:bg-brand-soft'} ${className}`}>
      {theme === 'dark' ? <Sun size={20} aria-hidden="true" /> : <Moon size={20} aria-hidden="true" />}
    </button>
  );
}
