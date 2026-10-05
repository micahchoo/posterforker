import { expect, test, type Page } from '@playwright/test';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { CONTENT_FILE } from '../src/core/names.ts';
import { fakeGitHub } from '../test/edit/fake-github.ts';

const content = resolve(import.meta.dirname, '../.scratch/e2e/content');
const walk = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? walk(join(dir, d.name)) : [join(dir, d.name)]));
const contentFiles = () =>
  Object.fromEntries(
    walk(content)
      .map((p) => relative(content, p).split(sep).join('/'))
      .filter((p) => CONTENT_FILE.test(p))
      .map((p) => [p, readFileSync(join(content, p), 'utf8')]),
  );

/** A Scene's own button in the list: "2 The mouth", not its Move up / Move down buttons. */
const sceneButton = (page: Page, title: string) =>
  page.getByRole('list', { name: 'Scenes' }).getByRole('button', { name: new RegExp(`^\\d+\\s+${title}$`) });

/** Serve api.github.com from the fake, and arrive signed in, as the relay would send us back. */
async function signedIn(page: Page) {
  const gh = fakeGitHub('maker/col', contentFiles());
  await page.route('https://api.github.com/**', async (route) => {
    const r = route.request();
    const res = await gh.fetch(r.url(), { method: r.method(), headers: r.headers(), ...(r.postData() ? { body: r.postData()! } : {}) });
    await route.fulfill({ status: res.status, body: await res.text(), headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' } });
  });
  await page.addInitScript(() => sessionStorage.setItem('pf-nonce', 'n1'));
  await page.goto('./edit/#pf-token=t0ken&pf-nonce=n1');
  await expect(page.getByText('Signed in')).toBeVisible();
  return gh;
}

test('a Maker edits everything and saves once, without leaving the page', async ({ page }) => {
  const gh = await signedIn(page);
  const scenes = page.getByRole('list', { name: 'Scenes' });
  await expect(sceneButton(page, 'The source')).toBeVisible();

  // Move a Scene's box.
  await sceneButton(page, 'The mouth').click();
  const box = page.getByRole('group', { name: 'Box of The mouth' });
  const b = (await box.boundingBox())!;
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2 - 40, b.y + b.height / 2 - 30, { steps: 6 });
  await page.mouse.up();

  // Rewrite another.
  await sceneButton(page, 'The source').click();
  await page.getByLabel('Title').fill('The spring');
  await page.getByLabel('Words').fill('Where the **water** starts.');
  await expect(page.getByTestId('reader-preview').locator('strong')).toHaveText('water');

  // Add a third and put it first.
  await page.getByRole('button', { name: 'Add a Scene' }).click();
  await expect(page.getByLabel('Title')).toBeFocused();
  await page.keyboard.type('The delta');
  await page.getByRole('button', { name: 'Move The delta up' }).click();
  await page.getByRole('button', { name: 'Move The delta up' }).click();
  await expect(sceneButton(page, 'The delta')).toHaveAccessibleName('1 The delta');

  // A new look, and Share moved to another corner.
  await page.getByRole('tab', { name: 'Look' }).click();
  await page.getByRole('radio', { name: /Ink/ }).check();
  await page.getByRole('tab', { name: 'Layout' }).click();
  await page.getByRole('button', { name: 'Share' }).dragTo(page.getByRole('group', { name: 'Bottom left' }));

  await expect(page.getByRole('button', { name: /^Save/ })).toContainText('6');
  await page.getByRole('button', { name: /^Save/ }).click();
  await expect(page.getByText(/Publishing/)).toBeVisible();

  const files = gh.files();
  expect(gh.calls.filter((c) => c.includes('/git/commits') && c.startsWith('POST'))).toHaveLength(1);
  expect(files['tours/river/tour.yml']).toContain('scenes: [ the-delta, "01", "02" ]');
  expect(files['tours/river/scenes/the-delta.md']).toContain('title: "The delta"');
  expect(files['tours/river/scenes/01.md']).toContain('title: "The spring"');
  expect(files['tours/river/scenes/02.md']).not.toContain('x: 1200, y: 900');
  expect(files['theme.yml']).toContain('preset: ink');
  expect(files['collection.yml']).toMatch(/bottom-left: \[ share \]/);

  gh.finishRun('success');
  await expect(page.getByRole('link', { name: /Live/ })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole('button', { name: /^Save/ })).toBeDisabled();
});

test('unsaved work survives a reload, and Undo takes back the last step', async ({ page }) => {
  await signedIn(page);
  await sceneButton(page, 'The source').click();
  await page.getByLabel('Title').fill('Kept');
  await page.reload();
  await expect(sceneButton(page, 'Kept')).toBeVisible();
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(sceneButton(page, 'The source')).toBeVisible();
});

test('signed out, the editor still works and offers both ways to save', async ({ page }) => {
  await page.goto('./edit/');
  await expect(page.getByRole('button', { name: 'Sign in with GitHub to save' })).toBeVisible();
  await sceneButton(page, 'The source').click();
  await page.getByLabel('Title').fill('The spring');
  await page.getByRole('button', { name: 'Save without signing in' }).click();
  const dialog = page.getByRole('dialog', { name: 'Save without signing in' });
  await expect(dialog.getByText('tours/river/scenes/01.md')).toBeVisible();
  await expect(dialog.getByRole('link', { name: 'Open on GitHub' })).toHaveAttribute('href', 'https://github.com/maker/col/edit/main/tours/river/scenes/01.md');
});
