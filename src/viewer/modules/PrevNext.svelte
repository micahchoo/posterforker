<script lang="ts">
  import type { ViewerState } from '../state.svelte.ts';
  let { viewer }: { viewer: ViewerState } = $props();
  const last = $derived(viewer.scenes.length - 1);
</script>

{#if viewer.scenes.length > 0}
  <div class="prev-next">
    <button type="button" onclick={() => viewer.previous()} disabled={viewer.sceneIndex === null || viewer.sceneIndex === 0}>
      <span aria-hidden="true">‹</span> Previous
    </button>
    <span class="count">{viewer.sceneIndex === null ? '–' : viewer.sceneIndex + 1} / {viewer.scenes.length}</span>
    <button type="button" onclick={() => viewer.next()} disabled={viewer.sceneIndex === last}>
      Next <span aria-hidden="true">›</span>
    </button>
  </div>
{/if}

<style>
  .prev-next {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }
  .count {
    font-variant-numeric: tabular-nums;
    opacity: 0.8;
  }
</style>
