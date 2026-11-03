import {
  isValidSlug,
  repoPathFromPublic,
  safeFileName,
  serializeCaseStudy,
  type CaseStudy,
  type GalleryImage,
} from './caseStudy';

export type PlannedFile = { path: string; bytes: Uint8Array };

export type PlanMedia = {
  filename?: string;
  bytes?: Uint8Array;
  path?: string;
  alt: string;
  caption?: string;
  kind: 'image' | 'video';
};

export type PlanInline = {
  tokenPath: string;
  filename: string;
  bytes: Uint8Array;
};

export type CommitPlanInput = {
  slug: string;
  study: CaseStudy;
  cover: PlanMedia | null;
  gallery: PlanMedia[];
  inline: PlanInline[];
  existingUploadPaths: string[];
};

function allocate(names: Set<string>, filename: string) {
  const clean = safeFileName(filename);
  if (!names.has(clean)) {
    names.add(clean);
    return clean;
  }
  const dot = clean.lastIndexOf('.');
  const stem = dot > 0 ? clean.slice(0, dot) : clean;
  const ext = dot > 0 ? clean.slice(dot) : '';
  let index = 2;
  while (names.has(`${stem}-${index}${ext}`)) index += 1;
  const next = `${stem}-${index}${ext}`;
  names.add(next);
  return next;
}

export function uploadPathsInText(text: string) {
  const paths: string[] = [];
  const pattern = /\/uploads\/[A-Za-z0-9_./-]+/g;
  for (const match of text.matchAll(pattern)) {
    paths.push(repoPathFromPublic(match[0].replace(/[),.;]+$/, '')));
  }
  return paths;
}

export function buildCommitPlan(input: CommitPlanInput) {
  const slug = input.slug.trim();
  if (!isValidSlug(slug)) {
    throw new Error('Use a simple link made of letters, numbers, and hyphens.');
  }
  const names = new Set<string>();
  const keep = new Set<string>();
  const files: PlannedFile[] = [];
  const folder = `/uploads/${slug}`;
  const study: CaseStudy = {
    ...input.study,
    tags: input.study.tags.map((tag) => tag.trim()).filter(Boolean),
    quotes: input.study.quotes.filter((quote) => quote.text.trim()),
    body: input.study.body,
  };

  if (input.cover?.bytes && input.cover.filename) {
    const filename = allocate(names, `cover-${input.cover.filename}`);
    const urlPath = `${folder}/${filename}`;
    study.cover = urlPath;
    study.coverType = input.cover.kind;
    if (!study.coverAlt.trim()) study.coverAlt = input.cover.alt;
    const repoPath = repoPathFromPublic(urlPath);
    keep.add(repoPath);
    files.push({ path: repoPath, bytes: input.cover.bytes });
  } else if (study.cover) {
    keep.add(repoPathFromPublic(study.cover));
  }

  const gallery: GalleryImage[] = [];
  for (const item of input.gallery) {
    if (item.bytes && item.filename) {
      const filename = allocate(names, item.filename);
      const urlPath = `${folder}/${filename}`;
      const repoPath = repoPathFromPublic(urlPath);
      keep.add(repoPath);
      files.push({ path: repoPath, bytes: item.bytes });
      gallery.push({ src: urlPath, alt: item.alt, ...(item.caption ? { caption: item.caption } : {}) });
    } else if (item.path) {
      keep.add(repoPathFromPublic(item.path));
      gallery.push({ src: item.path, alt: item.alt, ...(item.caption ? { caption: item.caption } : {}) });
    }
  }
  study.gallery = gallery;

  for (const image of input.inline) {
    const filename = allocate(names, image.filename);
    const urlPath = `${folder}/${filename}`;
    if (image.tokenPath) study.body = study.body.split(image.tokenPath).join(urlPath);
    const repoPath = repoPathFromPublic(urlPath);
    keep.add(repoPath);
    files.push({ path: repoPath, bytes: image.bytes });
  }
  study.body = study.body.replaceAll('/uploads/__SLUG__/', `${folder}/`).trim();

  for (const path of uploadPathsInText(`${study.cover}\n${study.body}\n${study.gallery.map((item) => item.src).join('\n')}`)) {
    if (path.startsWith(`public/uploads/${slug}/`)) keep.add(path);
  }

  const markdown = serializeCaseStudy(study);
  files.push({
    path: `src/content/work/${slug}.md`,
    bytes: new TextEncoder().encode(markdown),
  });

  const prefix = `public/uploads/${slug}/`;
  const deletions = input.existingUploadPaths.filter((path) => path.startsWith(prefix) && !keep.has(path));
  return { files, deletions, markdown, study };
}

export function buildDeletePlan(slug: string, existingUploadPaths: string[]) {
  if (!isValidSlug(slug)) throw new Error('That case study link is not valid.');
  const prefix = `public/uploads/${slug}/`;
  return {
    files: [] as PlannedFile[],
    deletions: [`src/content/work/${slug}.md`, ...existingUploadPaths.filter((path) => path.startsWith(prefix))],
  };
}
