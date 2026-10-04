<script lang="ts">
  import type { ViewerState } from '../state.svelte.ts';
  let { viewer }: { viewer: ViewerState } = $props();
  let open = $state(false);
</script>

{#if viewer.scenes.length > 0}
  <nav class="scene-list" aria-label="Scenes">
    <button type="button" class="toggle" aria-expanded={open} onclick={() => (open = !open)}>
      Scenes <span aria-hidden="true">{open ? '▴' : '▾'}</span>
    </button>
    {#if open}
      <ol>
        {#each viewer.scenes as scene, i (scene.id)}
          <li>
            <button
              type="button"
              aria-current={viewer.sceneIndex === i ? 'step' : undefined}
              onclick={() => viewer.goToScene(i)}>{scene.title}</button
            >
          </li>
        {/each}
      </ol>
    {/if}
  </nav>
{/if}

<style>
  .toggle {
    font-weight: 600;
  }
  ol {
    margin: 0.5rem 0 0;
    padding-left: 1.5rem;
  }
  li button {
    background: none;
    border: 0;
    padding: 0.25rem 0;
    text-align: left;
    color: inherit;
    font: inherit;
  }
  li button[aria-current] {
    color: var(--pf-accent);
    font-weight: 600;
  }
</style>
