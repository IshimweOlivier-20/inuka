import { useEffect, useId, useState } from 'react';
import { Camera, X } from 'lucide-react';

const TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX = 3 * 1024 * 1024;

// Profile photo with a round preview. Checks type and size before upload.
export default function PhotoPicker({ file, onChange, required, error, label = 'Profile photo' }) {
  const id = useId();
  const [preview, setPreview] = useState(null);
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    if (!file) { setPreview(null); return undefined; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const pick = (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    if (!TYPES.includes(f.type)) { setLocalError('Please choose a JPG, PNG or WebP photo.'); return; }
    if (f.size > MAX) { setLocalError('This photo is larger than 3 MB. Please choose a smaller one.'); return; }
    setLocalError('');
    onChange(f);
  };

  const shown = localError || error;
  return (
    <div>
      <p className="block mb-1.5 text-sm font-medium">{label} {required ? <span className="text-ink-soft font-normal">(required for mentors)</span> : <span className="text-ink-soft font-normal">(optional)</span>}</p>
      <div className="flex items-center gap-4">
        <span className="w-20 h-20 shrink-0 rounded-full bg-brand-soft border border-line overflow-hidden flex items-center justify-center text-brand">
          {preview ? <img src={preview} alt="Your photo preview" className="w-full h-full object-cover" /> : <Camera size={28} aria-hidden="true" />}
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor={id} className="inline-flex items-center min-h-11 px-4 rounded-lg border-2 border-brand text-brand font-semibold cursor-pointer hover:bg-brand-soft focus-within:ring-2 focus-within:ring-brand">
            {file ? 'Change photo' : 'Choose a photo'}
            <input id={id} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={pick} aria-describedby={`${id}-hint`} aria-invalid={!!shown} />
          </label>
          {file && (
            <button type="button" onClick={() => onChange(null)} className="inline-flex items-center gap-1 min-h-11 px-3 text-sm font-semibold text-ink-soft hover:text-danger">
              <X size={16} aria-hidden="true" />Remove
            </button>
          )}
          <p id={`${id}-hint`} className="w-full text-xs text-ink-soft">JPG, PNG or WebP, up to 3 MB. A clear photo of your face works best.</p>
        </div>
      </div>
      {shown && <p className="mt-1 text-sm text-danger" role="alert">{shown}</p>}
    </div>
  );
}
