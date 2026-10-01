import DOMPurify from 'dompurify';

// Cleans HTML written in the admin text editor before it is shown (lessons, articles, FAQ answers).
// Keeps formatting (bold, colours, fonts, sizes, alignment, images, links) and YouTube videos; removes scripts.
const YOUTUBE = /^https:\/\/(www\.)?(youtube\.com|youtube-nocookie\.com)\/embed\//;

DOMPurify.addHook('uponSanitizeElement', (node, data) => {
  if (data.tagName === 'iframe' && !YOUTUBE.test(node.getAttribute('src') || '')) node.parentNode?.removeChild(node);
});
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A' && /^https?:/i.test(node.getAttribute('href') || '')) {
    node.setAttribute('target', '_blank');
    node.setAttribute('rel', 'noopener noreferrer');
  }
});

export const sanitizeRich = (html) => DOMPurify.sanitize(html || '', {
  ADD_TAGS: ['iframe'],
  ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'target'],
});

// Plain text written before the editor existed is shown as-is; HTML from the editor is cleaned.
export const looksLikeHtml = (s) => /<\/?[a-z][\s\S]*>/i.test(s || '');
