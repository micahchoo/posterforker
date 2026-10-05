<script lang="ts">
  // The real viewer, in a frame, shown the look and layout being edited.
  import type { EditSession } from './session.svelte.ts';
  import { DEFAULT_LAYOUT } from '../core/names.ts';
  let { session }: { session: EditSession } = $props();
  let frame = $state<HTMLIFrameElement>();

  const send = () =>
    frame?.contentWindow?.postMessage(
      { type: 'pf-preview', theme: $state.snapshot(session.draft.theme), layout: $state.snapshot(session.draft.layout ?? DEFAULT_LAYOUT) },
      location.origin,
    );
  $effect(() => {
    void JSON.stringify(session.draft.theme);
    void JSON.stringify(session.draft.layout);
    send();
  });
</script>

<figure class="preview">
  <iframe bind:this={frame} src="../?preview" title="Preview of your Collection" onload={send}></iframe>
  <figcaption>Live preview — this is what Readers will see.</figcaption>
</figure>

<style>
  .preview {
    margin: 0;
    height: 100%;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }
  iframe {
    flex: 1;
    width: 100%;
    min-height: 22rem;
    border: 1px solid #d5d5d5;
    border-radius: 12px;
    background: #fff;
  }
  figcaption {
    font-size: 0.8rem;
    color: #666;
  }
</style>
