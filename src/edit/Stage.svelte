<script lang="ts">
  // The Image with every Scene's box on it. A drag always looks around; only the selected
  // box and its handles take the pointer. No modes.
  import OpenSeadragon from 'openseadragon';
  import { pixelRect, type PixelRect } from '../core/geometry.ts';
  import type { EditSession } from './session.svelte.ts';

  let { session }: { session: EditSession } = $props();

  let host: HTMLDivElement;
  let osd: OpenSeadragon.Viewer | null = null;
  let frame = $state(0); // bumped whenever the view moves, so boxes follow
  let ready = $state(false);

  const P = (x: number, y: number) => new OpenSeadragon.Point(x, y);

  function screenOf(r: PixelRect) {
    void frame;
    if (!osd || !ready) return null;
    const a = osd.viewport.imageToViewerElementCoordinates(P(r.x, r.y));
    const b = osd.viewport.imageToViewerElementCoordinates(P(r.x + r.w, r.y + r.h));
    return { left: a.x, top: a.y, width: b.x - a.x, height: b.y - a.y };
  }

  const imageAt = (clientX: number, clientY: number) => {
    const box = host.getBoundingClientRect();
    return osd!.viewport.viewerElementToImageCoordinates(P(clientX - box.left, clientY - box.top));
  };

  function fly(r: PixelRect) {
    if (!osd) return;
    const m = Math.max(r.w, r.h) * 0.35;
    const a = osd.viewport.imageToViewportCoordinates(P(r.x - m, r.y - m));
    const b = osd.viewport.imageToViewportCoordinates(P(r.x + r.w + m, r.y + r.h + m));
    osd.viewport.fitBounds(new OpenSeadragon.Rect(a.x, a.y, b.x - a.x, b.y - a.y));
  }

  $effect(() => {
    const tour = session.tour;
    ready = false;
    const viewer = OpenSeadragon({
      element: host,
      showNavigationControl: false,
      gestureSettingsMouse: { clickToZoom: false, dblClickToZoom: true },
      visibilityRatio: 0.5,
      keyboardShortcutsEnabled: false,
    } as OpenSeadragon.Options);
    osd = viewer;
    for (const e of ['update-viewport', 'resize', 'open'] as const) viewer.addHandler(e, () => frame++);

    // A click (not a drag) picks the topmost Scene under it, or clears the choice.
    viewer.addHandler('canvas-click', (e) => {
      if (!e.quick) return;
      const p = viewer.viewport.viewerElementToImageCoordinates(e.position);
      const hit = [...session.scenes].reverse().find((s) => p.x >= s.region.x && p.x <= s.region.x + s.region.w && p.y >= s.region.y && p.y <= s.region.y + s.region.h);
      session.select(hit?.id ?? null);
    });

    session.viewOf = () => {
      const b = viewer.viewport.getBounds();
      const a = viewer.viewport.viewportToImageCoordinates(P(b.x, b.y));
      const c = viewer.viewport.viewportToImageCoordinates(P(b.x + b.width, b.y + b.height));
      return pixelRect({ x: a.x, y: a.y, w: c.x - a.x, h: c.y - a.y });
    };
    session.flyTo = fly;

    let cancelled = false;
    fetch(new URL(`../${tour.tiles}/info.json`, document.baseURI))
      .then((r) => r.json())
      .then((info) => {
        if (cancelled) return;
        viewer.addOnceHandler('open', () => (ready = true));
        viewer.open({ ...info, id: new URL(`../${tour.tiles}`, document.baseURI).href });
      });
    return () => {
      cancelled = true;
      session.viewOf = null;
      session.flyTo = null;
      viewer.destroy();
      osd = null;
    };
  });

  // ---- Moving and resizing the selected box ----

  type Grip = 'move' | 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';
  const GRIPS: Array<{ grip: Exclude<Grip, 'move'>; label: string }> = [
    { grip: 'nw', label: 'top left corner' },
    { grip: 'n', label: 'top edge' },
    { grip: 'ne', label: 'top right corner' },
    { grip: 'e', label: 'right edge' },
    { grip: 'se', label: 'bottom right corner' },
    { grip: 's', label: 'bottom edge' },
    { grip: 'sw', label: 'bottom left corner' },
    { grip: 'w', label: 'left edge' },
  ];

  let drag: { grip: Grip; id: string; from: { x: number; y: number }; start: PixelRect } | null = null;

  function reshape(start: PixelRect, grip: Grip, dx: number, dy: number): PixelRect {
    const { width, height } = session.tour;
    const min = Math.max(8, Math.min(width, height) * 0.01);
    let { x, y, w, h } = start;
    if (grip === 'move') {
      x = Math.min(Math.max(0, x + dx), width - w);
      y = Math.min(Math.max(0, y + dy), height - h);
      return pixelRect({ x, y, w, h });
    }
    if (grip.includes('w')) {
      const nx = Math.min(Math.max(0, x + dx), x + w - min);
      w += x - nx;
      x = nx;
    }
    if (grip.includes('e')) w = Math.min(Math.max(min, w + dx), width - x);
    if (grip.includes('n')) {
      const ny = Math.min(Math.max(0, y + dy), y + h - min);
      h += y - ny;
      y = ny;
    }
    if (grip.includes('s')) h = Math.min(Math.max(min, h + dy), height - y);
    return pixelRect({ x, y, w, h });
  }

  function down(e: PointerEvent, grip: Grip) {
    const scene = session.scene;
    if (!scene || !osd) return;
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    const p = imageAt(e.clientX, e.clientY);
    drag = { grip, id: scene.id, from: { x: p.x, y: p.y }, start: scene.region };
  }
  function move(e: PointerEvent) {
    if (!drag) return;
    const p = imageAt(e.clientX, e.clientY);
    session.updateScene(drag.id, { region: reshape(drag.start, drag.grip, p.x - drag.from.x, p.y - drag.from.y) });
  }
  function up() {
    drag = null;
  }

  /** Arrow keys move the selected box; Shift moves it further. */
  function nudge(e: KeyboardEvent) {
    const scene = session.scene;
    const step = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
    if (!scene || !step) return;
    e.preventDefault();
    const d = (e.shiftKey ? 0.05 : 0.01) * session.tour.width;
    session.updateScene(scene.id, { region: reshape(scene.region, 'move', step[0]! * d, step[1]! * d) });
  }

  const zoom = (f: number) => {
    osd?.viewport.zoomBy(f);
    osd?.viewport.applyConstraints();
  };
</script>

<div class="stage">
  <div class="image" bind:this={host}></div>

  <div class="layer" aria-hidden={!ready}>
    {#each session.scenes as scene, i (scene.id)}
      {@const at = screenOf(scene.region)}
      {#if at}
        {#if scene.id === session.selected}
          <!-- A composite widget: a group of resize handles that also moves with the arrow keys
               and by dragging. Svelte calls a group non-interactive; this one is interactive by design. -->
          <!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
          <div
            class="box selected"
            role="group"
            aria-label="Box of {scene.title}"
            aria-roledescription="movable box"
            tabindex="0"
            style:left="{at.left}px"
            style:top="{at.top}px"
            style:width="{at.width}px"
            style:height="{at.height}px"
            onpointerdown={(e) => down(e, 'move')}
            onpointermove={move}
            onpointerup={up}
            onkeydown={nudge}
          >
            <span class="tag">{i + 1} · {scene.title || 'Untitled'}</span>
            {#each GRIPS as g (g.grip)}
              <button
                type="button"
                class="grip {g.grip}"
                aria-label="Resize from the {g.label}"
                onpointerdown={(e) => down(e, g.grip)}
                onpointermove={move}
                onpointerup={up}
              ></button>
            {/each}
          </div>
        {:else}
          <div class="box" style:left="{at.left}px" style:top="{at.top}px" style:width="{at.width}px" style:height="{at.height}px">
            <button type="button" class="tag" onclick={() => session.select(scene.id)}>{i + 1} · {scene.title || 'Untitled'}</button>
          </div>
        {/if}
      {/if}
    {/each}
  </div>

  <div class="tools">
    <button type="button" aria-label="Zoom in" onclick={() => zoom(1.5)}>+</button>
    <button type="button" aria-label="Zoom out" onclick={() => zoom(1 / 1.5)}>−</button>
    <button type="button" aria-label="Show the whole Image" onclick={() => osd?.viewport.goHome()}>⤢</button>
  </div>
  <p class="hint">
    {#if session.scene}Drag the box or its handles · arrow keys nudge it{:else}Drag to look around · click a box to change it{/if}
  </p>
</div>

<style>
  .stage {
    position: relative;
    height: 100%;
    min-height: 18rem;
    border-radius: 12px;
    overflow: hidden;
    background: #1e1e1e;
  }
  .image,
  .layer {
    position: absolute;
    inset: 0;
  }
  .layer {
    pointer-events: none;
  }
  .box {
    position: absolute;
    border: 2px dashed rgb(255 255 255 / 0.9);
    box-shadow: 0 0 0 1px rgb(0 0 0 / 0.35);
    border-radius: 3px;
  }
  .box.selected {
    border: 3px solid #ffb000;
    background: rgb(255 176 0 / 0.12);
    pointer-events: auto;
    cursor: move;
    touch-action: none;
  }
  .box.selected:focus-visible {
    outline: 3px solid #fff;
    outline-offset: 3px;
  }
  .tag {
    position: absolute;
    left: -2px;
    bottom: 100%;
    margin-bottom: 4px;
    max-width: 16rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    background: #111;
    color: #fff;
    border: 0;
    border-radius: 999px;
    padding: 0.2rem 0.6rem;
    font: 600 0.8rem/1.3 system-ui, sans-serif;
    pointer-events: auto;
    cursor: pointer;
  }
  .selected .tag {
    background: #ffb000;
    color: #111;
    cursor: move;
  }
  .grip {
    position: absolute;
    width: 18px;
    height: 18px;
    padding: 0;
    border: 2px solid #111;
    border-radius: 50%;
    background: #ffb000;
    touch-action: none;
  }
  .grip.nw { left: -10px; top: -10px; cursor: nwse-resize; }
  .grip.n { left: calc(50% - 9px); top: -10px; cursor: ns-resize; }
  .grip.ne { right: -10px; top: -10px; cursor: nesw-resize; }
  .grip.e { right: -10px; top: calc(50% - 9px); cursor: ew-resize; }
  .grip.se { right: -10px; bottom: -10px; cursor: nwse-resize; }
  .grip.s { left: calc(50% - 9px); bottom: -10px; cursor: ns-resize; }
  .grip.sw { left: -10px; bottom: -10px; cursor: nesw-resize; }
  .grip.w { left: -10px; top: calc(50% - 9px); cursor: ew-resize; }
  .tools {
    position: absolute;
    right: 0.75rem;
    bottom: 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }
  .tools button {
    width: 2.6rem;
    height: 2.6rem;
    border-radius: 10px;
    border: 0;
    background: rgb(255 255 255 / 0.92);
    font-size: 1.2rem;
    cursor: pointer;
  }
  .hint {
    position: absolute;
    left: 0.75rem;
    top: 0.75rem;
    max-width: calc(100% - 1.5rem);
    margin: 0;
    padding: 0.35rem 0.8rem;
    border-radius: 999px;
    background: rgb(0 0 0 / 0.6);
    color: #fff;
    font-size: 0.85rem;
    pointer-events: none;
  }
</style>
