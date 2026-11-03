import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const projects = {
  jiak: { fill: '#e7e3da', label: 'Jiak' },
  habit: { fill: '#e2e6eb', label: 'Habit flow' },
  ynow: { fill: '#e3e6df', label: 'YNOW' },
};

const frames = [
  ['jiak', 'cover', 'Digital menu', 'Cover'],
  ['jiak', 'menu-builder', 'Menu builder', 'Final screen'],
  ['jiak', 'customer-menu', 'Customer live menu', 'Final screen'],
  ['jiak', 'menu-list', 'All menus in one place', 'Final screen'],
  ['jiak', 'analytics', 'Analytics and usage', 'Final screen'],
  ['jiak', 'tables', 'Table management', 'Final screen'],
  ['jiak', 'business-setup', 'Business setup', 'Final screen'],
  ['habit', 'cover', 'Habit creation flow', 'Cover'],
  ['habit', 'home', 'Proposed home', 'Final screen'],
  ['habit', 'habit-list', 'Proposed habit list', 'Final screen'],
  ['habit', 'step-1', 'Step 1, the basics', 'Final screen'],
  ['habit', 'step-2', 'Step 2, the target', 'Final screen'],
  ['habit', 'step-3', 'Step 3, tracking', 'Final screen'],
  ['habit', 'congrats', 'Congrats screen', 'Final screen'],
  ['ynow', 'cover', 'Application review', 'Cover'],
  ['ynow', 'dashboard', 'Dashboard', 'Final screen'],
  ['ynow', 'progress', 'Applicant progress', 'Final screen'],
  ['ynow', 'review', 'Collaborative review', 'Final screen'],
  ['ynow', 'decision', 'Independent decision', 'Final screen'],
  ['ynow', 'summary', 'Final evaluation', 'Final screen'],
  ['ynow', 'applicant-site', 'Applicant website', 'Final screen'],
  ['ynow', 'cv-upload', 'CV upload', 'Final screen'],
  ['ynow', 'offer', 'Offer letter', 'Final screen'],
];

function escapeXml(value) {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char]);
}

for (const [project, name, title, kind] of frames) {
  const tone = projects[project];
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1200" viewBox="0 0 1600 1200" role="img" aria-label="Placeholder. ${escapeXml(title)}. Omar will replace this image.">
  <rect width="1600" height="1200" fill="${tone.fill}"/>
  <rect x="96" y="96" width="1408" height="1008" fill="none" stroke="#1a1a1a" stroke-width="3" stroke-dasharray="14 12"/>
  <text x="800" y="500" text-anchor="middle" font-family="sans-serif" font-size="28" font-weight="600" letter-spacing="3" fill="#5c5c5c">${escapeXml(kind.toUpperCase())}</text>
  <text x="800" y="575" text-anchor="middle" font-family="sans-serif" font-size="64" font-weight="700" fill="#1a1a1a">Placeholder</text>
  <text x="800" y="650" text-anchor="middle" font-family="sans-serif" font-size="36" fill="#1a1a1a">${escapeXml(tone.label)} · ${escapeXml(title)}</text>
  <text x="800" y="720" text-anchor="middle" font-family="sans-serif" font-size="28" fill="#3f3f3f">Omar will replace this image</text>
</svg>
`;
  const path = join('public', 'uploads', project, `${name}.svg`);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, svg);
}
