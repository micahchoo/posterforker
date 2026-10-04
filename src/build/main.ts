// The build a Maker's Action runs:
//   node src/build/main.ts --content <repo> --out <site> --base-url <pages url>
// Every failure is printed as a GitHub annotation, so the Maker sees it on the file.
import { Effect, Exit, Result } from 'effect';
import { appendFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import type { Problem } from '../core/source.ts';
import { emitSite } from './emit.ts';
import { folderAssets, githubAssets, ReleaseAssets } from './fetch.ts';
import { ContentProblems, readContent } from './read.ts';
import { tileImage, type Tiled } from './tile.ts';

type Annotation = { file?: string; line?: number; message: string };

const escapeData = (s: string) => s.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
const escapeProperty = (s: string) => escapeData(s).replace(/:/g, '%3A').replace(/,/g, '%2C');

const annotate = (level: 'error' | 'notice', a: Annotation) => {
  const props = a.file === undefined ? '' : ` file=${escapeProperty(a.file)}${a.line === undefined ? '' : `,line=${a.line}`}`;
  console.log(`::${level}${props}::${escapeData(a.message)}`);
};

class Failed {
  readonly _tag = 'Failed';
  readonly annotations: Annotation[];
  constructor(annotations: Annotation[]) {
    this.annotations = annotations;
  }
}

const build = (contentDir: string, out: string, baseUrl: string, engineDist: string, repo: { repository: string; branch: string } | undefined) =>
  Effect.gen(function* () {
    const content = yield* readContent(contentDir).pipe(
      Effect.mapError((e: ContentProblems) => new Failed(e.problems.map((p: Problem) => ({ ...p })))),
    );
    const assets = yield* ReleaseAssets;

    // Every Tour is tried, so one run reports every missing asset and broken Image.
    const results = yield* Effect.forEach(content.tours, (tour) =>
      Effect.gen(function* () {
        const at = { file: `tours/${tour.id}/tour.yml`, line: tour.imageLine };
        const src =
          'path' in tour.image
            ? tour.image.path
            : yield* assets.fetch(tour.image.release).pipe(
                Effect.mapError((e) =>
                  e._tag === 'AssetMissing'
                    ? { ...at, message: `image.release "${e.name}" is not attached to any Release of this repository` }
                    : { ...at, message: `image.release "${e.name}" could not be downloaded: ${e.reason}` },
                ),
              );
        const tiled = yield* tileImage(src, join(out, 'tiles', tour.id)).pipe(
          Effect.mapError((e) => ({ ...at, message: `the Image could not be tiled: ${e.reason}` })),
        );
        return [tour.id, tiled] as const;
      }).pipe(Effect.result),
    );
    const failures = results.filter(Result.isFailure).map((r) => r.failure);
    if (failures.length > 0) return yield* Effect.fail(new Failed(failures));
    const tiled = new Map<string, Tiled>(results.filter(Result.isSuccess).map((r) => r.success));

    const site = yield* emitSite({ content, tiled, out, baseUrl, engineDist, ...(repo ? { repo } : {}) }).pipe(
      Effect.mapError((e) => new Failed([{ message: `the site could not be written: ${e.reason}` }])),
    );
    const scenes = content.tours.reduce((n, t) => n + t.scenes.length, 0);
    return `Built ${site.tours.length} Tour${site.tours.length === 1 ? '' : 's'} with ${scenes} Scene${scenes === 1 ? '' : 's'}.`;
  });

const { values } = parseArgs({
  options: {
    content: { type: 'string', default: '.' },
    out: { type: 'string', default: '_site' },
    'base-url': { type: 'string' },
  },
});

const repo = process.env.GITHUB_REPOSITORY;
const baseUrl =
  values['base-url'] ?? (repo ? `https://${repo.split('/')[0]}.github.io/${repo.split('/')[1]}/` : 'http://localhost:4173/');
const engineDist = resolve(import.meta.dirname, '../../dist');
const assets = process.env.POSTERFORKER_RELEASE_DIR
  ? folderAssets(process.env.POSTERFORKER_RELEASE_DIR)
  : repo
    ? githubAssets(repo, process.env.GITHUB_TOKEN, resolve(process.env.RUNNER_TEMP ?? '.cache', 'posterforker-assets'))
    : folderAssets(resolve(values.content, '.releases'));

const repoInfo = repo ? { repository: repo, branch: process.env.GITHUB_REF_NAME ?? 'main' } : undefined;
const exit = await Effect.runPromiseExit(
  build(resolve(values.content), resolve(values.out), baseUrl, engineDist, repoInfo).pipe(Effect.provideService(ReleaseAssets, assets)),
);

if (Exit.isSuccess(exit)) {
  // The run page is where a Maker looks after a commit, so both addresses go there.
  const site = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  const edit = `${site}edit/`;
  annotate('notice', { message: `${exit.value} Edit Scenes and the Theme at ${edit}` });
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(
      process.env.GITHUB_STEP_SUMMARY,
      `## Published\n\n${exit.value}\n\n| | |\n|---|---|\n| Your Collection | [${site}](${site}) |\n| Edit Scenes, Theme and Layout | [${edit}](${edit}) |\n`,
    );
  }
} else {
  const failure = exit.cause.reasons.find((r) => r._tag === 'Fail')?.error;
  if (failure instanceof Failed) failure.annotations.forEach((a) => annotate('error', a));
  else annotate('error', { message: `the build stopped unexpectedly: ${String(exit.cause)}` });
  process.exitCode = 1;
}
