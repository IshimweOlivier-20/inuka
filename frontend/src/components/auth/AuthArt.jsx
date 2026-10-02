import { HeartHandshake, LogIn, UserPlus } from 'lucide-react';

// The icon at the top of the blue panel on the sign-in / register pages.
// Just the icon in white on the navy panel: no circles, badges or dots.
const ART = {
  login: { Icon: LogIn, label: 'Sign in' },
  register: { Icon: UserPlus, label: 'Create an account' },
  mentor: { Icon: HeartHandshake, label: 'Mentor' },
};

export default function AuthArt({ kind = 'login', className = '' }) {
  const { Icon, label } = ART[kind] || ART.login;
  return (
    <span className={`inline-flex ${className}`} role="img" aria-label={label}>
      <Icon size={64} strokeWidth={1.5} className="text-white" aria-hidden="true" />
    </span>
  );
}
