<script lang="ts">
  import type { ViewerState } from '../state.svelte.ts';
  let { viewer }: { viewer: ViewerState } = $props();

  async function share() {
    const url = viewer.link;
    try {
      await navigator.clipboard.writeText(url);
      viewer.say('Link copied. It opens exactly this view.');
    } catch {
      prompt('Copy this link:', url);
    }
  }
</script>

<button type="button" onclick={share}>Share this view</button>
