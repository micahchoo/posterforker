// Reads a Maker's repository into a Collection, or into every Problem it has.
import { Data, Effect } from 'effect';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { themeContrastProblems } from '../core/contrast.ts';
import { CollectionFile, ThemeFile, TourFile } from '../core/schema.ts';
import { resolveTheme } from '../core/theme.ts';
import { lineAt, playingOrder, readScene, readYamlFile, sourceAt, type Problem, type Read, type Scene } from '../core/source.ts';

export class ContentProblems extends Data.TaggedError('ContentProblems')<{ problems: Problem[] }> {}

export type TourSource = {
  id: string;
  title: string;
  alt?: string;
  image: { file: string; path: string } | { release: string };
  /** For problems found later, about the image line of tour.yml. */
  imageLine: number;
  scenes: Array<Scene & { id: string }>;
};

export type Content = {
  collection: CollectionFile;
  theme: ThemeFile;
  tours: TourSource[];
};

const TOUR_ID = /^[a-z0-9][a-z0-9-]*$/;

export const readContent = (root: string): Effect.Effect<Content, ContentProblems> =>
  Effect.suspend(() => {
    const problems: Problem[] = [];
    const take = <T>(r: Read<T>): T | undefined => {
      if (r.ok) return r.value;
      problems.push(...r.problems);
      return undefined;
    };
    const text = (file: string): string | undefined => {
      const path = join(root, file);
      if (existsSync(path)) return readFileSync(path, 'utf8');
      return undefined;
    };

    const collectionText = text('collection.yml');
    if (collectionText === undefined) problems.push({ file: 'collection.yml', line: 1, message: 'collection.yml is missing; it names the Collection' });
    const collection = collectionText === undefined ? undefined : take(readYamlFile('collection.yml', collectionText, CollectionFile));
    const themeText = text('theme.yml');
    const theme = themeText === undefined ? {} : take(readYamlFile('theme.yml', themeText, ThemeFile));
    // The Theme editor refuses these colours; a hand edit must not get round it.
    if (theme) {
      const line = lineAt(themeText ?? '', ['colors']);
      for (const message of themeContrastProblems(resolveTheme(theme).colors)) {
        problems.push({ file: 'theme.yml', line, message: `colors: ${message}` });
      }
    }

    const toursDir = join(root, 'tours');
    const folders = existsSync(toursDir)
      ? readdirSync(toursDir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort()
      : [];
    const order = collection?.tours ?? folders;
    order.forEach((id, i) => {
      if (!folders.includes(id)) {
        problems.push({ file: 'collection.yml', line: lineAt(collectionText ?? '', ['tours', i]), message: `tours.${i} "${id}" has no folder tours/${id}/` });
      }
    });
    if (folders.length === 0) problems.push({ file: 'tours/', line: 1, message: 'there are no Tours; add a folder tours/<name>/ with a tour.yml' });

    const tours: TourSource[] = [];
    for (const id of order.filter((t) => folders.includes(t))) {
      const dir = `tours/${id}`;
      if (!TOUR_ID.test(id)) {
        problems.push({ file: `${dir}/`, line: 1, message: `the folder name "${id}" must use only a-z, 0-9 and -` });
        continue;
      }
      const tourText = text(`${dir}/tour.yml`);
      if (tourText === undefined) {
        problems.push({ file: `${dir}/tour.yml`, line: 1, message: `tour.yml is missing; it names the Tour and its Image` });
        continue;
      }
      const meta = take(readYamlFile(`${dir}/tour.yml`, tourText, TourFile));
      const scenesDir = join(root, dir, 'scenes');
      const sceneFiles = existsSync(scenesDir) ? readdirSync(scenesDir).filter((f) => f.endsWith('.md')).sort() : [];
      const byFile = sceneFiles.flatMap((f) => {
        const scene = take(readScene(`${dir}/scenes/${f}`, readFileSync(join(scenesDir, f), 'utf8')));
        return scene ? [{ ...scene, id: f.replace(/\.md$/, '') }] : [];
      });
      if (!meta) continue;

      // tour.yml may list the playing order; Scenes it does not list follow, in file order.
      const { order, missing } = playingOrder(byFile.map((s) => s.id), meta.scenes);
      for (const i of missing) {
        const typed = sourceAt(tourText, ['scenes', i]) ?? String(meta.scenes?.[i]);
        problems.push({ file: `${dir}/tour.yml`, line: lineAt(tourText, ['scenes', i]), message: `scenes.${i} "${typed}" has no file ${dir}/scenes/${typed}.md` });
      }
      const scenes = order.map((id) => byFile.find((s) => s.id === id)!);

      const imageLine = lineAt(tourText, ['image']);
      let image: TourSource['image'];
      if ('file' in meta.image) {
        const path = join(root, dir, meta.image.file);
        if (!existsSync(path)) {
          problems.push({ file: `${dir}/tour.yml`, line: imageLine, message: `image.file "${meta.image.file}" is not in ${dir}/` });
          continue;
        }
        image = { file: meta.image.file, path };
      } else {
        image = { release: meta.image.release };
      }
      tours.push({ id, title: meta.title, ...(meta.alt ? { alt: meta.alt } : {}), image, imageLine, scenes });
    }

    return problems.length > 0 || !collection || !theme
      ? Effect.fail(new ContentProblems({ problems }))
      : Effect.succeed({ collection, theme, tours });
  });
