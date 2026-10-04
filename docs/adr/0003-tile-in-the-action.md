---
status: accepted
date: 2026-10-04
---

# Images are tiled by libvips in the build Action, never in the browser

The build Action tiles each Image with libvips, as IIIF Image API 3 level-0 tiles.
Since 2026-10-04 it does so through `sharp`, which bundles libvips, so the Action
installs no system package (`docs/spikes/2026-10-04-tiling.md`). Images up to
25 MiB are committed through the browser; larger ones (up to 2 GB) are attached to a
GitHub Release and the Action fetches them. No Git LFS: its bandwidth is metered and a
copied repository would hit the quota.

Tiling in the browser was the first plan. Archie's ADR-0004 had already rejected
wasm-vips (no `dzsave` binding, a 13-20 MB binary), and once GitHub runs the build,
real libvips costs nothing. Tiles go into the Pages deployment, not into Git, so the
repository stays small.
