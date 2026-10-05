#!/usr/bin/env node
// One-time setup of the sign-in relay (ADR-0005, docs/RELAY.md). Run from the repository root:
//
//   node scripts/setup-relay.mjs
//
// It does everything except two clicks only the owner can make: logging in to Cloudflare,
// and pressing "Create GitHub App" on GitHub's own (prefilled) form.
import { execFileSync, spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';

const ENGINE = 'micahchoo/posterforker';
const PORT = 3456;
const say = (s) => console.log(`\n\x1b[1m${s}\x1b[0m`);
const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'inherit'], ...opts });
const wrangler = (args, opts = {}) => run('npx', ['--yes', 'wrangler', ...args], { cwd: 'relay', ...opts });

// 1. Accounts
say('1/5  Checking GitHub and Cloudflare logins');
run('gh', ['auth', 'status']);
if (/not authenticated/i.test(spawnSync('npx', ['--yes', 'wrangler', 'whoami'], { cwd: 'relay', encoding: 'utf8' }).stdout ?? '')) {
  console.log('A browser opens for Cloudflare. Log in (a free account is enough), then come back here.');
  spawnSync('npx', ['--yes', 'wrangler', 'login'], { cwd: 'relay', stdio: 'inherit' });
}

// 2. Deploy the relay, to learn its address
say('2/5  Deploying the relay to Cloudflare');
const deployed = wrangler(['deploy']);
const relay = deployed.match(/https:\/\/[\w.-]+\.workers\.dev/)?.[0];
if (!relay) throw new Error(`Could not find the relay's address in:\n${deployed}`);
console.log(`Relay: ${relay}`);

// 3. Create the GitHub App from a manifest: GitHub shows its form prefilled; you press Create.
say('3/5  Creating the GitHub App');
const state = randomUUID();
const manifest = {
  name: 'PosterForker',
  description: 'Lets PosterForker’s editor save your Collection in one commit.',
  url: `https://github.com/${ENGINE}`,
  hook_attributes: { url: relay, active: false },
  redirect_url: `http://127.0.0.1:${PORT}/done`,
  callback_urls: [`${relay}/callback`],
  setup_url: `${relay}/installed`,
  setup_on_update: false,
  public: true,
  request_oauth_on_install: false,
  default_permissions: { contents: 'write', actions: 'read', metadata: 'read' },
  default_events: [],
};
const code = await new Promise((resolve, reject) => {
  const server = createServer((req, res) => {
    const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
    if (url.pathname === '/') {
      res.writeHead(200, { 'content-type': 'text/html' });
      res.end(`<!doctype html><meta charset="utf-8"><title>Create the PosterForker App</title>
        <form method="post" action="https://github.com/settings/apps/new?state=${state}">
        <input type="hidden" name="manifest" value='${JSON.stringify(manifest).replace(/'/g, '&#39;')}'>
        <p>GitHub will show its "Create GitHub App" form, already filled in. If the name is taken, change it there.</p>
        <button>Continue to GitHub</button></form><script>document.forms[0].submit()</script>`);
      return;
    }
    if (url.pathname === '/done' && url.searchParams.get('state') === state) {
      res.writeHead(200, { 'content-type': 'text/html' });
      res.end('<!doctype html><meta charset="utf-8"><p>Done. You can close this tab and go back to the terminal.</p>');
      server.close();
      resolve(url.searchParams.get('code'));
      return;
    }
    res.writeHead(404).end();
  });
  server.on('error', reject);
  server.listen(PORT, '127.0.0.1', () => {
    const open = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
    console.log(`A browser opens on GitHub. Press "Create GitHub App". (If nothing opens: http://127.0.0.1:${PORT}/)`);
    spawnSync(open, [`http://127.0.0.1:${PORT}/`], { stdio: 'ignore', shell: process.platform === 'win32' });
  });
});
const app = JSON.parse(run('gh', ['api', '-X', 'POST', `/app-manifests/${code}/conversions`]));
console.log(`App: ${app.html_url}`);

// 4. Give the relay the App's id and secret
say('4/5  Storing the App’s secret in the relay');
wrangler(['secret', 'put', 'CLIENT_ID'], { input: app.client_id });
wrangler(['secret', 'put', 'CLIENT_SECRET'], { input: app.client_secret });
wrangler(['deploy', '--var', `APP_SLUG:${app.slug}`]);

// 5. Point the engine's builds at the relay
say('5/5  Telling the engine where the relay is');
run('gh', ['variable', 'set', 'POSTERFORKER_RELAY', '-R', ENGINE, '-b', relay]);

say('Done.');
console.log(`The next engine release turns on "Sign in with GitHub" in every Collection's /edit.
  git tag vX.Y.Z && git push origin vX.Y.Z      (see docs/PIPELINE.md §3)`);
