import { describe, expect, it } from 'vitest';
import { readScene, readYamlFile } from '../../src/core/source.ts';
import { CollectionFile } from '../../src/core/schema.ts';

const scene = (front: string, body = 'Words.') => `---\n${front}\n---\n${body}\n`;

describe('readScene', () => {
  it('reads front matter and renders the body', () => {
    const r = readScene('tours/a/scenes/01.md', scene('title: The river\nregion: { x: 1, y: 2, w: 3, h: 4 }'));
    expect(r).toEqual({
      ok: true,
      value: { title: 'The river', region: { x: 1, y: 2, w: 3, h: 4 }, html: '<p>Words.</p>\n' },
    });
  });

  it('names the file, the line and the field when a key is missing', () => {
    const r = readScene('scenes/04.md', scene('title: The river\nregion: { x: 1, y: 2, h: 4 }'));
    expect(r).toEqual({
      ok: false,
      problems: [{ file: 'scenes/04.md', line: 3, message: 'region.w is required' }],
    });
  });

  it('points at the bad value itself', () => {
    const r = readScene('s.md', scene('title: A\nregion:\n  x: left\n  y: 2\n  w: 3\n  h: 4'));
    expect(r).toEqual({ ok: false, problems: [{ file: 's.md', line: 4, message: 'region.x must be a number' }] });
  });

  it('refuses a file with no front matter', () => {
    const r = readScene('s.md', 'just words');
    expect(r).toEqual({
      ok: false,
      problems: [{ file: 's.md', line: 1, message: 'a Scene starts with front matter between two --- lines' }],
    });
  });

  it('reports YAML syntax errors at their line', () => {
    const r = readScene('s.md', scene('title: A\nregion: { x: 1'));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.problems[0]).toMatchObject({ file: 's.md', line: 3 });
  });
});

describe('readYamlFile', () => {
  it('refuses an unknown Module name at its line', () => {
    const r = readYamlFile('collection.yml', 'title: C\nlayout:\n  top-right: [share, sparkles]\n', CollectionFile);
    expect(r).toEqual({
      ok: false,
      problems: [{ file: 'collection.yml', line: 3, message: 'layout.top-right.1 must be one of: scene-text, scene-list, prev-next, tour-switcher, zoom, fullscreen, share, credits' }],
    });
  });
});

describe('Scene words are safe to show', () => {
  it('shows raw HTML as text, so it cannot run', () => {
    const r = readScene('s.md', scene('title: A\nregion: { x: 1, y: 2, w: 3, h: 4 }', 'Look <img src=x onerror=alert(1)> here.'));
    expect(r.ok && r.value.html).toBe('<p>Look &lt;img src=x onerror=alert(1)&gt; here.</p>\n');
  });

  it('keeps web, mail and relative links and drops any other kind', () => {
    const r = readScene('s.md', scene('title: A\nregion: { x: 1, y: 2, w: 3, h: 4 }', '[a](https://x.org) [b](mailto:a@b.c) [c](../other) [d](javascript:alert(1)) [e](data:text/html,x)'));
    expect(r.ok && r.value.html).toBe(
      '<p><a href="https://x.org">a</a> <a href="mailto:a@b.c">b</a> <a href="../other">c</a> d e</p>\n',
    );
  });
});
