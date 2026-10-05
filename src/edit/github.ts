// /edit's only writer (ADR-0005): read the Collection's text files, write a Save as one
// commit, then follow the Publish run it starts. Plain fetch against api.github.com,
// which accepts browser calls that carry a token.
import { CONTENT_FILE } from '../core/names.ts';
import type { FileChange } from './draft.ts';

export type Connection = {
  repository: string;
  branch: string;
  token: string;
  /** Replaced by a fake in tests. */
  fetch?: typeof fetch;
};

/** Someone committed to the branch after /edit loaded it. Nothing was written. */
export class SavedElsewhere extends Error {
  constructor() {
    super('Someone else saved to this Collection while you were editing.');
  }
}


async function api<T>(c: Connection, method: string, path: string, body?: unknown): Promise<T> {
  const res = await (c.fetch ?? fetch)(`https://api.github.com/repos/${c.repository}${path}`, {
    method,
    headers: {
      authorization: `Bearer ${c.token}`,
      accept: 'application/vnd.github+json',
      'x-github-api-version': '2022-11-28',
      ...(body ? { 'content-type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (res.status === 422 && method === 'PATCH') throw new SavedElsewhere();
  if (!res.ok) throw new Error(`GitHub answered ${res.status} to ${method} ${path}`);
  return (await res.json()) as T;
}

const decodeBase64 = (b64: string) => new TextDecoder().decode(Uint8Array.from(atob(b64.replace(/\s/g, '')), (ch) => ch.charCodeAt(0)));

export async function loadFiles(c: Connection): Promise<{ head: string; files: Record<string, string> }> {
  const head = (await api<{ object: { sha: string } }>(c, 'GET', `/git/ref/heads/${c.branch}`)).object.sha;
  const { tree } = await api<{ tree: Array<{ path: string; type: string; sha: string }> }>(c, 'GET', `/git/trees/${head}?recursive=1`);
  const wanted = tree.filter((e) => e.type === 'blob' && CONTENT_FILE.test(e.path));
  const texts = await Promise.all(
    wanted.map(async (e) => [e.path, decodeBase64((await api<{ content: string }>(c, 'GET', `/git/blobs/${e.sha}`)).content)] as const),
  );
  return { head, files: Object.fromEntries(texts) };
}

/** One commit on top of `head`; refuses if the branch moved since. */
export async function save(c: Connection, head: string, changes: ReadonlyArray<FileChange>, message: string): Promise<{ commit: string }> {
  const current = (await api<{ object: { sha: string } }>(c, 'GET', `/git/ref/heads/${c.branch}`)).object.sha;
  if (current !== head) throw new SavedElsewhere();
  const base = await api<{ tree: { sha: string } }>(c, 'GET', `/git/commits/${head}`);
  const tree = await api<{ sha: string }>(c, 'POST', '/git/trees', {
    base_tree: base.tree.sha,
    tree: changes.map((ch) =>
      'text' in ch ? { path: ch.path, mode: '100644', type: 'blob', content: ch.text } : { path: ch.path, mode: '100644', type: 'blob', sha: null },
    ),
  });
  const commit = await api<{ sha: string }>(c, 'POST', '/git/commits', { message, tree: tree.sha, parents: [head] });
  // Not forced: GitHub refuses (422) if someone committed between the check above and now.
  await api(c, 'PATCH', `/git/refs/heads/${c.branch}`, { sha: commit.sha, force: false });
  return { commit: commit.sha };
}

export type PublishState = 'waiting' | 'publishing' | 'live' | 'failed';

export async function publishState(c: Connection, commit: string): Promise<PublishState> {
  const { workflow_runs } = await api<{ workflow_runs: Array<{ status: string; conclusion: string | null }> }>(
    c,
    'GET',
    `/actions/runs?head_sha=${commit}&per_page=1`,
  );
  const run = workflow_runs[0];
  if (!run) return 'waiting';
  if (run.status !== 'completed') return 'publishing';
  return run.conclusion === 'success' ? 'live' : 'failed';
}
