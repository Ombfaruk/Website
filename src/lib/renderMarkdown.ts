import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';

const sanitizeOptions: sanitizeHtml.IOptions = {
  allowedTags: ['h2', 'h3', 'h4', 'p', 'strong', 'em', 'ul', 'ol', 'li', 'a', 'img', 'blockquote', 'br'],
  allowedAttributes: {
    a: ['href'],
    img: ['src', 'alt'],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  allowProtocolRelative: false,
  disallowedTagsMode: 'discard',
};

export function markdownToSafeHtml(markdown: string) {
  const raw = marked.parse(markdown, { async: false, gfm: true, breaks: false });
  return sanitizeHtml(raw, sanitizeOptions);
}

export function renderMarkdown(markdown: string, base: string) {
  const prefix = base.endsWith('/') ? base : `${base}/`;
  const prefixed = markdown.replace(/\]\(\/uploads\//g, `](${prefix}uploads/`);
  return markdownToSafeHtml(prefixed);
}
