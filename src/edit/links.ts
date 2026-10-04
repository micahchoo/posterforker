// /edit never writes to GitHub itself (ADR-0001). It writes text, and opens the GitHub
// page where the Maker commits that text.
import { stringify } from 'yaml';
import type { PixelRect } from '../core/geometry.ts';
import type { Layout } from '../core/names.ts';
import type { ThemeFile } from '../core/schema.ts';
import { writeScene } from '../core/source.ts';

export type Repo = { repository: string; branch: string };

/** GitHub's new-file screen, prefilled. The folders go in `filename`, which GitHub splits into folders. */
export function sceneLink(repo: Repo, tour: string, file: string, scene: { title: string; region: PixelRect; words: string }): string {
  const url = new URL(`https://github.com/${repo.repository}/new/${repo.branch}`);
  url.searchParams.set('filename', `tours/${tour}/scenes/${file}`);
  url.searchParams.set('value', writeScene(scene));
  return url.href;
}

/** GitHub's editor on a file that exists. GitHub cannot prefill it; the Maker pastes. */
export const editFileLink = (repo: Repo, path: string): string => `https://github.com/${repo.repository}/edit/${repo.branch}/${path}`;

/** One past the highest numbered Scene: a new Scene never replaces one. */
export function nextSceneFile(existing: ReadonlyArray<string>): string {
  const highest = Math.max(0, ...existing.map((id) => Number.parseInt(id, 10)).filter(Number.isFinite));
  return `${String(highest + 1).padStart(2, '0')}.md`;
}

export const themeYaml = (theme: ThemeFile): string => stringify(theme, { flowCollectionPadding: true });

export const collectionYaml = (c: { title: string; credits?: string; tours: string[]; layout: Layout }): string =>
  stringify(
    { title: c.title, tours: c.tours, ...(c.credits ? { credits: c.credits } : {}), layout: c.layout },
    { collectionStyle: 'any', flowCollectionPadding: false },
  ).replace(/^(  [\w-]+):\n((?:    - .+\n)+)/gm, (_, key: string, items: string) =>
    // Module lists read best on one line: `panel: [scene-text, prev-next]`.
    `${key}: [${items.trim().split('\n').map((l) => l.replace(/^\s*- /, '')).join(', ')}]\n`,
  );
