# PosterForker v1.1 plan: an editor a Maker enjoys

v1.1 is finished when this passes:

> A Maker who has never seen `/edit` opens it, signs in, moves one Scene, rewrites
> another, adds a third, reorders them, picks a new look, moves the Share button to
> another corner, and presses Save once. Without leaving the page or reading
> instructions, they watch it go live in under two minutes.

Why: ADR-0005. Build a phase only after the one before it passes.

**Status, 2026-10-04:** phases 1–5 pass locally; phase 6 waits on the owner (`HANDOFF.md`).

## Phase 1: Make a token safe to hold

- Scene Markdown renders without raw HTML, and only `http(s):`, `mailto:` and relative
  links survive (`core/source.ts`).
- A Content Security Policy `<meta>` on the viewer and on `/edit`: scripts from the
  site only.

**First failing test:** a Scene whose words contain `<img src=x onerror=alert(1)>` and
`[x](javascript:alert(1))` renders both as harmless text.

## Phase 2: The edit model (pure)

`src/edit/draft.ts`: the Collection as loaded, plus a list of changes (add, move, retitle,
rewrite, delete and reorder Scenes; Theme; layout). It turns them into file changes:
path → new text, or delete.

Scene order moves into `tour.yml` as an optional `scenes:` list, so reordering never
renames a file and a shared `#scene=` link survives. New Scenes get a file name from their
title (`mount-fuji.md`). The format only grows: a Tour without `scenes:` still plays in
file-name order.

**First failing test:** move Scene 2 to first place and retitle it. The file changes are
one `tour.yml` with `scenes: [02, 01, 03, 04]` and one rewritten `02.md`, and the build
reads both back.

## Phase 3: Saving

- `src/edit/github.ts`: one commit through the Git Data API (ref, blobs, tree, commit,
  update ref). A conflict, when someone else committed meanwhile, is reported, never
  overwritten.
- Then follow the Publish run until it is live.
- The fallback without sign-in: today's links.

**First failing test:** against a fake GitHub, three changes make exactly one commit
whose tree holds the three paths. A moved branch head fails with "Someone else saved
first".

## Phase 4: The relay (`relay/`)

A Cloudflare Worker with two routes: `/login` redirects to GitHub, and `/callback`
exchanges the code, checks where the token may go, and redirects to `<site>/edit/#token=…`.

**First failing test:** a return address on a Pages site whose owner has not installed
the App for this user gets no token.

## Phase 5: The editor

The viewer with an edit layer, as sketched in `.brainstorm/sessions/0002`. Select a Scene
to move and resize it with handles. Edit words in place. Drag to reorder. "+ Add Scene".
A Look drawer of named looks and swatches; unreadable colours are never offered. Drag a
Module onto a corner. A bar reads "N unsaved changes · Save", then "Publishing…", then
"Live ✓".

**First failing test (Playwright):** the v1.1 sentence above, against a fake GitHub.

## Phase 6: The owner's steps, then release

Create the GitHub App and deploy the Worker. Only the owner can do these, so a wizard
script guides them. Then release v1.1.0.
