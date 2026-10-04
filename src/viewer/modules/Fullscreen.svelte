<script lang="ts">
  import type { ViewerState } from '../state.svelte.ts';
  let { viewer: _viewer }: { viewer: ViewerState } = $props();
  let full = $state(false);
  const supported = typeof document !== 'undefined' && document.fullscreenEnabled;

  function toggle() {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen();
  }
</script>

<svelte:document onfullscreenchange={() => (full = document.fullscreenElement !== null)} />

{#if supported}
  <button type="button" onclick={toggle} aria-pressed={full}>{full ? 'Exit full screen' : 'Full screen'}</button>
{/if}
