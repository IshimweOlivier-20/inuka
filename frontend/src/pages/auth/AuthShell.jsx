import { Link } from 'react-router-dom';
import Logo from '../../components/layout/Logo';
import ThemeToggle from '../../components/layout/ThemeToggle';

// The blue panel with soft shapes, used on the sign-in / sign-up card and the other account pages.
export function BluePanel({ className = '', children }) {
  return (
    <div className={`${/\babsolute\b/.test(className) ? '' : 'relative'} overflow-hidden bg-gradient-to-br from-brand via-[#0957CC] to-brand-deep text-white ${className}`}>
      <span className="pointer-events-none absolute -top-24 -right-20 w-72 h-72 rounded-full bg-white/10" aria-hidden="true" />
      <span className="pointer-events-none absolute -bottom-28 -left-16 w-80 h-80 rounded-full bg-white/[0.07]" aria-hidden="true" />
      <span className="pointer-events-none absolute bottom-20 right-10 w-14 h-14 rounded-2xl rotate-12 border-2 border-white/15" aria-hidden="true" />
      <div className="relative h-full">{children}</div>
    </div>
  );
}

// Outline button on the blue panel ("Sign in", "Create account").
export function GhostButton({ to, state, children, onClick }) {
  const cls = 'inline-flex items-center justify-center min-h-12 px-10 rounded-full border-2 border-white/80 text-white font-display font-semibold tracking-wide uppercase text-sm hover:bg-white hover:text-[#0A3D91] transition-colors';
  return to ? <Link to={to} state={state} onClick={onClick} className={cls}>{children}</Link> : <button type="button" onClick={onClick} className={cls}>{children}</button>;
}

// Title + subtitle + form content inside the card.
export function FormPanel({ title, subtitle, children }) {
  return (
    <div className="w-full max-w-[460px] mx-auto">
      <h1 className="text-3xl font-bold text-center">{title}</h1>
      {subtitle && <p className="text-ink-soft text-center mt-2 mb-6">{subtitle}</p>}
      {!subtitle && <div className="mb-6" />}
      {children}
    </div>
  );
}

// Page frame for all account pages: logo, theme switch, and the card.
export function AuthFrame({ children }) {
  return (
    <div className="min-h-screen bg-paper flex flex-col">
      <header className="px-5 py-4 flex items-center justify-between">
        <Link to="/" aria-label="INUKA home"><Logo tagline /></Link>
        <ThemeToggle />
      </header>
      <main className="flex-1 flex items-start lg:items-center justify-center px-4 pb-12">{children}</main>
    </div>
  );
}

// Smaller pages (forgot password, reset password, verify email): blue panel on the left, form on the right.
export default function AuthShell({ title, subtitle, children }) {
  return (
    <AuthFrame>
      <div className="w-full max-w-[900px] bg-surface rounded-3xl border border-line shadow-[0_30px_70px_-35px_rgba(10,61,145,0.45)] overflow-hidden grid md:grid-cols-[0.9fr_1.1fr]">
        <BluePanel className="hidden md:block">
          <div className="h-full flex flex-col items-center justify-center text-center px-10 py-14">
            <p className="font-display text-3xl font-bold">Rise. Learn. Succeed.</p>
            <p className="mt-3 text-white/85 max-w-[30ch]">Free courses, scholarships and mentors for African graduates and refugees.</p>
          </div>
        </BluePanel>
        <div className="p-6 sm:p-10 flex items-center"><FormPanel title={title} subtitle={subtitle}>{children}</FormPanel></div>
      </div>
    </AuthFrame>
  );
}
