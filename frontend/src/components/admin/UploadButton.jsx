import { useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { Spinner } from '../ui';
import { api, errorMessage } from '../../services/api';

// Uploads one file to /api/admin/files (audio, PDF, Word, PowerPoint, Excel, images; 25 MB at most).
// onUploaded({ url, name, type, size })
export const ACCEPT = {
  audio: 'audio/mpeg,audio/mp4,audio/x-m4a,audio/aac,audio/ogg,audio/wav,audio/webm,.mp3,.m4a',
  image: 'image/jpeg,image/png,image/webp,image/gif',
  document: '.pdf,.docx,.pptx,.xlsx,image/jpeg,image/png',
};

export default function UploadButton({ accept, label = 'Upload a file', onUploaded, onError, small }) {
  const input = useRef(null);
  const [busy, setBusy] = useState(false);
  const pick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) { onError?.('This file is bigger than 25 MB. Please choose a smaller file.'); return; }
    setBusy(true);
    try {
      const body = new FormData();
      body.append('file', file);
      const { data } = await api.post('/admin/files', body);
      onUploaded(data);
    } catch (err) { onError?.(errorMessage(err)); } finally { setBusy(false); }
  };
  return (
    <>
      <input ref={input} type="file" accept={accept} className="sr-only" tabIndex={-1} aria-hidden="true" onChange={pick} />
      <button type="button" onClick={() => input.current?.click()} disabled={busy}
        className={`inline-flex items-center gap-2 rounded border-2 border-brand text-brand font-semibold hover:bg-brand hover:text-white disabled:opacity-50 ${small ? 'min-h-10 px-3 text-sm' : 'min-h-11 px-4'}`}>
        {busy ? <Spinner small /> : <Upload size={16} aria-hidden="true" />}{busy ? 'Uploading…' : label}
      </button>
    </>
  );
}
