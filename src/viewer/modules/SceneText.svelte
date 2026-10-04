<script lang="ts">
  import type { ViewerState } from '../state.svelte.ts';
  let { viewer }: { viewer: ViewerState } = $props();
</script>

<!-- polite: a screen reader hears the new Scene after the move, without interruption -->
<section class="scene-text" aria-live="polite">
  {#if viewer.scene}
    <h2>{viewer.scene.title}</h2>
    <!-- The Maker's own words, rendered from their Markdown by the build. -->
    <div class="words">{@html viewer.scene.html}</div>
  {:else}
    <h2>{viewer.tour.title}</h2>
    {#if viewer.scenes.length > 0}
      <p class="hint">{viewer.scenes.length} Scene{viewer.scenes.length === 1 ? '' : 's'}. Press Next, or explore the Image.</p>
    {/if}
  {/if}
</section>

<style>
  h2 {
    font-family: var(--pf-font-heading);
    font-size: 1.35rem;
    line-height: 1.2;
    margin: 0 0 0.5rem;
  }
  .words :global(p) {
    margin: 0 0 0.75em;
  }
  .words :global(img) {
    max-width: 100%;
  }
  .words :global(a) {
    color: var(--pf-accent);
  }
  .hint {
    opacity: 0.8;
    margin: 0;
  }
</style>
