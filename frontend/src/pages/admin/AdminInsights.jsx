import { useEffect, useState } from 'react';
import { Megaphone, Sparkles, TrendingDown } from 'lucide-react';
import { Alert, Button, Card, Field } from '../../components/ui';
import { ListRowsSkeleton } from '../../components/ui/Skeletons';
import RichEditor from '../../components/editor/RichEditor';
import RichText from '../../components/ui/RichText';
import { PageTitle, RankBars } from '../../components/admin/AdminUI';
import { useConfirm, useToast } from '../../context/FeedbackContext';
import { plainText } from '../../utils/sanitize';
import { api, errorMessage } from '../../services/api';
import { APP_STATUS, timeAgo } from '../../utils/format';

// Analytics (spec 16.2): learning statistics, popular content, drop-off points, AI query themes.
export function AdminAnalytics() {
  const [d, setD] = useState(null);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(null);
  useEffect(() => {
    document.title = 'Analytics — INUKA admin';
    api.get('/admin/analytics').then((r) => setD(r.data)).catch((e) => setError(errorMessage(e)));
  }, []);
  if (error) return <Alert>{error}</Alert>;
  if (!d) return <ListRowsSkeleton rows={8} />;

  return (
    <div className="space-y-6">
      <PageTitle title="Analytics" intro="How students learn on INUKA: where they start, where they stop, and what they ask INUKA AI." />

      <Card>
        <h2 className="text-lg font-semibold">Courses: started, finished and drop-off points</h2>
        <div className="overflow-x-auto mt-3">
          <table className="w-full text-sm">
            <thead className="text-left text-ink-soft"><tr><th className="py-2 pr-3 font-semibold">Course</th><th className="py-2 px-3 font-semibold">Started</th><th className="py-2 px-3 font-semibold">Finished</th><th className="py-2 px-3 font-semibold">Finish rate</th><th className="py-2 pl-3 font-semibold">Most students stop after</th></tr></thead>
            <tbody className="divide-y divide-line">
              {d.funnel.map((c) => (
                <tr key={c.id} className="align-top">
                  <td className="py-2.5 pr-3">
                    <button type="button" onClick={() => setOpen(open === c.id ? null : c.id)} aria-expanded={open === c.id} className="font-semibold text-left hover:underline min-h-11">{c.title}</button>
                    {open === c.id && (
                      <ol className="mt-2 mb-1 space-y-1.5 min-w-[260px]">
                        {c.lessons.map((l) => (
                          <li key={l.id} className="text-xs">
                            <div className="flex justify-between gap-2"><span className="truncate">{l.number}. {l.title}</span><span className="tabular-nums text-ink-soft">{l.completed}{l.avgScore !== null && ` · quiz ${l.avgScore}%`}</span></div>
                            <div className="h-1.5 rounded-full bg-line mt-0.5 overflow-hidden"><div className="h-full bg-brand" style={{ width: `${c.enrolled ? Math.min(100, (l.completed / c.enrolled) * 100) : 0}%` }} /></div>
                          </li>
                        ))}
                      </ol>
                    )}
                  </td>
                  <td className="py-2.5 px-3 tabular-nums">{c.enrolled}</td>
                  <td className="py-2.5 px-3 tabular-nums">{c.completed}</td>
                  <td className="py-2.5 px-3 tabular-nums">{c.enrolled ? `${Math.round((c.completed / c.enrolled) * 100)}%` : '—'}</td>
                  <td className="py-2.5 pl-3">{c.dropOff ? <span className="inline-flex items-start gap-1.5"><TrendingDown size={16} className="text-danger shrink-0 mt-0.5" aria-hidden="true" />Lesson {c.dropOff.afterLesson}: {c.dropOff.title} <span className="text-ink-soft">({c.dropOff.lost} stopped)</span></span> : <span className="text-ink-soft">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-ink-soft mt-2">Open a course to see how many students finished each lesson and their average quiz score.</p>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <h2 className="text-lg font-semibold mb-4">Most completed lessons</h2>
          <RankBars rows={d.popularLessons.map((l) => ({ label: `${l.title} (${l.course})`, value: l.completed }))} empty="No lessons completed yet." />
        </Card>
        <Card>
          <h2 className="text-lg font-semibold mb-1 flex items-center gap-2"><Sparkles size={20} className="text-brand" aria-hidden="true" />What students ask INUKA AI</h2>
          <p className="text-sm text-ink-soft mb-4">Last 90 days: {d.ai.questions} questions in {d.ai.conversations} conversations. Only topics are counted; nobody's messages are shown.</p>
          <RankBars rows={d.ai.themes.map((t) => ({ label: t.theme, value: t.count }))} empty="No questions yet." />
        </Card>
      </div>

      <Card>
        <h2 className="text-lg font-semibold mb-4">Scholarship applications tracked by students</h2>
        <RankBars rows={Object.entries(APP_STATUS).map(([k, label]) => ({ label, value: d.applications[k] || 0 }))} empty="No applications tracked yet." />
      </Card>
    </div>
  );
}

// Announcements (spec 16.2): in-app notification to all students or a group.
export function AdminAnnouncements() {
  const confirm = useConfirm();
  const toast = useToast();
  const [editorKey, setEditorKey] = useState(0);
  const [d, setD] = useState(null);
  const [f, setF] = useState({ message: '', link: '', audience: 'all_students', country: '' });
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const load = () => api.get('/admin/announcements').then((r) => setD(r.data)).catch((e) => setMsg({ tone: 'error', text: errorMessage(e) }));
  useEffect(() => { document.title = 'Announcements — INUKA admin'; load(); }, []);

  const send = async (e) => {
    e.preventDefault(); setMsg(null);
    const text = plainText(f.message);
    if (text.length < 5) { setMsg({ tone: 'error', text: 'Please write the announcement.' }); return; }
    if (text.length > 400) { setMsg({ tone: 'error', text: 'Please keep announcements under 400 characters of text.' }); return; }
    if (f.audience === 'country' && !f.country) { setMsg({ tone: 'error', text: 'Please choose a country.' }); return; }
    const n = f.audience === 'country' ? d?.countries.find((c) => c.country === f.country)?.students : d?.audienceCounts?.[f.audience];
    const group = f.audience === 'country' ? `students in ${f.country}` : (d?.audiences[f.audience] || '').toLowerCase();
    const ok = await confirm({
      title: n != null ? `Send to ${n} ${n === 1 ? 'person' : 'people'}?` : 'Send this announcement?',
      message: `It goes to ${group} straight away and cannot be taken back.`,
      confirmLabel: 'Yes, send it',
    });
    if (!ok) return;
    setBusy(true);
    try {
      const { data } = await api.post('/admin/announcements', f);
      toast.success(`Sent to ${data.sent} ${data.sent === 1 ? 'person' : 'people'} (${data.audience}). They see it under the bell icon.`);
      setF({ ...f, message: '', link: '' }); setEditorKey((k) => k + 1); load();
    } catch (err) { setMsg({ tone: 'error', text: errorMessage(err) }); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-6">
      <PageTitle title="Announcements" intro="Send a short message to all students or to one group. It appears in their notifications (the bell at the top)." />
      <div className="grid lg:grid-cols-[1fr_1fr] gap-6 items-start">
        <Card>
          <form onSubmit={send} className="space-y-4" noValidate>
            {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}
            <RichEditor key={editorKey} showLabel variant="compact" label="Message" maxChars={400} value={f.message} onChange={(html) => setF((x) => ({ ...x, message: html }))} placeholder="e.g. New scholarships for refugees are open. Apply before 30 June!" />
            <Field label="Link (optional)" value={f.link} onChange={(e) => setF({ ...f, link: e.target.value })} placeholder="/scholarships" hint="A page on INUKA (starting with /) or a full https:// link." />
            <Field as="select" label="Send to" value={f.audience} onChange={(e) => setF({ ...f, audience: e.target.value })}>
              {d && Object.entries(d.audiences).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              <option value="country">Students in one country</option>
            </Field>
            {f.audience === 'country' && (
              <Field as="select" label="Country" value={f.country} onChange={(e) => setF({ ...f, country: e.target.value })}>
                <option value="">Choose a country</option>
                {d?.countries.map((c) => <option key={c.country} value={c.country}>{c.country} ({c.students})</option>)}
              </Field>
            )}
            <Button type="submit" loading={busy}><Megaphone size={18} aria-hidden="true" />Send announcement</Button>
          </form>
        </Card>
        <Card>
          <h2 className="text-lg font-semibold mb-3">Sent recently</h2>
          {!d ? <ListRowsSkeleton rows={3} /> : d.announcements.length === 0 ? <p className="text-ink-soft">Nothing sent yet.</p> : (
            <ul className="divide-y divide-line">
              {d.announcements.map((a) => (
                <li key={`${a.sentAt}${a.message}`} className="py-3">
                  <RichText html={a.message} />
                  <p className="text-sm text-ink-soft mt-0.5">{timeAgo(a.sentAt)} · {a.recipients} recipients · {a.read} read{a.link && ` · links to ${a.link}`}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
