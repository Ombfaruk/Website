function plain(block: string) {
  return block
    .replace(/!\[[^\]]*]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)]\([^)]*\)/g, '$1')
    .replace(/[*_`>#]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function firstParagraph(markdown: string) {
  const chunks = markdown
    .replace(/\r\n/g, '\n')
    .replace(/^## +.+$/gm, '')
    .split(/\n\s*\n/)
    .map(plain)
    .filter(Boolean);
  return chunks[0] ?? '';
}

export function studyYear(timeline: string) {
  const years = timeline.match(/20\d{2}/g);
  return years?.[years.length - 1] ?? '';
}

export function clientLabel(client: string) {
  return client.split(' at ')[0].replace(/ Ltd\.?$/i, '').trim();
}
