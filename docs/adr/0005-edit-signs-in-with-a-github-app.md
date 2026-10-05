---
status: accepted
date: 2026-10-04
---

# /edit signs in with a GitHub App and saves in one commit

Amends ADR-0001 for `/edit` only. Readers, the build and publishing stay serverless.

The owner judged `/edit` not user-friendly enough, and the cause was ADR-0001: with no
login, every save left the page, one file per commit, and editing an existing file meant
select-all-and-paste on GitHub. "Extremely user-friendly" and "never leave the page to
save" are one requirement.

So `/edit` has **Sign in with GitHub**. A GitHub App (Contents: read and write, Actions:
read), installed by the Maker on their Collection's repository only, issues a user token.
`/edit` keeps every change in a list and **Save** writes them as one commit through the Git
Data API, which accepts browser calls (CORS allows `Authorization` from any origin, checked
2026-10-04).

GitHub's code-for-token exchange does not accept browser calls and needs the App's
secret, so a relay does that one step: a Cloudflare Worker in `relay/`, holding no data.
It returns the token in the URL fragment, and only to a Pages site owned by an account
on which the App is installed for the signed-in user. That check is what stops another
site from collecting tokens through the same sign-in.

## Considered Options

- **Stay login-free; batch through GitHub's upload page.** Still leaves the page to save.
- **A pasted fine-grained token.** GitHub can prefill the form (2025-08), but the Maker
  faces GitHub's token screen, and a long-lived token sits in a public page's storage.

## Consequences

- The old links stay as the fallback when the relay is down or the Maker will not sign in.
- A token in the page makes script injection serious, so Scene Markdown loses raw HTML
  and `javascript:` links, and both pages carry a Content Security Policy.
- The relay is a service someone must keep running: one Worker and one App secret.
