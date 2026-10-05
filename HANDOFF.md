# Handoff — 2026-10-04

## v1.1 — released without sign-in

v1.1.0 ships the new editor. The owner chose not to set up the relay (2026-10-04), so
`POSTERFORKER_RELAY` is unset and /edit offers only **Save without signing in**. The
sign-in code (relay/, edit/github.ts, auth.ts) is built and tested against fakes, and
switched on later by `node scripts/setup-relay.mjs` plus one release (docs/RELAY.md).
Never tested against real Cloudflare or a real GitHub App.

## State

v1.0.0 is released and live.

| What | Where |
|---|---|
| Engine | https://github.com/micahchoo/posterforker (`v1` → the 1.0.0 release commit with `dist/`) |
| Template | https://github.com/micahchoo/posterforker-template (marked as a template) |
| Live sample | https://micahchoo.github.io/posterforker-template/ (built by `@v1` on `ubuntu-latest`, 25 s) |
| CI | `Test`: typecheck, 41 unit, 8 browser tests, and a build of the real template, all green |

Local folders: `notebook/PosterForker` (engine), `notebook/posterforker-template`.
Scoped rules for this repo live in DevStuff's `.claude/rules/posterforker-*.md`;
`CLAUDE.md` here carries their short form for anyone without DevStuff.

## Open

1. **The prefilled new-file link on github.com is untested.** It needs a logged-in
   browser: open `/edit/` on the live sample, draw a Scene, press **Commit this Scene on
   GitHub**, and check that GitHub proposes `tours/great-wave/scenes/05.md` with the folders
   intact. If it drops them, change `src/edit/links.ts#sceneLink` only.
2. **A big Image through a Release on a runner.** Locally a 286 MiB TIFF builds in 25 s;
   on GitHub only the 2.6 MB sample has run. Attach a large image to a Release on a copy
   of the template and watch the Publish run's time and the deployed size (Pages: 1 GB).
3. **The v1 exit test** with someone who has not seen the project (`docs/plan-v1.md`).
4. GitHub moves `ubuntu-latest` to Ubuntu 26 from 2026-10-19. `sharp` ships its own
   libvips, so nothing should change; watch the first runs after that date.

## Known limits

- Scene words are the Maker's Markdown shown as HTML. A Scene proposed by a stranger
  through a pull request could carry a script; the Maker must read proposals.
- `/edit` is public at `<site>/edit/` on purpose. It can only produce text and links.
- Viewer bundle 108 KB gzipped, 87 KB of it OpenSeadragon.
- Theme fonts load from Google Fonts when a non-system font is named.

## Fixed after the first push

CI's timing exposed that OpenSeadragon's opening animation counted as a Reader's pan,
so a new Tour's link gained `&xywh=…`. Following now starts only from a Reader's
gesture (`Tour.svelte`); `e2e/viewer.spec.ts` waits out the animation and checks.
