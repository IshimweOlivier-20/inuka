import { Link } from 'react-router-dom';
import Logo from '../../components/layout/Logo';

export default function AuthShell({ title, subtitle, children, wide }) {
  return (
    <div className="min-h-screen bg-brand-soft flex flex-col">
      <header className="px-5 py-4"><Link to="/" aria-label="INUKA home"><Logo tagline /></Link></header>
      <main className="flex-1 flex items-start sm:items-center justify-center px-4 pb-12">
        <div className={`w-full ${wide ? 'max-w-xl' : 'max-w-md'} bg-white rounded-2xl border border-line p-6 sm:p-8`}>
          <h1 className="text-2xl font-semibold mb-1">{title}</h1>
          {subtitle && <p className="text-ink-soft mb-6">{subtitle}</p>}
          {children}
        </div>
      </main>
    </div>
  );
}
