import { expect, test } from '@playwright/test';

test('home, case study, services, and contact render', async ({ page }) => {
  await page.goto('/Website/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText("Hello, I'm Omar");
  await expect(page.getByRole('link', { name: /From Static Lists to a Menu Owners Could Shape/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /Making habit creation easier/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /When a million dollar decision lives in seven tools/ })).toBeVisible();
  await expect(page.getByRole('link', { name: 'X' }).first()).toHaveAttribute('href', 'https://x.com/designbyomarf');
  await expect(page.getByRole('link', { name: 'LinkedIn' }).first()).toHaveAttribute('href', 'https://www.linkedin.com/in/designbyomarf/');
  await expect(page.getByRole('link', { name: 'Dribbble' }).first()).toHaveAttribute('href', 'https://dribbble.com/designbyomar');
  await expect(page.getByRole('link', { name: 'collaborate.omar@gmail.com' })).toBeVisible();
  await expect(page.locator('a[href="https://omar.figma.site"]')).toHaveCount(0);
  await expect(page.getByRole('img', { name: 'Portrait of Omar Faruk' })).toBeVisible();
  expect(await page.locator('img:not([alt])').count()).toBe(0);
  await expect(page.locator('body')).not.toContainText('Placeholder');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /omar-headshot\.jpg/);

  await page.getByRole('link', { name: /From Static Lists to a Menu Owners Could Shape/ }).click();
  await expect(page).toHaveURL(/\/Website\/work\/jiak\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('From Static Lists to a Menu Owners Could Shape');
  await expect(page.getByText('Those were goals, not results.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Screens', exact: true })).toBeVisible();
  await expect(page.getByRole('img', { name: /Jiak menu builder beside the customer view/ })).toBeVisible();
  await expect(page.getByText('Founder and CEO, Jiak Technology')).toBeVisible();
  await expect(page.locator('body')).not.toContainText('Placeholder');

  await page.goto('/Website/about/');
  await expect(page.getByRole('heading', { name: 'Services' })).toBeVisible();
  await expect(page.getByText('From $4,000')).toBeVisible();
  await expect(page.getByText('From $2,000')).toBeVisible();
  await expect(page.getByText('From $1,200')).toBeVisible();
  await expect(page.getByText('$790')).toBeVisible();
  await expect(page.getByText('Typically 4 weeks')).toHaveCount(2);
  await expect(page.getByText('Typically 2 weeks')).toBeVisible();
  await expect(page.getByText('Typically 1 week')).toBeVisible();
  await expect(page.getByText('Pricing varies by scope and requirements.')).toHaveCount(4);
  await expect(page.getByRole('heading', { name: 'Experience' })).toBeVisible();

  await page.goto('/Website/work/habit-tracker/');
  await expect(page.getByText('tested informally with 5 people').first()).toBeVisible();
  await expect(page.getByText('not measured data from my test').first()).toBeVisible();

  await page.goto('/Website/work/ynow/');
  await expect(page.getByText('40% faster').first()).toBeVisible();
  await expect(page.getByText('no live product metrics').first()).toBeVisible();
});

test('layout holds together on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/Website/');
  await expect(page.getByRole('button', { name: 'Menu' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Work', exact: true })).toBeHidden();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  expect(overflow).toBe(false);
  await page.getByRole('button', { name: 'Menu' }).click();
  await expect(page.getByRole('link', { name: 'Work', exact: true })).toBeVisible();
});

test('admin is not indexed and the sitemap lists the work', async ({ page }) => {
  await page.goto('/Website/admin/');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  const sitemap = await page.request.get('/Website/sitemap-index.xml');
  expect(sitemap.ok()).toBe(true);
  const index = await sitemap.text();
  expect(index).not.toContain('/admin');
  const nested = index.match(/sitemap-0\.xml/);
  expect(nested).not.toBeNull();
  const child = await page.request.get('/Website/sitemap-0.xml');
  const body = await child.text();
  expect(body).toContain('/Website/work/jiak/');
  expect(body).not.toContain('/admin');
});
