// The page's half of signing in (ADR-0005). The relay sends the Maker back to
// <site>/edit/#pf-token=…&pf-nonce=…; the token counts only with the nonce this tab sent,
// so a crafted link cannot sign the Maker in as someone else.

export type SignIn = { token: string } | { error: 'not-installed'; install: string } | { error: 'login-failed' };

export function signInUrl(relay: string, editPage: string, nonce: string): string {
  const u = new URL('/login', relay);
  u.searchParams.set('return', editPage.split('#')[0]!);
  u.searchParams.set('nonce', nonce);
  return u.href;
}

export function readSignIn(hash: string, sentNonce: string | null): SignIn | null {
  const f = new URLSearchParams(hash.replace(/^#/, ''));
  const token = f.get('pf-token');
  if (token) return sentNonce && f.get('pf-nonce') === sentNonce ? { token } : { error: 'login-failed' };
  const error = f.get('pf-error');
  if (error === 'not-installed') return { error, install: f.get('pf-install') ?? '' };
  if (error) return { error: 'login-failed' };
  return null;
}
