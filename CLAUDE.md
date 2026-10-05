# PosterForker

The engine behind a GitHub template: a Maker's repository of Images and Markdown
Scenes becomes a deep-zoom guided Tour on GitHub Pages. Read `CONTEXT.md` first and use
its words (Image, Scene, Tour, Collection, Maker, Reader, Theme, Module, Slot). The
reasons for the shape are `docs/adr/`; the release process is `docs/PIPELINE.md`.

## Verify

```bash
pnpm test && pnpm typecheck && pnpm e2e
```

## Five things that break silently

1. **The viewer never imports `core/schema.ts` or `core/source.ts`.** They pull in
   Effect. The viewer imports `core/names.ts`, `theme.ts`, `geometry.ts`,
   `contrast.ts` only. Bundle: 108 KB gzipped, 87 KB of it OpenSeadragon.
2. **`/edit` holds a GitHub token** (ADR-0005), so nothing on it may run script: Scene
   Markdown has no raw HTML, both pages carry a CSP, the token lives in `sessionStorage`.
   A Save is one commit through `edit/github.ts` and never forces over someone else's.
3. **Every Maker-facing failure names a file and a line.** The build prints
   `::error file=…,line=…::`; the Maker sees nothing else.
4. **Regions are Image pixels** (`PixelRect`) everywhere a Maker or IIIF sees them;
   viewport units (`NormRect`) only inside OpenSeadragon code. The types keep them apart.
5. **`v1` moves.** Every release reaches every Collection's next build. Inside v1 the
   format only grows (`docs/PIPELINE.md` §4).

## Layout

`src/core` the format (shared) · `src/build` the Action's build (Effect) ·
`src/viewer` the Reader's page (Svelte 5 + OpenSeadragon; `state.svelte.ts` is the
Module API) · `src/edit` the Scene picker and Theme editor · `test/` Vitest ·
`e2e/` Playwright.
