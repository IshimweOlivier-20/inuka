import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Award, BadgeCheck, CircleX, ShieldCheck } from 'lucide-react';
import { Alert, Button, PageLoader } from '../../components/ui';
import ToolShell, { ToolHeader } from '../../components/tools/ToolShell';
import { api, errorMessage } from '../../services/api';
import { formatDate } from '../../utils/format';

// Public certificate check: the QR code on every INUKA certificate opens /verify/<code>.
// Universities, scholarship offices and employers can confirm a certificate is real without an account.
export default function Verify() {
  const { code } = useParams();
  const navigate = useNavigate();
  const [input, setInput] = useState(code || '');
  const [res, setRes] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    setRes(null); setError('');
    if (code) api.get(`/public/certificates/${encodeURIComponent(code)}`).then((r) => setRes(r.data)).catch((e) => setError(errorMessage(e)));
  }, [code]);
  const submit = (e) => { e.preventDefault(); const c = input.trim().toUpperCase().replace(/[^A-Z0-9]/g, ''); if (c) navigate(`/verify/${c}`); };

  return (
    <ToolShell narrow header={<ToolHeader icon={ShieldCheck} eyebrow="Certificate check" title="Verify an INUKA certificate" intro="Scan the QR code on the certificate, or type the code printed under it." />}>
      <form onSubmit={submit} className="flex gap-2">
        <label className="flex-1"><span className="sr-only">Certificate code</span>
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="e.g. 7KQ2M9XHTP" maxLength={20}
            className="w-full h-11 rounded-lg border border-line bg-surface px-3 text-sm font-mono tracking-widest uppercase" />
        </label>
        <Button type="submit" variant="dark" className="!min-h-11 text-sm">Check</Button>
      </form>

      <div className="mt-6">
        {error && <Alert>{error}</Alert>}
        {code && !res && !error && <PageLoader />}
        {res && !res.valid && (
          <div className="rounded-md border border-danger/40 bg-danger-soft p-5 flex gap-3">
            <CircleX size={28} className="text-danger shrink-0" aria-hidden="true" />
            <div><p className="font-bold text-danger-ink">No certificate found with this code</p>
              <p className="text-sm text-danger-ink/90 mt-1">Check the code carefully (letters and numbers only). If it still fails, the certificate may not be genuine. Contact INUKA to confirm.</p></div>
          </div>
        )}
        {res?.valid && (
          <div className="rounded-md border border-success/40 bg-surface overflow-hidden">
            <div className="bg-success-soft px-5 py-4 flex items-center gap-3">
              <BadgeCheck size={28} className="text-success shrink-0" aria-hidden="true" />
              <div><p className="font-bold text-success-ink">Valid certificate</p><p className="text-sm text-success-ink/90">Issued by INUKA. The details below come from our records.</p></div>
            </div>
            <dl className="divide-y divide-line text-sm">
              {[
                ['Awarded to', res.holder],
                ['Course', res.course.title],
                ['Subject', `${res.course.subject}${res.course.level ? ` · ${res.course.level}` : ''}`],
                ['Issued on', formatDate(res.issuedAt)],
                ...(res.finalExam ? [['Final exam', `Passed with ${res.finalExam.score}%`]] : []),
                ['Certificate code', <span key="c" className="font-mono tracking-widest">{res.code}</span>],
              ].map(([k, v]) => <div key={k} className="px-5 py-3 grid grid-cols-[130px_1fr] gap-3"><dt className="text-ink-soft">{k}</dt><dd className="font-semibold">{v}</dd></div>)}
            </dl>
          </div>
        )}
        {!code && (
          <div className="flex gap-3 text-sm text-ink-soft"><Award size={18} className="text-brand shrink-0" aria-hidden="true" />
            <p>Every certificate has a unique code and a QR code. This page shows who received it, for which course and when, so nobody can fake one.</p></div>
        )}
      </div>
    </ToolShell>
  );
}
