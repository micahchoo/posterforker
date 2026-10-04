<script lang="ts">
  import type { ViewerState } from '../state.svelte.ts';
  let { viewer }: { viewer: ViewerState } = $props();
</script>

{#if viewer.collection.credits}
  <p class="credits">{viewer.collection.credits}</p>
{/if}

<style>
  .credits {
    margin: 0;
    font-size: 0.8rem;
    opacity: 0.85;
  }
</style>
