import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { parseHTML } from 'linkedom';
import { describe, expect, it } from 'vitest';
import { buildCommitPlan, buildDeletePlan } from '../../src/lib/commitPlan';
import { htmlToMarkdown } from '../../src/lib/htmlToMarkdown';
import { markdownToSafeHtml, renderMarkdown } from '../../src/lib/renderMarkdown';
import { splitCaseSections } from '../../src/lib/sections';
import { isValidSlug, parseCaseStudy, safeFileName, serializeCaseStudy, slugify, type CaseStudy } from '../../src/lib/caseStudy';
import { publishedWork } from '../../src/lib/work';

function markdownFrom(html: string) {
  const { document } = parseHTML(`<div id="root">${html}</div>`);
  const root = document.getElementById('root');
  if (!root) throw new Error('missing root');
  return htmlToMarkdown(root);
}

const sample = (): CaseStudy => ({
  title: "Note: it's ready",
  outcome: 'From a long form to a first win',
  client: 'Northwind',
  role: 'Product Designer (UX, UI)',
  timeline: 'Jan 2026 to Feb 2026',
  tags: ['SaaS', 'Onboarding'],
  cover: '/uploads/northwind/cover.png',
  coverAlt: 'Cover of the onboarding flow',
  coverType: 'image',
  gallery: [{ src: '/uploads/northwind/home.png', alt: 'Home screen', caption: 'Home' }],
  draft: false,
  order: 4,
  quotes: [{ text: "I'd ship this.", by: 'Founder, Northwind' }],
  body: '## Context\n\nHello **there**.',
});

describe('case study files', () => {
  it('round trips the fields Omar edits', () => {
    const parsed = parseCaseStudy(serializeCaseStudy(sample()));
    expect(parsed).toEqual({ ...sample(), body: sample().body.trim() });
  });

  it('builds safe slugs and file names', () => {
    expect(slugify('Jiak Digital Menu')).toBe('jiak-digital-menu');
    expect(slugify('  Hello, World! ')).toBe('hello-world');
    expect(slugify('')).toBe('case-study');
    expect(isValidSlug('habit-tracker')).toBe(true);
    expect(isValidSlug('../secret')).toBe(false);
    expect(safeFileName('../../My Cover.PNG')).toBe('my-cover.png');
  });

  it('keeps new screens, drops removed ones, and rewrites story images', () => {
    const plan = buildCommitPlan({
      slug: 'northwind',
      study: { ...sample(), cover: '', gallery: [], body: '![Desk](/uploads/__SLUG__/inline-desk.png)' },
      cover: { filename: 'cover.png', bytes: new Uint8Array([1, 2, 3]), alt: 'Cover', kind: 'image' },
      gallery: [
        { filename: 'home.png', bytes: new Uint8Array([4]), alt: 'Home screen', caption: 'Home', kind: 'image' },
        { path: '/uploads/northwind/kept.png', alt: 'Kept', kind: 'image' },
      ],
      inline: [{ tokenPath: '/uploads/__SLUG__/inline-desk.png', filename: 'inline-desk.png', bytes: new Uint8Array([5]) }],
      existingUploadPaths: [
        'public/uploads/northwind/kept.png',
        'public/uploads/northwind/old.png',
        'public/uploads/other/skip.png',
      ],
    });
    expect(plan.deletions).toEqual(['public/uploads/northwind/old.png']);
    expect(plan.markdown).toContain('draft: false');
    expect(plan.markdown).toContain('/uploads/northwind/inline-desk.png');
    expect(plan.markdown).not.toContain('__SLUG__');
    expect(plan.files.map((file) => file.path)).toContain('src/content/work/northwind.md');
    expect(plan.files.map((file) => file.path)).not.toContain('public/uploads/northwind/kept.png');
    expect(plan.study.gallery.map((item) => item.alt)).toEqual(['Home screen', 'Kept']);
  });

  it('plans a delete for the case study and its images only', () => {
    const plan = buildDeletePlan('jiak', [
      'public/uploads/jiak/cover.svg',
      'public/uploads/habit/cover.svg',
    ]);
    expect(plan.deletions).toEqual(['src/content/work/jiak.md', 'public/uploads/jiak/cover.svg']);
    expect(plan.files).toEqual([]);
  });

  it('splits the story so results stay after the screens', () => {
    const sections = splitCaseSections('## Context\n\nHi\n\n## Process\n\nWork\n\n## Results\n\nDone');
    expect(sections.map((section) => section.heading)).toEqual(['Context', 'Process', 'Results']);
    expect(sections[2]?.isResults).toBe(true);
    expect(sections[1]?.isResults).toBe(false);
  });

  it('renders markdown without scripts and keeps upload images on the site path', () => {
    const html = renderMarkdown('Hello <script>alert(1)</script>\n\n![Desk](/uploads/jiak/cover.svg)\n\n[bad](javascript:alert(1))', '/Website/');
    expect(html).not.toContain('<script');
    expect(html).not.toContain('javascript:');
    expect(html).toContain('src="/Website/uploads/jiak/cover.svg"');
    expect(html).toContain('alt="Desk"');
  });

  it('turns the editor back into markdown', () => {
    expect(markdownFrom('<h2>Context</h2><p>Hello <strong>there</strong>.</p><ul><li>One</li><li>Two</li></ul>')).toBe(
      '## Context\n\nHello **there**.\n\n- One\n- Two',
    );
    expect(markdownFrom('<p><img alt="Desk" data-path="/uploads/__SLUG__/desk.png" src="blob:1"></p>')).toBe(
      '![Desk](/uploads/__SLUG__/desk.png)',
    );
  });

  it('keeps seeded stories intact through the editor', () => {
    for (const name of ['jiak.md', 'habit-tracker.md', 'ynow.md']) {
      const study = parseCaseStudy(readFileSync(join('src/content/work', name), 'utf8'));
      const next = markdownFrom(markdownToSafeHtml(study.body));
      expect(next).toContain('## Hook');
      expect(next).toContain('## Honest outcomes');
    }
  });

  it('publishes only the three seeded studies in order', () => {
    const entries = ['habit-tracker.md', 'ynow.md', 'jiak.md'].map((name) => {
      const study = parseCaseStudy(readFileSync(join('src/content/work', name), 'utf8'));
      return { data: study };
    });
    expect(publishedWork(entries).map((entry) => entry.data.title)).toEqual([
      'From Static Lists to a Menu Owners Could Shape',
      'Making habit creation easier, one small step at a time',
      'When a million dollar decision lives in seven tools',
    ]);
  });

  it('does not treat Jiak menu goals as measured results', () => {
    const jiak = parseCaseStudy(readFileSync('src/content/work/jiak.md', 'utf8'));
    expect(jiak.body).toContain('Those were goals, not results.');
    expect(jiak.body).toContain('4,300');
    expect(jiak.body).not.toContain('14,000');
    expect(jiak.body).toContain('not a measured result of this Digital Menu study');
    expect(jiak.quotes.map((quote) => quote.by)).toEqual([
      'Founder and CEO, Jiak Technology',
      'Head of Engineering, Jiak Technology',
    ]);
    const habit = parseCaseStudy(readFileSync('src/content/work/habit-tracker.md', 'utf8'));
    expect(habit.body).toContain('5 people');
    expect(habit.body).toContain('not measured data from my test');
    const ynow = parseCaseStudy(readFileSync('src/content/work/ynow.md', 'utf8'));
    expect(ynow.body).toContain('no live product metrics');
    expect(ynow.body).toContain('40% faster');
    expect(ynow.body).toContain('Global Chief Executive');
  });
});

describe('copy safety', () => {
  it('does not invent a password, a phone number, or dash punctuation', () => {
    const files = walk('src').filter((file) => /\.(md|ts|astro|css|mjs)$/.test(file));
    files.push('README.md');
    const text = files.map((file) => readFileSync(file, 'utf8')).join('\n');
    expect(text).not.toContain('Omf1');
    expect(text).not.toContain('633490');
    expect(text).not.toContain('—');
    expect(text).not.toContain('–');
  });
});

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return walk(path);
    return [path];
  });
}
