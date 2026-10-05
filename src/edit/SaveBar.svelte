<script lang="ts">
  import { signInUrl } from './auth.ts';
  import { RELAY_URL } from './config.ts';
  import type { EditSession } from './session.svelte.ts';
  let { session, onfallback }: { session: EditSession; onfallback: () => void } = $props();

  const n = $derived(session.pending.length);
  const site = new URL('../', document.baseURI).href;

  function signIn() {
    const nonce = crypto.randomUUID();
    sessionStorage.setItem('pf-nonce', nonce);
    location.href = signInUrl(RELAY_URL, location.href, nonce);
  }
  function signOut() {
    sessionStorage.removeItem('pf-token');
    location.reload();
  }
</script>

<div class="bar">
  <button type="button" class="ghost" disabled={session.steps.length === 0} onclick={() => session.undo()}>Undo</button>

  {#if session.connection}
    {#if session.status.kind === 'saving'}
      <span class="state">Saving…</span>
    {:else if session.status.kind === 'publishing'}
      <span class="state busy">Publishing… about a minute</span>
    {:else if session.status.kind === 'live'}
      <a class="state ok" href={site} target="_blank" rel="noopener">Live ✓ — see it</a>
    {:else if session.status.kind === 'failed'}
      <a class="state bad" href="https://github.com/{session.collection.repository}/actions" target="_blank" rel="noopener">Not published — see why</a>
    {/if}
    <button type="button" class="primary" disabled={n === 0 || session.status.kind === 'saving'} onclick={() => session.save()}>
      Save{#if n > 0}<span class="n">{n}</span>{/if}
    </button>
    <span class="who">Signed in <button type="button" class="link" onclick={signOut}>Sign out</button></span>
  {:else}
    {#if n > 0}
      <span class="state">{n} unsaved change{n === 1 ? '' : 's'}</span>
      <button type="button" class="ghost" onclick={onfallback}>Save without signing in</button>
    {/if}
    {#if RELAY_URL}
      <button type="button" class="primary" onclick={signIn}>Sign in with GitHub to save</button>
    {/if}
  {/if}
</div>

<style>
  .bar {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    flex-wrap: wrap;
    justify-content: flex-end;
  }
  button {
    font: inherit;
    cursor: pointer;
  }
  .primary {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    padding: 0.55rem 1.1rem;
    border-radius: 10px;
    border: 0;
    background: #1f5fbf;
    color: #fff;
    font-weight: 700;
  }
  .primary:disabled {
    background: #a8b6cc;
    cursor: default;
  }
  .n {
    background: #fff;
    color: #1f5fbf;
    border-radius: 999px;
    padding: 0 0.45rem;
    font-size: 0.85rem;
  }
  .ghost {
    padding: 0.5rem 0.85rem;
    border-radius: 10px;
    border: 1px solid #c3c3c3;
    background: #fff;
  }
  .ghost:disabled {
    opacity: 0.45;
    cursor: default;
  }
  .state {
    font-size: 0.9rem;
    color: #444;
  }
  .busy::before {
    content: '';
    display: inline-block;
    width: 0.7rem;
    height: 0.7rem;
    margin-right: 0.4rem;
    border-radius: 50%;
    border: 2px solid #1f5fbf;
    border-right-color: transparent;
    animation: spin 0.9s linear infinite;
    vertical-align: -1px;
  }
  @media (prefers-reduced-motion: reduce) {
    .busy::before {
      animation: none;
    }
  }
  @keyframes spin {
    to {
      transform: rotate(1turn);
    }
  }
  .ok {
    color: #0b6b2f;
    font-weight: 700;
  }
  .bad {
    color: #a40000;
    font-weight: 700;
  }
  .who {
    font-size: 0.85rem;
    color: #555;
  }
  .link {
    background: none;
    border: 0;
    color: #1f3f74;
    text-decoration: underline;
    padding: 0;
  }
</style>
