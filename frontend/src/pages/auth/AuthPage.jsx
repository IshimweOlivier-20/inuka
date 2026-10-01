import { useEffect } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { AuthFrame, BluePanel, GhostButton } from './AuthShell';
import Login from './Login';
import Register from './Register';

// Sign in and sign up on one card. On large screens the blue panel slides across when you switch;
// on phones one form shows at a time with a blue banner on top.
export default function AuthPage() {
  const { pathname, state } = useLocation();
  const [params] = useSearchParams();
  const mode = pathname.startsWith('/register') ? 'register' : 'login';
  const mentor = params.get('as') === 'mentor' || params.get('role') === 'mentor';
  useEffect(() => { document.title = mode === 'register' ? 'Create your account — INUKA' : 'Sign in — INUKA'; }, [mode]);

  const loginCopy = { title: 'Welcome back!', text: 'Already have an account? Sign in to keep learning and follow your applications.', button: 'Sign in', to: mentor ? '/login?as=mentor' : '/login' };
  const registerCopy = mentor
    ? { title: 'Guide a student', text: 'Share your experience and help young people reach university. Apply to become an INUKA mentor.', button: 'Become a mentor', to: '/register?role=mentor' }
    : { title: 'Hello, friend!', text: 'New to INUKA? Create your free account and start your journey to university today.', button: 'Create account', to: '/register' };
  const other = mode === 'login' ? registerCopy : loginCopy;

  return (
    <AuthFrame>
      <div className="relative w-full max-w-[1040px] bg-surface rounded-3xl border border-line shadow-[0_30px_70px_-35px_rgba(10,61,145,0.45)] overflow-hidden">
        {/* Phones and tablets: banner with the other option */}
        <BluePanel className="lg:hidden">
          <div className="px-6 py-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="font-display text-xl font-bold">{other.title}</p>
              <p className="text-white/85 text-sm mt-1 max-w-[42ch]">{other.text}</p>
            </div>
            <GhostButton to={other.to} state={state}>{other.button}</GhostButton>
          </div>
        </BluePanel>

        <div className="grid lg:grid-cols-2">
          <section aria-label="Sign in" inert={mode !== 'login' || undefined}
            className={`lg:col-start-1 lg:row-start-1 px-6 py-8 sm:px-10 sm:py-12 flex items-center transition-[opacity,transform] duration-700 ease-[cubic-bezier(.65,0,.35,1)] ${
              mode === 'login' ? 'opacity-100 translate-x-0' : 'hidden lg:flex opacity-0 lg:translate-x-[20%]'}`}>
            <Login />
          </section>
          <section aria-label="Create account" inert={mode !== 'register' || undefined}
            className={`lg:col-start-2 lg:row-start-1 px-6 py-8 sm:px-10 sm:py-12 flex items-center transition-[opacity,transform] duration-700 ease-[cubic-bezier(.65,0,.35,1)] ${
              mode === 'register' ? 'opacity-100 translate-x-0' : 'hidden lg:flex opacity-0 lg:-translate-x-[20%]'}`}>
            <Register />
          </section>
        </div>

        {/* Large screens: the sliding blue panel covers the form that is not in use */}
        <BluePanel className={`hidden lg:block absolute inset-y-0 left-0 w-1/2 z-10 transition-transform duration-700 ease-[cubic-bezier(.65,0,.35,1)] ${mode === 'login' ? 'translate-x-full' : 'translate-x-0'}`}>
          {[['register', loginCopy], ['login', registerCopy]].map(([forMode, c]) => (
            <div key={forMode} aria-hidden={mode !== forMode}
              className={`absolute inset-0 flex flex-col items-center justify-center text-center px-14 transition-[opacity,transform] duration-700 ${
                mode === forMode ? 'opacity-100 translate-x-0' : `opacity-0 pointer-events-none ${forMode === 'login' ? 'translate-x-12' : '-translate-x-12'}`}`}>
              <p className="font-display text-4xl font-bold leading-tight">{c.title}</p>
              <p className="mt-4 text-white/85 text-lg max-w-[32ch]">{c.text}</p>
              <div className="mt-8"><GhostButton to={c.to} state={state}>{c.button}</GhostButton></div>
              <p className="absolute bottom-8 text-sm text-white/60 tracking-wide">Rise. Learn. Succeed.</p>
            </div>
          ))}
        </BluePanel>
      </div>
    </AuthFrame>
  );
}
