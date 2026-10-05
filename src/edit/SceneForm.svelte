<script lang="ts">
  import { readScene, writeScene } from '../core/source.ts';
  import type { EditSession } from './session.svelte.ts';
  let { session }: { session: EditSession } = $props();

  let title = $state<HTMLInputElement>();
  // The words as a Reader will see them: the build's own Markdown, so no surprises.
  const html = $derived.by(() => {
    const s = session.scene;
    if (!s) return '';
    const r = readScene('preview.md', writeScene({ title: s.title || 'x', region: s.region, words: s.words }));
    return r.ok ? r.value.html : '';
  });

  // Once per "Add a Scene": the cursor waits in Title, its text selected, so typing names it.
  let handled = 0;
  $effect(() => {
    if (session.focusTitle !== handled && title) {
      handled = session.focusTitle;
      title.focus();
      title.select();
    }
  });
</script>

{#if session.scene}
  {@const s = session.scene}
  <section class="form">
    <label for="scene-title">Title</label>
    <input id="scene-title" bind:this={title} value={s.title} oninput={(e) => session.updateScene(s.id, { title: e.currentTarget.value })} />

    <label for="scene-words">Words</label>
    <textarea id="scene-words" rows="6" value={s.words} placeholder="What should a Reader notice here?" oninput={(e) => session.updateScene(s.id, { words: e.currentTarget.value })}></textarea>
    <p class="hint">**bold** · *italic* · [a link](https://…) · a blank line starts a new paragraph</p>

    <div class="preview">
      <span class="label">Readers see</span>
      <h3>{s.title || 'Untitled'}</h3>
      <div data-testid="reader-preview">{@html html}</div>
    </div>

    <button type="button" class="delete" onclick={() => session.deleteScene(s.id)}>Delete this Scene</button>
  </section>
{:else}
  <section class="empty">
    <p><strong>Pick a Scene</strong> in the list or on the Image to change it, or add a new one.</p>
  </section>
{/if}

<style>
  .form {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }
  label {
    font-weight: 600;
    margin-top: 0.4rem;
  }
  input,
  textarea {
    font: inherit;
    padding: 0.6rem 0.7rem;
    border: 1px solid #b9c0ca;
    border-radius: 8px;
    background: #fff;
  }
  textarea {
    resize: vertical;
  }
  input:focus,
  textarea:focus {
    outline: 3px solid #a9c7f5;
    border-color: #1f5fbf;
  }
  .hint {
    margin: 0;
    font-size: 0.78rem;
    color: #666;
  }
  .preview {
    margin-top: 0.6rem;
    padding: 0.75rem 0.9rem;
    border-radius: 10px;
    background: #fff;
    border: 1px solid #e3e3e3;
  }
  .preview .label {
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #888;
  }
  .preview h3 {
    margin: 0.2rem 0 0.3rem;
    font-size: 1.1rem;
  }
  .preview :global(p) {
    margin: 0 0 0.5em;
  }
  .delete {
    margin-top: 0.75rem;
    align-self: flex-start;
    background: none;
    border: 0;
    color: #a40000;
    font: inherit;
    text-decoration: underline;
    cursor: pointer;
    padding: 0.3rem 0;
  }
  .empty {
    color: #444;
    padding: 0.5rem 0;
  }
</style>
