import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowDown, ArrowUp, BookOpen, Laptop, Plus, Trash2 } from 'lucide-react';
import { Alert, Button, Card, Field, Pill } from '../../components/ui';
import IconTile from '../../components/ui/IconTile';
import { ListRowsSkeleton } from '../../components/ui/Skeletons';
import RichEditor from '../../components/editor/RichEditor';
import { ActionBar, BackLink, PageTitle } from '../../components/admin/AdminUI';
import { useConfirm, useToast } from '../../context/FeedbackContext';
import { api, errorMessage } from '../../services/api';

// Course management (spec 16.2): list of courses.
export function AdminCourses() {
  const [courses, setCourses] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    document.title = 'Courses — INUKA admin';
    api.get('/admin/courses').then((r) => setCourses(r.data.courses)).catch((e) => setError(errorMessage(e)));
  }, []);
  return (
    <div className="space-y-5">
      <PageTitle title="Courses" intro="Open a course to edit its details, add or reorder lessons, and write quiz questions. Changes appear on the website straight away."
        action={<Button to="/admin/courses/new"><Plus size={18} aria-hidden="true" />New course</Button>} />
      {error && <Alert>{error}</Alert>}
      {!courses ? <ListRowsSkeleton rows={6} /> : (
        <ul className="grid md:grid-cols-2 gap-4">
          {courses.map((c) => (
            <li key={c.id}>
              <Link to={`/admin/courses/${c.id}`} className="block bg-surface rounded-xl border border-line p-4 hover:border-brand/40 hover:shadow-sm">
                <div className="flex items-start gap-3">
                  <IconTile icon={c.category === 'english' ? BookOpen : Laptop} tone={c.category === 'english' ? 'brand' : 'cyan'} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-ink-soft">{c.category === 'english' ? 'English' : 'Computer skills'}, course {c.track} · {c.level}</p>
                    <p className="font-semibold text-lg leading-snug">{c.title}</p>
                    <p className="text-sm text-ink-soft mt-1">{c._count.lessons} lessons · {c._count.enrollments} students · {c._count.certificates} certificates</p>
                  </div>
                  {!c.isPublished && <Pill>Hidden</Pill>}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// One course: details + lessons.
export function AdminCourse() {
  const { id } = useParams();
  return id === 'new' ? <NewCourse /> : <EditCourse id={id} />;
}

function EditCourse({ id }) {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const toast = useToast();
  const [c, setC] = useState(null);
  const [f, setF] = useState(null);
  const [msg, setMsg] = useState(null);
  const load = () => api.get(`/admin/courses/${id}`).then((r) => {
    setC(r.data.course);
    const x = r.data.course;
    setF((old) => old || { title: x.title, description: x.description, level: x.level, thumbnailUrl: x.thumbnailUrl || '', skills: (x.skills || []).join(', '), isPublished: x.isPublished });
  }).catch((e) => setMsg({ tone: 'error', text: errorMessage(e) }));
  useEffect(() => { load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!c) return msg ? <Alert>{msg.text}</Alert> : <ListRowsSkeleton rows={6} />;
  const save = async (e) => {
    e.preventDefault(); setMsg(null);
    try {
      await api.patch(`/admin/courses/${id}`, { ...f, skills: f.skills.split(',').map((s) => s.trim()).filter(Boolean) });
      toast.success('Course saved.'); load();
    } catch (err) { setMsg({ tone: 'error', text: errorMessage(err) }); }
  };
  const removeCourse = async () => {
    const ok = await confirm({ title: `Delete "${c.title}"?`, message: 'All its lessons and quizzes are deleted too, and students lose their progress and certificates for it. This cannot be undone. To keep it, untick "Show this course on the website" instead.', confirmLabel: 'Yes, delete course', tone: 'danger' });
    if (!ok) return;
    try { await api.delete(`/admin/courses/${id}`); toast.success(`"${c.title}" was deleted.`); navigate('/admin/courses'); } catch (err) { toast.error(errorMessage(err)); }
  };
  const move = async (lessonId, direction) => { await api.post(`/admin/lessons/${lessonId}/move`, { direction }); load(); };

  return (
    <div className="space-y-6">
      <BackLink to="/admin/courses">All courses</BackLink>
      <PageTitle title={c.title} intro={`${c.category === 'english' ? 'English' : 'Computer skills'}, course ${c.track}`}
        action={<Button variant="ghost" className="text-danger" onClick={removeCourse}><Trash2 size={18} aria-hidden="true" />Delete course</Button>} />
      {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}
      <div className="grid lg:grid-cols-[1fr_1.2fr] gap-6 items-start">
        <Card>
          <h2 className="text-lg font-semibold mb-3">Course details</h2>
          <form onSubmit={save} className="space-y-4" noValidate>
            <Field label="Title" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
            <RichEditor showLabel variant="compact" label="Description" value={f.description} onChange={(html) => setF((x) => ({ ...x, description: html }))} />
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Level" value={f.level} onChange={(e) => setF({ ...f, level: e.target.value })} hint="e.g. Beginner, Beginner–Intermediate" />
              <Field label="Thumbnail image link (optional)" type="url" value={f.thumbnailUrl} onChange={(e) => setF({ ...f, thumbnailUrl: e.target.value })} />
            </div>
            <Field label="Skills (separated by commas)" value={f.skills} onChange={(e) => setF({ ...f, skills: e.target.value })} hint="Used by the Skills filter on /learn." />
            <label className="flex items-center gap-3 min-h-11"><input type="checkbox" className="w-5 h-5 accent-[#07294D]" checked={f.isPublished} onChange={(e) => setF({ ...f, isPublished: e.target.checked })} />Show this course on the website</label>
            <Button type="submit">Save course</Button>
          </form>
        </Card>
        <Card>
          <div className="flex items-center justify-between gap-3 mb-3">
            <h2 className="text-lg font-semibold">Lessons ({c.lessons.length})</h2>
            <Button to={`/admin/courses/${id}/lessons/new`}><Plus size={18} aria-hidden="true" />Add lesson</Button>
          </div>
          <ol className="divide-y divide-line">
            {c.lessons.map((l, i) => (
              <li key={l.id} className="py-2.5 flex items-center gap-2">
                <span className="w-7 h-7 shrink-0 rounded-full bg-brand-soft text-brand text-xs font-bold flex items-center justify-center">{i + 1}</span>
                <Link to={`/admin/lessons/${l.id}`} className="flex-1 min-w-0 hover:underline">
                  <span className="block font-medium truncate">{l.title}</span>
                  <span className="block text-xs text-ink-soft">{l._count.quizzes} quiz {l._count.quizzes === 1 ? 'question' : 'questions'} · completed by {l._count.progress}</span>
                </Link>
                {!l.isPublished && <Pill>Hidden</Pill>}
                <button type="button" disabled={i === 0} onClick={() => move(l.id, 'up')} className="w-10 h-10 rounded-lg hover:bg-brand-soft disabled:opacity-30 flex items-center justify-center" aria-label={`Move "${l.title}" up`}><ArrowUp size={16} /></button>
                <button type="button" disabled={i === c.lessons.length - 1} onClick={() => move(l.id, 'down')} className="w-10 h-10 rounded-lg hover:bg-brand-soft disabled:opacity-30 flex items-center justify-center" aria-label={`Move "${l.title}" down`}><ArrowDown size={16} /></button>
              </li>
            ))}
          </ol>
        </Card>
      </div>
    </div>
  );
}

// Add a lesson: its own page. The lesson is created hidden, then opens in the lesson editor.
export function AdminNewLesson() {
  const { id: courseId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [course, setCourse] = useState(null);
  const [f, setF] = useState({ title: '', summary: '', contentHtml: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    document.title = 'Add a lesson — INUKA admin';
    api.get(`/admin/courses/${courseId}`).then((r) => setCourse(r.data.course)).catch((e) => setError(errorMessage(e)));
  }, [courseId]);
  const add = async (e) => {
    e.preventDefault(); setError(''); setBusy(true);
    try {
      const { data } = await api.post(`/admin/courses/${courseId}/lessons`, { ...f, summary: f.summary || null, isPublished: false });
      toast.success('Lesson added. It stays hidden until you publish it.');
      navigate(`/admin/lessons/${data.lesson.id}`);
    } catch (err) { setError(errorMessage(err)); setBusy(false); }
  };
  return (
    <form onSubmit={add} className="space-y-6 max-w-4xl" noValidate>
      <BackLink to={`/admin/courses/${courseId}`}>{course ? course.title : 'Back to the course'}</BackLink>
      <PageTitle title="Add a lesson" intro="It is added at the end of the course and stays hidden until you publish it. You can add quiz questions after saving." />
      {error && <Alert>{error}</Alert>}
      <Card className="space-y-4">
        <Field label="Lesson title" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
        <RichEditor showLabel variant="compact" label="Summary (optional)" value={f.summary} onChange={(html) => setF((x) => ({ ...x, summary: html }))} placeholder="One or two sentences about what students learn." />
        <RichEditor showLabel label="Lesson content" value={f.contentHtml} onChange={(html) => setF((x) => ({ ...x, contentHtml: html }))} />
      </Card>
      <ActionBar>
        <Button type="submit" loading={busy}>Save lesson</Button>
        <Button variant="ghost" to={`/admin/courses/${courseId}`}>Cancel</Button>
      </ActionBar>
    </form>
  );
}

// New course: its own page.
function NewCourse() {
  const navigate = useNavigate();
  const toast = useToast();
  const [f, setF] = useState({ title: '', category: 'english', level: 'Beginner', description: '', skills: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { document.title = 'New course — INUKA admin'; }, []);
  const create = async (e) => {
    e.preventDefault(); setError(''); setBusy(true);
    try {
      const { data } = await api.post('/admin/courses', { ...f, skills: f.skills.split(',').map((s) => s.trim()).filter(Boolean) });
      toast.success('Course created. Now add its lessons.');
      navigate(`/admin/courses/${data.course.id}`);
    } catch (err) { setError(errorMessage(err)); setBusy(false); }
  };
  return (
    <form onSubmit={create} className="space-y-6 max-w-3xl" noValidate>
      <BackLink to="/admin/courses">All courses</BackLink>
      <PageTitle title="New course" intro='The course gets the next letter (A, B, C…) and stays hidden until you add lessons and tick "Show this course on the website".' />
      {error && <Alert>{error}</Alert>}
      <Card className="space-y-4">
        <Field label="Title" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
        <div className="grid sm:grid-cols-2 gap-4">
          <Field as="select" label="Subject" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}><option value="english">English</option><option value="computer">Computer skills</option></Field>
          <Field label="Level" value={f.level} onChange={(e) => setF({ ...f, level: e.target.value })} hint="e.g. Beginner, Beginner–Intermediate" />
        </div>
        <RichEditor showLabel variant="compact" label="Description" value={f.description} onChange={(html) => setF((x) => ({ ...x, description: html }))} placeholder="What will students learn in this course?" />
        <Field label="Skills (separated by commas, optional)" value={f.skills} onChange={(e) => setF({ ...f, skills: e.target.value })} hint="Used by the Skills filter on /learn." />
      </Card>
      <ActionBar>
        <Button type="submit" loading={busy}>Create and add lessons</Button>
        <Button variant="ghost" to="/admin/courses">Cancel</Button>
      </ActionBar>
    </form>
  );
}
