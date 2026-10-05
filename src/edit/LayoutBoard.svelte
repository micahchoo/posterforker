<script lang="ts">
  // Where each button and panel sits: drag a chip onto a place on the little screen,
  // or pick a chip and press "Put it here". Plain names only.
  import { DEFAULT_LAYOUT, MODULES, SLOTS, type Layout, type ModuleName, type SlotName } from '../core/names.ts';
  import { MODULE_LABELS, SLOT_LABELS } from './labels.ts';
  import type { EditSession } from './session.svelte.ts';

  let { session }: { session: EditSession } = $props();

  const layout = $derived(session.draft.layout ?? DEFAULT_LAYOUT);
  const inSlot = (s: SlotName) => layout[s] ?? [];
  const hidden = $derived(MODULES.filter((m) => !SLOTS.some((s) => layout[s]?.includes(m))));
  let picked = $state<ModuleName | null>(null);

  function place(m: ModuleName, to: SlotName | null) {
    const next: Layout = {};
    for (const s of SLOTS) {
      const list = (layout[s] ?? []).filter((x) => x !== m);
      if (s === to) list.push(m);
      if (list.length > 0) next[s] = list;
    }
    session.setLayout(next);
    picked = null;
  }
  const drop = (to: SlotName | null) => (e: DragEvent) => {
    e.preventDefault();
    const m = e.dataTransfer?.getData('text/plain') as ModuleName | undefined;
    if (m && (MODULES as readonly string[]).includes(m)) place(m, to);
  };
</script>

{#snippet chip(m: ModuleName)}
  <button
    type="button"
    class="chip"
    class:picked={picked === m}
    draggable="true"
    aria-pressed={picked === m}
    ondragstart={(e) => e.dataTransfer?.setData('text/plain', m)}
    onclick={() => (picked = picked === m ? null : m)}>{MODULE_LABELS[m]}</button
  >
{/snippet}

{#snippet zone(s: SlotName | null)}
  <div class="zone {s ?? 'off'}" role="group" aria-label={s ? SLOT_LABELS[s] : 'Not shown'} ondragover={(e) => e.preventDefault()} ondrop={drop(s)}>
    <span class="where">{s ? SLOT_LABELS[s] : 'Not shown'}</span>
    {#each s ? inSlot(s) : hidden as m (m)}{@render chip(m)}{/each}
    {#if picked && !(s ? inSlot(s) : hidden).includes(picked)}
      <button type="button" class="here" onclick={() => place(picked!, s)}>Put it here</button>
    {/if}
  </div>
{/snippet}

<div class="board">
  <p class="how">Drag a button to where it should sit on the screen. Or click it, then “Put it here”.</p>
  <div class="screen">
    {#each SLOTS as s (s)}{@render zone(s)}{/each}
  </div>
  {@render zone(null)}
  <p class="note">On a phone, the side panel becomes a sheet at the bottom; everything else stays in its corner.</p>
</div>

<style>
  .board {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  .how,
  .note {
    margin: 0;
    font-size: 0.85rem;
    color: #555;
  }
  .screen {
    display: grid;
    grid-template-columns: 1.1fr 1fr 1fr;
    grid-template-rows: auto 1fr auto;
    grid-template-areas:
      'top-left top top-right'
      'panel . .'
      'bottom-left bottom bottom-right';
    gap: 0.4rem;
    aspect-ratio: 16 / 10;
    padding: 0.5rem;
    border-radius: 12px;
    background: linear-gradient(135deg, #cfd8e3, #a9b7c8);
  }
  .zone {
    display: flex;
    flex-wrap: wrap;
    align-content: flex-start;
    gap: 0.3rem;
    min-height: 3rem;
    padding: 0.35rem;
    border-radius: 8px;
    border: 2px dashed rgb(255 255 255 / 0.85);
    background: rgb(255 255 255 / 0.35);
  }
  .zone.panel {
    grid-area: panel;
    background: rgb(255 255 255 / 0.75);
  }
  .top-left { grid-area: top-left; }
  .top { grid-area: top; }
  .top-right { grid-area: top-right; }
  .bottom-left { grid-area: bottom-left; }
  .bottom { grid-area: bottom; }
  .bottom-right { grid-area: bottom-right; }
  .zone.off {
    background: #f3f3f3;
    border-color: #ccc;
  }
  .where {
    width: 100%;
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #334;
  }
  .chip {
    padding: 0.3rem 0.6rem;
    border-radius: 999px;
    border: 1px solid #889;
    background: #fff;
    font: 500 0.85rem system-ui, sans-serif;
    cursor: grab;
  }
  .chip.picked {
    background: #1b1b1b;
    color: #fff;
  }
  .here {
    padding: 0.3rem 0.6rem;
    border-radius: 999px;
    border: 2px solid #1f5fbf;
    background: #eaf0fb;
    color: #1f3f74;
    font: 600 0.8rem system-ui, sans-serif;
    cursor: pointer;
  }
</style>
