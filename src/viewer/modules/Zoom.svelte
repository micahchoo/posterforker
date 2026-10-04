<script lang="ts">
  import type { ViewerState } from '../state.svelte.ts';
  let { viewer }: { viewer: ViewerState } = $props();
</script>

<div class="zoom" role="group" aria-label="Zoom">
  <button type="button" onclick={() => viewer.zoomIn()} aria-label="Zoom in" title="Zoom in (+)">+</button>
  <button type="button" onclick={() => viewer.zoomOut()} aria-label="Zoom out" title="Zoom out (−)">−</button>
  <button type="button" onclick={() => viewer.home()} aria-label="Whole Image" title="Whole Image (0)">⤢</button>
</div>

<style>
  .zoom {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  button {
    width: 2.75rem;
    height: 2.75rem;
    font-size: 1.25rem;
  }
</style>
