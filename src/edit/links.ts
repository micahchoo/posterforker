// Saving without signing in (ADR-0005's fallback, and ADR-0001's original way): /edit opens
// the GitHub page that makes each change, and the Maker commits it there.
import type { FileChange } from './draft.ts';

export type Repo = { repository: string; branch: string };

/**
 * The GitHub page that makes one change by hand. A new file opens GitHub's new-file screen,
 * prefilled; an existing one opens GitHub's editor, which cannot be prefilled, so the Maker
 * pastes; a removed one opens GitHub's delete screen.
 */
export function fileLink(repo: Repo, change: FileChange, exists: boolean): string {
  const base = `https://github.com/${repo.repository}`;
  if (!('text' in change)) return `${base}/delete/${repo.branch}/${change.path}`;
  if (exists) return `${base}/edit/${repo.branch}/${change.path}`;
  const url = new URL(`${base}/new/${repo.branch}`);
  url.searchParams.set('filename', change.path);
  url.searchParams.set('value', change.text);
  return url.href;
}
