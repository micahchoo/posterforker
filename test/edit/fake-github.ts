// An in-memory GitHub: the few REST routes /edit uses, with real fast-forward rules.
// A fetch, so the code under test calls it exactly as it calls api.github.com.

type Tree = Record<string, string>; // path -> content
type Commit = { tree: Tree; parent: string | null; message: string };

export function fakeGitHub(repo: string, files: Tree) {
  const commits = new Map<string, Commit>();
  let n = 0;
  const id = (p: string) => `${p}${(++n).toString(16).padStart(6, '0')}`;
  const trees = new Map<string, Tree>();
  const blobs = new Map<string, string>();
  const root = id('c');
  commits.set(root, { tree: files, parent: null, message: 'first' });
  const refs = { main: root };
  const runs: Array<{ head_sha: string; status: string; conclusion: string | null }> = [];
  const calls: string[] = [];

  const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

  const fetch = async (input: string | URL | Request, init: RequestInit = {}): Promise<Response> => {
    const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
    const method = (init.method ?? 'GET').toUpperCase();
    const auth = new Headers(init.headers).get('authorization');
    calls.push(`${method} ${url.pathname}`);
    if (auth !== 'Bearer t0ken') return json(401, { message: 'Bad credentials' });
    const base = `/repos/${repo}`;
    const path = url.pathname.slice(base.length);
    const body = init.body ? JSON.parse(String(init.body)) : undefined;

    if (method === 'GET' && path === '/git/ref/heads/main') return json(200, { object: { sha: refs.main } });
    const commitMatch = path.match(/^\/git\/commits\/(\w+)$/);
    if (method === 'GET' && commitMatch) {
      if (!commits.has(commitMatch[1]!)) return json(404, {});
      const t = id('t');
      trees.set(t, commits.get(commitMatch[1]!)!.tree);
      return json(200, { sha: commitMatch[1], tree: { sha: t } });
    }
    const treeMatch = path.match(/^\/git\/trees\/(\w+)$/);
    if (method === 'GET' && treeMatch) {
      const c = commits.get(treeMatch[1]!);
      const tree = c?.tree ?? trees.get(treeMatch[1]!);
      if (!tree) return json(404, {});
      return json(200, {
        tree: Object.entries(tree).map(([p, content]) => {
          const b = id('b');
          blobs.set(b, content);
          return { path: p, type: 'blob', sha: b };
        }),
      });
    }
    const blobMatch = path.match(/^\/git\/blobs\/(\w+)$/);
    if (method === 'GET' && blobMatch) {
      return json(200, { encoding: 'base64', content: Buffer.from(blobs.get(blobMatch[1]!) ?? '').toString('base64') });
    }
    if (method === 'POST' && path === '/git/trees') {
      const next: Tree = { ...(trees.get(body.base_tree) ?? {}) };
      for (const e of body.tree as Array<{ path: string; content?: string; sha?: null }>) {
        if (e.sha === null) delete next[e.path];
        else next[e.path] = e.content!;
      }
      const t = id('t');
      trees.set(t, next);
      return json(201, { sha: t });
    }
    if (method === 'POST' && path === '/git/commits') {
      const c = id('c');
      commits.set(c, { tree: trees.get(body.tree)!, parent: body.parents[0], message: body.message });
      return json(201, { sha: c });
    }
    if (method === 'PATCH' && path === '/git/refs/heads/main') {
      // GitHub refuses a non-fast-forward update unless forced.
      if (commits.get(body.sha)?.parent !== refs.main && !body.force) return json(422, { message: 'Update is not a fast forward' });
      refs.main = body.sha;
      runs.unshift({ head_sha: body.sha, status: 'queued', conclusion: null });
      return json(200, { object: { sha: body.sha } });
    }
    if (method === 'GET' && path === '/actions/runs') {
      return json(200, { workflow_runs: runs.filter((r) => r.head_sha === url.searchParams.get('head_sha')) });
    }
    return json(404, { message: `fake has no ${method} ${path}` });
  };

  return {
    fetch,
    calls,
    head: () => refs.main,
    files: () => commits.get(refs.main)!.tree,
    message: () => commits.get(refs.main)!.message,
    /** Someone else commits on GitHub while the Maker is editing. */
    commitElsewhere(path: string, content: string) {
      const c = id('c');
      commits.set(c, { tree: { ...commits.get(refs.main)!.tree, [path]: content }, parent: refs.main, message: 'elsewhere' });
      refs.main = c;
    },
    finishRun(conclusion: 'success' | 'failure') {
      if (runs[0]) Object.assign(runs[0], { status: 'completed', conclusion });
    },
  };
}
