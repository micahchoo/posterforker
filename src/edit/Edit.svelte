<script lang="ts">
  // /edit: tools for the Maker. They write text and open GitHub; they never write to GitHub.
  import type { SiteCollection } from '../core/names.ts';
  import Picker from './Picker.svelte';
  import ThemeEditor from './ThemeEditor.svelte';

  let { collection }: { collection: SiteCollection } = $props();
  const TABS = [
    ['scenes', 'Scenes'],
    ['theme', 'Theme'],
    ['layout', 'Layout'],
  ] as const;
  let tab = $state<(typeof TABS)[number][0]>('scenes');
</script>

<div class="edit">
  <header>
    <h1>Edit <a href="../">{collection.title}</a></h1>
    <div role="tablist" aria-label="What to edit">
      {#each TABS as [id, label] (id)}
        <button type="button" role="tab" aria-selected={tab === id} onclick={() => (tab = id)}>{label}</button>
      {/each}
    </div>
  </header>
  <div class="panel" role="tabpanel">
    {#if tab === 'scenes'}
      <Picker {collection} />
    {:else}
      {#key tab}<ThemeEditor {collection} {tab} />{/key}
    {/if}
  </div>
</div>

<style>
  :global(html, body) {
    margin: 0;
    height: 100%;
    font-family: system-ui, sans-serif;
    color: #1b1b1b;
    background: #fafafa;
  }
  :global(button),
  :global(a.primary) {
    font: inherit;
    padding: 0.45rem 0.8rem;
    border: 1px solid #888;
    border-radius: 4px;
    background: #fff;
    cursor: pointer;
    color: inherit;
  }
  :global(a.primary) {
    background: #1f5fbf;
    border-color: #1f5fbf;
    color: #fff;
    text-decoration: none;
  }
  :global(button[aria-pressed='true']),
  :global(button[aria-selected='true']) {
    background: #1b1b1b;
    color: #fff;
  }
  :global(:focus-visible) {
    outline: 3px solid #1f5fbf;
    outline-offset: 2px;
  }
  .edit {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: 0.75rem 1rem;
    box-sizing: border-box;
    gap: 0.75rem;
  }
  header {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }
  h1 {
    font-size: 1.1rem;
    margin: 0;
  }
  [role='tablist'] {
    display: flex;
    gap: 0.25rem;
  }
  .panel {
    flex: 1;
    min-height: 0;
  }
</style>
