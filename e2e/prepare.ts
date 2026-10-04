// Builds the fixture Collection with the real build, for the browser tests.
import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';

const root = resolve(import.meta.dirname, '../.scratch/e2e');
rmSync(root, { recursive: true, force: true });
const content = resolve(root, 'content');
cpSync(resolve(import.meta.dirname, '../test/fixtures/good'), content, { recursive: true });
mkdirSync(resolve(root, 'releases'), { recursive: true });
// The browser tests' own layout: a Tour switcher on top, and no zoom Module.
writeFileSync(
  resolve(content, 'collection.yml'),
  'title: Two maps\ntours: [river, harbour]\ncredits: Public-domain test images.\nlayout:\n  panel: [scene-text, scene-list, prev-next]\n  top: [tour-switcher]\n  top-right: [share, fullscreen]\n',
);

// A gradient with a grid, so a moved or missing tile is visible in a screenshot.
const grid = (w: number, h: number) =>
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><defs><linearGradient id="g"><stop offset="0" stop-color="#2a6"/><stop offset="1" stop-color="#26a"/></linearGradient>` +
      `<pattern id="p" width="100" height="100" patternUnits="userSpaceOnUse"><path d="M100 0H0V100" fill="none" stroke="#fff" stroke-width="2"/></pattern></defs>` +
      `<rect width="100%" height="100%" fill="url(#g)"/><rect width="100%" height="100%" fill="url(#p)"/></svg>`,
  );
await sharp(grid(2000, 1500)).tiff().toFile(resolve(root, 'releases/river.tif'));
await sharp(grid(600, 400)).jpeg().toFile(resolve(content, 'tours/harbour/harbour.jpg'));

execFileSync(
  'node',
  ['--experimental-strip-types', '--no-warnings', resolve(import.meta.dirname, '../src/build/main.ts'), '--content', content, '--out', resolve(root, 'site'), '--base-url', 'http://localhost:4173/'],
  { env: { ...process.env, POSTERFORKER_RELEASE_DIR: resolve(root, 'releases'), GITHUB_REPOSITORY: 'maker/col', GITHUB_REF_NAME: 'main' }, stdio: 'inherit' },
);
