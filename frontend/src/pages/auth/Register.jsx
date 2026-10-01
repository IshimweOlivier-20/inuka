import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FormPanel } from './AuthShell';
import GoogleButton from '../../components/auth/GoogleButton';
import PhotoPicker from '../../components/auth/PhotoPicker';
import AvailabilityPicker from '../../components/auth/AvailabilityPicker';
import { cellsToUtcSlots } from '../../utils/availability';
import { Alert, Button, Field } from '../../components/ui';
import { CountryOptions, LANGUAGES } from '../../utils/countries';
import { api, errorMessage } from '../../services/api';

const words = (t) => t.trim().split(/\s+/).filter(Boolean).length;
const EXPERTISE = ['Scholarship Guidance', 'University Admissions', 'English Language', 'Computer Skills', 'Career Counselling', 'Refugee Rights & Education'];

function validateStep1(f) {
  const e = {};
  if (!f.firstName.trim()) e.firstName = 'Please enter your first name.';
  if (!f.lastName.trim()) e.lastName = 'Please enter your last name.';
  if (!/^\S+@\S+\.\S+$/.test(f.email)) e.email = 'Please enter a valid email address.';
  if (f.password.length < 8) e.password = 'Your password must be at least 8 characters long.';
  else if (!/\d/.test(f.password)) e.password = 'Your password must include at least one number.';
  if (f.confirm !== f.password) e.confirm = 'The two passwords do not match.';
  return e;
}

export default function Register() {
  const [params] = useSearchParams();
  const [role, setRole] = useState(params.get('role') === 'mentor' ? 'mentor' : 'student');
  // This form stays on the page while people switch between sign in and sign up, so follow ?role= changes.
  useEffect(() => { if (params.get('role') === 'mentor') { setRole('mentor'); setStep(1); } }, [params]);
  const [photo, setPhoto] = useState(null);
  const [cells, setCells] = useState([]); // mentor availability, "day-hour" in local time
  const [step, setStep] = useState(1);
  const [f, setF] = useState({
    firstName: '', lastName: '', email: '', password: '', confirm: '',
    countryOrigin: '', countryResidence: '', refugeeStatus: '', educationLevel: '', language: '', age: '', acceptTerms: false,
    title: '', org: '', bio: '', expertise: [], languages: [], linkedinUrl: '',
  });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const toggle = (k, v) => setF({ ...f, [k]: f[k].includes(v) ? f[k].filter((x) => x !== v) : [...f[k], v] });

  const next = (e) => {
    e.preventDefault();
    const errs = validateStep1(f);
    setErrors(errs);
    if (!Object.keys(errs).length) setStep(2);
  };

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!f.countryOrigin) errs.countryOrigin = 'Please choose your country of origin.';
    if (!f.countryResidence) errs.countryResidence = 'Please choose the country where you live now.';
    if (!f.acceptTerms) errs.acceptTerms = 'Please accept the Terms of Use and Privacy Policy.';
    if (role === 'mentor') {
      if (!f.title.trim()) errs.title = 'Please enter your professional title.';
      if (f.bio.trim().length < 20) errs.bio = 'Please write a short bio (at least 20 characters).';
      else if (words(f.bio) > 300) errs.bio = `Your bio has ${words(f.bio)} words. Please keep it to 300 words or fewer.`;
      if (!photo) errs.photo = 'Please add a profile photo, so students can see who they are booking.';
      if (!cells.length) errs.slots = 'Please choose at least one hour when you are available.';
      if (!f.expertise.length) errs.expertise = 'Please choose at least one area of expertise.';
      if (!f.languages.length) errs.languages = 'Please choose at least one language.';
    }
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true); setError('');
    try {
      const payload = {
        role, firstName: f.firstName, lastName: f.lastName, email: f.email, password: f.password,
        countryOrigin: f.countryOrigin, countryResidence: f.countryResidence,
        refugeeStatus: f.refugeeStatus || undefined, educationLevel: f.educationLevel || undefined,
        language: f.language || undefined, age: f.age || undefined, acceptTerms: f.acceptTerms,
        ...(role === 'mentor' && { mentor: { title: f.title, org: f.org, bio: f.bio, expertise: f.expertise, languages: f.languages, linkedinUrl: f.linkedinUrl, slots: cellsToUtcSlots(cells) } }),
      };
      // Sent as a form so the photo can travel with it.
      const body = new FormData();
      body.append('data', JSON.stringify(payload));
      if (photo) body.append('photo', photo);
      const { data } = await api.post('/auth/register', body);
      setDone(data);
    } catch (err) {
      setError(errorMessage(err));
      if (err.response?.status === 409) setStep(1);
    } finally { setBusy(false); }
  };

  if (done) {
    return (
      <FormPanel title="Check your email" subtitle={`We sent a confirmation link to ${done.email}.`}>
        <p className="text-ink-soft mb-4">Open the email and click the link to activate your account. If you do not see it, check your spam folder.</p>
        {done.devVerifyUrl && <Alert tone="info">Development mode (no email service yet): <a href={done.devVerifyUrl} className="underline font-semibold">open your confirmation link</a>.</Alert>}
        {role === 'mentor' && <p className="mt-4 text-sm text-ink-soft">After you confirm, the INUKA team will review your mentor profile before students can book you.</p>}
        <Button to="/login" variant="outline" className="w-full mt-6">Go to sign in</Button>
      </FormPanel>
    );
  }

  return (
    <FormPanel title={role === 'mentor' ? 'Become a mentor' : 'Create account'} subtitle={`Step ${step} of 2 — ${step === 1 ? 'Account details' : role === 'mentor' ? 'Your mentor profile' : 'Your profile'}`}>
      {step === 1 && (
        <div className="grid grid-cols-2 gap-2 p-1 bg-paper rounded-lg mb-5" role="radiogroup" aria-label="Account type">
          {['student', 'mentor'].map((r) => (
            <button key={r} type="button" role="radio" aria-checked={role === r} onClick={() => setRole(r)}
              className={`min-h-11 rounded-md font-medium ${role === r ? 'bg-surface shadow-sm text-brand' : 'text-ink-soft'}`}>
              {r === 'student' ? 'I am a student' : 'I am a mentor'}
            </button>
          ))}
        </div>
      )}
      {error && <div className="mb-4"><Alert>{error}</Alert></div>}
      {step === 1 && role === 'student' && <GoogleButton text="signup_with" role="student" divider="or sign up with your email" />}

      {step === 1 ? (
        <form onSubmit={next} className="space-y-4" noValidate>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="First name" autoComplete="given-name" value={f.firstName} onChange={set('firstName')} error={errors.firstName} />
            <Field label="Last name" autoComplete="family-name" value={f.lastName} onChange={set('lastName')} error={errors.lastName} />
          </div>
          <Field label="Email address" type="email" autoComplete="email" value={f.email} onChange={set('email')} error={errors.email} />
          <Field label="Password" type="password" autoComplete="new-password" value={f.password} onChange={set('password')} error={errors.password} hint="At least 8 characters, including one number." />
          <Field label="Confirm password" type="password" autoComplete="new-password" value={f.confirm} onChange={set('confirm')} error={errors.confirm} />
          <Button type="submit" className="w-full">Continue</Button>
        </form>
      ) : (
        <form onSubmit={submit} className="space-y-4" noValidate>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field as="select" label="Country of origin" value={f.countryOrigin} onChange={set('countryOrigin')} error={errors.countryOrigin}><CountryOptions /></Field>
            <Field as="select" label="Country where you live now" value={f.countryResidence} onChange={set('countryResidence')} error={errors.countryResidence}><CountryOptions /></Field>
          </div>
          <PhotoPicker file={photo} onChange={(p) => { setPhoto(p); setErrors((e) => ({ ...e, photo: undefined })); }} required={role === 'mentor'} error={errors.photo} />
          {role === 'student' ? (
            <>
              <Field as="select" label="Are you a refugee or displaced person? (optional)" value={f.refugeeStatus} onChange={set('refugeeStatus')}
                hint="This helps us show you scholarships made for refugees. Only you can see it.">
                <option value="">Choose an answer</option><option value="yes">Yes</option><option value="no">No</option><option value="prefer_not_to_say">Prefer not to say</option>
              </Field>
              <div className="grid sm:grid-cols-3 gap-4">
                <Field as="select" label="Highest level completed" value={f.educationLevel} onChange={set('educationLevel')}>
                  <option value="">Choose</option>{['S4', 'S5', 'S6', 'Other'].map((l) => <option key={l}>{l}</option>)}
                </Field>
                <Field as="select" label="Language at home" value={f.language} onChange={set('language')}>
                  <option value="">Choose</option>{LANGUAGES.map((l) => <option key={l}>{l}</option>)}
                </Field>
                <Field label="Age (optional)" type="number" min="13" max="100" inputMode="numeric" value={f.age} onChange={set('age')} />
              </div>
            </>
          ) : (
            <>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Professional title" placeholder="e.g. Admissions Counsellor" value={f.title} onChange={set('title')} error={errors.title} />
                <Field label="Organisation" value={f.org} onChange={set('org')} />
              </div>
              <Chips label="Areas of expertise" options={EXPERTISE} value={f.expertise} onToggle={(v) => toggle('expertise', v)} error={errors.expertise} />
              <Chips label="Languages you speak" options={['English', 'French', 'Kinyarwanda', 'Kiswahili', 'Arabic', 'Portuguese', 'Other']} value={f.languages} onToggle={(v) => toggle('languages', v)} error={errors.languages} />
              <Field as="textarea" rows={5} label="Professional bio (max 300 words)" value={f.bio} onChange={set('bio')} error={errors.bio}
                hint={`${words(f.bio)} of 300 words. Tell students how you can help them.`} />
              <Field label="LinkedIn profile URL" type="url" placeholder="https://www.linkedin.com/in/…" value={f.linkedinUrl} onChange={set('linkedinUrl')} />
              <AvailabilityPicker value={cells} onChange={(c) => { setCells(c); setErrors((e) => ({ ...e, slots: undefined })); }} error={errors.slots} />
            </>
          )}
          <div>
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" className="mt-1 w-5 h-5 accent-brand" checked={f.acceptTerms} onChange={set('acceptTerms')} />
              <span className="text-sm">I agree to the INUKA <Link to="/terms" target="_blank" className="text-brand underline">Terms of Use</Link> and <Link to="/privacy" target="_blank" className="text-brand underline">Privacy Policy</Link>.</span>
            </label>
            {errors.acceptTerms && <p className="mt-1 text-sm text-danger">{errors.acceptTerms}</p>}
          </div>
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={() => setStep(1)}>Back</Button>
            <Button type="submit" loading={busy} className="flex-1">Create account</Button>
          </div>
        </form>
      )}
    </FormPanel>
  );
}

function Chips({ label, options, value, onToggle, error }) {
  return (
    <fieldset>
      <legend className="block mb-1.5 text-sm font-medium">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button key={o} type="button" aria-pressed={value.includes(o)} onClick={() => onToggle(o)}
            className={`min-h-10 px-3 rounded-full border text-sm ${value.includes(o) ? 'bg-brand text-white border-brand' : 'bg-surface border-line hover:border-brand'}`}>{o}</button>
        ))}
      </div>
      {error && <p className="mt-1 text-sm text-danger">{error}</p>}
    </fieldset>
  );
}
