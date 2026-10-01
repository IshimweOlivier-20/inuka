import { lazy, Suspense, useEffect } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import AppLayout from './components/layout/AppLayout';
import { PageLoader } from './components/ui';
import { homeFor } from './config/roles';

// Each page is its own chunk (spec 19.4: code splitting for slow connections).
// Pages are grouped by who uses them: public, auth, student, mentor, admin, shared.

// Public website
const Landing = lazy(() => import('./pages/public/Landing'));
const Learn = lazy(() => import('./pages/public/Learn'));
const Opportunities = lazy(() => import('./pages/public/Opportunities'));
const NewsList = lazy(() => import('./pages/public/News').then((m) => ({ default: m.NewsList })));
const Article = lazy(() => import('./pages/public/News').then((m) => ({ default: m.Article })));
const Terms = lazy(() => import('./pages/public/Legal').then((m) => ({ default: m.Terms })));
const Privacy = lazy(() => import('./pages/public/Legal').then((m) => ({ default: m.Privacy })));

// Sign in, sign up, account emails
const Login = lazy(() => import('./pages/auth/Login'));
const Register = lazy(() => import('./pages/auth/Register'));
const VerifyEmail = lazy(() => import('./pages/auth/AccountPages').then((m) => ({ default: m.VerifyEmail })));
const ForgotPassword = lazy(() => import('./pages/auth/AccountPages').then((m) => ({ default: m.ForgotPassword })));
const ResetPassword = lazy(() => import('./pages/auth/AccountPages').then((m) => ({ default: m.ResetPassword })));

// Student dashboard
const StudentDashboard = lazy(() => import('./pages/student/StudentDashboard'));
const Courses = lazy(() => import('./pages/student/Courses'));
const CourseDetail = lazy(() => import('./pages/student/CourseDetail'));
const LessonPage = lazy(() => import('./pages/student/LessonPage'));
const Scholarships = lazy(() => import('./pages/student/Scholarships'));
const MyLearning = lazy(() => import('./pages/student/MyLearning'));
const Certificate = lazy(() => import('./pages/student/Certificate'));
const Profile = lazy(() => import('./pages/student/Profile'));
const Mentorship = lazy(() => import('./pages/student/Mentorship'));
const InukaAI = lazy(() => import('./pages/student/InukaAI'));

// Mentor dashboard
const MentorDashboard = lazy(() => import('./pages/mentor/MentorDashboard'));
const MentorSessions = lazy(() => import('./pages/mentor/MentorSessions'));
const MentorProfile = lazy(() => import('./pages/mentor/MentorProfile'));

// Admin dashboard
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'));
const AdminMentors = lazy(() => import('./pages/admin/AdminMentors'));
const AdminCourses = lazy(() => import('./pages/admin/AdminCourses').then((m) => ({ default: m.AdminCourses })));
const AdminCourse = lazy(() => import('./pages/admin/AdminCourses').then((m) => ({ default: m.AdminCourse })));
const AdminLesson = lazy(() => import('./pages/admin/AdminLesson'));
const AdminScholarships = lazy(() => import('./pages/admin/AdminScholarships').then((m) => ({ default: m.AdminScholarships })));
const AdminScholarshipForm = lazy(() => import('./pages/admin/AdminScholarships').then((m) => ({ default: m.AdminScholarshipForm })));
const AdminAnalytics = lazy(() => import('./pages/admin/AdminInsights').then((m) => ({ default: m.AdminAnalytics })));
const AdminAnnouncements = lazy(() => import('./pages/admin/AdminInsights').then((m) => ({ default: m.AdminAnnouncements })));

// Shared
const NotFound = lazy(() => import('./pages/shared/Misc').then((m) => ({ default: m.NotFound })));

// Signed-in only. With `roles`, people with another role are sent to their own dashboard.
function RequireAuth({ children, roles }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  if (roles && !roles.includes(user.role)) return <Navigate to={homeFor(user)} replace />;
  return children;
}

// /logout (spec 6.1): signs out and returns to the home page.
function Logout() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  useEffect(() => { logout().finally(() => navigate('/', { replace: true })); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return <PageLoader />;
}

function GuestOnly({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <PageLoader />;
  if (!user) return children;
  // Just signed in: go where the person was heading (e.g. a scholarship they clicked), or to their own dashboard.
  return <Navigate to={location.state?.from || homeFor(user)} replace />;
}

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public website */}
        <Route path="/" element={<GuestOnly><Landing /></GuestOnly>} />
        <Route path="/learn" element={<Learn />} />
        <Route path="/opportunities" element={<Opportunities />} />
        <Route path="/news" element={<NewsList />} />
        <Route path="/news/:slug" element={<Article />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/logout" element={<Logout />} />

        {/* Sign in and account */}
        <Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />
        <Route path="/register" element={<GuestOnly><Register /></GuestOnly>} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Student dashboard */}
        <Route element={<RequireAuth roles={['student']}><AppLayout /></RequireAuth>}>
          <Route path="/dashboard" element={<StudentDashboard />} />
          <Route path="/courses" element={<Courses />} />
          <Route path="/courses/:slug" element={<CourseDetail />} />
          <Route path="/lessons/:id" element={<LessonPage />} />
          <Route path="/scholarships" element={<Scholarships />} />
          <Route path="/my-learning" element={<MyLearning />} />
          <Route path="/certificates/:id" element={<Certificate />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/mentorship" element={<Mentorship />} />
          <Route path="/ai" element={<InukaAI />} />
        </Route>

        {/* Mentor dashboard */}
        <Route element={<RequireAuth roles={['mentor']}><AppLayout /></RequireAuth>}>
          <Route path="/mentor" element={<MentorDashboard />} />
          <Route path="/mentor/sessions" element={<MentorSessions />} />
          <Route path="/mentor/profile" element={<MentorProfile />} />
        </Route>

        {/* Admin dashboard */}
        <Route element={<RequireAuth roles={['admin']}><AppLayout /></RequireAuth>}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/mentors" element={<AdminMentors />} />
          <Route path="/admin/courses" element={<AdminCourses />} />
          <Route path="/admin/courses/:id" element={<AdminCourse />} />
          <Route path="/admin/lessons/:id" element={<AdminLesson />} />
          <Route path="/admin/scholarships" element={<AdminScholarships />} />
          <Route path="/admin/scholarships/:id" element={<AdminScholarshipForm />} />
          <Route path="/admin/analytics" element={<AdminAnalytics />} />
          <Route path="/admin/announcements" element={<AdminAnnouncements />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
