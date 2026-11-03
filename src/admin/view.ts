import { escapeHtml } from '../lib/escape';

export type QuoteDraft = { text: string; by: string };

export type MediaDraft = {
  id: string;
  name: string;
  kind: 'image' | 'video';
  alt: string;
  caption: string;
  previewUrl: string;
  path?: string;
};

export type EditorDraft = {
  slugLocked: boolean;
  slug: string;
  title: string;
  outcome: string;
  client: string;
  role: string;
  timeline: string;
  order: number;
  coverAlt: string;
  cover: MediaDraft | null;
  tags: string[];
  gallery: MediaDraft[];
  quotes: QuoteDraft[];
};

export type ListRow = {
  slug: string;
  title: string;
  outcome: string;
  client: string;
  draft: boolean;
  thumb: string;
};

function statusBlock(status: string, error: string) {
  return `<p id="status" class="status" role="status">${escapeHtml(status)}</p><p id="form-error" class="form-error" role="alert">${escapeHtml(error)}</p>`;
}

export function gateHtml(error = '') {
  return `<div class="admin-wrap gate">
    <p class="section-label">Admin</p>
    <h1>Sign in to add a case study</h1>
    <p>This page saves case studies into your Website repository on GitHub. Paste a token once on this computer. It stays in this browser and is never saved in the website files.</p>
    <p>Only the GitHub account Ombfaruk can publish.</p>
    <details>
      <summary>Create a token</summary>
      <ol>
        <li>On GitHub, click your profile photo, then click Settings.</li>
        <li>Scroll the left sidebar to the bottom and click Developer settings.</li>
        <li>Click Personal access tokens, then Fine-grained tokens.</li>
        <li>Click Generate new token.</li>
        <li>Token name: Portfolio admin.</li>
        <li>Expiration: choose Custom, then pick a date about one year away.</li>
        <li>Repository access: choose Only select repositories, then choose Website.</li>
        <li>Under Permissions, open Repository permissions and set Contents to Read and write.</li>
        <li>Click Generate token and copy it. GitHub shows it only once.</li>
      </ol>
    </details>
    <p class="hint">The token usually starts with github_pat_ or ghp_.</p>
    ${statusBlock('', error)}
    <label class="field" for="token">GitHub token
      <span class="token-row">
        <input id="token" name="token" type="password" autocomplete="off" spellcheck="false" />
        <button type="button" id="toggle-token" class="button button-ghost">Show token</button>
      </span>
    </label>
    <button type="button" id="save-token" class="button">Save token</button>
  </div>`;
}

export function listHtml(rows: ListRow[], status = '') {
  const items = rows.length
    ? rows.map((row) => `<article class="study-row">
        <img class="thumb" src="${escapeHtml(row.thumb)}" alt="" />
        <div>
          <h2>${escapeHtml(row.outcome || row.title)}<span class="badge">${row.draft ? 'Draft' : 'Live'}</span></h2>
          <p>${escapeHtml(row.client)} · ${escapeHtml(row.title)}</p>
        </div>
        <div class="row-actions">
          <button type="button" data-edit="${escapeHtml(row.slug)}">Edit ${escapeHtml(row.title)}</button>
          <button type="button" data-delete="${escapeHtml(row.slug)}">Delete ${escapeHtml(row.title)}</button>
        </div>
      </article>`).join('')
    : '<p>No case studies yet.</p>';
  return `<div class="admin-wrap">
    <header class="list-head">
      <div>
        <p class="section-label">Admin</p>
        <h1>Case studies</h1>
        <p>Signed in as Ombfaruk. Drafts stay off the live site.</p>
      </div>
      <div class="row-actions">
        <button type="button" id="sign-out" class="button button-ghost">Sign out</button>
        <button type="button" id="new-study" class="button">New case study</button>
      </div>
    </header>
    ${statusBlock(status, '')}
    <div id="study-list">${items}</div>
  </div>`;
}

function coverPreview(cover: MediaDraft | null) {
  if (!cover?.previewUrl) return '';
  if (cover.kind === 'video') return `<video src="${escapeHtml(cover.previewUrl)}" controls playsinline></video>`;
  return `<img src="${escapeHtml(cover.previewUrl)}" alt="" />`;
}

export function mediaHtml(draft: EditorDraft, error = '') {
  const chosen = `${coverPreview(draft.cover)}${draft.cover ? `<p>${escapeHtml(draft.cover.name)}</p>` : ''}<p class="drop-title">Drag and drop an image or video, or <label class="browse">browse<input id="cover-file" class="visually-hidden" type="file" accept="image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm" aria-label="Cover image or video" /></label></p><p class="hint">PNG, JPG, GIF, WebP, or MP4. Up to 8 MB.</p>`;
  return `<div class="admin-wrap">
    <div class="admin-bar">
      <button type="button" id="cancel" class="text-button">Cancel</button>
      <div class="row-actions">
        <button type="button" id="save-draft" class="button button-ghost">Save as draft</button>
        <button type="button" id="continue" class="button" ${draft.cover ? '' : 'disabled'}>Continue</button>
      </div>
    </div>
    ${statusBlock('', error)}
    <div class="media-step">
      <h1>What have you been working on?</h1>
      <p>Start with a cover. An image or a short video both work.</p>
      <div class="drop" id="cover-drop">${chosen}</div>
    </div>
  </div>`;
}

export function detailsHtml(draft: EditorDraft, error = '') {
  const slug = draft.slugLocked ? draft.slug : '';
  return `<div class="admin-wrap">
    <div class="admin-bar">
      <button type="button" id="cancel" class="text-button">Cancel</button>
      <div class="row-actions">
        <button type="button" id="back-media" class="button button-ghost">Cover</button>
        <button type="button" id="save-draft" class="button button-ghost">Save as draft</button>
        <button type="button" id="publish" class="button">Publish</button>
      </div>
    </div>
    ${statusBlock('', error)}
    <div class="editor-layout">
      <form id="study-form" novalidate>
        <p class="section-label">Case study details</p>
        <h1>Tell the story</h1>
        <div id="cover-box" class="drop drop-small">${coverPreview(draft.cover) || '<p>No cover yet.</p>'}</div>
        <label class="field">Cover description
          <input id="cover-alt" value="${escapeHtml(draft.coverAlt)}" />
        </label>
        <label class="browse">Replace cover
          <input id="cover-file" class="visually-hidden" type="file" accept="image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm" aria-label="Replace cover image or video" />
        </label>
        <label class="field">Title
          <input id="title" value="${escapeHtml(draft.title)}" />
        </label>
        <label class="field">Outcome line
          <span class="hint">This is the big line on the work grid. Say what changed.</span>
          <input id="outcome" value="${escapeHtml(draft.outcome)}" placeholder="From a crowded setup to a first win" />
        </label>
        <label class="field">Client
          <input id="client" value="${escapeHtml(draft.client)}" />
        </label>
        <label class="field">Role
          <input id="role" value="${escapeHtml(draft.role)}" />
        </label>
        <label class="field">Timeline
          <input id="timeline" value="${escapeHtml(draft.timeline)}" placeholder="Jan 2026 to Feb 2026" />
        </label>
        <label class="field">Position in the work grid
          <span class="hint">1 shows first.</span>
          <input id="order" type="number" min="1" step="1" value="${draft.order || 1}" />
        </label>
        <p id="slug-preview" class="hint">${slug ? `Link: /work/${escapeHtml(slug)}/` : ''}</p>
        <div class="field">Tags
          <div id="tag-list" class="chips"></div>
          <input id="tag-input" placeholder="Type a tag and press Enter" aria-label="Add a tag" />
        </div>
        <div class="field">Final screens
          <label class="drop drop-small" id="gallery-drop">Drag images here, or <span class="browse">browse</span>
            <input id="gallery-file" class="visually-hidden" type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple aria-label="Add final screens" />
          </label>
          <div id="gallery-list"></div>
        </div>
        <div class="field">Story
          <div class="toolbar" role="toolbar" aria-label="Story formatting">
            <button type="button" id="cmd-h2">Heading</button>
            <button type="button" id="cmd-bold">Bold</button>
            <button type="button" id="cmd-ul">Bulleted list</button>
            <button type="button" id="cmd-ol">Numbered list</button>
            <button type="button" id="cmd-image">Image</button>
          </div>
          <label id="image-alt-label" class="field" hidden>Selected image description
            <input id="image-alt" type="text" />
          </label>
          <div id="story" class="editor" contenteditable="true" role="textbox" aria-multiline="true" aria-label="Case study story"></div>
          <input id="inline-file" class="visually-hidden" type="file" accept="image/png,image/jpeg,image/webp,image/gif" aria-label="Image for the story" />
        </div>
        <div class="field">Proof quotes
          <div id="quotes"></div>
          <button type="button" id="add-quote" class="button button-ghost">Add a quote</button>
        </div>
        <p><a href="#preview">Jump to preview</a></p>
      </form>
      <aside class="preview-col" id="preview" aria-label="Preview">
        <h2>Preview</h2>
      </aside>
    </div>
  </div>`;
}

export function tagsHtml(tags: string[]) {
  return tags.map((tag) => `<span class="chip">${escapeHtml(tag)}<button type="button" data-remove-tag="${escapeHtml(tag)}" aria-label="Remove tag ${escapeHtml(tag)}">×</button></span>`).join('');
}

export function galleryHtml(items: MediaDraft[]) {
  if (!items.length) return '<p class="hint">No final screens yet.</p>';
  return items.map((item, index) => `<div class="gallery-row" data-gallery="${escapeHtml(item.id)}" draggable="true">
    ${item.kind === 'video' ? `<video class="thumb" src="${escapeHtml(item.previewUrl)}"></video>` : `<img class="thumb" src="${escapeHtml(item.previewUrl)}" alt="" />`}
    <div>
      <label class="field">Description for screen ${index + 1}
        <input data-alt value="${escapeHtml(item.alt)}" />
      </label>
      <label class="field">Caption for screen ${index + 1}
        <input data-caption value="${escapeHtml(item.caption)}" placeholder="Optional" />
      </label>
      <div class="row-actions">
        <button type="button" data-move="up">Move screen ${index + 1} up</button>
        <button type="button" data-move="down">Move screen ${index + 1} down</button>
        <button type="button" data-remove>Remove screen ${index + 1}</button>
      </div>
    </div>
  </div>`).join('');
}

export function quotesHtml(quotes: QuoteDraft[]) {
  if (!quotes.length) return '<p class="hint">Optional. Add a line someone else said about the work.</p>';
  return quotes.map((quote, index) => `<div class="quote-edit">
    <label class="field">Quote ${index + 1}
      <input id="quote-text-${index}" value="${escapeHtml(quote.text)}" />
    </label>
    <label class="field">Who said quote ${index + 1}
      <input id="quote-by-${index}" value="${escapeHtml(quote.by)}" />
    </label>
    <button type="button" data-remove-quote="${index}">Remove quote ${index + 1}</button>
  </div>`).join('');
}
