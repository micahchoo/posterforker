import { expect, test } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { cpSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const e2e = resolve(import.meta.dirname, '../.scratch/e2e');

test('a Scene drawn in the picker reaches the Tour after the next build', async ({ page }) => {
  await page.goto('./edit/');
  const image = page.getByLabel('The Image of The river');
  await expect(page.locator('.pf-existing')).toHaveCount(2);

  const box = (await image.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.3);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.75, box.y + box.height * 0.5, { steps: 8 });
  await page.mouse.up();
  await expect(page.getByText(/^Box: x \d+, y \d+, \d+ × \d+ pixels$/)).toBeVisible();

  await page.getByLabel('Title').fill('The bend');
  await page.getByLabel('Words').fill('Slow water.');
  await expect(page.getByText('This becomes tours/river/scenes/03.md.')).toBeVisible();

  const href = (await page.getByRole('link', { name: 'Commit this Scene on GitHub' }).getAttribute('href'))!;
  const link = new URL(href);
  expect(link.origin + link.pathname).toBe('https://github.com/maker/col/new/main');
  expect(link.searchParams.get('filename')).toBe('tours/river/scenes/03.md');

  // What GitHub would commit, built the way the Action builds it, into a site of its own.
  const content = resolve(e2e, 'content-round-trip');
  rmSync(content, { recursive: true, force: true });
  cpSync(resolve(e2e, 'content'), content, { recursive: true });
  writeFileSync(resolve(content, link.searchParams.get('filename')!), link.searchParams.get('value')!);
  execFileSync('node', ['--experimental-strip-types', '--no-warnings', resolve('src/build/main.ts'), '--content', content, '--out', resolve(e2e, 'site/round-trip'), '--base-url', 'http://localhost:4173/round-trip/'], {
    env: { ...process.env, POSTERFORKER_RELEASE_DIR: resolve(e2e, 'releases') },
  });

  await page.goto('./round-trip/#tour=river&scene=03');
  await expect(page.getByRole('heading', { level: 2, name: 'The bend' })).toBeVisible();
  await expect(page.getByText('Slow water.')).toBeVisible();
});

test('the Theme editor refuses faint text and previews the real viewer', async ({ page }) => {
  await page.goto('./edit/');
  await page.getByRole('tab', { name: 'Theme' }).click();
  const preview = page.frameLocator('iframe[title="Preview of your Collection"]');
  await expect(preview.getByRole('heading', { level: 2, name: 'The river' })).toBeVisible();

  await page.getByLabel('Text colour').fill('#cccccc');
  await expect(page.getByText(/^Too faint: text on background/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Copy' })).toBeDisabled();
  const textVar = () => page.frames()[1]!.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--pf-text'));
  await expect.poll(textVar).toBe('#cccccc');

  await page.getByLabel('With character').check();
  await expect(page.getByText(/^Too faint/)).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Copy' })).toBeEnabled();
  await expect.poll(() => page.frames()[1]!.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--pf-background'))).toBe('#1d1a16');
  await expect(page.locator('pre')).toHaveText('preset: character\n');
});

test('the Layout editor moves a Module, and the preview follows', async ({ page }) => {
  await page.goto('./edit/');
  await page.getByRole('tab', { name: 'Layout' }).click();
  const preview = page.frameLocator('iframe[title="Preview of your Collection"]');
  await expect(preview.getByRole('button', { name: 'Zoom in' })).toHaveCount(0);
  await page.getByLabel('Slot for zoom').selectOption('bottom-right');
  await expect(preview.getByRole('button', { name: 'Zoom in' })).toBeVisible();
  await expect(page.locator('pre')).toContainText('bottom-right: [zoom]');
});
