---
status: accepted
date: 2026-10-04
---

# A Maker copies a template; the engine arrives as a versioned GitHub Action

A Maker's repository holds only content (Images, Scenes, Theme, `collection.yml`) and a
short workflow that calls `posterforker/build@v1`. The viewer and the build live in
that Action, and the moving `v1` tag delivers fixes on the next build.

## Considered Options

- **Fork the engine repo.** "Sync fork" would deliver updates, but GitHub allows one
  fork per account per upstream and forks of public repos are public: one Collection
  per Maker, never private. Rejected despite the product's name.
- **Template that contains the engine.** Unlimited private copies, but a copy has no
  link upstream, so no Collection would ever receive a fix.
