import { describe, expect, it } from 'vitest';
import { handle, type Env } from '../relay/worker.ts';

const env: Env = { CLIENT_ID: 'Iv1.abc', CLIENT_SECRET: 's3cret', APP_SLUG: 'posterforker' };
const RELAY = 'https://relay.example.workers.dev';
const RETURN = 'https://maker.github.io/col/edit/';

/** GitHub as the relay sees it: the token exchange and the user's installations. */
const github = (installedOn: string[], exchange: Record<string, unknown> = { access_token: 'ghu_tok' }) =>
  (async (input: string | URL | Request, init: RequestInit = {}) => {
    const url = String(input instanceof Request ? input.url : input);
    if (url === 'https://github.com/login/oauth/access_token') {
      const body = JSON.parse(String(init.body));
      expect(body).toEqual({ client_id: 'Iv1.abc', client_secret: 's3cret', code: 'c0de' });
      return Response.json(exchange);
    }
    if (url === 'https://api.github.com/user/installations') {
      expect(new Headers(init.headers).get('authorization')).toBe('Bearer ghu_tok');
      return Response.json({ installations: installedOn.map((login) => ({ account: { login } })) });
    }
    return new Response('unexpected', { status: 500 });
  }) as typeof fetch;

const go = (path: string, f: typeof fetch = github(['Maker'])) => handle(new Request(`${RELAY}${path}`), env, f);
const login = async (ret = RETURN) => {
  const res = await go(`/login?return=${encodeURIComponent(ret)}&nonce=n1`);
  return { res, state: new URL(res.headers.get('location') ?? 'x:').searchParams.get('state') };
};
const fragment = (res: Response) => new URLSearchParams(new URL(res.headers.get('location')!).hash.slice(1));

describe('relay', () => {
  it('sends the Maker to GitHub with a way back', async () => {
    const { res } = await login();
    expect(res.status).toBe(302);
    const to = new URL(res.headers.get('location')!);
    expect(to.origin + to.pathname).toBe('https://github.com/login/oauth/authorize');
    expect(to.searchParams.get('client_id')).toBe('Iv1.abc');
    expect(to.searchParams.get('redirect_uri')).toBe(`${RELAY}/callback`);
  });

  it('refuses a way back that is not a Pages site’s /edit/', async () => {
    for (const bad of ['https://evil.example/edit/', 'http://maker.github.io/col/edit/', 'https://maker.github.io/col/', 'javascript:alert(1)']) {
      expect((await login(bad)).res.status).toBe(400);
    }
  });

  it('hands the token back in the fragment, to a site whose owner installed the App', async () => {
    const { state } = await login();
    const res = await go(`/callback?code=c0de&state=${state}`);
    expect(res.status).toBe(302);
    expect(res.headers.get('location')!.startsWith(RETURN + '#')).toBe(true);
    expect(fragment(res).get('pf-token')).toBe('ghu_tok');
    expect(fragment(res).get('pf-nonce')).toBe('n1');
  });

  it('gives no token to a site whose owner has not installed the App for this user', async () => {
    const { state } = await login('https://copycat.github.io/col/edit/');
    const res = await go(`/callback?code=c0de&state=${state}`);
    const f = fragment(res);
    expect(f.get('pf-token')).toBeNull();
    expect(f.get('pf-error')).toBe('not-installed');
    const install = new URL(f.get('pf-install')!);
    expect(install.origin + install.pathname).toBe('https://github.com/apps/posterforker/installations/new');
    expect(install.searchParams.get('state')).toBe(state);
  });

  it('after the App is installed, signs the Maker in again by itself', async () => {
    const { state } = await login();
    const res = await go(`/installed?installation_id=1&setup_action=install&state=${state}`);
    const again = new URL(res.headers.get('location')!);
    expect(again.href).toBe(`${RELAY}/login?return=${encodeURIComponent(RETURN)}&nonce=n1`);
  });

  it('reports a failed exchange without a token', async () => {
    const { state } = await login();
    const res = await go(`/callback?code=c0de&state=${state}`, github(['maker'], { error: 'bad_verification_code' }));
    expect(fragment(res).get('pf-error')).toBe('login-failed');
    expect(fragment(res).get('pf-token')).toBeNull();
  });
});
