<script lang="ts">
  import type { ViewerState } from '../state.svelte.ts';
  let { viewer }: { viewer: ViewerState } = $props();
</script>

{#if viewer.collection.tours.length > 1}
  <nav class="tour-switcher" aria-label="Tours">
    {#each viewer.collection.tours as tour, i (tour.id)}
      <button type="button" aria-current={viewer.tourIndex === i ? 'page' : undefined} onclick={() => viewer.openTour(i)}>
        {tour.title}
      </button>
    {/each}
  </nav>
{/if}

<style>
  .tour-switcher {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
  }
  button[aria-current] {
    background: var(--pf-accent);
    color: var(--pf-panel);
  }
</style>
