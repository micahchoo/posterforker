import { mount } from 'svelte';
import type { SiteCollection } from '../core/names.ts';
import { readSignIn } from './auth.ts';
import Edit from './Edit.svelte';
import type { Connection } from './github.ts';
import { EditSession } from './session.svelte.ts';

const collection = (await (await fetch(new URL('../collection.json', document.baseURI))).json()) as SiteCollection;
document.title = `Edit · ${collection.title}`;

// Back from signing in: take the token (if its nonce is ours), then clear it from the address.
let notice = '';
const signIn = readSignIn(location.hash, sessionStorage.getItem('pf-nonce'));
if (signIn) {
  history.replaceState(null, '', location.pathname + location.search);
  if ('token' in signIn) {
    sessionStorage.removeItem('pf-nonce');
    sessionStorage.setItem('pf-token', signIn.token);
  } else if (signIn.error === 'not-installed' && signIn.install) {
    // First time: GitHub asks the Maker to let PosterForker save to this repository, then
    // the relay signs them in again by itself. The nonce stays for that second return.
    location.href = signIn.install;
  } else {
    sessionStorage.removeItem('pf-nonce');
    notice = 'Signing in did not work. Try again, or save without signing in.';
  }
}

const token = sessionStorage.getItem('pf-token');
const connection: Connection | null =
  token && collection.repository && collection.branch ? { repository: collection.repository, branch: collection.branch, token } : null;

const session = new EditSession(collection, connection);
mount(Edit, { target: document.getElementById('app')!, props: { session } });
if (notice) session.say(notice);
session.load().catch(() => {
  // A token GitHub no longer accepts: forget it and edit from the published files.
  sessionStorage.removeItem('pf-token');
  location.reload();
});
