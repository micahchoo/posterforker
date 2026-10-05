<script lang="ts">
  // /edit: the Image with its Scenes, the look and the layout — all changed in place, saved once.
  import FallbackDialog from './FallbackDialog.svelte';
  import LayoutBoard from './LayoutBoard.svelte';
  import LookPanel from './LookPanel.svelte';
  import Preview from './Preview.svelte';
  import SaveBar from './SaveBar.svelte';
  import SceneForm from './SceneForm.svelte';
  import SceneList from './SceneList.svelte';
  import type { EditSession } from './session.svelte.ts';
  import Stage from './Stage.svelte';

  let { session }: { session: EditSession } = $props();
  const TABS = [
    ['scenes', 'Scenes'],
    ['look', 'Look'],
    ['layout', 'Layout'],
  ] as const;
  let tab = $state<(typeof TABS)[number][0]>('scenes');
  let fallback = $state(false);

  function onkeydown(e: KeyboardEvent) {
    const typing = (e.target as HTMLElement).closest('input, textarea, select');
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z' && !typing) {
      e.preventDefault();
      session.undo();
    }
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      if (session.connection) void session.save();
      else fallback = true;
    }
  }
</script>

<svelte:window {onkeydown} />

<div class="edit">
  <header>
    <div class="who">
      <a class="back" href="../" title="See it as Readers do">← {session.collection.title}</a>
      <span class="badge">Editing</span>
    </div>
    <div class="tabs" role="tablist" aria-label="What to change">
      {#each TABS as [id, label] (id)}
        <button type="button" role="tab" aria-selected={tab === id} onclick={() => (tab = id)}>{label}</button>
      {/each}
    </div>
    <SaveBar {session} onfallback={() => (fallback = true)} />
  </header>

  {#if session.collection.tours.length > 1}
    <nav class="tours" aria-label="Tours">
      {#each session.collection.tours as t, i (t.id)}
        <button type="button" aria-current={session.tourIndex === i ? 'true' : undefined} onclick={() => ((session.tourIndex = i), session.select(null))}>{t.title}</button>
      {/each}
    </nav>
  {/if}

  <main class={tab}>
    {#if !session.loaded}
      <p class="loading">Opening your Collection…</p>
    {:else if tab === 'scenes'}
      <aside class="side">
        <SceneList {session} />
        <SceneForm {session} />
      </aside>
      <div class="main"><Stage {session} /></div>
    {:else}
      <aside class="side">
        {#if tab === 'look'}<LookPanel {session} />{:else}<LayoutBoard {session} />{/if}
      </aside>
      <div class="main"><Preview {session} /></div>
    {/if}
  </main>

  <p class="notice" role="status">{session.notice}</p>
  <FallbackDialog {session} bind:open={fallback} />
</div>

<style>
  :global(html, body) {
    margin: 0;
    height: 100%;
    font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
    color: #1b1b1b;
    background: #f5f5f2;
  }
  :global(:focus-visible) {
    outline: 3px solid #1f5fbf;
    outline-offset: 2px;
  }
  :global(#app) {
    height: 100%;
  }
  .edit {
    display: flex;
    flex-direction: column;
    height: 100%;
  }
  header {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    gap: 0.75rem;
    padding: 0.6rem 1rem;
    background: #fff;
    border-bottom: 1px solid #e3e3e3;
  }
  .who {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    min-width: 0;
  }
  .back {
    font-weight: 700;
    color: inherit;
    text-decoration: none;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .badge {
    font-size: 0.75rem;
    background: #fff4d6;
    color: #6b4a00;
    border-radius: 999px;
    padding: 0.15rem 0.55rem;
  }
  .tabs {
    display: flex;
    background: #f0f0ec;
    border-radius: 12px;
    padding: 0.2rem;
  }
  .tabs button {
    font: 600 0.95rem system-ui, sans-serif;
    border: 0;
    background: none;
    padding: 0.45rem 1.1rem;
    border-radius: 10px;
    cursor: pointer;
    color: #444;
  }
  .tabs button[aria-selected='true'] {
    background: #fff;
    color: #111;
    box-shadow: 0 1px 4px rgb(0 0 0 / 0.12);
  }
  .tours {
    display: flex;
    gap: 0.4rem;
    padding: 0.5rem 1rem 0;
  }
  .tours button {
    border: 1px solid #ccc;
    border-radius: 999px;
    background: #fff;
    padding: 0.3rem 0.8rem;
    cursor: pointer;
  }
  .tours button[aria-current] {
    background: #1b1b1b;
    color: #fff;
  }
  main {
    flex: 1;
    min-height: 0;
    display: grid;
    grid-template-columns: minmax(19rem, 24rem) 1fr;
    /* One row the height of the window: the side column scrolls, the Image never runs off. */
    grid-template-rows: minmax(0, 1fr);
    gap: 1rem;
    padding: 1rem;
  }
  .side {
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    padding-right: 0.25rem;
  }
  .main {
    min-height: 0;
  }
  .loading {
    grid-column: 1 / -1;
    text-align: center;
    color: #555;
  }
  .notice {
    position: fixed;
    left: 50%;
    bottom: 1.25rem;
    transform: translateX(-50%);
    margin: 0;
    max-width: min(36rem, calc(100% - 2rem));
    background: #1b1b1b;
    color: #fff;
    padding: 0.6rem 1rem;
    border-radius: 12px;
    box-shadow: 0 8px 24px rgb(0 0 0 / 0.25);
  }
  .notice:empty {
    display: none;
  }
  @media (max-width: 820px) {
    header {
      grid-template-columns: 1fr;
      justify-items: stretch;
    }
    .tabs {
      justify-content: center;
    }
    main {
      grid-template-columns: 1fr;
      grid-template-rows: auto auto;
      overflow-y: auto;
    }
    main.scenes {
      display: flex;
      flex-direction: column-reverse;
    }
    main.scenes .main {
      height: 55vh;
    }
    .side {
      overflow: visible;
    }
  }
</style>
