import { expect, test, type Page, type Route } from '@playwright/test';

const jiak = `---
title: "Jiak digital menu"
outcome: "From a static menu to one owners can update"
client: "Jiak Technology"
role: "Product Designer (UX, UI)"
timeline: "Feb 2025 to Sep 2025"
tags:
  - Restaurant
cover: "/uploads/jiak/cover.svg"
coverAlt: "Placeholder cover"
coverType: image
gallery: []
draft: false
order: 1
---

## Context

A static menu.
`;

type Store = {
  files: Map<string, string>;
  blobs: Map<string, string>;
  ref: string;
};

function createStore(): Store {
  const files = new Map<string, string>();
  files.set('src/content/work/jiak.md', Buffer.from(jiak).toString('base64'));
  files.set('public/uploads/jiak/cover.svg', Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>').toString('base64'));
  return { files, blobs: new Map(), ref: 'commit-1' };
}

function children(store: Store, dir: string) {
  const prefix = `${dir.replace(/\/$/, '')}/`;
  const found = new Map<string, { name: string; path: string; type: 'file' | 'dir' }>();
  for (const filePath of store.files.keys()) {
    if (!filePath.startsWith(prefix)) continue;
    const parts = filePath.slice(prefix.length).split('/');
    const name = parts[0] ?? '';
    const path = `${prefix}${name}`;
    found.set(path, { name, path, type: parts.length > 1 ? 'dir' : 'file' });
  }
  return [...found.values()];
}

async function fulfill(route: Route, status: number, data: unknown) {
  await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) });
}

async function handle(route: Route, store: Store) {
  const request = route.request();
  const url = new URL(request.url());
  const path = url.pathname;
  const auth = request.headers().authorization ?? '';
  if (path === '/user') {
    if (!auth.startsWith('Bearer ')) return fulfill(route, 401, { message: 'Bad credentials' });
    if (auth.includes('ghp_other')) return fulfill(route, 200, { login: 'octocat' });
    return fulfill(route, 200, { login: 'Ombfaruk' });
  }
  if (path === '/repos/Ombfaruk/Website') return fulfill(route, 200, { permissions: { push: true } });
  if (path === '/repos/Ombfaruk/Website/git/ref/heads/main' && request.method() === 'GET') {
    return fulfill(route, 200, { object: { sha: store.ref } });
  }
  if (path === `/repos/Ombfaruk/Website/git/commits/${store.ref}`) {
    return fulfill(route, 200, { sha: store.ref, tree: { sha: 'tree-1' } });
  }
  if (path.endsWith('/git/blobs') && request.method() === 'POST') {
    const body = request.postDataJSON() as { content: string };
    const sha = `blob-${store.blobs.size + 1}`;
    store.blobs.set(sha, body.content);
    return fulfill(route, 201, { sha });
  }
  if (path.endsWith('/git/trees') && request.method() === 'POST') {
    const body = request.postDataJSON() as { tree: { path: string; sha: string | null }[] };
    for (const item of body.tree) {
      if (!item.sha) store.files.delete(item.path);
      else store.files.set(item.path, store.blobs.get(item.sha) ?? '');
    }
    return fulfill(route, 201, { sha: 'tree-next' });
  }
  if (path.endsWith('/git/commits') && request.method() === 'POST') {
    return fulfill(route, 201, { sha: 'commit-next' });
  }
  if (path.endsWith('/git/refs/heads/main') && request.method() === 'PATCH') {
    const body = request.postDataJSON() as { sha: string };
    store.ref = body.sha;
    return fulfill(route, 200, { ref: 'refs/heads/main', object: { sha: body.sha } });
  }
  if (path.startsWith('/repos/Ombfaruk/Website/contents/')) {
    const repoPath = decodeURIComponent(path.replace('/repos/Ombfaruk/Website/contents/', ''));
    if (store.files.has(repoPath)) {
      const content = store.files.get(repoPath) ?? '';
      return fulfill(route, 200, {
        type: 'file',
        name: repoPath.split('/').pop(),
        path: repoPath,
        sha: `sha-${repoPath}`,
        size: content.length,
        encoding: 'base64',
        content,
      });
    }
    const listed = children(store, repoPath);
    if (!listed.length) return fulfill(route, 404, { message: 'Not Found' });
    return fulfill(route, 200, listed.map((item) => ({ ...item, sha: `sha-${item.path}`, size: 1 })));
  }
  return fulfill(route, 404, { message: `No mock for ${path}` });
}

async function signIn(page: Page, token = 'ghp_test') {
  await page.goto('/Website/admin/');
  await page.getByLabel('GitHub token').fill(token);
  await page.getByRole('button', { name: 'Save token' }).click();
}

const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

test('Omar can publish, edit, and delete a case study', async ({ page }) => {
  const store = createStore();
  await page.route(/api\.github\.com\//, (route) => handle(route, store));
  await signIn(page);
  await expect(page.getByRole('heading', { name: 'Case studies' })).toBeVisible();
  await expect(page.getByRole('heading', { name: /From a static menu/ })).toBeVisible();

  await page.getByRole('button', { name: 'New case study' }).click();
  await expect(page.getByRole('heading', { name: 'What have you been working on?' })).toBeVisible();
  await page.getByLabel('Cover image or video').setInputFiles({ name: 'cover.png', mimeType: 'image/png', buffer: png });
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('textbox', { name: 'Title', exact: true }).fill('Northwind onboarding');
  await page.getByRole('textbox', { name: /Outcome line/ }).fill('From a long form to a first win');
  await page.getByRole('textbox', { name: 'Client', exact: true }).fill('Northwind');
  await page.getByRole('textbox', { name: 'Role', exact: true }).fill('Product Designer (UX, UI)');
  await page.getByRole('textbox', { name: 'Timeline', exact: true }).fill('Jan 2026 to Feb 2026');
  await page.getByLabel('Add final screens').setInputFiles([
    { name: 'one.png', mimeType: 'image/png', buffer: png },
    { name: 'two.png', mimeType: 'image/png', buffer: png },
  ]);
  await page.getByRole('button', { name: 'Move screen 1 down' }).click();
  await page.locator('#story').evaluate((editor) => {
    editor.innerHTML = '<h2>Context</h2><p>Teams were dropping off after sign up.</p><h2>Results</h2><p>Prototype tests only.</p>';
    editor.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.locator('#story p').first().evaluate((paragraph) => {
    const range = document.createRange();
    range.selectNodeContents(paragraph);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  });
  await page.getByRole('button', { name: 'Bold' }).click();
  await page.getByRole('button', { name: 'Publish' }).click();
  await expect(page.getByText(/Published Northwind onboarding/)).toBeVisible();

  const markdown = Buffer.from(store.files.get('src/content/work/northwind-onboarding.md') ?? '', 'base64').toString('utf8');
  expect(markdown).toContain('title: "Northwind onboarding"');
  expect(markdown).toContain('From a long form to a first win');
  expect(markdown).toContain('draft: false');
  expect(markdown).toContain('**Teams were dropping off after sign up.**');
  expect(markdown.indexOf('two.png')).toBeLessThan(markdown.indexOf('one.png'));
  const image = [...store.files.keys()].find((path) => path.includes('cover-cover.png'));
  expect(image).toBeTruthy();
  expect(Buffer.from(store.files.get(image ?? '') ?? '', 'base64')[0]).toBe(0x89);

  await page.getByRole('button', { name: 'Edit Northwind onboarding' }).click();
  await page.getByRole('textbox', { name: /Outcome line/ }).fill('From drop off to a first win');
  await page.getByRole('button', { name: 'Save as draft' }).click();
  await expect(page.getByText(/Draft saved/)).toBeVisible();
  const draft = Buffer.from(store.files.get('src/content/work/northwind-onboarding.md') ?? '', 'base64').toString('utf8');
  expect(draft).toContain('draft: true');
  expect(draft).toContain('From drop off to a first win');
  await expect(page.getByText('Draft').first()).toBeVisible();

  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Delete Northwind onboarding' }).click();
  await expect(page.getByText(/Deleted Northwind onboarding/)).toBeVisible();
  expect(store.files.has('src/content/work/northwind-onboarding.md')).toBe(false);
  expect([...store.files.keys()].some((path) => path.includes('northwind-onboarding'))).toBe(false);
  await expect(page.getByRole('heading', { name: /From a static menu/ })).toBeVisible();
});

test('a token for another GitHub account cannot publish', async ({ page }) => {
  const store = createStore();
  await page.route(/api\.github\.com\//, (route) => handle(route, store));
  await signIn(page, 'ghp_other');
  await expect(page.getByRole('alert')).toContainText('octocat');
  await expect(page.getByRole('heading', { name: 'Case studies' })).toHaveCount(0);
});
