import { expect, test } from '@playwright/test';

test('a Reader walks the Scenes, and a shared link reopens the same Scene', async ({ page }) => {
  const tiles: string[] = [];
  page.on('response', (r) => {
    if (r.url().includes('/tiles/river/') && r.url().endsWith('default.jpg') && r.ok()) tiles.push(r.url());
  });

  await page.goto('./');
  await expect(page.getByRole('heading', { level: 2, name: 'The river' })).toBeVisible();
  await expect(page.getByText('2 Scenes. Press Next, or explore the Image.')).toBeVisible();
  await expect.poll(() => tiles.length).toBeGreaterThan(0);

  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('heading', { level: 2, name: 'The source' })).toBeVisible();
  await expect(page).toHaveURL(/#tour=river&scene=01$/);

  await page.getByRole('button', { name: /Next/ }).click();
  await expect(page.getByRole('heading', { level: 2, name: 'The mouth' })).toBeVisible();
  await expect(page.getByText('Where it meets the sea.')).toBeVisible();
  await expect(page).toHaveURL(/#tour=river&scene=02$/);

  await page.reload();
  await expect(page.getByRole('heading', { level: 2, name: 'The mouth' })).toBeVisible();
});

test('the Tour switcher opens the second Tour, and its link names it', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'The harbour' }).click();
  await expect(page.getByRole('heading', { level: 2, name: 'The harbour' })).toBeVisible();
  await expect(page).toHaveURL(/#tour=harbour$/);
  await page.keyboard.press('n');
  await expect(page.getByRole('heading', { level: 2, name: 'The pier' })).toBeVisible();
});

test('Modules sit in the Slots collection.yml names', async ({ page }) => {
  await page.goto('./');
  const share = page.getByRole('button', { name: 'Share this view' });
  const box = (await share.boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(box.x).toBeGreaterThan(viewport.width / 2);
  expect(box.y).toBeLessThan(viewport.height / 4);
  // The fixture's layout leaves zoom out, so it is not on the page.
  await expect(page.getByRole('button', { name: 'Zoom in' })).toHaveCount(0);
});

test('on a phone the panel is a bottom sheet', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 740 });
  await page.goto('./');
  const panel = page.getByRole('complementary', { name: 'About this Tour' });
  await expect(panel).toBeVisible();
  const box = (await panel.boundingBox())!;
  expect(Math.round(box.y + box.height)).toBe(740);
  expect(box.width).toBe(375);
});
