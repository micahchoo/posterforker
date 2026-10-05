import { describe, expect, it } from 'vitest';
import { pixelRect } from '../../src/core/geometry.ts';
import { readScene, writeScene } from '../../src/core/source.ts';
import { fileLink } from '../../src/edit/links.ts';

const repo = { repository: 'maker/col', branch: 'main' };

describe('saving without signing in', () => {
  it('opens GitHub’s new-file screen with a Scene the build accepts', () => {
    const text = writeScene({ title: 'A bend: "the elbow"', region: pixelRect({ x: 10.6, y: 20, w: 300, h: 200 }), words: 'Slow water.\n\nDeep.' });
    const link = new URL(fileLink(repo, { path: 'tours/river/scenes/a-bend.md', text }, false));
    expect(link.origin + link.pathname).toBe('https://github.com/maker/col/new/main');
    expect(link.searchParams.get('filename')).toBe('tours/river/scenes/a-bend.md');
    expect(readScene('a-bend.md', link.searchParams.get('value')!)).toEqual({
      ok: true,
      value: { title: 'A bend: "the elbow"', region: { x: 11, y: 20, w: 300, h: 200 }, html: '<p>Slow water.</p>\n<p>Deep.</p>\n' },
    });
  });

  it('opens GitHub’s editor on a file that exists, and its delete screen on a removed one', () => {
    expect(fileLink(repo, { path: 'theme.yml', text: 'preset: ink\n' }, true)).toBe('https://github.com/maker/col/edit/main/theme.yml');
    expect(fileLink(repo, { path: 'tours/river/scenes/01.md', delete: true }, true)).toBe('https://github.com/maker/col/delete/main/tours/river/scenes/01.md');
  });
});
