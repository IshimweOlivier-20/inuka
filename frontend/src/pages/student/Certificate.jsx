import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button } from '../../components/ui';
import Logo from '../../components/layout/Logo';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { formatDate } from '../../utils/format';
import { Skeleton } from '../../components/ui/Skeletons';
import QRCode from 'qrcode';
import { Copy, ShieldCheck } from 'lucide-react';

// The QR code opens the public check page (/verify/<code>), so anyone can confirm the certificate is real.
function useQr(url) {
  const [src, setSrc] = useState('');
  useEffect(() => { if (url) QRCode.toDataURL(url, { margin: 0, width: 220, color: { dark: '#07294D', light: '#FFFFFF' } }).then(setSrc).catch(() => setSrc('')); }, [url]);
  return src;
}

// Printable certificate. "Download PDF" uses the browser's Save as PDF — works on phones and computers.
export default function Certificate() {
  const { id } = useParams();
  const { user } = useAuth();
  const [cert, setCert] = useState(undefined);
  const [copied, setCopied] = useState(false);
  useEffect(() => { api.get('/certificates').then((r) => setCert(r.data.certificates.find((c) => c.id === id) || null)); }, [id]);
  const verifyUrl = cert?.code ? `${window.location.origin}/verify/${cert.code}` : '';
  const qr = useQr(verifyUrl);
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
      {cert.code && (
        <div className="max-w-4xl mb-4 print:hidden rounded-md border border-line bg-surface px-4 py-3 flex flex-wrap items-center gap-3 text-sm">
          <ShieldCheck size={18} className="text-success shrink-0" aria-hidden="true" />
          <p className="flex-1 min-w-[220px]">Anyone can check this certificate at <a href={verifyUrl} target="_blank" rel="noopener noreferrer" className="text-brand font-semibold hover:underline break-all">{verifyUrl.replace(/^https?:\/\//, '')}</a></p>
          <button type="button" onClick={() => { navigator.clipboard?.writeText(verifyUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded border border-line hover:border-brand text-sm font-semibold"><Copy size={14} aria-hidden="true" />{copied ? 'Copied' : 'Copy link'}</button>
        </div>
      )}
      <div id="certificate" className="relative bg-surface aspect-[1.414] max-w-4xl border-[10px] border-brand rounded-sm p-8 sm:p-14 flex flex-col items-center justify-center text-center">
        <Logo tagline size="xl" />
        <h1 className="mt-4 text-xl sm:text-3xl font-bold">Certificate of Completion</h1>
        <p className="mt-6 text-ink-soft">This certifies that</p>
        <p className="mt-2 font-display text-2xl sm:text-4xl font-semibold text-brand">{user.firstName} {user.lastName}</p>
        <p className="mt-6 text-ink-soft">has successfully completed the course</p>
        <p className="mt-2 text-lg sm:text-xl font-semibold">{cert.course.title}</p>
        <p className="mt-8 text-ink-soft">{formatDate(cert.issuedAt)}</p>
        {cert.code ? (
          <div className="absolute right-4 bottom-4 sm:right-8 sm:bottom-8 flex items-end gap-2 text-left">
            <div className="text-[10px] leading-tight text-ink-soft hidden sm:block"><p>Scan to verify</p><p className="font-mono font-semibold text-ink tracking-wider">{cert.code}</p></div>
            {qr && <img src={qr} alt={`QR code to verify certificate ${cert.code}`} className="w-14 h-14 sm:w-20 sm:h-20 bg-white p-1 rounded-sm" />}
          </div>
        ) : <p className="mt-2 text-xs text-ink-soft">Certificate ID: {cert.id}</p>}
        {cert.code && <p className="mt-2 text-xs text-ink-soft sm:hidden">Code: {cert.code}</p>}
      </div>
    </div>
  );
}
