import { looksLikeHtml, sanitizeRich } from '../../utils/sanitize';

// Shows text written in the admin editor (formatted HTML) or older plain text, safely.
export default function RichText({ html, className = '', as: Tag = 'div' }) {
  if (!html) return null;
  if (!looksLikeHtml(html)) return <Tag className={`whitespace-pre-line ${className}`}>{html}</Tag>;
  return <Tag className={`rich-content ${className}`} dangerouslySetInnerHTML={{ __html: sanitizeRich(html) }} />;
}
