import { describe, expect, it } from 'vitest';
import { readSignIn, signInUrl } from '../../src/edit/auth.ts';

describe('sign-in handshake', () => {
  it('asks the relay to come back to this edit page', () => {
    const u = new URL(signInUrl('https://relay.example', 'https://maker.github.io/col/edit/#x', 'n1'));
    expect(u.origin + u.pathname).toBe('https://relay.example/login');
    expect(u.searchParams.get('return')).toBe('https://maker.github.io/col/edit/');
    expect(u.searchParams.get('nonce')).toBe('n1');
  });

  it('takes a token only with the nonce this tab sent', () => {
    expect(readSignIn('#pf-token=ghu_1&pf-nonce=n1', 'n1')).toEqual({ token: 'ghu_1' });
    expect(readSignIn('#pf-token=ghu_1&pf-nonce=n2', 'n1')).toEqual({ error: 'login-failed' });
    expect(readSignIn('#pf-token=ghu_1&pf-nonce=n1', null)).toEqual({ error: 'login-failed' });
  });

  it('passes on what the relay said went wrong', () => {
    expect(readSignIn('#pf-error=not-installed&pf-install=https%3A%2F%2Fgithub.com%2Fapps%2Fposterforker%2Finstallations%2Fnew', 'n1')).toEqual({
      error: 'not-installed',
      install: 'https://github.com/apps/posterforker/installations/new',
    });
  });

  it('ignores a page opened normally', () => {
    expect(readSignIn('', 'n1')).toBeNull();
    expect(readSignIn('#tour=river', 'n1')).toBeNull();
  });
});
