import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import AppLayout from './components/layout/AppLayout';
import { PageLoader } from './components/ui';
import { HeartHandshake, Sparkles, Wrench } from 'lucide-react';

// Each page is its own chunk (spec 19.4: code splitting for slow connections)
const Landing = lazy(() => import('./pages/Landing'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const VerifyEmail = lazy(() => import('./pages/AccountPages').then((m) => ({ default: m.VerifyEmail })));
const ForgotPassword = lazy(() => import('./pages/AccountPages').then((m) => ({ default: m.ForgotPassword })));
const ResetPassword = lazy(() => import('./pages/AccountPages').then((m) => ({ default: m.ResetPassword })));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Courses = lazy(() => import('./pages/Courses'));
const CourseDetail = lazy(() => import('./pages/CourseDetail'));
const LessonPage = lazy(() => import('./pages/LessonPage'));
const Scholarships = lazy(() => import('./pages/Scholarships'));
const MyLearning = lazy(() => import('./pages/MyLearning'));
const Certificate = lazy(() => import('./pages/Certificate'));
const Profile = lazy(() => import('./pages/Profile'));
const ComingSoon = lazy(() => import('./pages/Misc').then((m) => ({ default: m.ComingSoon })));
const NewsList = lazy(() => import('./pages/News').then((m) => ({ default: m.NewsList })));
const Article = lazy(() => import('./pages/News').then((m) => ({ default: m.Article })));
const Learn = lazy(() => import('./pages/Learn'));
const Opportunities = lazy(() => import('./pages/Opportunities'));
const NotFound = lazy(() => import('./pages/Misc').then((m) => ({ default: m.NotFound })));

function RequireAuth({ children, role }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  if (role && user.role !== role) return <Navigate to="/dashboard" replace />;
  return children;
}

function GuestOnly({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <PageLoader />;
  if (!user) return children;
  // Just signed in: go where the person was heading (e.g. a scholarship they clicked), not always the dashboard.
  const home = user.role === 'admin' ? '/admin' : '/dashboard';
  return <Navigate to={location.state?.from || home} replace />;
}

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<GuestOnly><Landing /></GuestOnly>} />
        <Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />
        <Route path="/register" element={<GuestOnly><Register /></GuestOnly>} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/learn" element={<Learn />} />
        <Route path="/opportunities" element={<Opportunities />} />
        <Route path="/news" element={<NewsList />} />
        <Route path="/news/:slug" element={<Article />} />

        <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/courses" element={<Courses />} />
          <Route path="/courses/:slug" element={<CourseDetail />} />
          <Route path="/lessons/:id" element={<LessonPage />} />
          <Route path="/scholarships" element={<Scholarships />} />
          <Route path="/my-learning" element={<MyLearning />} />
          <Route path="/certificates/:id" element={<Certificate />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/mentorship" element={<ComingSoon icon={HeartHandshake} title="Mentorship is coming next" text="Soon you will be able to book a session with a mentor who can review your personal statement and guide your applications." />} />
          <Route path="/ai" element={<ComingSoon icon={Sparkles} title="INUKA AI is coming soon" text="Your 24/7 learning guide for scholarships, English and computer questions is being built." />} />
          <Route path="/admin" element={<RequireAuth role="admin"><ComingSoon icon={Wrench} title="Admin dashboard" text="Coming in a later phase. For now, use Prisma Studio (npm run db:studio in the server folder) to manage data." /></RequireAuth>} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
