import { describe, expect, it } from 'vitest';
import { pixelRect } from '../../src/core/geometry.ts';
import { readScene } from '../../src/core/source.ts';
import { addScene, changes, deleteScene, moveScene, readDraft, setLayout, setTheme, updateScene, type FileChange } from '../../src/edit/draft.ts';

const scene = (title: string, x: number, words: string) => `---\ntitle: ${title}\nregion: { x: ${x}, y: 0, w: 10, h: 10 }\n---\n${words}\n`;
const FILES: Record<string, string> = {
  'collection.yml': '# My notes\ntitle: Waves\nlayout:\n  panel: [scene-text]\n  top-right: [share]\n',
  'theme.yml': '# How it looks\npreset: neutral\n',
  'tours/wave/tour.yml': '# The print\ntitle: The wave\nimage: { file: wave.jpg }\n',
  'tours/wave/scenes/01.md': scene('Claws', 1, 'Foam.'),
  'tours/wave/scenes/02.md': scene('Fuji', 2, 'The mountain.'),
  'tours/wave/scenes/03.md': scene('Rowers', 3, 'Oars.'),
};

const apply = (files: Record<string, string>, cs: FileChange[]) => {
  const next = { ...files };
  for (const c of cs) {
    if ('text' in c) next[c.path] = c.text;
    else delete next[c.path];
  }
  return next;
};
const order = (files: Record<string, string>) => readDraft(files).tours[0]!.scenes.map((s) => s.title);

describe('the edit model', () => {
  const draft = readDraft(FILES);

  it('reads Scenes in file order, with their Markdown words', () => {
    expect(draft.tours[0]!.scenes.map((s) => [s.id, s.title, s.words])).toEqual([
      ['01', 'Claws', 'Foam.'],
      ['02', 'Fuji', 'The mountain.'],
      ['03', 'Rowers', 'Oars.'],
    ]);
  });

  it('changes nothing when nothing changed', () => {
    expect(changes(FILES, draft)).toEqual([]);
  });

  it('reorders in tour.yml, keeps its comment, and renames no file', () => {
    const d = updateScene(moveScene(draft, 'wave', '02', 0), 'wave', '02', { title: 'Mount Fuji' });
    const cs = changes(FILES, d);
    expect(cs.map((c) => c.path).sort()).toEqual(['tours/wave/scenes/02.md', 'tours/wave/tour.yml']);
    const after = apply(FILES, cs);
    expect(after['tours/wave/tour.yml']).toBe('# The print\ntitle: The wave\nimage: { file: wave.jpg }\nscenes: [ "02", "01", "03" ]\n');
    expect(order(after)).toEqual(['Mount Fuji', 'Claws', 'Rowers']);
    expect(readScene('02.md', after['tours/wave/scenes/02.md']!)).toMatchObject({ ok: true, value: { title: 'Mount Fuji' } });
  });

  it('moves a box by rewriting only that Scene', () => {
    const cs = changes(FILES, updateScene(draft, 'wave', '03', { region: pixelRect({ x: 50, y: 60, w: 70, h: 80 }) }));
    expect(cs).toEqual([{ path: 'tours/wave/scenes/03.md', text: '---\ntitle: "Rowers"\nregion: { x: 50, y: 60, w: 70, h: 80 }\n---\nOars.\n' }]);
  });

  it('names a new Scene after its title, never over an existing file', () => {
    const { draft: d, id } = addScene(draft, 'wave', pixelRect({ x: 5, y: 5, w: 20, h: 20 }));
    const titled = updateScene(d, 'wave', id, { title: 'Claws!', words: 'More foam.' });
    const cs = changes(FILES, titled);
    const added = cs.find((c) => c.path.endsWith('.md'))!;
    expect(added.path).toBe('tours/wave/scenes/claws.md');
    expect(order(apply(FILES, cs))).toEqual(['Claws', 'Fuji', 'Rowers', 'Claws!']);

    const second = addScene(titled, 'wave', pixelRect({ x: 1, y: 1, w: 2, h: 2 }));
    const again = updateScene(second.draft, 'wave', second.id, { title: 'Claws' });
    expect(changes(FILES, again).filter((c) => c.path.endsWith('.md')).map((c) => c.path).sort()).toEqual([
      'tours/wave/scenes/claws-2.md',
      'tours/wave/scenes/claws.md',
    ]);
  });

  it('deletes a Scene file and drops it from the order', () => {
    const d = deleteScene(moveScene(draft, 'wave', '03', 0), 'wave', '01');
    const after = apply(FILES, changes(FILES, d));
    expect(after['tours/wave/scenes/01.md']).toBeUndefined();
    expect(order(after)).toEqual(['Rowers', 'Fuji']);
  });

  it('writes the Theme and the layout, keeping the files’ comments and other keys', () => {
    const d = setLayout(setTheme(draft, { preset: 'character', radius: 4 }), { panel: ['scene-text', 'prev-next'], 'bottom-left': ['share'] });
    const after = apply(FILES, changes(FILES, d));
    expect(after['theme.yml']).toBe('# How it looks\npreset: character\nradius: 4\n');
    expect(after['collection.yml']).toBe('# My notes\ntitle: Waves\nlayout:\n  panel: [ scene-text, prev-next ]\n  bottom-left: [ share ]\n');
  });
});

describe('edits as steps', () => {
  it('merges typing into one step, so Undo takes back an edit and not a letter', async () => {
    const { record } = await import('../../src/edit/draft.ts');
    let steps = record([], { kind: 'update', tour: 'wave', id: '01', patch: { title: 'C' } });
    steps = record(steps, { kind: 'update', tour: 'wave', id: '01', patch: { title: 'Cl' } });
    steps = record(steps, { kind: 'update', tour: 'wave', id: '01', patch: { words: 'Foam!' } });
    steps = record(steps, { kind: 'update', tour: 'wave', id: '02', patch: { title: 'F' } });
    expect(steps).toEqual([
      { kind: 'update', tour: 'wave', id: '01', patch: { title: 'Cl', words: 'Foam!' } },
      { kind: 'update', tour: 'wave', id: '02', patch: { title: 'F' } },
    ]);
  });

  it('replays the Maker’s steps on a newer version saved elsewhere', async () => {
    const { replay } = await import('../../src/edit/draft.ts');
    const steps = [
      { kind: 'update', tour: 'wave', id: '02', patch: { title: 'Mount Fuji' } },
      { kind: 'move', tour: 'wave', id: '03', to: 0 },
      { kind: 'theme', theme: { preset: 'character' } },
    ] as const;
    // Meanwhile someone fixed a typo in Scene 1 on github.com.
    const newer = { ...FILES, 'tours/wave/scenes/01.md': scene('Claws', 1, 'Foam, fixed.') };
    const d = replay(readDraft(newer), steps);
    expect(d.tours[0]!.scenes.map((s) => [s.title, s.words])).toEqual([
      ['Rowers', 'Oars.'],
      ['Claws', 'Foam, fixed.'],
      ['Mount Fuji', 'The mountain.'],
    ]);
    expect(changes(newer, d).map((c) => c.path).sort()).toEqual(['theme.yml', 'tours/wave/scenes/02.md', 'tours/wave/tour.yml']);
  });

  it('skips a step whose Scene is gone, instead of failing', async () => {
    const { replay } = await import('../../src/edit/draft.ts');
    const { ['tours/wave/scenes/02.md']: _gone, ...without } = FILES;
    const d = replay(readDraft(without), [{ kind: 'update', tour: 'wave', id: '02', patch: { title: 'Mount Fuji' } }]);
    expect(changes(without, d)).toEqual([]);
  });
});
