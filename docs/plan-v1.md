# PosterForker v1 plan

v1 is finished when this passes:

> A stranger, using only a browser, goes from **Use this template** to a live
> Collection in 20 minutes: one 300 MB Image attached to a Release, five Scenes made
> with the Scene picker, and a changed Theme. Each wait for the Action counts.

## Status, 2026-10-04

Phases 1–6 are built and pass locally: 40 Vitest tests, 7 Playwright tests, `tsc` and
`svelte-check` clean. Phase 0 (1) passed on this machine, not yet on a GitHub runner.
Phase 0 (2), the prefilled link, is untested against GitHub. Nothing is pushed:
`micahchoo/posterforker` and the template repository do not exist on GitHub yet, so
the exit test cannot run. Details in `HANDOFF.md`.

Read `CONTEXT.md` for the terms and `docs/adr/` for why the shape is what it is.
Build a phase only after the phase before it passes. Each phase touches five source
files or fewer, not counting config.

## Two repositories

| Repository | Holds |
|---|---|
| `posterforker` | The engine: the build, the viewer, the `/edit` pages, and `action.yml`. Tagged `v1`. |
| `posterforker-template` | What a Maker copies: content folders, `collection.yml`, a sample Image, and one workflow that calls `posterforker/build@v1`. |

## The content a Maker edits

```
collection.yml              # title, Tour order, layout (Modules in Slots)
theme.yml                   # colours, fonts, radius, opacity, motion
tours/<tour>/tour.yml       # title, Image source: a file in the repo or a Release asset
tours/<tour>/scenes/01.md   # one Scene per file
```

A Scene file:

```markdown
---
title: The river
region: { x: 1200, y: 3400, w: 2400, h: 1600 }   # pixels of the full Image
---
The words a Reader sees for this Scene.
```

The region is in Image pixels, the unit IIIF uses (`#xywh=`), so it survives any
change to the tiles. The viewer converts it to viewport units in one place.

---

## Phase 0 — Probe the two risks (throwaway)

Two unknowns can change the plan. Measure them before writing product code.

1. **Tiling on a GitHub runner.** A workflow in a scratch repo downloads a 300 MB
   TIFF from a Release, runs `vips dzsave --layout iiif3`, and deploys the result to
   Pages. Record: run time, peak memory, tile count, deployed size against the
   1 GB Pages limit. Then open the result in a bare OpenSeadragon page.
2. **The prefilled new-file link.** Open
   `github.com/<owner>/<repo>/new/main?filename=tours/a/scenes/06.md&value=<encoded>`
   with a 2 KB value with front matter and line breaks. Record: does the file name hold
   its folders, does the body arrive intact, and what is the longest value that works.

**Exit:** both are written up in `docs/spikes/`. If (1) fails at 300 MB, lower the
promised size in the exit test; if (2) fails, the Scene picker copies text instead.

## Phase 1 — The format (`packages/core`)

Pure TypeScript; no I/O.

- `geometry.ts` — branded `PixelRect` and `NormRect`; the one conversion between them.
- `schema.ts` — schemas for Scene front matter, `tour.yml`, `collection.yml`,
  `theme.yml`. Every failure names the file, the line and the field.
- `manifest.ts` — a Tour plus its Image size becomes a IIIF Presentation 3 manifest with
  one W3C annotation per Scene.
- `contrast.ts` — WCAG contrast ratio for a Theme's colour pairs.

**First failing test:** a Scene with `region: { x: 1200, y: 3400, w: 2400, h: 1600 }` on
a 10000 x 8000 Image yields an annotation targeting `…#xywh=1200,3400,2400,1600` whose
body is the Markdown rendered to HTML.

**Exit:** a Scene missing `w` fails with `scenes/04.md:3 region.w is required`.

## Phase 2 — The build (`packages/build`, Effect)

A Node CLI: read the content repository, validate it, fetch Release assets, tile, and
write `_site/` (manifests, `collection.json`, tiles, the viewer).

- `read.ts` — walk the folders, parse with `core/schema`.
- `fetch.ts` — download a Release asset named in `tour.yml`.
- `tile.ts` — run `vips dzsave`, read back the Image size.
- `emit.ts` — write `_site/`.
- `main.ts` — the program; every failure becomes a GitHub annotation.

Errors use GitHub's own format, `::error file=tours/a/scenes/04.md,line=3::…`, so the
Maker sees them on the file in GitHub, not only in the log.

**First failing test:** a fixture repository with one bad Scene exits non-zero and prints
exactly that `::error` line. A good fixture produces a `_site/` whose manifest the
Phase 1 test accepts.

**Exit:** the build runs on the Phase 0 scratch repository with the real 300 MB Image.

## Phase 3 — The viewer core (`packages/viewer`)

Svelte 5 + OpenSeadragon. No Annotorious: the viewer shows regions, it does not edit
them.

- `Tour.svelte` — load a manifest, show the Image, go to a Scene.
- `follow.ts` — scene following: which Scene best matches the current view. A port of
  `calcProximateScene` from the Beehive viewer (MIT, © 2014 Jonathan Rochkind; keep
  the notice).
- `link.ts` — a view in the URL and back.
- `keys.ts` — keyboard: next, previous, zoom; respects reduced motion.

**First failing test:** `follow` on a view that covers 60% of Scene 2 and 5% of Scene 3
returns Scene 2; on a view that touches no Scene it returns none.

**Exit (Playwright):** open a Tour, press → , the view moves to Scene 2 and the URL
changes; reload that URL and the same view returns.

## Phase 4 — Modules, Slots and Theme (`packages/viewer`)

- `slots.ts` — the seven Slots, and how they fold on a narrow screen (panel becomes a
  bottom sheet).
- `modules.ts` — the registry: Scene text, Scene list, Previous/Next, Tour switcher,
  zoom, full screen, share link, credits. Built-in Modules use the same API a
  third-party Module will use later.
- `theme.ts` — `theme.yml` becomes CSS custom properties.
- `presets.ts` — neutral, and one with character.

**First failing test:** `layout: { top-right: [share] }` puts the share button in the
top-right Slot; an unknown Module name fails the build with the file and line.

**Exit:** both presets pass the contrast check; a 375 px screen shows the bottom sheet.

## Phase 5 — The `/edit` pages (`packages/edit`)

Published with every Collection, not linked from the Reader's interface.

- `Picker.svelte` — zoom, draw a box, write a title and words.
- `newFileLink.ts` — a Scene becomes the prefilled GitHub new-file link (or copied text,
  if Phase 0 ruled the link out).
- `ThemeEditor.svelte` — the Theme and Layout tabs with a live preview of the real
  viewer; refuses colours that fail contrast.
- `yaml.ts` — the Theme and layout as text, then open GitHub's editor on `theme.yml`.

**First failing test:** a box drawn on the picker produces a link whose decoded `value`
passes the Phase 1 Scene schema. That round trip is the contract between the picker and
the build.

**Exit:** a Scene made in the picker and committed through the link appears in the
Tour after the next build.

## Phase 6 — Ship

- `posterforker`: `action.yml` (a composite action that installs the engine and runs
  the build; libvips comes inside `sharp`), the `v1` tag, the release workflow.
- `posterforker-template`: one sample Tour on a public-domain Image (a museum CC0
  image, never Beehive material, which is CC-BY-NC), the workflow, and a README for
  Makers.

**Exit:** the v1 exit test at the top of this file, timed, with someone who has not seen
the project.

---

## Risks still open

| Risk | Where it is settled |
|---|---|
| A runner cannot tile 300 MB, or the tiles pass 1 GB | Phase 0 (1) |
| The prefilled link drops folders or long bodies | Phase 0 (2) |
| Effect fights the build | Phase 2: fall back to plain TypeScript with Valibot; the schemas move over |
| The viewer bundle grows | Measure at Phase 3 exit. Dropping Annotorious already removes the largest part of Archie's viewer weight |

## After v1

Minimap, audio per Scene, language, third-party Modules by URL, Scene proposals from
issue forms, presenter mode (an opt-in Module that needs a server).
