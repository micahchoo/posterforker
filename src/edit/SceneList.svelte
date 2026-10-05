<script lang="ts">
  import type { EditSession } from './session.svelte.ts';
  let { session }: { session: EditSession } = $props();

  let dragging = $state<string | null>(null);
  let over = $state<number | null>(null);
</script>

<section class="list">
  <h2>Scenes <span class="count">{session.scenes.length}</span></h2>
  <ol aria-label="Scenes">
    {#each session.scenes as scene, i (scene.id)}
      <li
        class:selected={scene.id === session.selected}
        class:over={over === i && dragging !== scene.id}
        draggable="true"
        ondragstart={(e) => {
          dragging = scene.id;
          e.dataTransfer?.setData('text/plain', scene.id);
        }}
        ondragover={(e) => {
          e.preventDefault();
          over = i;
        }}
        ondragleave={() => (over = null)}
        ondrop={(e) => {
          e.preventDefault();
          if (dragging) session.moveScene(dragging, i);
          dragging = over = null;
        }}
        ondragend={() => (dragging = over = null)}
      >
        <span class="handle" aria-hidden="true" title="Drag to reorder">⠿</span>
        <button type="button" class="pick" aria-current={scene.id === session.selected ? 'true' : undefined} onclick={() => session.select(scene.id, true)}>
          <span class="n">{i + 1}</span>
          <span class="title">{scene.title || 'Untitled'}</span>
        </button>
        <span class="order">
          <button type="button" aria-label="Move {scene.title} up" disabled={i === 0} onclick={() => session.moveScene(scene.id, i - 1)}>↑</button>
          <button type="button" aria-label="Move {scene.title} down" disabled={i === session.scenes.length - 1} onclick={() => session.moveScene(scene.id, i + 1)}>↓</button>
        </span>
      </li>
    {/each}
  </ol>
  <button type="button" class="add" onclick={() => session.addSceneHere()}>
    <span aria-hidden="true">＋</span> Add a Scene
  </button>
  <p class="tip">A new Scene starts in the middle of what you are looking at.</p>
</section>

<style>
  h2 {
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #555;
    margin: 0 0 0.5rem;
  }
  .count {
    background: #e7e7e7;
    border-radius: 999px;
    padding: 0 0.45rem;
    margin-left: 0.25rem;
  }
  ol {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  li {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    border-radius: 10px;
    padding: 0.15rem 0.25rem;
    border: 2px solid transparent;
  }
  li.selected {
    background: #fff4d6;
    border-color: #ffb000;
  }
  li.over {
    border-top: 3px solid #1f5fbf;
  }
  .handle {
    cursor: grab;
    color: #888;
    padding: 0 0.15rem;
  }
  .pick {
    flex: 1;
    display: flex;
    gap: 0.5rem;
    align-items: baseline;
    text-align: left;
    background: none;
    border: 0;
    padding: 0.45rem 0.25rem;
    font: inherit;
    cursor: pointer;
    min-width: 0;
  }
  .n {
    color: #777;
    font-variant-numeric: tabular-nums;
  }
  .title {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .order {
    display: flex;
    gap: 0.15rem;
    opacity: 0.55;
  }
  li:hover .order,
  li.selected .order,
  .order:focus-within {
    opacity: 1;
  }
  .order button {
    width: 1.9rem;
    height: 1.9rem;
    border-radius: 6px;
    border: 1px solid #ccc;
    background: #fff;
    cursor: pointer;
  }
  .order button:disabled {
    opacity: 0.3;
    cursor: default;
  }
  .add {
    margin-top: 0.75rem;
    width: 100%;
    padding: 0.7rem;
    border-radius: 10px;
    border: 2px dashed #9aa7b8;
    background: #f6f8fb;
    font: 600 1rem system-ui, sans-serif;
    color: #1f3f74;
    cursor: pointer;
  }
  .add:hover {
    background: #eaf0f8;
  }
  .tip {
    margin: 0.4rem 0 0;
    font-size: 0.8rem;
    color: #666;
  }
</style>
