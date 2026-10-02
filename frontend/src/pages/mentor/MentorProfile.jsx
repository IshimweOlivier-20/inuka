import { useEffect, useState } from 'react';
import { Alert, Button, Card, Field } from '../../components/ui';
import { ListRowsSkeleton } from '../../components/ui/Skeletons';
import ProfilePhotoCard from '../../components/auth/ProfilePhotoCard';
import AvailabilityPicker from '../../components/auth/AvailabilityPicker';
import { cellsToUtcSlots, utcSlotsToCells } from '../../utils/availability';
import { countWords } from '../../components/mentorship/shared';
import { api, errorMessage } from '../../services/api';

const EXPERTISE = ['Scholarship Guidance', 'University Admissions', 'English Language', 'Computer Skills', 'Career Counselling', 'Refugee Rights & Education'];
const LANGS = ['English', 'French', 'Kinyarwanda', 'Kiswahili', 'Kirundi', 'Arabic', 'Portuguese', 'Somali', 'Amharic', 'Other'];

// Mentor profile and availability (spec 12.5: "manage their profile", "update available time slots").
export default function MentorProfile() {
  const [m, setM] = useState(null);
  const [f, setF] = useState(null);
  const [cells, setCells] = useState([]);
  const [msg, setMsg] = useState(null);
  const [slotMsg, setSlotMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    document.title = 'My mentor profile — INUKA';
    api.get('/mentor/overview').then(({ data }) => {
      setM(data.mentor);
      if (data.mentor) {
        const x = data.mentor;
        setF({ title: x.title, org: x.org || '', bio: x.bio || '', expertise: x.expertise || [], languages: x.languages || [], linkedinUrl: x.linkedinUrl || '' });
        setCells(utcSlotsToCells(x.slots));
      }
    }).catch((e) => setMsg({ tone: 'error', text: errorMessage(e) }));
  }, []);
  useEffect(() => { if (f && window.location.hash === '#availability') document.getElementById('availability')?.scrollIntoView(); }, [f]);

  if (!m && !msg) return <ListRowsSkeleton rows={5} />;
  if (!m) return <Alert>{msg?.text || 'Your mentor profile is not set up yet. Please contact the INUKA team.'}</Alert>;

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const toggle = (k, v) => setF({ ...f, [k]: f[k].includes(v) ? f[k].filter((x) => x !== v) : [...f[k], v] });

  const save = async (e) => {
    e.preventDefault(); setBusy(true); setMsg(null);
    try {
      const { data } = await api.put('/mentor/profile', f);
      setMsg({ tone: 'success', text: data.resubmitted ? 'Saved. Your profile has been sent to the INUKA team for review again.' : 'Your profile has been saved.' });
    } catch (err) { setMsg({ tone: 'error', text: errorMessage(err) }); } finally { setBusy(false); }
  };
  const saveSlots = async () => {
    setSlotMsg(null);
    try { await api.put('/mentor/slots', { slots: cellsToUtcSlots(cells) }); setSlotMsg({ tone: 'success', text: 'Your availability has been saved. Students can book these hours.' }); }
    catch (err) { setSlotMsg({ tone: 'error', text: errorMessage(err) }); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-[1.75rem] font-bold">My mentor profile</h1>
        <p className="text-ink-soft mt-1">This is what students see when they choose a mentor.</p>
      </div>
      <div className="grid lg:grid-cols-[1fr_320px] gap-6 items-start">
        <Card>
          <form onSubmit={save} className="space-y-4" noValidate>
            {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Professional title" value={f.title} onChange={set('title')} />
              <Field label="Organisation" value={f.org} onChange={set('org')} />
            </div>
            <Chips label="Areas of expertise" options={EXPERTISE} value={f.expertise} onToggle={(v) => toggle('expertise', v)} />
            <Chips label="Languages you speak" options={[...new Set([...LANGS, ...f.languages])]} value={f.languages} onToggle={(v) => toggle('languages', v)} />
            <Field as="textarea" rows={6} label="Professional bio (max 300 words)" value={f.bio} onChange={set('bio')} hint={`${countWords(f.bio)} of 300 words.`} />
            <Field label="LinkedIn profile URL" type="url" value={f.linkedinUrl} onChange={set('linkedinUrl')} />
            <Button type="submit" loading={busy}>Save profile</Button>
          </form>
        </Card>
        <ProfilePhotoCard />
      </div>
      <Card id="availability" className="scroll-mt-24">
        <h2 className="text-lg font-semibold mb-3">Weekly availability</h2>
        {slotMsg && <div className="mb-3"><Alert tone={slotMsg.tone}>{slotMsg.text}</Alert></div>}
        <div className="max-w-2xl">
          <AvailabilityPicker value={cells} onChange={setCells} />
          <p className="text-sm text-ink-soft mt-2">Sessions that are already booked stay booked when you change these hours.</p>
          <Button onClick={saveSlots} className="mt-4" disabled={!cells.length}>Save availability</Button>
        </div>
      </Card>
    </div>
  );
}

function Chips({ label, options, value, onToggle }) {
  return (
    <fieldset>
      <legend className="block mb-1.5 text-sm font-medium">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button key={o} type="button" aria-pressed={value.includes(o)} onClick={() => onToggle(o)}
            className={`min-h-10 px-3 rounded-full border text-sm ${value.includes(o) ? 'bg-brand text-white border-brand' : 'bg-surface border-line hover:border-brand'}`}>{o}</button>
        ))}
      </div>
    </fieldset>
  );
}
