# PosterForker

Publish a guided tour of a very large image on GitHub Pages, using nothing but a
browser. A Maker copies [the template](https://github.com/micahchoo/posterforker-template),
adds Images and Scenes, and GitHub does the rest.

This repository is the engine: the build that runs in GitHub Actions, the viewer a
Reader sees, and the `/edit` pages a Maker uses. The terms are in
[CONTEXT.md](CONTEXT.md); the reasons for the shape are in [docs/adr/](docs/adr/).

## How a Collection is built

```
the Maker's repository                   GitHub Actions: micahchoo/posterforker@v1
  collection.yml, theme.yml        ──▶     read and check every file (errors land on the line)
  tours/<tour>/tour.yml                   fetch big Images from Releases
  tours/<tour>/scenes/*.md                tile each Image (libvips, IIIF level 0)
  (Images, or Release assets)              write IIIF manifests + collection.json
                                           copy the viewer and /edit, deploy to Pages
```

Nothing runs on a server, and nothing logs in. `/edit` writes text and opens the GitHub
page where the Maker commits it.

## Develop

Node 24 and pnpm.

```bash
pnpm install
pnpm test          # format, build and viewer logic (Vitest)
pnpm typecheck     # tsc + svelte-check
pnpm e2e           # builds a fixture Collection and drives it in Chromium
```

Build a Collection locally (big Images come from `<content>/.releases/` or
`POSTERFORKER_RELEASE_DIR`):

```bash
pnpm build:ui
node --experimental-strip-types src/build/main.ts --content ../posterforker-template --out _site
node e2e/serve.mjs "$PWD/_site" 4173     # then open http://localhost:4173/
```

| Folder | Holds |
|---|---|
| `src/core` | The format: schemas, geometry, IIIF manifests, Themes. Shared by everything. |
| `src/build` | The build the Action runs (Effect). |
| `src/viewer` | The Reader's page (Svelte 5 + OpenSeadragon). `state.svelte.ts` is the Module API. |
| `src/edit` | The Scene picker and the Theme and Layout editor. |

## Release

See [docs/PIPELINE.md](docs/PIPELINE.md). In short: push a tag `vX.Y.Z`; the release
workflow builds `dist/`, commits it, and moves `v1`, which every Collection uses.

## Credits

Scene following is ported from Jonathan Rochkind's Beehive Poster Viewer (MIT, 2014).
The sample Image is Katsushika Hokusai's *The Great Wave off Kanagawa*, public domain.

MIT licence.
