# The sign-in relay

`/edit` saves in one commit after **Sign in with GitHub** (ADR-0005). GitHub's
code-for-token exchange needs a secret and refuses browser calls, so a Cloudflare Worker
(`relay/worker.ts`) does that one step. It stores nothing.

## Set it up (once)

```bash
node scripts/setup-relay.mjs
```

It asks for two clicks: a Cloudflare login (free account), and **Create GitHub App** on
GitHub's form, which it fills in. It then stores the App's secret in the Worker and sets
the engine's repository variable `POSTERFORKER_RELAY`. The next release
(`docs/PIPELINE.md` §3) turns sign-in on for every Collection.

## What the App may do

Contents: read and write; Actions: read; Metadata: read. A Maker installs it on their
Collection's repository only, the first time they sign in. The relay gives a token only
to a `<owner>.github.io/…/edit/` page whose owner has the App installed for that user.

## When it breaks

`/edit` falls back to **Save without signing in**, which opens GitHub's own pages. To
rotate the secret: GitHub → the App → Generate a new client secret, then
`cd relay && npx wrangler secret put CLIENT_SECRET`.
