# Pipeline

Every Collection builds with `micahchoo/posterforker@v1`, and `v1` moves with each
release. **A release reaches every Maker's next build, unasked.** That is the feature,
and it is why each step below exists.

## 1. Develop

Test first. Each layer has its own test seam:

| Change in | Test with | Seam |
|---|---|---|
| `src/core` | `test/core/*.test.ts` | pure functions |
| `src/build` | `test/build/build.test.ts` | the CLI: exit code and `::error` lines |
| `src/viewer`, `src/edit` (logic) | `test/viewer`, `test/edit` | pure functions |
| `src/viewer`, `src/edit` (pages) | `e2e/*.spec.ts` | a fixture Collection built by the real build, in Chromium |

```bash
pnpm test && pnpm typecheck && pnpm e2e
```

`test/fixtures/` is shared. Never edit a fixture to fix one test: make a new one, or
write the variant in the test (as `e2e/prepare.ts` does for its layout).

Look at the pages, too. A passing e2e run has shipped an empty chip and broken icons
before; take a screenshot of anything you changed on screen.

## 2. Continuous integration

`.github/workflows/test.yml`, on every push to `main` and every pull request:

- **test**: typecheck, unit tests, browser tests.
- **template**: checks out `micahchoo/posterforker-template` and builds it with this
  commit. The template is what every Maker starts from; if this job fails, a release
  would break new Collections.

## 3. Release

1. Bump `version` in `package.json` on `main`; push; wait for CI to pass.
2. `git tag vX.Y.Z && git push origin vX.Y.Z`.
3. `.github/workflows/release.yml` runs the tests again, builds `dist/` (the viewer and
   `/edit`), commits it onto the tag's commit, and force-moves the major tag (`v1`).
   Only this workflow commits `dist/`; it is ignored everywhere else.
4. Check one real Collection:

   ```bash
   gh workflow run Publish -R micahchoo/posterforker-template
   gh run watch -R micahchoo/posterforker-template "$(gh run list -R micahchoo/posterforker-template -L1 --json databaseId -q '.[0].databaseId')"
   ```

   then open https://micahchoo.github.io/posterforker-template/ and walk the Scenes.

To withdraw a bad release, move `v1` back: `git push --force origin <good-commit>:refs/tags/v1`.

## 4. What may change inside v1

A Collection that built under `v1` must still build under every later `v1`. So, inside
v1:

- The format only grows: new optional keys, new Modules, new presets. No key is
  renamed, removed, or made required, and no default changes what an existing
  Collection looks like.
- `action.yml` inputs and outputs only grow.
- A Module name in `MODULES` and a Slot name in `SLOTS` are never removed.

Anything else is `v2`: a new major tag, and the template's workflow moves to it.

## 5. The template

`micahchoo/posterforker-template` is its own repository, marked as a template. Change it
there. Its `Publish` workflow is the same file every Maker copies, so test a change to it
on the template's own Pages before anyone copies it.
