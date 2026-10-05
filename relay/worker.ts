// The sign-in relay (ADR-0005). GitHub's code-for-token exchange needs the App's secret and
// refuses browser calls, so this Worker does that one step and holds nothing.
//
//   /login?return=<site>/edit/&nonce=…   → GitHub's sign-in page
//   /callback?code=…&state=…             → back to <site>/edit/#pf-token=…  (or #pf-error=…)
//   /installed?state=…                   → the App was just installed: sign in again
//
// A token goes back only to a GitHub Pages site whose owner account has the App installed
// for the signed-in user. Without that check, any site could collect tokens through this
// same sign-in by naming itself as the way back.

export type Env = { CLIENT_ID: string; CLIENT_SECRET: string; APP_SLUG: string };

/** https://<owner>.github.io/<any path>/edit/ — the /edit page of a Pages site, nothing else. */
const EDIT_PAGE = /^https:\/\/([a-z0-9](?:[a-z0-9-]{0,38}))\.github\.io\/(?:[^?#]*\/)?edit\/$/i;

const redirect = (to: string) => new Response(null, { status: 302, headers: { location: to, 'cache-control': 'no-store' } });
const back = (ret: string, fields: Record<string, string>) => redirect(`${ret}#${new URLSearchParams(fields)}`);

const encodeState = (s: { r: string; n: string }) => btoa(JSON.stringify(s)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
function decodeState(state: string): { r: string; n: string } | null {
  try {
    const value = JSON.parse(atob(state.replace(/-/g, '+').replace(/_/g, '/')));
    return typeof value?.r === 'string' && typeof value?.n === 'string' ? value : null;
  } catch {
    return null;
  }
}

export async function handle(req: Request, env: Env, github: typeof fetch = fetch): Promise<Response> {
  const url = new URL(req.url);

  if (url.pathname === '/login') {
    const ret = url.searchParams.get('return') ?? '';
    if (!EDIT_PAGE.test(ret)) return new Response('That is not the edit page of a GitHub Pages site.', { status: 400 });
    const to = new URL('https://github.com/login/oauth/authorize');
    to.searchParams.set('client_id', env.CLIENT_ID);
    to.searchParams.set('redirect_uri', `${url.origin}/callback`);
    to.searchParams.set('state', encodeState({ r: ret, n: (url.searchParams.get('nonce') ?? '').slice(0, 64) }));
    return redirect(to.href);
  }

  if (url.pathname === '/callback') {
    const state = decodeState(url.searchParams.get('state') ?? '');
    const owner = state?.r.match(EDIT_PAGE)?.[1]?.toLowerCase();
    if (!state || !owner) return new Response('This sign-in link is broken. Start again from your edit page.', { status: 400 });

    const exchange = (await github('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { accept: 'application/json', 'content-type': 'application/json' },
      body: JSON.stringify({ client_id: env.CLIENT_ID, client_secret: env.CLIENT_SECRET, code: url.searchParams.get('code') ?? '' }),
    }).then((r) => r.json())) as { access_token?: string };
    const token = exchange.access_token;
    if (!token) return back(state.r, { 'pf-error': 'login-failed' });

    const { installations = [] } = (await github('https://api.github.com/user/installations', {
      headers: { authorization: `Bearer ${token}`, accept: 'application/vnd.github+json', 'user-agent': 'posterforker-relay' },
    }).then((r) => r.json())) as { installations?: Array<{ account: { login: string } }> };
    if (!installations.some((i) => i.account.login.toLowerCase() === owner)) {
      // GitHub carries `state` through the install and hands it to /installed afterwards.
      const install = new URL(`https://github.com/apps/${env.APP_SLUG}/installations/new`);
      install.searchParams.set('state', url.searchParams.get('state') ?? '');
      return back(state.r, { 'pf-error': 'not-installed', 'pf-install': install.href });
    }
    return back(state.r, { 'pf-token': token, 'pf-nonce': state.n });
  }

  if (url.pathname === '/installed') {
    // The App's setup URL. The Maker installed it mid-sign-in; carry on where they were.
    const state = decodeState(url.searchParams.get('state') ?? '');
    if (!state || !EDIT_PAGE.test(state.r)) return new Response('Installed. Go back to your edit page and sign in.', { status: 200 });
    const again = new URL('/login', url.origin);
    again.searchParams.set('return', state.r);
    again.searchParams.set('nonce', state.n);
    return redirect(again.href);
  }

  return new Response('PosterForker sign-in relay.', { status: 404 });
}

export default { fetch: (req: Request, env: Env) => handle(req, env) };
