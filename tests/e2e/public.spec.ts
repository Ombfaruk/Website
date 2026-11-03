import { expect, test } from '@playwright/test';

test('home, case study, services, and contact render', async ({ page }) => {
  await page.goto('/Website/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Users sign up, then drop off.');
  await expect(page.getByRole('link', { name: /From a static menu to one owners can update/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /From a cluttered habit form/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /From scattered reviews to one place to decide/ })).toBeVisible();
  await expect(page.getByText('From $4,000')).toBeVisible();
  await expect(page.getByText('From $2,000')).toBeVisible();
  await expect(page.getByText('From $1,200')).toBeVisible();
  await expect(page.getByText('$790')).toBeVisible();
  await expect(page.getByText('Typically 4 weeks')).toHaveCount(2);
  await expect(page.getByText('Typically 2 weeks')).toBeVisible();
  await expect(page.getByText('Typically 1 week')).toBeVisible();
  await expect(page.getByText('Pricing varies by scope and requirements')).toHaveCount(4);
  await expect(page.getByRole('link', { name: 'collaborate.omar@gmail.com' })).toBeVisible();
  await expect(page.getByRole('link', { name: /LinkedIn/ }).first()).toHaveAttribute('href', 'https://www.linkedin.com/in/designbyomarf/');
  await expect(page.getByRole('link', { name: /Dribbble/ }).first()).toHaveAttribute('href', 'https://dribbble.com/designbyomar');
  await expect(page.getByRole('link', { name: /Current portfolio/ }).first()).toHaveAttribute('href', 'https://omar.figma.site');
  await expect(page.getByRole('img', { name: 'Portrait of Omar Faruk' })).toBeVisible();
  expect(await page.locator('img:not([alt])').count()).toBe(0);
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /omar-headshot\.jpg/);

  await page.getByRole('link', { name: /From a static menu to one owners can update/ }).click();
  await expect(page).toHaveURL(/\/Website\/work\/jiak\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('From a static menu to one owners can update');
  await expect(page.getByText('Treat those as goals, not as measured results.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Final screens' })).toBeVisible();
  await expect(page.getByRole('img', { name: /Placeholder cover for the Jiak digital menu/ })).toBeVisible();
  await expect(page.getByText('Founder and CEO, Jiak Technology')).toBeVisible();

  await page.goto('/Website/work/habit-tracker/');
  await expect(page.getByText('a few people')).toBeVisible();
  await expect(page.getByText('not a measured result')).toBeVisible();

  await page.goto('/Website/work/ynow/');
  await expect(page.getByText('40% faster')).toBeVisible();
  await expect(page.getByText('live platform')).toBeVisible();
});

test('layout holds together on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/Website/');
  await page.getByRole('button', { name: 'Menu' }).click();
  await page.getByRole('link', { name: 'Services' }).click();
  await expect(page.locator('#services')).toBeInViewport();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  expect(overflow).toBe(false);
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
