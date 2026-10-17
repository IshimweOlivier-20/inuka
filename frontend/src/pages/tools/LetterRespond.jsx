import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CalendarDays, CircleCheck, FileUp, HeartHandshake, Mail, PenLine, X } from 'lucide-react';
import { Alert, Button, Field, PageLoader } from '../../components/ui';
import ToolShell, { ToolHeader } from '../../components/tools/ToolShell';
import { api, errorMessage } from '../../services/api';
import { formatDate, formatSize } from '../../utils/format';

// The teacher's page (link from the email, no account): read the request, upload the letter or say no politely.
const TIPS = ['How long and in what role you have known the student', 'Their strengths, with one or two real examples', 'Their character: hard work, leadership, kindness', 'Why they deserve this opportunity', 'Your name, title, school, phone or email, and signature'];

export default function LetterRespond() {
  const { token } = useParams();
  const [req, setReq] = useState(null);
  const [error, setError] = useState('');
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState('');
  const [done, setDone] = useState('');
  const [declining, setDeclining] = useState(false);
  const [note, setNote] = useState('');
  const [drag, setDrag] = useState(false);
  const input = useRef();

  useEffect(() => { api.get(`/public/letters/${token}`).then((r) => setReq(r.data.request)).catch((e) => setError(errorMessage(e))); }, [token]);

  const pick = (f) => {
    setError('');
    if (!f) return;
    if (!/\.(pdf|docx)$/i.test(f.name)) { setError('Please choose a PDF or Word (.docx) file.'); return; }
    if (f.size > 5 * 1024 * 1024) { setError('The file is too big. Please keep it under 5 MB.'); return; }
    setFile(f);
  };
  const upload = async () => {
    setBusy('upload'); setError('');
    try {
      const fd = new FormData(); fd.append('file', file);
      await api.post(`/public/letters/${token}/upload`, fd);
      setDone('uploaded');
    } catch (e) { setError(errorMessage(e)); } finally { setBusy(''); }
  };
  const decline = async () => {
    setBusy('decline'); setError('');
    try { await api.post(`/public/letters/${token}/decline`, { note: note || undefined }); setDone('declined'); } catch (e) { setError(errorMessage(e)); } finally { setBusy(''); }
  };

  const closed = req && req.status !== 'requested';
  return (
    <ToolShell narrow header={<ToolHeader icon={HeartHandshake} eyebrow="Recommendation letter" title={req ? `${req.student} asks for your letter` : 'Recommendation letter'} intro="Thank you for supporting a young person's future. You do not need an INUKA account." />}>
      {!req && !error && <PageLoader />}
      {!req && error && <Alert>{error}</Alert>}
      {req && (done || closed) ? (
        <div className="rounded-md border border-success/40 bg-success-soft p-6 text-center">
          <CircleCheck size={36} className="mx-auto text-success" aria-hidden="true" />
          <p className="font-bold text-success-ink mt-2 text-lg">
            {done === 'uploaded' || req.status === 'received' ? 'Thank you! The letter was received.' : done === 'declined' || req.status === 'declined' ? 'Thank you for letting us know.' : 'This request is closed.'}
          </p>
          <p className="text-sm text-success-ink/90 mt-1">{done === 'uploaded' || req.status === 'received' ? `${req.student} has been told and can now use it in applications.` : `We told ${req.student} so they can ask someone else in time.`}</p>
        </div>
      ) : req && (
        <div className="space-y-5">
          <section className="bg-surface border border-line rounded-md p-5">
            <p className="text-sm">Dear {req.teacherName},</p>
            <dl className="mt-3 grid sm:grid-cols-2 gap-3 text-sm">
              <div><dt className="text-ink-soft text-xs">Student</dt><dd className="font-semibold">{req.student}</dd></div>
              <div><dt className="text-ink-soft text-xs">How you know them</dt><dd className="font-semibold">{req.relationship}</dd></div>
              <div><dt className="text-ink-soft text-xs">The letter is for</dt><dd className="font-semibold">{req.purpose}</dd></div>
              <div><dt className="text-ink-soft text-xs">Needed by</dt><dd className="font-semibold inline-flex items-center gap-1"><CalendarDays size={14} className="text-brand" aria-hidden="true" />{req.dueDate ? formatDate(req.dueDate) : 'As soon as you can'}</dd></div>
            </dl>
            {req.message && <blockquote className="mt-4 border-l-4 border-accent bg-paper rounded-r-md px-4 py-3 text-sm"><p className="text-xs font-semibold text-ink-soft mb-1 flex items-center gap-1"><Mail size={13} aria-hidden="true" />Message from {req.student.split(' ')[0]}</p>{req.message}</blockquote>}
          </section>

          {!declining ? (
            <section className="bg-surface border border-line rounded-md p-5">
              <h2 className="text-base font-semibold flex items-center gap-2"><FileUp size={18} className="text-brand" aria-hidden="true" />Upload the letter</h2>
              <div onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
                onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files[0]); }}
                className={`mt-3 rounded-lg border-2 border-dashed p-6 text-center transition-colors ${drag ? 'border-brand bg-brand-soft' : 'border-line'}`}>
                {file ? (
                  <div className="flex items-center justify-center gap-3 text-sm">
                    <span className="font-semibold truncate max-w-[60%]">{file.name}</span><span className="text-ink-soft">{formatSize(file.size)}</span>
                    <button type="button" onClick={() => setFile(null)} aria-label="Remove file" className="w-8 h-8 rounded-full hover:bg-danger-soft hover:text-danger inline-flex items-center justify-center"><X size={16} /></button>
                  </div>
                ) : (
                  <>
                    <p className="text-sm">Drag the file here, or</p>
                    <button type="button" onClick={() => input.current.click()} className="mt-2 h-9 px-4 rounded border border-brand text-brand text-sm font-semibold hover:bg-brand hover:text-white">Choose a file</button>
                    <p className="text-xs text-ink-soft mt-2">PDF or Word (.docx), up to 5 MB. A signed letter on school paper is best.</p>
                  </>
                )}
                <input ref={input} type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="hidden" onChange={(e) => pick(e.target.files[0])} />
              </div>
              {error && <div className="mt-3"><Alert>{error}</Alert></div>}
              <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
                <button type="button" onClick={() => { setDeclining(true); setError(''); }} className="text-sm text-ink-soft hover:text-ink hover:underline">I cannot write this letter</button>
                <Button onClick={upload} disabled={!file} loading={busy === 'upload'} className="!min-h-10 text-sm">Send the letter</Button>
              </div>
            </section>
          ) : (
            <section className="bg-surface border border-line rounded-md p-5">
              <h2 className="text-base font-semibold">Let {req.student.split(' ')[0]} know</h2>
              <p className="text-sm text-ink-soft mt-1">That is okay. We will tell the student so they can ask another teacher in time.</p>
              <div className="mt-3"><Field as="textarea" rows={3} label="Short note (optional)" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} placeholder="e.g. I am travelling this month. Please ask Mrs. Uwase." /></div>
              {error && <div className="mt-3"><Alert>{error}</Alert></div>}
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="ghost" onClick={() => setDeclining(false)} className="!min-h-10 text-sm">Back</Button>
                <Button variant="dark" onClick={decline} loading={busy === 'decline'} className="!min-h-10 text-sm">Send</Button>
              </div>
            </section>
          )}

          <section className="rounded-md border border-line bg-paper p-5">
            <h2 className="text-sm font-semibold flex items-center gap-2"><PenLine size={16} className="text-brand" aria-hidden="true" />A strong letter usually includes</h2>
            <ul className="mt-2 space-y-1 text-sm text-ink-soft">{TIPS.map((t) => <li key={t}>• {t}</li>)}</ul>
          </section>
        </div>
      )}
    </ToolShell>
  );
}
