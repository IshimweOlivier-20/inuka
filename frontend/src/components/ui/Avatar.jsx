import { useState } from 'react';

const SIZES = { sm: 'w-9 h-9 text-sm', md: 'w-12 h-12 text-base', xl: 'w-16 h-16 text-xl', lg: 'w-24 h-24 text-2xl' };

// Profile photo, or the person's initials when there is no photo (or it fails to load).
export default function Avatar({ user, size = 'sm', className = '' }) {
  const [broken, setBroken] = useState(false);
  const initials = `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`.toUpperCase();
  const box = `${SIZES[size]} shrink-0 rounded-full overflow-hidden ${className}`;
  if (user?.profilePhotoUrl && !broken) {
    return <img src={user.profilePhotoUrl} alt="" className={`${box} object-cover bg-brand-soft`} onError={() => setBroken(true)} referrerPolicy="no-referrer" />;
  }
  return <span className={`${box} bg-[#0284C7] text-white font-display font-semibold flex items-center justify-center`} aria-hidden="true">{initials}</span>;
}
