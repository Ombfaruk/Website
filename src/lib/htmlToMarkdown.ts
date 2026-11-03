const INLINE = new Set(['a', 'b', 'strong', 'em', 'i', 'span', 'img', 'br', 'code', 'small', 'u']);

function isElement(node: Node): node is HTMLElement {
  return node.nodeType === 1;
}

function inlineText(node: Node): string {
  if (node.nodeType === 3) return (node.textContent ?? '').replace(/\u00a0/g, ' ');
  if (!isElement(node)) return '';
  const tag = node.tagName.toLowerCase();
  if (tag === 'br') return '\n';
  if (tag === 'img') {
    const alt = node.getAttribute('alt') ?? '';
    const src = node.getAttribute('data-path') || node.getAttribute('src') || '';
    return `![${alt}](${src})`;
  }
  const inner = [...node.childNodes].map((child) => inlineText(child)).join('');
  if (tag === 'strong' || tag === 'b') return inner.trim() ? `**${inner.trim()}**` : '';
  if (tag === 'em' || tag === 'i') return inner.trim() ? `*${inner.trim()}*` : '';
  if (tag === 'a') {
    const href = node.getAttribute('href') ?? '';
    const label = inner.trim();
    return label ? `[${label}](${href})` : '';
  }
  return inner;
}

function listMarkdown(node: HTMLElement, ordered: boolean) {
  const items = [...node.children].filter((child) => child.tagName.toLowerCase() === 'li');
  return items
    .map((item, index) => {
      const marker = ordered ? `${index + 1}. ` : '- ';
      return `${marker}${inlineText(item).replace(/\s+/g, ' ').trim()}`;
    })
    .join('\n');
}

function blockText(node: Node): string {
  if (node.nodeType === 3) {
    const text = (node.textContent ?? '').trim();
    return text ? `${text}\n\n` : '';
  }
  if (!isElement(node)) return '';
  const tag = node.tagName.toLowerCase();
  if (/^h[1-4]$/.test(tag)) {
    const level = Number(tag.slice(1));
    const hashes = '#'.repeat(level === 1 ? 2 : level);
    const text = inlineText(node).replace(/\s+/g, ' ').trim();
    return text ? `${hashes} ${text}\n\n` : '';
  }
  if (tag === 'p' || tag === 'blockquote') {
    const text = inlineText(node).replace(/[ \t]+\n/g, '\n').trim();
    if (!text) return '';
    return tag === 'blockquote' ? text.split('\n').map((line) => `> ${line}`).join('\n') + '\n\n' : `${text}\n\n`;
  }
  if (tag === 'ul' || tag === 'ol') {
    const text = listMarkdown(node, tag === 'ol');
    return text ? `${text}\n\n` : '';
  }
  if (tag === 'div' || tag === 'figure' || tag === 'section' || tag === 'article' || tag === 'li') {
    const hasBlock = [...node.children].some((child) => !INLINE.has(child.tagName.toLowerCase()));
    if (hasBlock) return [...node.childNodes].map((child) => blockText(child)).join('');
    const text = inlineText(node).trim();
    return text ? `${text}\n\n` : '';
  }
  if (INLINE.has(tag)) {
    const text = inlineText(node).trim();
    return text ? `${text}\n\n` : '';
  }
  return [...node.childNodes].map((child) => blockText(child)).join('');
}

export function htmlToMarkdown(root: ParentNode) {
  const markdown = [...root.childNodes].map((node) => blockText(node)).join('');
  return markdown.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}
