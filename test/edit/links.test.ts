import { describe, expect, it } from 'vitest';
import { pixelRect } from '../../src/core/geometry.ts';
import { CollectionFile, ThemeFile } from '../../src/core/schema.ts';
import { readScene, readYamlFile } from '../../src/core/source.ts';
import { collectionYaml, editFileLink, nextSceneFile, sceneLink, themeYaml } from '../../src/edit/links.ts';

const repo = { repository: 'maker/col', branch: 'main' };

describe('sceneLink', () => {
  it('opens GitHub’s new-file screen with a Scene the build accepts', () => {
    const link = new URL(
      sceneLink(repo, 'river', '03.md', { title: 'A bend: "the elbow"', region: pixelRect({ x: 10.6, y: 20, w: 300, h: 200 }), words: 'Slow water.\n\nDeep.' }),
    );
    expect(link.origin + link.pathname).toBe('https://github.com/maker/col/new/main');
    const filename = link.searchParams.get('filename')!;
    expect(filename).toBe('tours/river/scenes/03.md');
    const read = readScene(filename, link.searchParams.get('value')!);
    expect(read).toEqual({
      ok: true,
      value: { title: 'A bend: "the elbow"', region: { x: 11, y: 20, w: 300, h: 200 }, html: '<p>Slow water.</p>\n<p>Deep.</p>\n' },
    });
  });
});

describe('nextSceneFile', () => {
  it('numbers past the highest Scene, so no file is overwritten', () => {
    expect(nextSceneFile(['01', '02', '07'])).toBe('08.md');
    expect(nextSceneFile([])).toBe('01.md');
    expect(nextSceneFile(['intro', '04'])).toBe('05.md');
  });
});

describe('YAML the Theme editor writes', () => {
  it('writes a theme.yml the build accepts', () => {
    const theme = { preset: 'character' as const, colors: { accent: '#ffcc00' }, radius: 4, motion: 'none' as const };
    const read = readYamlFile('theme.yml', themeYaml(theme), ThemeFile);
    expect(read).toEqual({ ok: true, value: theme });
  });

  it('writes a collection.yml that keeps the title, Tours and credits', () => {
    const text = collectionYaml({ title: 'Two maps', credits: 'CC0', tours: ['river', 'harbour'], layout: { panel: ['scene-text'], top: ['tour-switcher'] } });
    const read = readYamlFile('collection.yml', text, CollectionFile);
    expect(read).toEqual({
      ok: true,
      value: { title: 'Two maps', credits: 'CC0', tours: ['river', 'harbour'], layout: { panel: ['scene-text'], top: ['tour-switcher'] } },
    });
  });

  it('opens GitHub’s editor on an existing file', () => {
    expect(editFileLink(repo, 'theme.yml')).toBe('https://github.com/maker/col/edit/main/theme.yml');
  });
});
