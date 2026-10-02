import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import ThemeToggle from '../../components/layout/ThemeToggle';

// The blue panel with soft shapes, used on the sign-in / sign-up card and the other account pages.
export function BluePanel({ className = '', children }) {
  return (
    <div className={`${/\babsolute\b/.test(className) ? '' : 'relative'} overflow-hidden bg-brand text-white ${className}`}>
      <div className="relative h-full">{children}</div>
    </div>
  );
}

// Outline button on the blue panel ("Sign in", "Create account").
export function GhostButton({ to, state, children, onClick }) {
  const cls = 'inline-flex items-center justify-center min-h-11 px-8 rounded border-2 border-white text-white font-semibold text-[15px] hover:bg-accent hover:border-accent hover:text-night transition-colors';
  return to ? <Link to={to} state={state} onClick={onClick} className={cls}>{children}</Link> : <button type="button" onClick={onClick} className={cls}>{children}</button>;
}

// Title + subtitle + form content inside the card.
export function FormPanel({ title, subtitle, children }) {
  return (
    <div className="w-full max-w-[460px] mx-auto">
      <h1 className="text-2xl font-bold text-center">{title}</h1>
      {subtitle && <p className="text-ink-soft text-[15px] text-center mt-1.5 mb-5">{subtitle}</p>}
      {!subtitle && <div className="mb-5" />}
      {children}
    </div>
  );
}

// Page frame for all account pages: logo, theme switch, and the card.
export function AuthFrame({ children }) {
  return (
    <div className="min-h-screen bg-paper flex flex-col">
      <header className="px-5 py-2 flex items-center justify-between">
        <Link to="/" className="inline-flex items-center gap-1.5 min-h-11 px-3 -ml-3 rounded-lg text-sm font-semibold text-ink-soft hover:text-ink hover:bg-brand-soft"><ArrowLeft size={18} aria-hidden="true" />Back to home</Link>
        <ThemeToggle />
      </header>
      <main className="flex-1 flex items-start lg:items-center justify-center px-4 pb-8">{children}</main>
    </div>
  );
}

// Smaller pages (forgot password, reset password, verify email): blue panel on the left, form on the right.
export default function AuthShell({ title, subtitle, children }) {
  return (
    <AuthFrame>
      <div className="w-full max-w-[900px] bg-surface rounded-3xl border border-line shadow-[0_30px_70px_-35px_rgba(7,41,77,0.45)] overflow-hidden grid md:grid-cols-[0.9fr_1.1fr]">
        <BluePanel className="hidden md:block">
          <div className="h-full flex flex-col items-center justify-center text-center px-10 py-14">
            <p className="font-display text-2xl font-bold">Rise. Learn. Succeed.</p>
            <p className="mt-3 text-white/85 max-w-[30ch]">Free courses, scholarships and mentors for African graduates and refugees.</p>
          </div>
        </BluePanel>
        <div className="p-6 sm:p-10 flex items-center"><FormPanel title={title} subtitle={subtitle}>{children}</FormPanel></div>
      </div>
    </AuthFrame>
  );
}
