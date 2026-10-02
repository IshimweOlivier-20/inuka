import { useEffect, useRef, useState } from 'react';
import { EditorContent, useEditor, useEditorState } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TextStyleKit } from '@tiptap/extension-text-style';
import Image from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import Youtube from '@tiptap/extension-youtube';
import { CharacterCount, Placeholder } from '@tiptap/extensions';
import {
  AlignCenter, AlignJustify, AlignLeft, AlignRight, Bold, Code2, Highlighter, ImagePlus, Italic, Link2, List, ListOrdered,
  Minus, Quote, Redo2, RemoveFormatting, Strikethrough, Type, Underline as UnderlineIcon, Undo2, Unlink, Video,
} from 'lucide-react';
import { Alert, Button, Field, Modal } from '../ui';
import { api, errorMessage } from '../../services/api';

// Rich text editor for everything admins write (lessons, articles, FAQ answers):
// headings, font, size, bold/italic/underline, text colour, highlight, alignment, lists, quotes, links, images, YouTube videos.
// It produces simple HTML that the website shows with sanitizeRich() (utils/sanitize.js).

const FONTS = [['', 'Default font'], ['"Plus Jakarta Sans", sans-serif', 'Plus Jakarta Sans'], ['Inter, sans-serif', 'Inter'], ['Georgia, serif', 'Georgia (serif)'], ['"Fira Code", monospace', 'Monospace']];
const SIZES = [['', 'Normal size'], ['14px', 'Small'], ['20px', 'Large'], ['24px', 'Larger'], ['30px', 'Huge']];
const COLORS = ['#0F1E3D', '#4A5B78', '#0A6CF0', '#0A3D91', '#0891B2', '#0284C7', '#EF4444', '#B91C1C', '#7C3AED', '#DB2777', '#EA580C', '#15803D'];
const HIGHLIGHTS = ['#FEF3C7', '#DBEAFE', '#E0F2FE', '#FCE7F3', '#EDE9FE', '#FEE2E2', '#DCFCE7', '#F3F4F6'];

// variant 'full' (lessons, articles) or 'compact' (summaries, descriptions, quotes, announcements: no headings, fonts, images or video).
// maxChars: optional limit on the visible text length (shown under the editor).
export default function RichEditor({ value, onChange, label = 'Content', placeholder = 'Start writing…', minHeight: minHeightProp, inModal = false, variant = 'full', maxChars, showLabel = false, hint }) {
  const full = variant === 'full';
  const minHeight = minHeightProp ?? (full ? 320 : 120);
  const [source, setSource] = useState(false);
  const [dialog, setDialog] = useState(null); // 'link' | 'image' | 'video'
  const lastEmitted = useRef(value);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3, 4] }, link: { openOnClick: false, autolink: true, defaultProtocol: 'https' } }),
      TextStyleKit,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Image.configure({ inline: false, allowBase64: false }),
      Youtube.configure({ nocookie: true, width: 640, height: 360 }),
      Placeholder.configure({ placeholder }),
      CharacterCount,
    ],
    content: value || '',
    editorProps: { attributes: { class: `${full ? 'lesson-prose' : 'rich-content text-[15px]'} rich-editor-area focus:outline-none`, style: `min-height:${Math.max(80, minHeight - 30)}px`, 'aria-label': label, 'aria-multiline': 'true', role: 'textbox' } },
    onUpdate: ({ editor: e }) => {
      const html = e.isEmpty ? '' : e.getHTML();
      lastEmitted.current = html;
      onChange(html);
    },
  });

  // If the value changes from outside (e.g. loaded from the server), show it.
  useEffect(() => {
    if (editor && value !== lastEmitted.current) {
      editor.commands.setContent(value || '', { emitUpdate: false });
      lastEmitted.current = value;
    }
  }, [value, editor]);

  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => e && ({
      bold: e.isActive('bold'), italic: e.isActive('italic'), underline: e.isActive('underline'), strike: e.isActive('strike'),
      bullet: e.isActive('bulletList'), ordered: e.isActive('orderedList'), quote: e.isActive('blockquote'), link: e.isActive('link'),
      block: e.isActive('heading', { level: 2 }) ? 'h2' : e.isActive('heading', { level: 3 }) ? 'h3' : e.isActive('heading', { level: 4 }) ? 'h4' : 'p',
      align: ['center', 'right', 'justify'].find((a) => e.isActive({ textAlign: a })) || 'left',
      font: e.getAttributes('textStyle').fontFamily || '', size: e.getAttributes('textStyle').fontSize || '',
      color: e.getAttributes('textStyle').color || '', canUndo: e.can().undo(), canRedo: e.can().redo(),
      words: e.storage.characterCount?.words?.() ?? 0,
      chars: e.storage.characterCount?.characters?.() ?? 0,
    }),
  });
  if (!editor || !state) return <div className="rounded-xl border border-line bg-surface" style={{ minHeight }} />;
  const chain = () => editor.chain().focus();

  const setBlock = (v) => {
    if (v === 'p') chain().setParagraph().run();
    else chain().toggleHeading({ level: Number(v.slice(1)) }).run();
  };

  const box = (
    <div className="rounded-xl border border-line bg-surface focus-within:ring-2 focus-within:ring-brand/40">
      <p className="sr-only">{label}</p>
      <div role="toolbar" aria-label={`${label} formatting`} className={`flex flex-wrap items-center gap-0.5 border-b border-line bg-paper rounded-t-xl px-2 py-1.5 sticky z-10 ${inModal ? 'top-0' : 'top-16'}`}>
        <Btn label="Undo" onClick={() => chain().undo().run()} disabled={!state.canUndo}><Undo2 size={18} /></Btn>
        <Btn label="Redo" onClick={() => chain().redo().run()} disabled={!state.canRedo}><Redo2 size={18} /></Btn>
        <Sep />
        {full && (
          <>
            <Select label="Text style" value={state.block} onChange={setBlock} options={[['p', 'Paragraph'], ['h2', 'Heading 1'], ['h3', 'Heading 2'], ['h4', 'Heading 3']]} />
            <Select label="Font" value={state.font} onChange={(v) => (v ? chain().setFontFamily(v).run() : chain().unsetFontFamily().run())} options={FONTS} />
            <Select label="Font size" value={state.size} onChange={(v) => (v ? chain().setFontSize(v).run() : chain().unsetFontSize().run())} options={SIZES} icon={<Type size={15} aria-hidden="true" />} />
            <Sep />
          </>
        )}
        <Btn label="Bold" active={state.bold} onClick={() => chain().toggleBold().run()}><Bold size={18} /></Btn>
        <Btn label="Italic" active={state.italic} onClick={() => chain().toggleItalic().run()}><Italic size={18} /></Btn>
        <Btn label="Underline" active={state.underline} onClick={() => chain().toggleUnderline().run()}><UnderlineIcon size={18} /></Btn>
        <Btn label="Strikethrough" active={state.strike} onClick={() => chain().toggleStrike().run()}><Strikethrough size={18} /></Btn>
        <Swatches label="Text colour" colors={COLORS} current={state.color}
          icon={<span className="flex flex-col items-center leading-none"><span className="font-bold text-[15px]">A</span><span className="block w-4 h-1 rounded-sm mt-0.5" style={{ background: state.color || 'currentColor' }} /></span>}
          onPick={(c) => (c ? chain().setColor(c).run() : chain().unsetColor().run())} />
        <Swatches label="Highlight" colors={HIGHLIGHTS} icon={<Highlighter size={18} />}
          onPick={(c) => (c ? chain().setBackgroundColor(c).run() : chain().unsetBackgroundColor().run())} />
        <Sep />
        {full && (
          <>
            <Btn label="Align left" active={state.align === 'left'} onClick={() => chain().setTextAlign('left').run()}><AlignLeft size={18} /></Btn>
            <Btn label="Align centre" active={state.align === 'center'} onClick={() => chain().setTextAlign('center').run()}><AlignCenter size={18} /></Btn>
            <Btn label="Align right" active={state.align === 'right'} onClick={() => chain().setTextAlign('right').run()}><AlignRight size={18} /></Btn>
            <Btn label="Justify" active={state.align === 'justify'} onClick={() => chain().setTextAlign('justify').run()}><AlignJustify size={18} /></Btn>
            <Sep />
          </>
        )}
        <Btn label="Bullet list" active={state.bullet} onClick={() => chain().toggleBulletList().run()}><List size={18} /></Btn>
        <Btn label="Numbered list" active={state.ordered} onClick={() => chain().toggleOrderedList().run()}><ListOrdered size={18} /></Btn>
        {full && <Btn label="Quote" active={state.quote} onClick={() => chain().toggleBlockquote().run()}><Quote size={18} /></Btn>}
        {full && <Btn label="Divider line" onClick={() => chain().setHorizontalRule().run()}><Minus size={18} /></Btn>}
        <Sep />
        <Btn label="Insert link" active={state.link} onClick={() => setDialog('link')}><Link2 size={18} /></Btn>
        <Btn label="Remove link" disabled={!state.link} onClick={() => chain().extendMarkRange('link').unsetLink().run()}><Unlink size={18} /></Btn>
        {full && <Btn label="Insert image" onClick={() => setDialog('image')}><ImagePlus size={18} /></Btn>}
        {full && <Btn label="Insert YouTube video" onClick={() => setDialog('video')}><Video size={18} /></Btn>}
        <Sep />
        <Btn label="Clear formatting" onClick={() => chain().unsetAllMarks().clearNodes().run()}><RemoveFormatting size={18} /></Btn>
        {full && <Btn label={source ? 'Back to editor' : 'Edit HTML'} active={source} onClick={() => setSource(!source)}><Code2 size={18} /></Btn>}
      </div>

      {source ? (
        <textarea value={value || ''} onChange={(e) => { lastEmitted.current = null; onChange(e.target.value); }} aria-label={`${label} (HTML)`}
          className="w-full p-4 font-mono text-sm bg-surface focus:outline-none" style={{ minHeight }} />
      ) : (
        <div className="px-4 py-3 cursor-text" style={{ minHeight }} onClick={() => editor.commands.focus()}>
          <EditorContent editor={editor} />
        </div>
      )}
      <div className="flex justify-between gap-3 border-t border-line px-3 py-1.5 text-xs text-ink-soft bg-paper rounded-b-xl">
        <span className={maxChars && state.chars > maxChars ? 'text-danger font-semibold' : ''}>
          {maxChars ? `${state.chars} of ${maxChars} characters` : `${state.words} ${state.words === 1 ? 'word' : 'words'}`}
        </span>
        <span className="hidden sm:inline">Tip: Ctrl+B bold, Ctrl+I italic, Ctrl+Z undo</span>
      </div>
      {dialog && <InsertDialog kind={dialog} editor={editor} onClose={() => setDialog(null)} />}
    </div>
  );
  if (!showLabel && !hint) return box;
  return (
    <div>
      {showLabel && <p className="text-sm font-medium mb-1.5" aria-hidden="true">{label}</p>}
      {box}
      {hint && <p className="text-xs text-ink-soft mt-1">{hint}</p>}
    </div>
  );
}

function Btn({ label, active, disabled, onClick, children }) {
  return (
    <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={onClick} disabled={disabled} aria-label={label} title={label} aria-pressed={active ?? undefined}
      className={`w-9 h-9 rounded-md inline-flex items-center justify-center transition-colors disabled:opacity-35 ${active ? 'bg-brand-soft text-brand' : 'text-ink hover:bg-brand-soft'}`}>
      {children}
    </button>
  );
}
const Sep = () => <span className="w-px h-6 bg-line mx-1" aria-hidden="true" />;

function Select({ label, value, onChange, options, icon }) {
  return (
    <label className="inline-flex items-center gap-1 h-9 px-1.5 rounded-md hover:bg-brand-soft text-sm">
      {icon}
      <span className="sr-only">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} title={label} className="bg-transparent h-9 pr-1 font-medium max-w-[150px] focus:outline-none cursor-pointer">
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  );
}

function Swatches({ label, colors, current, icon, onPick }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);
  const pick = (c) => { onPick(c); setOpen(false); };
  return (
    <div ref={ref} className="relative">
      <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => setOpen(!open)} aria-label={label} title={label} aria-expanded={open}
        className="h-9 px-2 rounded-md inline-flex items-center justify-center text-ink hover:bg-brand-soft">{icon}<span className="ml-0.5 text-[10px]" aria-hidden="true">▾</span></button>
      {open && (
        <div className="absolute left-0 top-10 z-30 w-52 rounded-xl border border-line bg-surface p-3 shadow-lg" role="dialog" aria-label={label}>
          <div className="grid grid-cols-6 gap-1.5">
            {colors.map((c) => (
              <button key={c} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => pick(c)} aria-label={c} title={c}
                className={`w-7 h-7 rounded-md border ${current === c ? 'border-brand ring-2 ring-brand/40' : 'border-line'}`} style={{ background: c }} />
            ))}
          </div>
          <div className="flex items-center justify-between gap-2 mt-3">
            <label className="inline-flex items-center gap-2 text-xs text-ink-soft cursor-pointer">Other
              <input type="color" onChange={(e) => pick(e.target.value)} className="w-7 h-7 rounded border border-line bg-transparent cursor-pointer" aria-label={`${label}: choose any colour`} />
            </label>
            <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => pick('')} className="text-xs font-semibold text-brand hover:underline min-h-9">Remove</button>
          </div>
        </div>
      )}
    </div>
  );
}

// After inserting an image or video, put the cursor after it, so typing or inserting again does not replace it.
function afterBlock(editor) {
  const { to } = editor.state.selection;
  editor.chain().focus().setTextSelection(Math.min(to + 1, editor.state.doc.content.size)).run();
}

function InsertDialog({ kind, editor, onClose }) {
  const [url, setUrl] = useState(kind === 'link' ? editor.getAttributes('link').href || '' : '');
  const [alt, setAlt] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const titles = { link: 'Insert a link', image: 'Insert an image', video: 'Insert a YouTube video' };

  const upload = async (file) => {
    if (!file) return;
    setBusy(true); setError('');
    try {
      const body = new FormData();
      body.append('file', file);
      const { data } = await api.post('/admin/media', body);
      setUrl(data.url);
      if (!alt) setAlt(file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '));
    } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  };

  const insert = () => {
    const u = url.trim();
    if (kind === 'link') {
      if (!u) editor.chain().focus().extendMarkRange('link').unsetLink().run();
      else editor.chain().focus().extendMarkRange('link').setLink({ href: /^(https?:|mailto:|\/)/.test(u) ? u : `https://${u}` }).run();
    }
    if (kind === 'image') {
      if (!/^(https:\/\/|\/api\/public\/media\/)/.test(u)) { setError('Upload an image, or paste a link starting with https://'); return; }
      editor.chain().focus().setImage({ src: u, alt: alt.trim() }).run();
      afterBlock(editor);
    }
    if (kind === 'video') {
      if (!/youtu\.?be/.test(u)) { setError('Please paste a YouTube link, for example https://www.youtube.com/watch?v=…'); return; }
      editor.chain().focus().setYoutubeVideo({ src: u }).run();
      afterBlock(editor);
    }
    onClose();
  };

  return (
    <Modal open onClose={onClose} title={titles[kind]}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={insert} loading={busy}>{kind === 'link' && !url ? 'Remove link' : 'Insert'}</Button></>}>
      <div className="space-y-4">
        {error && <Alert>{error}</Alert>}
        {kind === 'image' && (
          <label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line p-6 text-center cursor-pointer hover:border-brand">
            <ImagePlus size={28} className="text-brand" aria-hidden="true" />
            <span className="font-semibold">Upload an image from your computer</span>
            <span className="text-sm text-ink-soft">JPG, PNG, WebP or GIF, up to 5 MB</span>
            <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" onChange={(e) => upload(e.target.files?.[0])} />
          </label>
        )}
        <Field label={kind === 'link' ? 'Link address' : kind === 'image' ? 'or paste an image link' : 'YouTube link'} value={url} onChange={(e) => setUrl(e.target.value)}
          placeholder={kind === 'video' ? 'https://www.youtube.com/watch?v=…' : 'https://…'} hint={kind === 'link' ? 'A web address, or a page on INUKA such as /scholarships.' : undefined} />
        {kind === 'image' && <Field label="Describe the image (for people who cannot see it)" value={alt} onChange={(e) => setAlt(e.target.value)} />}
        {kind === 'image' && url && <img src={url} alt="" className="max-h-48 rounded-lg border border-line" />}
      </div>
    </Modal>
  );
}
