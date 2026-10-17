import { useState } from 'react';
import { CircleAlert, CircleCheck, Info, ShieldAlert, ShieldCheck, ShieldQuestion, Sparkles, TriangleAlert } from 'lucide-react';
import { Alert, Button } from '../../components/ui';
import ToolShell, { DashTitle, ToolHeader } from '../../components/tools/ToolShell';
import VoiceInputButton from '../../components/ui/VoiceInput';
import { api, errorMessage } from '../../services/api';

// Scholarship scam checker: paste a message, email or link → red / yellow / green with reasons.
const LEVEL = {
  red: { Icon: ShieldAlert, box: 'border-danger/40 bg-danger-soft', ink: 'text-danger-ink', bar: 'bg-danger', label: 'High risk' },
  yellow: { Icon: ShieldQuestion, box: 'border-warning/50 bg-warning-soft', ink: 'text-warning-ink', bar: 'bg-warning', label: 'Be careful' },
  green: { Icon: ShieldCheck, box: 'border-success/40 bg-success-soft', ink: 'text-success-ink', bar: 'bg-success', label: 'Low risk' },
};
const REASON_ICON = { red: [CircleAlert, 'text-danger'], yellow: [TriangleAlert, 'text-warning'], info: [Info, 'text-info'], ai: [Sparkles, 'text-brand'] };
const EXAMPLES = [
  'Congratulations! You have been selected for a full scholarship in Canada. Pay the processing fee of 45,000 RWF by MoMo within 24 hours to secure your place. Contact: scholarship.office.canada@gmail.com',
  'Hello, I am an agent. I can get you admitted to a university in Poland with a visa. Send me your passport and 300 USD on WhatsApp.',
  'The Mastercard Foundation Scholars Program at partner universities is open. Read the eligibility and apply on https://mastercardfdn.org',
];
const SIGNS = ['Asks you to pay a "processing", "registration" or "visa" fee', 'Says you are selected before you applied', 'Pushes you to act within hours', 'Uses Gmail/Yahoo while claiming to be a university or embassy', 'Hides the link (bit.ly) or only gives WhatsApp', 'Asks for passwords, PINs or bank details'];

function ScamTool() {
  const [text, setText] = useState('');
  const [res, setRes] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const check = async (e) => {
    e?.preventDefault(); setError(''); setBusy(true); setRes(null);
    try { setRes((await api.post('/public/scam-check', { text })).data); } catch (err) { setError(errorMessage(err)); } finally { setBusy(false); }
  };
  const L = res && LEVEL[res.level];
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_320px] gap-5 items-start">
      <div className="space-y-4">
        <form onSubmit={check} className="bg-surface border border-line rounded-md p-5">
          <label htmlFor="scam-text" className="block text-sm font-semibold">Paste the message, email or link you received</label>
          <div className="relative mt-2">
            <textarea id="scam-text" rows={7} value={text} onChange={(e) => setText(e.target.value)} maxLength={6000}
              placeholder="e.g. “Congratulations, you are selected… pay 50,000 RWF to…”"
              className="w-full rounded-lg border border-line bg-surface px-3 py-2.5 pr-12 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-brand/40" />
            <div className="absolute right-2 bottom-3"><VoiceInputButton onText={(t) => setText((v) => (v ? `${v} ${t}` : t))} /></div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 mt-3">
            <div className="flex flex-wrap gap-1.5 text-xs">
              <span className="text-ink-soft self-center">Try an example:</span>
              {['Fee request', 'Agent', 'Official'].map((l, i) => (
                <button key={l} type="button" onClick={() => { setText(EXAMPLES[i]); setRes(null); }} className="h-7 px-2.5 rounded-full border border-line hover:border-brand hover:text-brand">{l}</button>
              ))}
            </div>
            <Button type="submit" loading={busy} disabled={text.trim().length < 10} className="!min-h-10 !px-5 text-sm">Check it</Button>
          </div>
          <p className="text-xs text-ink-soft mt-3">We do not store what you paste. Remove personal details (your ID number, passwords) before checking.</p>
        </form>

        {error && <Alert>{error}</Alert>}
        {res && (
          <section className={`rounded-md border p-5 ${L.box}`} aria-live="polite">
            <div className="flex items-start gap-3">
              <L.Icon size={30} className={`${L.ink} shrink-0`} aria-hidden="true" />
              <div className="flex-1">
                <p className={`text-xs font-bold uppercase tracking-wider ${L.ink}`}>{L.label}</p>
                <h2 className={`text-lg font-bold ${L.ink}`}>{res.title}</h2>
                <div className="flex gap-1 mt-2" aria-hidden="true">
                  {['green', 'yellow', 'red'].map((k) => <span key={k} className={`h-1.5 flex-1 rounded-full ${['green', 'yellow', 'red'].indexOf(k) <= ['green', 'yellow', 'red'].indexOf(res.level) ? L.bar : 'bg-black/10'}`} />)}
                </div>
              </div>
            </div>
            {res.reasons.length > 0 && (
              <ul className="mt-4 space-y-2 bg-surface/70 rounded-md p-3">
                {res.reasons.map((r, i) => {
                  const [Icon, cls] = REASON_ICON[r.level] || REASON_ICON.info;
                  return <li key={i} className="flex gap-2 text-sm"><Icon size={16} className={`${cls} shrink-0 mt-0.5`} aria-hidden="true" /><span>{r.level === 'ai' && <span className="font-semibold">INUKA AI: </span>}{r.text}</span></li>;
                })}
              </ul>
            )}
            <p className="text-sm font-semibold mt-4">What to do</p>
            <ul className="mt-1 space-y-1 text-sm">{res.advice.map((a) => <li key={a} className="flex gap-2"><CircleCheck size={15} className="text-success shrink-0 mt-0.5" aria-hidden="true" />{a}</li>)}</ul>
            <p className="text-xs text-ink-soft mt-3">This is an automatic check{res.aiUsed ? ' (rules + INUKA AI)' : ''}. It can miss things: when in doubt, ask a mentor.</p>
          </section>
        )}
      </div>
      <aside className="bg-surface border border-line rounded-md p-5">
        <h2 className="text-base font-semibold flex items-center gap-2"><ShieldAlert size={17} className="text-danger" aria-hidden="true" />Six warning signs</h2>
        <ul className="mt-3 space-y-2 text-sm">{SIGNS.map((s) => <li key={s} className="flex gap-2"><span className="w-1.5 h-1.5 rounded-full bg-danger mt-2 shrink-0" aria-hidden="true" />{s}</li>)}</ul>
        <p className="text-sm mt-4 pt-4 border-t border-line"><span className="font-semibold">Remember:</span> real scholarships never ask you to pay to be selected. You can always apply yourself, for free, on the official website.</p>
      </aside>
    </div>
  );
}

export default function ScamCheckPublic() {
  return (
    <ToolShell header={<ToolHeader icon={ShieldCheck} eyebrow="Free tool" title="Is this scholarship real?" intro="Paste a message, email or link. INUKA checks it for common scam signs and tells you what to do." />}>
      <ScamTool />
    </ToolShell>
  );
}

export function ScamCheckDashboard() {
  return (
    <div className="text-[15px]">
      <DashTitle title="Scam checker" intro="Got a message about a scholarship? Check it before you pay, share documents or click a link." />
      <ScamTool />
    </div>
  );
}
