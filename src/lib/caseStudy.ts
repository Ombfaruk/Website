export type Quote = { text: string; by: string };

export type GalleryImage = { src: string; alt: string; caption?: string };

export type CaseStudy = {
  title: string;
  outcome: string;
  client: string;
  role: string;
  timeline: string;
  tags: string[];
  cover: string;
  coverAlt: string;
  coverType: 'image' | 'video';
  gallery: GalleryImage[];
  draft: boolean;
  order: number;
  quotes: Quote[];
  body: string;
};

export const starterBody = `## Context

Who was this for, and what were you asked to do?

## Problem

What was getting in people's way?

## Process

What did you do, in order?

## Results

What changed? Only include numbers you can stand behind.
`;

export function slugify(title: string) {
  const slug = title
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return slug || 'case-study';
}

export function isValidSlug(slug: string) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}

export function safeFileName(name: string) {
  const cleaned = name.normalize('NFKC').replace(/\\/g, '/').split('/').pop() || 'file';
  const dot = cleaned.lastIndexOf('.');
  const rawExt = dot > 0 ? cleaned.slice(dot).toLowerCase() : '';
  const ext = /^\.[a-z0-9]{1,5}$/.test(rawExt) ? rawExt : '';
  const stem = (dot > 0 ? cleaned.slice(0, dot) : cleaned)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return `${stem || 'file'}${ext}`;
}

export function altFromName(name: string) {
  const base = name.replace(/\.[a-z0-9]+$/i, '').replace(/[-_]+/g, ' ').trim();
  if (!base) return 'Project screen';
  return base.charAt(0).toUpperCase() + base.slice(1);
}

function asString(value: unknown) {
  return typeof value === 'string' ? value.trim() : value == null ? '' : String(value).trim();
}

function asStringArray(value: unknown) {
  if (Array.isArray(value)) return value.map((item) => asString(item)).filter(Boolean);
  const single = asString(value);
  return single ? [single] : [];
}

function asBoolean(value: unknown) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.trim().toLowerCase() === 'true';
  return false;
}

function asGallery(value: unknown): GalleryImage[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const record = item as Record<string, unknown>;
    const src = asString(record.src);
    if (!src) return [];
    const caption = asString(record.caption);
    return [{ src, alt: asString(record.alt), ...(caption ? { caption } : {}) }];
  });
}

function asQuotes(value: unknown): Quote[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const record = item as Record<string, unknown>;
    const text = asString(record.text);
    if (!text) return [];
    return [{ text, by: asString(record.by) }];
  });
}

function parseScalar(value: string): unknown {
  const trimmed = value.trim();
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  if (trimmed === '[]') return [];
  if (trimmed === '' || trimmed === 'null' || trimmed === '~') return '';
  if (/^-?\d+(?:\.\d+)?$/.test(trimmed)) return Number(trimmed);
  if (trimmed.startsWith('"')) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return trimmed.replace(/^"|"$/g, '');
    }
  }
  if (trimmed.startsWith("'") && trimmed.endsWith("'")) return trimmed.slice(1, -1).replace(/''/g, "'");
  return trimmed;
}

function yamlQuote(value: string) {
  return JSON.stringify(value);
}

function readFrontmatter(raw: string) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) throw new Error('This case study is missing its details at the top of the file.');
  const data: Record<string, unknown> = {};
  const lines = match[1].split(/\r?\n/);
  let index = 0;
  while (index < lines.length) {
    const line = lines[index] ?? '';
    if (!line.trim()) {
      index += 1;
      continue;
    }
    const keyMatch = line.match(/^([A-Za-z0-9]+):\s*(.*)$/);
    if (!keyMatch) {
      index += 1;
      continue;
    }
    const key = keyMatch[1];
    const rest = keyMatch[2] ?? '';
    if (rest.trim() === '') {
      const items: unknown[] = [];
      index += 1;
      while (index < lines.length && ((lines[index] ?? '').startsWith('  ') || !(lines[index] ?? '').trim())) {
        const current = lines[index] ?? '';
        if (!current.trim()) {
          index += 1;
          continue;
        }
        if (!current.startsWith('  - ')) break;
        const inline = current.slice(4);
        const pair = inline.match(/^([A-Za-z0-9]+):\s*(.*)$/);
        if (pair) {
          const item: Record<string, string> = { [pair[1]]: String(parseScalar(pair[2] ?? '')) };
          index += 1;
          while (index < lines.length && (lines[index] ?? '').startsWith('    ')) {
            const nested = (lines[index] ?? '').trim().match(/^([A-Za-z0-9]+):\s*(.*)$/);
            if (nested) item[nested[1]] = String(parseScalar(nested[2] ?? ''));
            index += 1;
          }
          items.push(item);
        } else {
          items.push(parseScalar(inline));
          index += 1;
        }
      }
      data[key] = items;
      continue;
    }
    data[key] = parseScalar(rest);
    index += 1;
  }
  return { data, body: raw.slice(match[0].length).trim() };
}

export function parseCaseStudy(raw: string): CaseStudy {
  const parsed = readFrontmatter(raw);
  const data = parsed.data;
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('This case study is missing its details at the top of the file.');
  }
  const record = data;
  const order = Number(record.order);
  return {
    title: asString(record.title),
    outcome: asString(record.outcome),
    client: asString(record.client),
    role: asString(record.role),
    timeline: asString(record.timeline),
    tags: asStringArray(record.tags),
    cover: asString(record.cover),
    coverAlt: asString(record.coverAlt),
    coverType: asString(record.coverType) === 'video' ? 'video' : 'image',
    gallery: asGallery(record.gallery),
    draft: asBoolean(record.draft),
    order: Number.isFinite(order) ? order : 0,
    quotes: asQuotes(record.quotes),
    body: parsed.body,
  };
}

export function serializeCaseStudy(study: CaseStudy) {
  const lines = [
    '---',
    `title: ${yamlQuote(study.title)}`,
    `outcome: ${yamlQuote(study.outcome)}`,
    `client: ${yamlQuote(study.client)}`,
    `role: ${yamlQuote(study.role)}`,
    `timeline: ${yamlQuote(study.timeline)}`,
    ...(study.tags.length ? ['tags:', ...study.tags.map((tag) => `  - ${yamlQuote(tag)}`)] : ['tags: []']),
    `cover: ${yamlQuote(study.cover)}`,
    `coverAlt: ${yamlQuote(study.coverAlt)}`,
    `coverType: ${study.coverType}`,
    ...(study.gallery.length ? ['gallery:'] : ['gallery: []']),
  ];
  for (const item of study.gallery) {
    lines.push(`  - src: ${yamlQuote(item.src)}`);
    lines.push(`    alt: ${yamlQuote(item.alt)}`);
    if (item.caption) lines.push(`    caption: ${yamlQuote(item.caption)}`);
  }
  lines.push(`draft: ${study.draft ? 'true' : 'false'}`);
  lines.push(`order: ${Number.isFinite(study.order) ? study.order : 0}`);
  if (study.quotes.length) {
    lines.push('quotes:');
    for (const quote of study.quotes) {
      lines.push(`  - text: ${yamlQuote(quote.text)}`);
      lines.push(`    by: ${yamlQuote(quote.by)}`);
    }
  }
  return `${lines.join('\n')}\n---\n\n${study.body.trim()}\n`;
}

export function repoPathFromPublic(urlPath: string) {
  const clean = urlPath.replace(/^\//, '');
  if (clean.startsWith('public/')) return clean;
  return `public/${clean}`;
}

export function publicPathFromRepo(repoPath: string) {
  const clean = repoPath.replace(/^public\//, '');
  return `/${clean}`;
}
