# Handoff — 2026-10-04

## State

v1 is built and tested on this machine. Nothing is committed and nothing is on GitHub.

| Check | Result |
|---|---|
| `pnpm test` | 40 passed |
| `pnpm e2e` | 7 passed (builds a fixture Collection, drives it in Chromium) |
| `pnpm typecheck` | `tsc` and `svelte-check`: 0 errors, 0 warnings |
| Template build | `template/` builds: 1 Tour, 4 Scenes; screenshots checked by eye |
| Production install | `pnpm install --prod` then the build works (what `action.yml` does) |
| 286 MiB Image | full build 25 s, 206 MB peak, 544 files, 60 MB (this machine) |

## Not done, and why

All of these need GitHub, so they wait for the owner's go-ahead.

1. **Create `micahchoo/posterforker`** and push. `template/.github/workflows/publish.yml`
   calls `micahchoo/posterforker@v1`, which does not exist yet.
2. **Tag `v1.0.0`.** The release workflow commits `dist/` and moves `v1`.
3. **Create the template repository** from `template/` and mark it a template.
4. **Phase 0 on GitHub:** the 300 MB Release run on `ubuntu-latest`, and the
   prefilled new-file link (`/new/main?filename=tours/x/scenes/03.md&value=…`). The
   link's folder handling is the riskiest untested assumption; if GitHub drops the
   folders, `src/edit/links.ts#sceneLink` is the one place to change.
5. **The v1 exit test** with a person who has not seen the project.

Action versions in the workflows (`checkout@v4`, `setup-node@v4`, `configure-pages@v5`,
`upload-pages-artifact@v3`, `deploy-pages@v4`) were not checked against 2026 releases.

## Known limits

- Scene words are the Maker's Markdown rendered to HTML and shown as HTML. A Scene
  proposed by a stranger through a pull request could carry a script; the Maker must
  read proposals before merging.
- `/edit` is public at `<site>/edit/` on purpose (ADR and round 4, Q22). It can only
  produce text and links.
- The viewer bundle is 108 KB gzipped, 87 KB of it OpenSeadragon.
- Theme fonts load from Google Fonts when a non-system font is named.

## Where things are

- Decisions: `docs/adr/0001`–`0004`. Plan and status: `docs/plan-v1.md`.
- Probe write-up: `docs/spikes/2026-10-04-tiling.md`.
- Session notes: `.brainstorm/`.
- Throwaway files: `.scratch/` (ignored by git), including the 286 MiB test TIFF.
