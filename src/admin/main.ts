import { siteConfig } from '../config';
import {
  altFromName,
  isValidSlug,
  parseCaseStudy,
  repoPathFromPublic,
  slugify,
  starterBody,
  type CaseStudy,
} from '../lib/caseStudy';
import { buildCommitPlan, buildDeletePlan, type PlanInline, type PlanMedia } from '../lib/commitPlan';
import { escapeHtml } from '../lib/escape';
import {
  assertCanPublish,
  bytesToBase64,
  createGitHubClient,
  friendlyGitHubError,
  GitHubError,
  listDirectory,
  publishFiles,
  readRepoFile,
  type GitHubClient,
} from '../lib/github';
import { htmlToMarkdown } from '../lib/htmlToMarkdown';
import { renderMarkdown } from '../lib/renderMarkdown';
import { markdownToSafeHtml } from '../lib/renderMarkdown';
import {
  detailsHtml,
  galleryHtml,
  gateHtml,
  listHtml,
  mediaHtml,
  quotesHtml,
  tagsHtml,
  type EditorDraft,
  type ListRow,
  type MediaDraft,
} from './view';

type InlineImage = { tokenPath: string; filename: string; file: File };

type EditorState = EditorDraft & {
  mode: 'new' | 'edit';
  tags: string[];
  body: string;
  inline: InlineImage[];
};

type StoredStudy = { slug: string; study: CaseStudy };

const IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);
const VIDEO_TYPES = new Set(['video/mp4', 'video/webm']);
const EMPTY_THUMB =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="120"><rect width="100%" height="100%" fill="#eceae4"/></svg>',
  );

let root: HTMLElement;
let client: GitHubClient | null = null;
let studies: StoredStudy[] = [];
let state: EditorState = {
  mode: 'new',
  slugLocked: false,
  slug: '',
  title: '',
  outcome: '',
  client: '',
  role: '',
  timeline: '',
  order: 1,
  coverAlt: '',
  cover: null,
  tags: [],
  gallery: [],
  quotes: [],
  body: starterBody,
  inline: [],
};
let dirty = false;
let saving = false;
let selectedImage: HTMLImageElement | null = null;
const previewUrls = new Map<string, string>();

export function mountAdmin(mount: HTMLElement) {
  root = mount;
  try {
    document.execCommand('styleWithCSS', false, 'false');
  } catch {
    // Older browsers may reject this. Bold still works.
  }
  window.addEventListener('dragover', (event) => event.preventDefault());
  window.addEventListener('drop', (event) => event.preventDefault());
  const token = localStorage.getItem(siteConfig.tokenStorageKey);
  if (!token) {
    showGate();
    return;
  }
  void start(token);
}

function publicBase() {
  const value = import.meta.env.BASE_URL || `${siteConfig.base}/`;
  return value.endsWith('/') ? value : `${value}/`;
}

function showGate(error = '') {
  root.innerHTML = gateHtml(error);
  document.title = 'Sign in · Omar Faruk';
  const token = root.querySelector<HTMLInputElement>('#token');
  root.querySelector('#toggle-token')?.addEventListener('click', () => {
    if (!token) return;
    const showing = token.type === 'text';
    token.type = showing ? 'password' : 'text';
    const button = root.querySelector('#toggle-token');
    if (button) button.textContent = showing ? 'Show token' : 'Hide token';
  });
  root.querySelector('#save-token')?.addEventListener('click', () => {
    const value = token?.value.trim() ?? '';
    if (!value) return setError('Paste your GitHub token.');
    if (!value.startsWith('github_pat_') && !value.startsWith('ghp_')) {
      setError('That does not look like a GitHub token. It usually starts with github_pat_ or ghp_.');
      return;
    }
    void start(value, true);
  });
}

async function start(token: string, persist = false) {
  client = createGitHubClient(token);
  setStatus('Checking the token...');
  try {
    await assertCanPublish(client, siteConfig.owner, siteConfig.repo);
    if (persist) localStorage.setItem(siteConfig.tokenStorageKey, token);
    await showList();
  } catch (error) {
    if (error instanceof GitHubError && (error.status === 401 || error.status === 403)) {
      localStorage.removeItem(siteConfig.tokenStorageKey);
    }
    client = null;
    showGate(friendlyGitHubError(error));
  }
}

async function showList(message = '') {
  if (!client) return showGate();
  root.innerHTML = listHtml([], message || 'Loading case studies...');
  try {
    studies = await loadStudies();
    root.innerHTML = listHtml(studies.map(toRow), message);
    document.title = 'Case studies · Omar Faruk';
    bindList();
    void loadThumbs();
  } catch (error) {
    root.innerHTML = listHtml([], '');
    setError(friendlyGitHubError(error));
    bindList();
  }
}

function bindList() {
  root.querySelector('#sign-out')?.addEventListener('click', () => {
    localStorage.removeItem(siteConfig.tokenStorageKey);
    client = null;
    showGate();
  });
  root.querySelector('#new-study')?.addEventListener('click', openNew);
  root.querySelectorAll<HTMLButtonElement>('[data-edit]').forEach((button) => {
    button.addEventListener('click', () => void editStudy(button.dataset.edit || ''));
  });
  root.querySelectorAll<HTMLButtonElement>('[data-delete]').forEach((button) => {
    button.addEventListener('click', () => void deleteStudy(button.dataset.delete || ''));
  });
}

function toRow(item: StoredStudy): ListRow {
  return {
    slug: item.slug,
    title: item.study.title || item.slug,
    outcome: item.study.outcome,
    client: item.study.client,
    draft: item.study.draft,
    thumb: previewUrls.get(item.study.cover) || EMPTY_THUMB,
  };
}

async function loadStudies() {
  if (!client) return [];
  const entries = await listDirectory(client, siteConfig.owner, siteConfig.repo, siteConfig.contentDir, siteConfig.branch);
  const loaded: StoredStudy[] = [];
  for (const entry of entries) {
    if (entry.type !== 'file' || !entry.name.endsWith('.md')) continue;
    const bytes = await readRepoFile(client, siteConfig.owner, siteConfig.repo, entry.path, siteConfig.branch);
    loaded.push({ slug: entry.name.replace(/\.md$/, ''), study: parseCaseStudy(new TextDecoder().decode(bytes)) });
  }
  loaded.sort((a, b) => a.study.order - b.study.order || a.study.title.localeCompare(b.study.title));
  return loaded;
}

async function loadThumbs() {
  if (!client) return;
  for (const item of studies) {
    const cover = item.study.cover;
    if (!cover || previewUrls.has(cover)) continue;
    try {
      const bytes = await readRepoFile(client, siteConfig.owner, siteConfig.repo, repoPathFromPublic(cover), siteConfig.branch);
      previewUrls.set(cover, URL.createObjectURL(toBlob(bytes, mimeFromPath(cover))));
    } catch {
      previewUrls.set(cover, EMPTY_THUMB);
    }
  }
  const list = root.querySelector('#study-list');
  if (!list) return;
  root.querySelectorAll<HTMLElement>('.study-row').forEach((row, index) => {
    const image = row.querySelector('img');
    const item = studies[index];
    if (image && item) image.src = previewUrls.get(item.study.cover) || EMPTY_THUMB;
  });
}

function openNew() {
  const next = studies.reduce((max, item) => Math.max(max, item.study.order), 0) + 1;
  state = {
    mode: 'new',
    slugLocked: false,
    slug: '',
    title: '',
    outcome: '',
    client: '',
    role: 'Product Designer (UX, UI)',
    timeline: '',
    order: next,
    coverAlt: '',
    cover: null,
    tags: [],
    gallery: [],
    quotes: [],
    body: starterBody,
    inline: [],
  };
  dirty = false;
  showMedia();
}

function showMedia(error = '') {
  root.innerHTML = mediaHtml(state, error);
  document.title = 'What have you been working on? · Omar Faruk';
  bindMedia();
}

function bindMedia() {
  root.querySelector('#cancel')?.addEventListener('click', () => leave());
  root.querySelector('#save-draft')?.addEventListener('click', () => void save(true));
  root.querySelector('#continue')?.addEventListener('click', () => {
    if (!state.cover) return setError('Add a cover image or video first.');
    showDetails();
  });
  const drop = root.querySelector<HTMLElement>('#cover-drop');
  const input = root.querySelector<HTMLInputElement>('#cover-file');
  input?.addEventListener('change', () => {
    const file = input.files?.[0];
    if (file) takeCover(file);
  });
  drop?.addEventListener('dragover', (event) => {
    event.preventDefault();
    drop.classList.add('is-dragover');
  });
  drop?.addEventListener('dragleave', () => drop.classList.remove('is-dragover'));
  drop?.addEventListener('drop', (event) => {
    event.preventDefault();
    drop.classList.remove('is-dragover');
    const file = event.dataTransfer?.files?.[0];
    if (file) takeCover(file);
  });
}

function takeCover(file: File) {
  const kind = fileKind(file, true);
  if (!kind) return setError('Use a PNG, JPG, GIF, WebP, or MP4.');
  if (file.size > siteConfig.maxUploadBytes) return setError('That file is larger than 8 MB.');
  state.cover = {
    id: crypto.randomUUID(),
    name: file.name,
    kind,
    alt: altFromName(file.name),
    caption: '',
    previewUrl: URL.createObjectURL(file),
    file,
  } as MediaDraft & { file: File };
  (state.cover as MediaDraft & { file?: File }).file = file;
  if (!state.coverAlt) state.coverAlt = `Cover image for ${state.title || 'this case study'}`;
  dirty = true;
  showMedia();
}

function showDetails(error = '') {
  root.innerHTML = detailsHtml(state, error);
  document.title = 'Tell the story · Omar Faruk';
  const editor = root.querySelector<HTMLElement>('#story');
  if (editor) editor.innerHTML = markdownToSafeHtml(state.body);
  renderTags();
  renderGallery();
  renderQuotes();
  updateSlug();
  bindDetails();
  if (editor) void hydrateImages(editor);
  updatePreview();
}

function bindDetails() {
  root.querySelector('#cancel')?.addEventListener('click', () => leave());
  root.querySelector('#back-media')?.addEventListener('click', () => {
    readForm();
    showMedia();
  });
  root.querySelector('#save-draft')?.addEventListener('click', () => void save(true));
  root.querySelector('#publish')?.addEventListener('click', () => void save(false));
  root.querySelector('#study-form')?.addEventListener('submit', (event) => event.preventDefault());
  root.querySelector('#title')?.addEventListener('input', () => {
    dirty = true;
    updateSlug();
    updatePreview();
  });
  for (const id of ['outcome', 'client', 'role', 'timeline', 'cover-alt', 'order']) {
    root.querySelector(`#${id}`)?.addEventListener('input', () => {
      dirty = true;
      updatePreview();
    });
  }
  root.querySelector('#cover-file')?.addEventListener('change', (event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) replaceCover(file);
  });
  const galleryInput = root.querySelector<HTMLInputElement>('#gallery-file');
  galleryInput?.addEventListener('change', () => {
    if (galleryInput.files) addGalleryFiles([...galleryInput.files]);
    galleryInput.value = '';
  });
  const galleryDrop = root.querySelector<HTMLElement>('#gallery-drop');
  galleryDrop?.addEventListener('dragover', (event) => {
    event.preventDefault();
    galleryDrop.classList.add('is-dragover');
  });
  galleryDrop?.addEventListener('dragleave', () => galleryDrop.classList.remove('is-dragover'));
  galleryDrop?.addEventListener('drop', (event) => {
    event.preventDefault();
    galleryDrop.classList.remove('is-dragover');
    addGalleryFiles([...(event.dataTransfer?.files ?? [])]);
  });
  const tagInput = root.querySelector<HTMLInputElement>('#tag-input');
  tagInput?.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ',') return;
    event.preventDefault();
    const value = tagInput.value.replace(/,/g, '').trim();
    if (!value) return;
    if (state.tags.length >= 8) return setError('Use up to 8 tags.');
    if (value.length > 24) return setError('Keep each tag under 24 characters.');
    if (!state.tags.includes(value)) state.tags.push(value);
    tagInput.value = '';
    dirty = true;
    renderTags();
  });
  root.querySelector('#add-quote')?.addEventListener('click', () => {
    syncQuotes();
    state.quotes.push({ text: '', by: '' });
    dirty = true;
    renderQuotes();
  });
  for (const id of ['cmd-h2', 'cmd-bold', 'cmd-ul', 'cmd-ol', 'cmd-image']) {
    root.querySelector(`#${id}`)?.addEventListener('mousedown', (event) => event.preventDefault());
  }
  root.querySelector('#cmd-h2')?.addEventListener('click', () => formatBlock('h2'));
  root.querySelector('#cmd-bold')?.addEventListener('click', () => runCommand('bold'));
  root.querySelector('#cmd-ul')?.addEventListener('click', () => runCommand('insertUnorderedList'));
  root.querySelector('#cmd-ol')?.addEventListener('click', () => runCommand('insertOrderedList'));
  root.querySelector('#cmd-image')?.addEventListener('click', () => root.querySelector<HTMLInputElement>('#inline-file')?.click());
  root.querySelector('#inline-file')?.addEventListener('change', (event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) insertInline(file);
    (event.target as HTMLInputElement).value = '';
  });
  const editor = root.querySelector<HTMLElement>('#story');
  editor?.addEventListener('input', () => {
    dirty = true;
    updatePreview();
  });
  editor?.addEventListener('click', (event) => selectEditorImage(event.target));
  const altInput = root.querySelector<HTMLInputElement>('#image-alt');
  altInput?.addEventListener('input', () => {
    if (!selectedImage) return;
    selectedImage.alt = altInput.value;
    dirty = true;
    updatePreview();
  });
  editor?.addEventListener('keydown', (event) => {
    if (!(event.metaKey || event.ctrlKey)) return;
    if (event.key.toLowerCase() === 'b') {
      event.preventDefault();
      runCommand('bold');
    }
    if (event.key.toLowerCase() === 'i') {
      event.preventDefault();
      runCommand('italic');
    }
  });
}

function replaceCover(file: File) {
  const kind = fileKind(file, true);
  if (!kind) return setError('Use a PNG, JPG, GIF, WebP, or MP4.');
  if (file.size > siteConfig.maxUploadBytes) return setError('That file is larger than 8 MB.');
  state.cover = {
    id: crypto.randomUUID(),
    name: file.name,
    kind,
    alt: state.coverAlt || altFromName(file.name),
    caption: '',
    previewUrl: URL.createObjectURL(file),
  };
  (state.cover as MediaDraft & { file?: File }).file = file;
  delete (state.cover as { path?: string }).path;
  dirty = true;
  const box = root.querySelector('#cover-box');
  if (box) {
    box.innerHTML = kind === 'video'
      ? `<video src="${state.cover.previewUrl}" controls playsinline></video>`
      : `<img src="${state.cover.previewUrl}" alt="" />`;
  }
  updatePreview();
}

function addGalleryFiles(files: File[]) {
  if (!files.length) return;
  syncGallery();
  for (const file of files) {
    const kind = fileKind(file, false);
    if (!kind) {
      setError('The gallery takes images. Video can be the cover.');
      continue;
    }
    if (file.size > siteConfig.maxUploadBytes) {
      setError('Each image needs to be 8 MB or smaller.');
      continue;
    }
    if (state.gallery.length >= 30) {
      setError('30 screens is the limit for one case study.');
      break;
    }
    const media: MediaDraft & { file?: File } = {
      id: crypto.randomUUID(),
      name: file.name,
      kind,
      alt: altFromName(file.name),
      caption: '',
      previewUrl: URL.createObjectURL(file),
      file,
    };
    state.gallery.push(media);
  }
  dirty = true;
  renderGallery();
  updatePreview();
}

function renderTags() {
  const list = root.querySelector('#tag-list');
  if (!list) return;
  list.innerHTML = tagsHtml(state.tags);
  list.querySelectorAll<HTMLButtonElement>('[data-remove-tag]').forEach((button) => {
    button.addEventListener('click', () => {
      state.tags = state.tags.filter((tag) => tag !== button.dataset.removeTag);
      dirty = true;
      renderTags();
    });
  });
}

function renderGallery() {
  const list = root.querySelector('#gallery-list');
  if (!list) return;
  list.innerHTML = galleryHtml(state.gallery);
  list.querySelectorAll<HTMLElement>('[data-gallery]').forEach((row) => {
    const id = row.dataset.gallery || '';
    row.querySelector('[data-move="up"]')?.addEventListener('click', () => moveGallery(id, -1));
    row.querySelector('[data-move="down"]')?.addEventListener('click', () => moveGallery(id, 1));
    row.querySelector('[data-remove]')?.addEventListener('click', () => {
      syncGallery();
      state.gallery = state.gallery.filter((item) => item.id !== id);
      dirty = true;
      renderGallery();
      updatePreview();
    });
    row.addEventListener('dragstart', () => row.setAttribute('data-dragging', 'true'));
    row.addEventListener('dragover', (event) => event.preventDefault());
    row.addEventListener('drop', (event) => {
      event.preventDefault();
      const from = list.querySelector<HTMLElement>('[data-dragging="true"]');
      row.removeAttribute('data-dragging');
      from?.removeAttribute('data-dragging');
      if (!from || from === row) return;
      syncGallery();
      const fromId = from.dataset.gallery || '';
      const toId = row.dataset.gallery || '';
      const fromIndex = state.gallery.findIndex((item) => item.id === fromId);
      const toIndex = state.gallery.findIndex((item) => item.id === toId);
      if (fromIndex < 0 || toIndex < 0) return;
      const [item] = state.gallery.splice(fromIndex, 1);
      state.gallery.splice(toIndex, 0, item);
      dirty = true;
      renderGallery();
      updatePreview();
    });
    row.addEventListener('dragend', () => row.removeAttribute('data-dragging'));
  });
}

function moveGallery(id: string, direction: number) {
  syncGallery();
  const index = state.gallery.findIndex((item) => item.id === id);
  const next = index + direction;
  if (index < 0 || next < 0 || next >= state.gallery.length) return;
  const [item] = state.gallery.splice(index, 1);
  state.gallery.splice(next, 0, item);
  dirty = true;
  renderGallery();
  updatePreview();
}

function renderQuotes() {
  const list = root.querySelector('#quotes');
  if (!list) return;
  list.innerHTML = quotesHtml(state.quotes);
  list.querySelectorAll<HTMLButtonElement>('[data-remove-quote]').forEach((button) => {
    button.addEventListener('click', () => {
      syncQuotes();
      const index = Number(button.dataset.removeQuote);
      state.quotes.splice(index, 1);
      dirty = true;
      renderQuotes();
    });
  });
}

function formatBlock(tag: string) {
  const editor = root.querySelector<HTMLElement>('#story');
  editor?.focus();
  document.execCommand('formatBlock', false, tag);
  if (!String(document.queryCommandValue('formatBlock')).toLowerCase().includes(tag)) {
    document.execCommand('formatBlock', false, `<${tag}>`);
  }
  dirty = true;
  updatePreview();
}

function runCommand(command: string) {
  root.querySelector<HTMLElement>('#story')?.focus();
  document.execCommand(command, false);
  dirty = true;
  updatePreview();
}

function insertInline(file: File) {
  const kind = fileKind(file, false);
  if (!kind) return setError('Use a PNG, JPG, GIF, or WebP in the story.');
  if (file.size > siteConfig.maxUploadBytes) return setError('That image is larger than 8 MB.');
  const id = crypto.randomUUID().slice(0, 8);
  const filename = `inline-${id}-${file.name}`;
  const tokenPath = `/uploads/__SLUG__/${filename.replace(/[^a-zA-Z0-9._-]+/g, '-')}`;
  state.inline.push({ tokenPath, filename, file });
  const url = URL.createObjectURL(file);
  previewUrls.set(tokenPath, url);
  const editor = root.querySelector<HTMLElement>('#story');
  editor?.focus();
  const alt = escapeHtml(altFromName(file.name));
  document.execCommand('insertHTML', false, `<img src="${url}" alt="${alt}" data-path="${tokenPath}">`);
  dirty = true;
  updatePreview();
}

function selectEditorImage(target: EventTarget | null) {
  const label = root.querySelector<HTMLElement>('#image-alt-label');
  const input = root.querySelector<HTMLInputElement>('#image-alt');
  if (!(target instanceof HTMLImageElement) || !label || !input) {
    selectedImage = null;
    if (label) label.hidden = true;
    return;
  }
  selectedImage = target;
  label.hidden = false;
  input.value = target.alt;
}

async function hydrateImages(editor: HTMLElement) {
  if (!client) return;
  const images = [...editor.querySelectorAll('img')];
  await Promise.all(images.map(async (image) => {
    const src = image.getAttribute('src') || '';
    const start = src.indexOf('/uploads/');
    if (start < 0) return;
    const path = src.slice(start);
    image.setAttribute('data-path', path);
    try {
      const bytes = await readRepoFile(client as GitHubClient, siteConfig.owner, siteConfig.repo, repoPathFromPublic(path), siteConfig.branch);
      const url = URL.createObjectURL(toBlob(bytes, mimeFromPath(path)));
      image.src = url;
      previewUrls.set(path, url);
    } catch {
      // The story still saves the original path.
    }
  }));
  updatePreview();
}

function readForm() {
  const read = (id: string) => root.querySelector<HTMLInputElement>(`#${id}`);
  const title = read('title');
  if (title) state.title = title.value.trim();
  const outcome = read('outcome');
  if (outcome) state.outcome = outcome.value.trim();
  const clientName = read('client');
  if (clientName) state.client = clientName.value.trim();
  const role = read('role');
  if (role) state.role = role.value.trim();
  const timeline = read('timeline');
  if (timeline) state.timeline = timeline.value.trim();
  const coverAlt = read('cover-alt');
  if (coverAlt) state.coverAlt = coverAlt.value.trim();
  const order = read('order');
  if (order) {
    const next = Number(order.value);
    if (Number.isFinite(next) && next > 0) state.order = next;
  }
  const editor = root.querySelector<HTMLElement>('#story');
  if (editor) state.body = htmlToMarkdown(editor);
  if (root.querySelector('[data-gallery]')) syncGallery();
  if (root.querySelector('[id^="quote-text-"], #quotes')) syncQuotes();
  if (!state.slugLocked) state.slug = slugify(state.title);
  if (!state.title && state.cover) state.title = altFromName(state.cover.name);
}

function syncGallery() {
  root.querySelectorAll<HTMLElement>('[data-gallery]').forEach((row) => {
    const item = state.gallery.find((entry) => entry.id === row.dataset.gallery);
    if (!item) return;
    const alt = row.querySelector<HTMLInputElement>('[data-alt]');
    const caption = row.querySelector<HTMLInputElement>('[data-caption]');
    if (alt) item.alt = alt.value;
    if (caption) item.caption = caption.value;
  });
}

function syncQuotes() {
  state.quotes = state.quotes.map((quote, index) => {
    const text = root.querySelector<HTMLInputElement>(`#quote-text-${index}`);
    const by = root.querySelector<HTMLInputElement>(`#quote-by-${index}`);
    return { text: text ? text.value : quote.text, by: by ? by.value : quote.by };
  });
}

function updateSlug() {
  const preview = root.querySelector('#slug-preview');
  if (!preview) return;
  const slug = state.slugLocked ? state.slug : slugify(value('title'));
  preview.textContent = slug ? `Link: /work/${slug}/` : '';
}

function updatePreview() {
  const preview = root.querySelector('#preview');
  if (!preview || !root.querySelector('#story')) return;
  const title = value('title');
  const outcome = value('outcome');
  const client = value('client');
  const body = htmlToMarkdown(root.querySelector('#story') as HTMLElement);
  const html = applyPreviewUrls(renderMarkdown(body, publicBase()));
  const cover = state.cover;
  const coverHtml = cover?.previewUrl
    ? cover.kind === 'video'
      ? `<video src="${escapeHtml(cover.previewUrl)}" controls playsinline></video>`
      : `<img src="${escapeHtml(cover.previewUrl)}" alt="" />`
    : '';
  const screens = state.gallery.map((item) => `<figure><img src="${escapeHtml(item.previewUrl)}" alt="${escapeHtml(item.alt)}" /><figcaption>${escapeHtml(item.caption || item.alt)}</figcaption></figure>`).join('');
  preview.innerHTML = `<h2>Preview</h2>
    <a class="work-card" href="#preview">${coverHtml}<p class="eyebrow">${escapeHtml(client)}</p><h3>${escapeHtml(outcome || 'Outcome line')}</h3></a>
    <article class="case"><p class="eyebrow">${escapeHtml(client)}</p><h2>${escapeHtml(outcome || title || 'Outcome line')}</h2><div class="prose">${html}</div>${screens ? `<h2>Final screens</h2><div class="gallery">${screens}</div>` : ''}</article>`;
}

function applyPreviewUrls(html: string) {
  const prefix = publicBase().replace(/\/$/, '');
  let output = html;
  for (const [path, url] of previewUrls) {
    output = output.split(`${prefix}${path}`).join(url);
  }
  return output;
}

function validate(publishing: boolean) {
  readForm();
  const errors: string[] = [];
  if (!state.title.trim()) errors.push('Add a title.');
  if (!state.cover) errors.push('Add a cover image or video.');
  if (!isValidSlug(state.slugLocked ? state.slug : slugify(state.title))) errors.push('Use a title with letters or numbers.');
  if (publishing) {
    if (!state.outcome.trim()) errors.push('Add the outcome line. This is the title on the work grid.');
    if (!state.client.trim()) errors.push('Add the client.');
    if (!state.role.trim()) errors.push('Add your role.');
    if (!state.timeline.trim()) errors.push('Add the timeline.');
    if (!state.coverAlt.trim()) errors.push('Describe the cover image.');
    if (state.gallery.some((item) => !item.alt.trim())) errors.push('Describe each final screen.');
    if (/!\[\s*\]\(/.test(state.body)) errors.push('Add a description for each image in the story.');
  }
  return errors;
}

async function save(asDraft: boolean) {
  if (saving || !client) return;
  const errors = validate(!asDraft);
  if (errors.length) return setError(errors.join(' '));
  const slug = state.slugLocked ? state.slug : slugify(state.title);
  if (!state.slugLocked && studies.some((item) => item.slug === slug)) {
    const replace = window.confirm('A case study with this link already exists. Replace it?');
    if (!replace) return;
  }
  saving = true;
  setStatus(asDraft ? 'Saving draft...' : 'Publishing...');
  try {
    const existing = await listDirectory(client, siteConfig.owner, siteConfig.repo, `${siteConfig.uploadDir}/${slug}`, siteConfig.branch);
    const inline: PlanInline[] = [];
    for (const image of state.inline) {
      if (!state.body.includes(image.tokenPath) && !state.body.includes(image.tokenPath.replace('/uploads/__SLUG__/', `/uploads/${slug}/`))) continue;
      inline.push({ tokenPath: image.tokenPath, filename: image.filename, bytes: await fileBytes(image.file) });
    }
    const plan = buildCommitPlan({
      slug,
      study: toStudy(asDraft),
      cover: await toPlanCover(),
      gallery: await toPlanGallery(),
      inline,
      existingUploadPaths: existing.map((item) => item.path),
    });
    await publishFiles(client, {
      owner: siteConfig.owner,
      repo: siteConfig.repo,
      branch: siteConfig.branch,
      message: `${asDraft ? 'Save draft' : 'Publish'} case study: ${state.title.trim()}`,
      files: plan.files.map((file) => ({ path: file.path, contentBase64: bytesToBase64(file.bytes) })),
      deletions: plan.deletions,
    });
    dirty = false;
    await showList(asDraft
      ? 'Draft saved. It stays off the live site. GitHub is rebuilding the rest of the site.'
      : `Published ${state.title.trim()}. The site will update after GitHub finishes the rebuild.`);
  } catch (error) {
    setError(friendlyGitHubError(error));
  } finally {
    saving = false;
  }
}

function toStudy(asDraft: boolean): CaseStudy {
  return {
    title: state.title.trim(),
    outcome: state.outcome.trim(),
    client: state.client.trim(),
    role: state.role.trim(),
    timeline: state.timeline.trim(),
    tags: [...state.tags],
    cover: coverPath(state.cover),
    coverAlt: state.coverAlt.trim(),
    coverType: state.cover?.kind === 'video' ? 'video' : 'image',
    gallery: state.gallery.map((item) => ({
      src: item.path || '',
      alt: item.alt.trim(),
      ...(item.caption.trim() ? { caption: item.caption.trim() } : {}),
    })),
    draft: asDraft,
    order: state.order,
    quotes: state.quotes.filter((quote) => quote.text.trim()),
    body: state.body,
  };
}

function coverPath(cover: MediaDraft | null) {
  return cover?.path || '';
}

async function toPlanCover(): Promise<PlanMedia | null> {
  if (!state.cover) return null;
  const file = (state.cover as MediaDraft & { file?: File }).file;
  if (file) {
    return { filename: state.cover.name, bytes: await fileBytes(file), alt: state.coverAlt, kind: state.cover.kind };
  }
  return { path: state.cover.path, alt: state.coverAlt, kind: state.cover.kind };
}

async function toPlanGallery(): Promise<PlanMedia[]> {
  const items: PlanMedia[] = [];
  for (const item of state.gallery) {
    const file = (item as MediaDraft & { file?: File }).file;
    if (file) {
      items.push({ filename: item.name, bytes: await fileBytes(file), alt: item.alt, caption: item.caption, kind: 'image' });
    } else if (item.path) {
      items.push({ path: item.path, alt: item.alt, caption: item.caption, kind: 'image' });
    }
  }
  return items;
}

async function editStudy(slug: string) {
  const found = studies.find((item) => item.slug === slug);
  if (!found || !client) return;
  setStatus('Opening case study...');
  const study = found.study;
  state = {
    mode: 'edit',
    slugLocked: true,
    slug,
    title: study.title,
    outcome: study.outcome,
    client: study.client,
    role: study.role,
    timeline: study.timeline,
    order: study.order || 1,
    coverAlt: study.coverAlt,
    cover: null,
    tags: [...study.tags],
    gallery: [],
    quotes: study.quotes.map((quote) => ({ ...quote })),
    body: study.body,
    inline: [],
  };
  if (study.cover) state.cover = await mediaFromPath(study.cover, study.coverAlt, study.coverType, '');
  for (const image of study.gallery) {
    state.gallery.push(await mediaFromPath(image.src, image.alt, 'image', image.caption || ''));
  }
  dirty = false;
  if (state.cover) showDetails();
  else showMedia();
}

async function mediaFromPath(path: string, alt: string, kind: 'image' | 'video', caption: string) {
  let previewUrl = EMPTY_THUMB;
  if (client) {
    try {
      const bytes = await readRepoFile(client, siteConfig.owner, siteConfig.repo, repoPathFromPublic(path), siteConfig.branch);
      previewUrl = URL.createObjectURL(toBlob(bytes, mimeFromPath(path)));
      previewUrls.set(path, previewUrl);
    } catch {
      previewUrl = EMPTY_THUMB;
    }
  }
  const media: MediaDraft & { path?: string } = {
    id: crypto.randomUUID(),
    name: path.split('/').pop() || 'file',
    kind,
    alt,
    caption,
    previewUrl,
    path,
  };
  return media;
}

async function deleteStudy(slug: string) {
  const found = studies.find((item) => item.slug === slug);
  if (!found || !client) return;
  const approved = window.confirm(`Delete "${found.study.title || slug}"? This removes it from the site after the next rebuild.`);
  if (!approved) return;
  setStatus('Deleting...');
  try {
    const existing = await listDirectory(client, siteConfig.owner, siteConfig.repo, `${siteConfig.uploadDir}/${slug}`, siteConfig.branch);
    const plan = buildDeletePlan(slug, existing.map((item) => item.path));
    await publishFiles(client, {
      owner: siteConfig.owner,
      repo: siteConfig.repo,
      branch: siteConfig.branch,
      message: `Remove case study: ${found.study.title || slug}`,
      files: [],
      deletions: plan.deletions,
    });
    await showList(`Deleted ${found.study.title || slug}. The site will update after GitHub finishes the rebuild.`);
  } catch (error) {
    setError(friendlyGitHubError(error));
  }
}

function leave() {
  if (dirty && !window.confirm('Leave without saving?')) return;
  dirty = false;
  void showList();
}

function value(id: string) {
  const field = root.querySelector<HTMLInputElement>(`#${id}`);
  return field ? field.value.trim() : '';
}

function setStatus(message: string) {
  const status = root.querySelector('#status');
  if (status) status.textContent = message;
}

function setError(message: string) {
  const error = root.querySelector('#form-error');
  if (error) error.textContent = message;
  else if (root.querySelector('.gate, .admin-wrap')) {
    const node = document.createElement('p');
    node.className = 'form-error';
    node.setAttribute('role', 'alert');
    node.textContent = message;
    root.querySelector('.admin-wrap')?.prepend(node);
  }
}

function fileKind(file: File, allowVideo: boolean): 'image' | 'video' | null {
  const type = file.type.toLowerCase();
  if (IMAGE_TYPES.has(type)) return 'image';
  if (allowVideo && VIDEO_TYPES.has(type)) return 'video';
  const name = file.name.toLowerCase();
  if (/\.(png|jpe?g|webp|gif)$/.test(name)) return 'image';
  if (allowVideo && /\.(mp4|webm)$/.test(name)) return 'video';
  return null;
}

function mimeFromPath(path: string) {
  const extension = path.split('.').pop()?.toLowerCase();
  if (extension === 'png') return 'image/png';
  if (extension === 'jpg' || extension === 'jpeg') return 'image/jpeg';
  if (extension === 'webp') return 'image/webp';
  if (extension === 'gif') return 'image/gif';
  if (extension === 'svg') return 'image/svg+xml';
  if (extension === 'mp4') return 'video/mp4';
  if (extension === 'webm') return 'video/webm';
  return 'application/octet-stream';
}

async function fileBytes(file: File) {
  return new Uint8Array(await file.arrayBuffer());
}

function toBlob(bytes: Uint8Array, type: string) {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return new Blob([copy.buffer], { type });
}

