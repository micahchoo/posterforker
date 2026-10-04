import { execFile } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import sharp from 'sharp';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const run = promisify(execFile);
const MAIN = resolve('src/build/main.ts');
const FIXTURES = resolve('test/fixtures');
const work = mkdtempSync(join(tmpdir(), 'pf-build-'));

async function build(content: string, env: Record<string, string> = {}) {
  env = { GITHUB_STEP_SUMMARY: '', ...env };
  const out = join(work, `site-${Math.random().toString(36).slice(2)}`);
  try {
    const r = await run('node', ['--experimental-strip-types', '--no-warnings', MAIN, '--content', content, '--out', out, '--base-url', 'https://maker.github.io/col/'], {
      env: { ...process.env, ...env },
    });
    return { code: 0, stdout: r.stdout, out };
  } catch (e) {
    const err = e as { code: number; stdout: string };
    return { code: err.code, stdout: err.stdout, out };
  }
}

const json = (path: string) => JSON.parse(readFileSync(path, 'utf8'));

let good: string;
let releases: string;

beforeAll(async () => {
  good = join(work, 'good');
  cpSync(join(FIXTURES, 'good'), good, { recursive: true });
  releases = join(work, 'releases');
  const img = (w: number, h: number) =>
    sharp({ create: { width: w, height: h, channels: 3, background: { r: 30, g: 90, b: 160 } } });
  mkdirSync(releases, { recursive: true });
  await img(2000, 1500).tiff().toFile(join(releases, 'river.tif'));
  await img(600, 400).jpeg().toFile(join(good, 'tours/harbour/harbour.jpg'));
});

afterAll(() => rmSync(work, { recursive: true, force: true }));

describe('build', () => {
  it('fails with a GitHub annotation on the bad Scene', async () => {
    const r = await build(join(FIXTURES, 'bad'));
    expect(r.code).toBe(1);
    expect(r.stdout).toContain('::error file=tours/a/scenes/04.md,line=3::region.w is required');
  });

  it('reports every problem in one run, not only the first', async () => {
    const r = await build(join(FIXTURES, 'bad'));
    expect(r.stdout).toContain('::error file=tours/a/tour.yml,line=2::image.file "a.jpg" is not in tours/a/');
  });

  it('names a Release asset that does not exist', async () => {
    const r = await build(good, { POSTERFORKER_RELEASE_DIR: join(work, 'empty') });
    expect(r.code).toBe(1);
    expect(r.stdout).toContain('::error file=tours/river/tour.yml,line=2::image.release "river.tif" is not attached to any Release');
  });

  it('refuses a Theme a Reader could not read', async () => {
    const dir = join(work, 'low-contrast');
    cpSync(good, dir, { recursive: true });
    writeFileSync(join(dir, 'theme.yml'), 'preset: neutral\ncolors:\n  text: "#cccccc"\n');
    const r = await build(dir, { POSTERFORKER_RELEASE_DIR: releases });
    expect(r.code).toBe(1);
    expect(r.stdout).toContain('::error file=theme.yml,line=2::colors: text on background is 1.45:1, needs 4.5:1');
  });

  it('tells the Maker where the Collection and /edit are, on the run page', async () => {
    const summary = join(work, 'summary.md');
    const r = await build(good, { POSTERFORKER_RELEASE_DIR: releases, GITHUB_STEP_SUMMARY: summary });
    expect(r.code).toBe(0);
    expect(r.stdout).toContain('::notice::Built 2 Tours with 3 Scenes. Edit Scenes and the Theme at https://maker.github.io/col/edit/');
    const text = readFileSync(summary, 'utf8');
    expect(text).toContain('[https://maker.github.io/col/](https://maker.github.io/col/)');
    expect(text).toContain('[https://maker.github.io/col/edit/](https://maker.github.io/col/edit/)');
  }, 30_000);

  it('writes manifests, tiles and the Collection for good content', async () => {
    const r = await build(good, { POSTERFORKER_RELEASE_DIR: releases });
    expect(r.code).toBe(0);

    const m = json(join(r.out, 'tours/river/manifest.json'));
    const canvas = m.items[0];
    expect(canvas).toMatchObject({ width: 2000, height: 1500 });
    expect(canvas.annotations[0].items.map((a: { target: string }) => a.target)).toEqual([
      `${canvas.id}#xywh=100,200,400,300`,
      `${canvas.id}#xywh=1200,900,500,400`,
    ]);
    const service = canvas.items[0].items[0].body.service[0].id;
    expect(service).toBe('https://maker.github.io/col/tiles/river');

    expect(json(join(r.out, 'tiles/river/info.json'))).toMatchObject({ width: 2000, height: 1500, type: 'ImageService3' });
    const full = canvas.items[0].items[0].body.id.replace('https://maker.github.io/col/', '');
    expect(existsSync(join(r.out, full))).toBe(true);

    const c = json(join(r.out, 'collection.json'));
    expect(c.title).toBe('Two maps');
    expect(c.tours.map((t: { id: string }) => t.id)).toEqual(['river', 'harbour']);
    expect(c.tours[0]).toMatchObject({ title: 'The river', manifest: 'tours/river/manifest.json', tiles: 'tiles/river' });
    expect(c.layout['top-right']).toEqual(['share', 'fullscreen']);
  }, 30_000);
});
