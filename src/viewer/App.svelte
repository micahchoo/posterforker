<script lang="ts">
  // The Reader's screen: the Image underneath, the Slots over it, each Module in its Slot.
  import { SLOTS, type SlotName } from '../core/names.ts';
  import { keyAction } from './keys.ts';
  import { MODULE_COMPONENTS } from './modules/index.ts';
  import type { ViewerState } from './state.svelte.ts';
  import Tour from './Tour.svelte';

  let { viewer }: { viewer: ViewerState } = $props();

  const layout = $derived(viewer.collection.layout);
  const modulesIn = (slot: SlotName) => (layout[slot] ?? []).map((name) => ({ name, component: MODULE_COMPONENTS[name] }));
  const overlays = $derived(SLOTS.filter((s) => s !== 'panel' && (layout[s]?.length ?? 0) > 0));

  let panel = $state<HTMLElement>();
  let collapsed = $state(false);
  let wide = $state(true);

  // The panel hides part of the Image. The camera must know how much, to put a Scene beside it.
  $effect(() => {
    const media = matchMedia('(min-width: 720px)');
    const measure = () => {
      wide = media.matches;
      const box = panel?.getBoundingClientRect();
      viewer.insets = !box || collapsed ? { left: 0, bottom: 0 } : wide ? { left: box.right, bottom: 0 } : { left: 0, bottom: innerHeight - box.top };
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (panel) observer.observe(panel);
    media.addEventListener('change', measure);
    return () => {
      observer.disconnect();
      media.removeEventListener('change', measure);
    };
  });

  function onkeydown(e: KeyboardEvent) {
    const target = e.target as HTMLElement;
    const action = keyAction({
      key: e.key,
      ctrlKey: e.ctrlKey,
      metaKey: e.metaKey,
      altKey: e.altKey,
      targetTag: target.tagName,
      targetEditable: target.isContentEditable,
    });
    if (!action) return;
    e.preventDefault();
    ({ next: () => viewer.next(), previous: () => viewer.previous(), 'zoom-in': () => viewer.zoomIn(), 'zoom-out': () => viewer.zoomOut(), home: () => viewer.home() })[action]();
  }
</script>

<svelte:window {onkeydown} onhashchange={() => viewer.readUrl()} />

<main class="screen" class:wide>
  <Tour {viewer} />

  {#each overlays as slot (slot)}
    <div class="slot overlay {slot}" style:--pf-sheet={viewer.insets.bottom + 'px'}>
      {#each modulesIn(slot) as m (m.name)}
        <div class="module {m.name}"><m.component {viewer} /></div>
      {/each}
    </div>
  {/each}

  {#if (layout.panel?.length ?? 0) > 0}
    <aside class="slot panel" class:collapsed bind:this={panel} aria-label="About this Tour">
      <header>
        <h1>{viewer.collection.title}</h1>
        <button type="button" class="collapse" aria-expanded={!collapsed} onclick={() => (collapsed = !collapsed)}>
          {collapsed ? 'Show text' : 'Hide text'}
        </button>
      </header>
      {#if !collapsed}
        {#each modulesIn('panel') as m (m.name)}
          <div class="module {m.name}"><m.component {viewer} /></div>
        {/each}
      {/if}
    </aside>
  {/if}

  <p class="status" role="status">{viewer.message}</p>
</main>

<style>
  :global(*, *::before, *::after) {
    box-sizing: border-box;
  }
  :global(html, body) {
    margin: 0;
    height: 100%;
    background: var(--pf-background);
    color: var(--pf-text);
    font-family: var(--pf-font-body);
    line-height: 1.5;
  }
  :global(button) {
    font: inherit;
    color: var(--pf-text);
    background: var(--pf-panel);
    border: 1px solid color-mix(in srgb, var(--pf-text) 25%, transparent);
    border-radius: calc(var(--pf-radius) * 0.6);
    padding: 0.4rem 0.75rem;
    min-height: 2.75rem;
    cursor: pointer;
  }
  :global(button:disabled) {
    opacity: 0.45;
    cursor: default;
  }
  :global(:focus-visible) {
    outline: 3px solid var(--pf-accent);
    outline-offset: 2px;
  }

  .screen {
    position: fixed;
    inset: 0;
    overflow: hidden;
  }
  .slot {
    position: absolute;
    display: flex;
    gap: 0.5rem;
    z-index: 2;
  }
  .overlay {
    margin: 0.75rem;
    align-items: flex-start;
  }
  .top {
    top: 0;
    left: 50%;
    transform: translateX(-50%);
  }
  .top-left {
    top: 0;
    left: 0;
  }
  .top-right {
    top: 0;
    right: 0;
  }
  .bottom {
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
  }
  .bottom-left {
    bottom: 0;
    left: 0;
  }
  .bottom-right {
    bottom: 0;
    right: 0;
    flex-direction: column;
  }
  .overlay .module {
    background: color-mix(in srgb, var(--pf-panel) calc(var(--pf-panel-opacity) * 100%), transparent);
    border-radius: var(--pf-radius);
    padding: 0.25rem;
  }
  /* A Module with nothing to show (a Tour switcher with one Tour) leaves no empty chip. */
  .overlay .module:empty {
    display: none;
  }
  .overlay.bottom-left .module {
    padding: 0.4rem 0.6rem;
  }

  .panel {
    flex-direction: column;
    background: color-mix(in srgb, var(--pf-panel) calc(var(--pf-panel-opacity) * 100%), transparent);
    border-radius: var(--pf-radius);
    box-shadow: 0 2px 18px rgb(0 0 0 / 0.18);
    padding: 1rem 1.25rem;
    overflow-y: auto;
    gap: 1rem;
  }
  .panel header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 0.75rem;
  }
  h1 {
    font-family: var(--pf-font-heading);
    font-size: 1rem;
    font-weight: 600;
    margin: 0.55rem 0 0;
    opacity: 0.85;
  }
  .collapse {
    flex: none;
    font-size: 0.85rem;
  }

  /* Wide: the panel docks on the left, below the top-left Slot. */
  .wide .panel {
    top: 4.25rem;
    left: 0.75rem;
    width: min(24rem, 36vw);
    max-height: calc(100% - 5rem);
  }
  /* Narrow: the panel is a bottom sheet; bottom Slots ride above it. */
  .screen:not(.wide) .panel {
    left: 0;
    right: 0;
    bottom: 0;
    max-height: 45%;
    border-radius: var(--pf-radius) var(--pf-radius) 0 0;
  }
  .screen:not(.wide) .overlay.bottom,
  .screen:not(.wide) .overlay.bottom-left,
  .screen:not(.wide) .overlay.bottom-right {
    bottom: var(--pf-sheet);
  }
  /* Narrow: the top Slot drops below the corners instead of colliding with them. */
  .screen:not(.wide) .overlay.top {
    top: 3.6rem;
    left: 0;
    transform: none;
    max-width: calc(100% - 1.5rem);
    overflow-x: auto;
  }
  .panel.collapsed {
    width: auto;
  }

  .status {
    position: absolute;
    bottom: 1rem;
    left: 50%;
    transform: translateX(-50%);
    z-index: 3;
    margin: 0;
    background: var(--pf-text);
    color: var(--pf-panel);
    border-radius: var(--pf-radius);
    padding: 0.4rem 0.8rem;
  }
  .status:empty {
    display: none;
  }
</style>
