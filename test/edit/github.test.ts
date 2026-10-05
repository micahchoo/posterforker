import { describe, expect, it } from 'vitest';
import { loadFiles, publishState, save, SavedElsewhere } from '../../src/edit/github.ts';
import { fakeGitHub } from './fake-github.ts';

const FILES = {
  'collection.yml': 'title: Waves\n',
  'tours/wave/tour.yml': 'title: The wave\nimage: { file: wave.jpg }\n',
  'tours/wave/scenes/01.md': '---\ntitle: A\nregion: { x: 1, y: 1, w: 1, h: 1 }\n---\nA.\n',
  'tours/wave/scenes/02.md': '---\ntitle: B\nregion: { x: 1, y: 1, w: 1, h: 1 }\n---\nB.\n',
  'tours/wave/wave.jpg': '(binary)',
  'README.md': 'hello',
};

const setup = () => {
  const gh = fakeGitHub('maker/col', FILES);
  return { gh, conn: { repository: 'maker/col', branch: 'main', token: 't0ken', fetch: gh.fetch } };
};

describe('GitHub', () => {
  it('loads the Collection’s text files, and only those', async () => {
    const { gh, conn } = setup();
    const loaded = await loadFiles(conn);
    expect(loaded.head).toBe(gh.head());
    expect(Object.keys(loaded.files).sort()).toEqual(['collection.yml', 'tours/wave/scenes/01.md', 'tours/wave/scenes/02.md', 'tours/wave/tour.yml']);
    expect(loaded.files['tours/wave/scenes/02.md']).toBe(FILES['tours/wave/scenes/02.md']);
  });

  it('writes every change as one commit', async () => {
    const { gh, conn } = setup();
    const { head } = await loadFiles(conn);
    await save(conn, head, [
      { path: 'tours/wave/scenes/01.md', text: 'changed' },
      { path: 'tours/wave/scenes/03.md', text: 'new' },
      { path: 'tours/wave/scenes/02.md', delete: true },
    ], 'Edit three Scenes');
    const files = gh.files();
    expect(files['tours/wave/scenes/01.md']).toBe('changed');
    expect(files['tours/wave/scenes/03.md']).toBe('new');
    expect(files['tours/wave/scenes/02.md']).toBeUndefined();
    expect(files['tours/wave/wave.jpg']).toBe('(binary)');
    expect(gh.message()).toBe('Edit three Scenes');
    expect(gh.calls.filter((c) => c.startsWith('POST /repos/maker/col/git/commits'))).toHaveLength(1);
  });

  it('never overwrites a commit made elsewhere since loading', async () => {
    const { gh, conn } = setup();
    const { head } = await loadFiles(conn);
    gh.commitElsewhere('README.md', 'edited on github.com');
    await expect(save(conn, head, [{ path: 'collection.yml', text: 'title: Mine\n' }], 'x')).rejects.toBeInstanceOf(SavedElsewhere);
    expect(gh.files()['README.md']).toBe('edited on github.com');
    expect(gh.files()['collection.yml']).toBe('title: Waves\n');
  });

  it('follows the Publish run that a save starts', async () => {
    const { gh, conn } = setup();
    const { head } = await loadFiles(conn);
    const { commit } = await save(conn, head, [{ path: 'collection.yml', text: 'title: Mine\n' }], 'x');
    expect(await publishState(conn, commit)).toBe('publishing');
    gh.finishRun('success');
    expect(await publishState(conn, commit)).toBe('live');
  });
});
