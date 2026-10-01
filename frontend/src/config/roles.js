import {
  BookOpen, CalendarDays, ChartLine, Globe, GraduationCap, HeartHandshake, LayoutDashboard, Megaphone, Newspaper, Sparkles, UserRound, UsersRound,
} from 'lucide-react';

// INUKA has three dashboards, one per role. Each role has its own home page and sidebar.
// Pages live in frontend/src/pages/student, pages/mentor and pages/admin.
export const ROLE_HOME = { student: '/dashboard', mentor: '/mentor', admin: '/admin' };
export const homeFor = (user) => ROLE_HOME[user?.role] || '/dashboard';

export const ROLE_LABEL = { student: 'Student', mentor: 'Mentor', admin: 'Admin' };

export const ROLE_NAV = {
  student: [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/courses', label: 'Courses', icon: BookOpen },
    { to: '/scholarships', label: 'Scholarships', icon: GraduationCap },
    { to: '/my-learning', label: 'My Learning', icon: ChartLine },
    { to: '/mentorship', label: 'Mentorship', icon: HeartHandshake },
    { to: '/ai', label: 'INUKA AI', icon: Sparkles },
    { to: '/profile', label: 'Profile', icon: UserRound },
  ],
  mentor: [
    { to: '/mentor', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/mentor/sessions', label: 'Sessions', icon: CalendarDays },
    { to: '/mentor/profile', label: 'My profile', icon: UserRound },
    { to: '/opportunities', label: 'Scholarships', icon: Globe },
  ],
  admin: [
    { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/admin/users', label: 'Users', icon: UsersRound },
    { to: '/admin/mentors', label: 'Mentors', icon: HeartHandshake },
    { to: '/admin/courses', label: 'Courses', icon: BookOpen },
    { to: '/admin/scholarships', label: 'Scholarships', icon: GraduationCap },
    { to: '/admin/content', label: 'Website content', icon: Newspaper },
    { to: '/admin/analytics', label: 'Analytics', icon: ChartLine },
    { to: '/admin/announcements', label: 'Announcements', icon: Megaphone },
  ],
};

// The mentor link to /opportunities opens the public scholarship page.
// Bottom tab bar on phones (students only; mentors and admins use the menu).
export const MOBILE_TABS = ['/dashboard', '/courses', '/scholarships', '/my-learning', '/profile'];
