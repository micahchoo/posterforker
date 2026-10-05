import { expect, test } from '@playwright/test';

const previewVar = (page: import('@playwright/test').Page, name: string) =>
  page.frames()[1]!.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n), name);

test('the Look panel previews the real viewer and never keeps an unreadable colour', async ({ page }) => {
  await page.goto('./edit/');
  await page.getByRole('tab', { name: 'Look' }).click();
  const preview = page.frameLocator('iframe[title="Preview of your Collection"]');
  await expect(preview.getByRole('heading', { level: 2, name: 'The river' })).toBeVisible();

  await page.getByRole('radio', { name: /Lantern/ }).check();
  await expect.poll(() => previewVar(page, '--pf-background')).toBe('#1d1a16');

  // Every accent offered stands out on this look.
  const offered = await page.getByRole('button', { name: /^Accent colour/ }).count();
  expect(offered).toBeGreaterThan(2);

  await page.getByText('Choose exact colours').click();
  await page.getByLabel('Text colour').fill('#2a251f');
  await expect(page.getByText(/^Not kept — text on background/)).toBeVisible();
  await expect.poll(() => previewVar(page, '--pf-text')).toBe('#f3ead9');
});

test('the Layout board moves a Module by plain name, and the preview follows', async ({ page }) => {
  await page.goto('./edit/');
  await page.getByRole('tab', { name: 'Layout' }).click();
  const preview = page.frameLocator('iframe[title="Preview of your Collection"]');
  await expect(preview.getByRole('button', { name: 'Zoom in' })).toHaveCount(0);
  await expect(page.getByText('scene-text')).toHaveCount(0);

  await page.getByRole('button', { name: 'Zoom buttons' }).click();
  await page.getByRole('group', { name: 'Bottom right' }).getByRole('button', { name: 'Put it here' }).click();
  await expect(preview.getByRole('button', { name: 'Zoom in' })).toBeVisible();
});
