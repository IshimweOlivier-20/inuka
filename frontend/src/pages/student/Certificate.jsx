import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button } from '../../components/ui';
import Logo from '../../components/layout/Logo';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { formatDate } from '../../utils/format';
import { Skeleton } from '../../components/ui/Skeletons';

// Printable certificate. "Download PDF" uses the browser's Save as PDF — works on phones and computers.
export default function Certificate() {
  const { id } = useParams();
  const { user } = useAuth();
  const [cert, setCert] = useState(undefined);
  useEffect(() => { api.get('/certificates').then((r) => setCert(r.data.certificates.find((c) => c.id === id) || null)); }, [id]);
  if (cert === undefined) return <Skeleton height={480} className="max-w-4xl" />;
  if (!cert) return <p>We could not find that certificate. <Link to="/my-learning" className="text-brand underline">Back to My Learning</Link></p>;

  return (
    <div>
      <style>{'@media print { body * { visibility: hidden; } #certificate, #certificate * { visibility: visible; } #certificate { position: fixed; inset: 0; margin: 0; border-width: 12px; } @page { size: A4 landscape; margin: 0; } }'}</style>
      <div className="flex flex-wrap gap-3 mb-6 print:hidden">
        <Button onClick={() => window.print()}>Download PDF</Button>
        <Button variant="ghost" to="/my-learning">Back to My Learning</Button>
        <p className="text-sm text-ink-soft self-center">In the print window, choose “Save as PDF”.</p>
      </div>
      <div id="certificate" className="bg-surface aspect-[1.414] max-w-4xl border-[10px] border-brand rounded-sm p-8 sm:p-14 flex flex-col items-center justify-center text-center">
        <Logo tagline size="xl" />
        <h1 className="mt-4 text-2xl sm:text-4xl font-bold">Certificate of Completion</h1>
        <p className="mt-6 text-ink-soft">This certifies that</p>
        <p className="mt-2 font-display text-3xl sm:text-5xl font-semibold text-brand">{user.firstName} {user.lastName}</p>
        <p className="mt-6 text-ink-soft">has successfully completed the course</p>
        <p className="mt-2 text-xl sm:text-2xl font-semibold">{cert.course.title}</p>
        <p className="mt-8 text-ink-soft">{formatDate(cert.issuedAt)}</p>
        <p className="mt-2 text-xs text-ink-soft">Certificate ID: {cert.id}</p>
      </div>
    </div>
  );
}
