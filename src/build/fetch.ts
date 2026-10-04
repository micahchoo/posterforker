// Images too large for the browser's 25 MiB upload live on a GitHub Release (up to 2 GB).
// ReleaseAssets finds one by name and puts it on disk. Two implementations: GitHub's
// API in the Action, and a plain folder for tests and local previews.
import { Context, Data, Effect } from 'effect';
import { createWriteStream, existsSync, mkdirSync, renameSync } from 'node:fs';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

export class AssetMissing extends Data.TaggedError('AssetMissing')<{ name: string }> {}
export class DownloadFailed extends Data.TaggedError('DownloadFailed')<{ name: string; reason: string }> {}

export class ReleaseAssets extends Context.Service<
  ReleaseAssets,
  { readonly fetch: (name: string) => Effect.Effect<string, AssetMissing | DownloadFailed> }
>()('posterforker/ReleaseAssets') {}

export const folderAssets = (dir: string): ReleaseAssets['Service'] => ({
  fetch: (name) => {
    const path = join(dir, name);
    return existsSync(path) ? Effect.succeed(path) : Effect.fail(new AssetMissing({ name }));
  },
});

type Asset = { id: number; name: string; url: string };

/** Every asset of every Release in `repo` ("owner/name"), newest Release first. */
export const githubAssets = (repo: string, token: string | undefined, cacheDir: string): ReleaseAssets['Service'] => {
  const headers = (accept: string): Record<string, string> => ({
    accept,
    'x-github-api-version': '2022-11-28',
    ...(token ? { authorization: `Bearer ${token}` } : {}),
  });
  const request = (name: string, url: string, accept: string) =>
    Effect.tryPromise({
      try: async () => {
        const res = await fetch(url, { headers: headers(accept), redirect: 'follow' });
        if (!res.ok) throw new Error(`${res.status} ${res.statusText} from ${url}`);
        return res;
      },
      catch: (e) => new DownloadFailed({ name, reason: String(e instanceof Error ? e.message : e) }),
    });

  // Built once per build: the outer effect of `cached` only makes the cache, so runSync is safe.
  const assets = Effect.runSync(Effect.cached(Effect.gen(function* () {
    const res = yield* request('(release list)', `https://api.github.com/repos/${repo}/releases?per_page=100`, 'application/vnd.github+json');
    const releases = (yield* Effect.promise(() => res.json())) as Array<{ assets: Asset[] }>;
    return releases.flatMap((r) => r.assets);
  })));

  return {
    fetch: (name) =>
      Effect.gen(function* () {
        const asset = (yield* assets).find((a) => a.name === name);
        if (!asset) return yield* Effect.fail(new AssetMissing({ name }));
        mkdirSync(cacheDir, { recursive: true });
        const path = join(cacheDir, `${asset.id}-${asset.name}`);
        if (existsSync(path)) return path;
        const res = yield* request(name, asset.url, 'application/octet-stream');
        yield* Effect.tryPromise({
          // Into .part first: an interrupted download must not look finished on the next run.
          try: async () => {
            await pipeline(Readable.fromWeb(res.body as import('node:stream/web').ReadableStream), createWriteStream(`${path}.part`));
            renameSync(`${path}.part`, path);
          },
          catch: (e) => new DownloadFailed({ name, reason: String(e) }),
        });
        return path;
      }),
  };
};
