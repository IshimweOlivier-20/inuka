import { useState } from 'react';
import { Alert, Button, Card } from '../ui';
import Avatar from '../ui/Avatar';
import PhotoPicker from './PhotoPicker';
import { useAuth } from '../../context/AuthContext';
import { api, errorMessage } from '../../services/api';

// Change or remove the profile photo (Profile page).
export default function ProfilePhotoCard() {
  const { user, setUser } = useAuth();
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const upload = async () => {
    setBusy(true); setMsg(null);
    try {
      const body = new FormData();
      body.append('photo', file);
      const { data } = await api.put('/profile/photo', body);
      setUser({ ...user, ...data.user });
      setFile(null);
      setMsg({ tone: 'success', text: 'Your photo has been updated.' });
    } catch (e) { setMsg({ tone: 'error', text: errorMessage(e) }); } finally { setBusy(false); }
  };
  const remove = async () => {
    setBusy(true); setMsg(null);
    try {
      const { data } = await api.delete('/profile/photo');
      setUser({ ...user, ...data.user });
      setMsg({ tone: 'success', text: 'Your photo has been removed.' });
    } catch (e) { setMsg({ tone: 'error', text: errorMessage(e) }); } finally { setBusy(false); }
  };

  return (
    <Card>
      <h2 className="font-semibold text-lg mb-3">Profile photo</h2>
      {msg && <div className="mb-3"><Alert tone={msg.tone}>{msg.text}</Alert></div>}
      {file ? (
        <div className="space-y-3">
          <PhotoPicker file={file} onChange={setFile} label="New photo" />
          <Button onClick={upload} loading={busy} className="w-full">Save photo</Button>
        </div>
      ) : (
        <div className="flex items-center gap-4">
          <Avatar user={user} size="lg" />
          <div className="flex flex-col gap-1 items-start">
            <label className="inline-flex items-center min-h-11 px-4 rounded-lg border-2 border-brand text-brand font-semibold cursor-pointer hover:bg-brand-soft focus-within:ring-2 focus-within:ring-brand">
              {user.profilePhotoUrl ? 'Change photo' : 'Add a photo'}
              <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only"
                onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) setFile(f); }} />
            </label>
            {user.profilePhotoUrl && user.role !== 'mentor' && (
              <button type="button" onClick={remove} disabled={busy} className="min-h-11 px-1 text-sm font-semibold text-ink-soft hover:text-danger">Remove photo</button>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
