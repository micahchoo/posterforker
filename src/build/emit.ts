// Writes the static site: one manifest per Tour, collection.json, and the prebuilt viewer
// and /edit pages from the engine's dist/.
import { Data, Effect } from 'effect';
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { tourManifest } from '../core/manifest.ts';
import { CONTENT_FILE, DEFAULT_LAYOUT, type SiteCollection } from '../core/schema.ts';
import type { Content } from './read.ts';
import type { Tiled } from './tile.ts';

export class EmitFailed extends Data.TaggedError('EmitFailed')<{ reason: string }> {}

export type EmitInput = {
  content: Content;
  tiled: ReadonlyMap<string, Tiled>;
  out: string;
  baseUrl: string;
  /** The engine's built viewer (dist/viewer) and editor (dist/edit), when present. */
  engineDist: string;
  repo?: { repository: string; branch: string };
  /** The Maker's repository, read again for the text files /edit starts from. */
  contentDir: string;
  /** The commit being built, so /edit can tell when a newer one exists. */
  commit?: string;
};

/** Every content file under `root`, as text, keyed by its path in the repository. */
function contentFiles(root: string): Record<string, string> {
  const walk = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((d) =>
      d.name.startsWith('.') ? [] : d.isDirectory() ? walk(join(dir, d.name)) : [join(dir, d.name)],
    );
  return Object.fromEntries(
    walk(root)
      .map((p) => [relative(root, p).split(sep).join('/'), p] as const)
      .filter(([path]) => CONTENT_FILE.test(path))
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([path, full]) => [path, readFileSync(full, 'utf8')]),
  );
}

const writeJson = (path: string, value: unknown) => {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(value, null, 2) + '\n');
};

export const emitSite = ({ content, tiled, out, baseUrl, engineDist, repo, contentDir, commit }: EmitInput): Effect.Effect<SiteCollection, EmitFailed> =>
  Effect.try({
    try: () => {
      const tours = content.tours.map((t) => {
        const image = tiled.get(t.id)!;
        const tiles = `tiles/${t.id}`;
        const manifest = `tours/${t.id}/manifest.json`;
        writeJson(
          join(out, manifest),
          tourManifest({
            baseUrl,
            tourId: t.id,
            title: t.title,
            image: { width: image.width, height: image.height, service: tiles, full: image.full },
            scenes: t.scenes,
          }),
        );
        return {
          id: t.id,
          title: t.title,
          ...(t.alt ? { alt: t.alt } : {}),
          manifest,
          tiles,
          width: image.width,
          height: image.height,
          thumbnail: `${tiles}/${image.full}`,
        };
      });
      const { collection, theme } = content;
      const site: SiteCollection = {
        title: collection.title,
        ...(repo ?? {}),
        ...(collection.credits ? { credits: collection.credits } : {}),
        layout: (collection.layout as SiteCollection['layout'] | undefined) ?? DEFAULT_LAYOUT,
        theme,
        tours,
      };
      writeJson(join(out, 'collection.json'), site);

      for (const [part, target] of [['viewer', out], ['edit', join(out, 'edit')]] as const) {
        const from = join(engineDist, part);
        if (existsSync(from)) cpSync(from, target, { recursive: true });
      }
      writeJson(join(out, 'edit/sources.json'), { ...(commit ? { commit } : {}), files: contentFiles(contentDir) });
      // GitHub Pages must serve files that start with _ (Vite's assets can).
      writeFileSync(join(out, '.nojekyll'), '');
      return site;
    },
    catch: (e) => new EmitFailed({ reason: e instanceof Error ? e.message : String(e) }),
  });
