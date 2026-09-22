import Skeleton, { SkeletonTheme } from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

// Brand-tinted placeholders that match the shape of each page while its data loads.
export function InukaSkeletonTheme({ children }) {
  const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  return (
    <SkeletonTheme baseColor="#E6EEE9" highlightColor="#F5FAF7" borderRadius="0.5rem" duration={1.4} enableAnimation={!reduced}>
      {children}
    </SkeletonTheme>
  );
}

const Box = ({ className = '', children }) => (
  <div className={`bg-white rounded-xl border border-line p-5 ${className}`} aria-hidden="true">{children}</div>
);

// Wrapper that tells screen readers something is loading, once.
function Loading({ label = 'Loading', children, className = '' }) {
  return <div role="status" aria-busy="true" aria-label={label} className={className}>{children}</div>;
}

export function PageSkeleton() {
  return (
    <Loading label="Loading page" className="flex flex-col gap-6">
      <Skeleton height={36} width="40%" />
      <Skeleton height={18} width="60%" />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => <Box key={i}><Skeleton height={20} width="70%" /><Skeleton count={3} className="mt-2" /></Box>)}
      </div>
    </Loading>
  );
}

export function DashboardSkeleton() {
  return (
    <Loading label="Loading your dashboard" className="flex flex-col gap-6">
      <Skeleton height={150} borderRadius="1rem" />
      <div className="grid lg:grid-cols-3 gap-6">
        <Box className="lg:col-span-2">
          <Skeleton height={22} width={140} />
          <Skeleton height={10} className="mt-5" />
          <div className="grid sm:grid-cols-2 gap-4 mt-5"><Skeleton height={64} /><Skeleton height={64} /></div>
          <Skeleton height={80} className="mt-5" />
        </Box>
        <Box><Skeleton height={22} width={120} /><Skeleton height={44} width={80} className="mt-4" /><Skeleton width="60%" /><Skeleton height={48} className="mt-6" /></Box>
        {[0, 1, 2].map((i) => <Box key={i}><Skeleton height={22} width={130} /><Skeleton count={2} className="mt-3" /><Skeleton height={44} className="mt-4" /></Box>)}
      </div>
    </Loading>
  );
}

export function CourseCardSkeleton() {
  return (
    <li className="bg-white rounded-xl border border-line overflow-hidden list-none" aria-hidden="true">
      <div className="bg-leaf px-5 pt-5 pb-4"><Skeleton height={32} width={32} /><Skeleton height={22} width="80%" className="mt-2" /></div>
      <div className="p-5"><Skeleton count={2} /><Skeleton height={10} className="mt-4" /><Skeleton height={44} className="mt-4" /></div>
    </li>
  );
}

export function CoursesSkeleton() {
  return (
    <Loading label="Loading courses" className="flex flex-col gap-10">
      <div><Skeleton height={36} width={180} /><Skeleton width="55%" className="mt-2" /></div>
      {[0, 1].map((t) => (
        <div key={t}>
          <Skeleton height={28} width={240} className="mb-4" />
          <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{[0, 1, 2].map((i) => <CourseCardSkeleton key={i} />)}</ul>
        </div>
      ))}
    </Loading>
  );
}

export function CourseDetailSkeleton() {
  return (
    <Loading label="Loading course" className="max-w-3xl">
      <Skeleton width={100} />
      <Skeleton height={36} width="60%" className="mt-3" />
      <Skeleton count={2} className="mt-2" />
      <Skeleton height={10} className="mt-5" />
      <Box className="mt-8 p-0">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-4 p-4 border-b border-line last:border-0">
            <Skeleton circle height={36} width={36} />
            <div className="flex-1"><Skeleton width="50%" /><Skeleton width="75%" height={14} /></div>
          </div>
        ))}
      </Box>
    </Loading>
  );
}

export function LessonSkeleton() {
  return (
    <Loading label="Loading lesson" className="max-w-3xl">
      <Skeleton width={160} />
      <Skeleton height={10} className="mt-4" />
      <Skeleton height={36} width="55%" className="mt-6" />
      <Skeleton width="40%" />
      <Skeleton height={44} width={220} borderRadius="999px" className="mt-4" />
      <div className="mt-6 flex flex-col gap-5"><Skeleton count={3} /><Skeleton width="30%" height={22} /><Skeleton count={4} /></div>
    </Loading>
  );
}

export function ScholarshipCardSkeleton() {
  return (
    <li className="bg-white rounded-xl border border-line p-5 list-none" aria-hidden="true">
      <div className="flex gap-3"><Skeleton height={48} width={48} /><div className="flex-1"><Skeleton height={20} /><Skeleton width="60%" /></div></div>
      <div className="flex gap-2 mt-3"><Skeleton width={90} height={22} borderRadius="999px" /><Skeleton width={120} height={22} borderRadius="999px" /></div>
      <Skeleton count={3} className="mt-3" />
      <div className="flex gap-2 mt-4"><Skeleton width={80} height={44} /><Skeleton width={110} height={44} /><div className="flex-1"><Skeleton height={44} /></div></div>
    </li>
  );
}

export function ScholarshipGridSkeleton({ count = 4 }) {
  return (
    <Loading label="Loading scholarships">
      <Skeleton width={110} className="mb-3" />
      <ul className="grid md:grid-cols-2 gap-4">{Array.from({ length: count }, (_, i) => <ScholarshipCardSkeleton key={i} />)}</ul>
    </Loading>
  );
}

export function FeaturedScholarshipsSkeleton() {
  return (
    <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4" role="status" aria-label="Loading scholarships">
      {Array.from({ length: 6 }, (_, i) => (
        <li key={i} className="bg-white rounded-xl border border-line p-5" aria-hidden="true">
          <Skeleton height={22} width="85%" /><Skeleton width="60%" />
          <div className="flex gap-2 mt-4"><Skeleton width={90} height={22} borderRadius="999px" /><Skeleton width={120} height={22} borderRadius="999px" /></div>
        </li>
      ))}
    </ul>
  );
}

export function ListRowsSkeleton({ rows = 4, label = 'Loading' }) {
  return (
    <Loading label={label} className="flex flex-col gap-3">
      {Array.from({ length: rows }, (_, i) => (
        <Box key={i} className="p-4 flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-48"><Skeleton width="45%" /><Skeleton width="30%" height={14} /></div>
          <Skeleton width={100} height={22} borderRadius="999px" />
          <Skeleton width={90} height={44} />
        </Box>
      ))}
    </Loading>
  );
}

export function MyLearningSkeleton() {
  return (
    <Loading label="Loading your progress" className="flex flex-col gap-6">
      <Skeleton height={36} width={200} />
      <div className="grid md:grid-cols-3 gap-6">
        {[0, 1].map((i) => <Box key={i} className="flex items-center gap-4"><Skeleton circle height={104} width={104} /><div className="flex-1"><Skeleton width="80%" /><Skeleton width="50%" /></div></Box>)}
        <Box><Skeleton width={100} /><Skeleton height={40} width={70} /><Skeleton width="70%" /><Skeleton height={100} width={130} className="mt-2" /></Box>
      </div>
      <Box><Skeleton height={22} width={150} /><Skeleton count={3} height={36} className="mt-3" /></Box>
      <Box><Skeleton height={22} width={100} />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-4">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} height={100} />)}</div>
      </Box>
    </Loading>
  );
}

export { Skeleton };
