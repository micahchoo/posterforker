---
status: accepted
date: 2026-10-04
---

# GitHub is the backend, and the Maker never runs anything locally

A Collection is a GitHub repository. GitHub's own interface does every write, a GitHub
Action builds and tiles, and GitHub Pages hosts. PosterForker has no server, no login
and no storage of its own, and any feature that needs a terminal on the Maker's
computer is out of scope.

We chose this over a browser editor with its own storage (the shape of the author's
other tool, Archie) because the aim is a tool simpler for the Maker than Archie. A
login from a Pages-hosted page is not possible anyway: GitHub's device-flow login is
refused by CORS in a browser tab (Archie, `publish-machine.svelte.ts`).

## Consequences

- Helper pages (Scene picker, Theme editor) produce text and open the right GitHub
  page; the Maker commits there.
- GitHub's limits are the product's limits: 25 MiB per browser upload, 2 GB per
  Release asset, about 1 GB per repository.
- An optional Module may need a server, but a Collection must work without it.
