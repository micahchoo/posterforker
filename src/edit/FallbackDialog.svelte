<script lang="ts">
  // Saving without signing in: each change opens the GitHub page that makes it.
  import { fileLink } from './links.ts';
  import type { EditSession } from './session.svelte.ts';
  let { session, open = $bindable(false) }: { session: EditSession; open: boolean } = $props();

  let dialog = $state<HTMLDialogElement>();
  let copied = $state('');
  $effect(() => {
    if (open) dialog?.showModal();
    else dialog?.close();
  });
  const repo = $derived(session.collection.repository && session.collection.branch ? { repository: session.collection.repository, branch: session.collection.branch } : null);

  async function copy(path: string, text: string) {
    await navigator.clipboard.writeText(text);
    copied = path;
  }
</script>

<dialog bind:this={dialog} aria-label="Save without signing in" onclose={() => (open = false)}>
  <h2>Save without signing in</h2>
  <p>Each change below opens the right page on GitHub. Make them in order, and commit each one there.</p>
  <ol>
    {#each session.pending as change (change.path)}
      {@const exists = change.path in session.files}
      <li>
        <span class="what">{'text' in change ? (exists ? 'Change' : 'Add') : 'Delete'}</span>
        <code>{change.path}</code>
        <span class="do">
          {#if 'text' in change && exists}
            <button type="button" onclick={() => copy(change.path, change.text)}>{copied === change.path ? 'Copied' : 'Copy the new text'}</button>
          {/if}
          {#if repo}<a href={fileLink(repo, change, exists)} target="_blank" rel="noopener">Open on GitHub</a>{/if}
        </span>
        {#if 'text' in change && exists}<span class="how">On GitHub: select all the text in the file, paste, commit.</span>{/if}
      </li>
    {/each}
  </ol>
  <p class="better">Signing in does all of this with one click.</p>
  <button type="button" class="close" onclick={() => (open = false)}>Close</button>
</dialog>

<style>
  dialog {
    max-width: 40rem;
    width: calc(100% - 2rem);
    border: 0;
    border-radius: 14px;
    padding: 1.25rem 1.5rem;
    box-shadow: 0 20px 60px rgb(0 0 0 / 0.3);
  }
  dialog::backdrop {
    background: rgb(0 0 0 / 0.4);
  }
  h2 {
    margin: 0 0 0.25rem;
  }
  ol {
    padding-left: 1.2rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  li {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    align-items: center;
  }
  .what {
    font-weight: 700;
  }
  .do {
    display: flex;
    gap: 0.5rem;
    margin-left: auto;
  }
  .how {
    width: 100%;
    font-size: 0.8rem;
    color: #666;
  }
  .better {
    color: #444;
  }
  .close {
    padding: 0.5rem 1rem;
    border-radius: 10px;
    border: 1px solid #bbb;
    background: #fff;
    cursor: pointer;
  }
</style>
