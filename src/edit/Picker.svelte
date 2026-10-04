<script lang="ts">
  // The Scene picker: draw a box on the Image, write the words, commit on GitHub.
  import OpenSeadragon from 'openseadragon';
  import { pixelRect, toNorm, type PixelRect } from '../core/geometry.ts';
  import type { SiteCollection } from '../core/names.ts';
  import { readScene, writeScene } from '../core/source.ts';
  import { scenesOf, type SceneView } from '../viewer/state.svelte.ts';
  import { nextSceneFile, sceneLink } from './links.ts';

  let { collection }: { collection: SiteCollection } = $props();

  let tourIndex = $state(0);
  let scenes = $state.raw<SceneView[]>([]);
  let region = $state<PixelRect | null>(null);
  let title = $state('');
  let words = $state('');
  let drawing = $state(true);
  let copied = $state(false);
  let host: HTMLDivElement;
  let osd: OpenSeadragon.Viewer | null = null;

  const tour = $derived(collection.tours[tourIndex]!);
  const file = $derived(nextSceneFile(scenes.map((s) => s.id)));
  const text = $derived(region ? writeScene({ title, region, words }) : '');
  const check = $derived(region ? readScene(`tours/${tour.id}/scenes/${file}`, text) : null);
  const problems = $derived(
    !region ? ['Draw a box around what this Scene is about.'] : title.trim() === '' ? ['Give the Scene a title.'] : check && !check.ok ? check.problems.map((p) => p.message) : [],
  );
  const repo = $derived(collection.repository && collection.branch ? { repository: collection.repository, branch: collection.branch } : null);
  const link = $derived(repo && region && problems.length === 0 ? sceneLink(repo, tour.id, file, { title, region, words }) : null);

  const drawn = document.createElement('div');
  drawn.className = 'pf-drawn';

  function place(r: PixelRect | null) {
    if (!osd) return;
    osd.removeOverlay(drawn);
    if (!r) return;
    const n = toNorm(r, tour.width);
    osd.addOverlay({ element: drawn, location: new OpenSeadragon.Rect(n.x, n.y, n.w, n.h) });
  }

  $effect(() => {
    const t = tour;
    region = null;
    const viewer = OpenSeadragon({
      element: host,
      showNavigationControl: false,
      gestureSettingsMouse: { clickToZoom: false },
    } as OpenSeadragon.Options);
    osd = viewer;

    // A drag draws a box in Image pixels; in Move mode it pans as usual.
    let start: OpenSeadragon.Point | null = null;
    const toImage = (p: OpenSeadragon.Point) => viewer.viewport.viewerElementToImageCoordinates(p);
    const clamp = (v: number, max: number) => Math.min(Math.max(v, 0), max);
    viewer.addHandler('canvas-press', (e) => {
      start = drawing ? toImage(e.position) : null;
    });
    viewer.addHandler('canvas-drag', (e) => {
      if (!drawing || !start) return;
      e.preventDefaultAction = true; // a drag that draws must not also pan
      const end = toImage(e.position);
      const x0 = clamp(Math.min(start.x, end.x), t.width);
      const y0 = clamp(Math.min(start.y, end.y), t.height);
      const x1 = clamp(Math.max(start.x, end.x), t.width);
      const y1 = clamp(Math.max(start.y, end.y), t.height);
      if (x1 - x0 > 2 && y1 - y0 > 2) {
        region = pixelRect({ x: Math.round(x0), y: Math.round(y0), w: Math.round(x1 - x0), h: Math.round(y1 - y0) });
        place(region);
      }
    });
    viewer.addHandler('canvas-release', () => {
      start = null;
    });

    let cancelled = false;
    Promise.all([
      fetch(new URL(`../${t.tiles}/info.json`, document.baseURI)).then((r) => r.json()),
      fetch(new URL(`../${t.manifest}`, document.baseURI)).then((r) => r.json()),
    ]).then(([info, manifest]) => {
      if (cancelled) return;
      const id = new URL(`../${t.tiles}`, document.baseURI).href;
      viewer.addOnceHandler('open', () => {
        scenes = scenesOf(manifest);
        // The Scenes already written, dashed, so a new one can be placed beside them.
        for (const s of scenes) {
          const el = document.createElement('div');
          el.className = 'pf-existing';
          el.dataset.title = s.title;
          const n = toNorm(s.region, t.width);
          viewer.addOverlay({ element: el, location: new OpenSeadragon.Rect(n.x, n.y, n.w, n.h) });
        }
      });
      viewer.open({ ...info, id });
    });

    return () => {
      cancelled = true;
      viewer.destroy();
      osd = null;
    };
  });

  async function copy() {
    await navigator.clipboard.writeText(text);
    copied = true;
    setTimeout(() => (copied = false), 2000);
  }
</script>

<div class="picker">
  <div class="stage">
    <div class="image" bind:this={host} aria-label="The Image of {tour.title}"></div>
    <div class="mode" role="group" aria-label="What a drag does">
      <button type="button" aria-pressed={drawing} onclick={() => (drawing = true)}>Draw a box</button>
      <button type="button" aria-pressed={!drawing} onclick={() => (drawing = false)}>Move the Image</button>
      <button type="button" aria-label="Zoom in" onclick={() => osd?.viewport.zoomBy(1.6)}>+</button>
      <button type="button" aria-label="Zoom out" onclick={() => osd?.viewport.zoomBy(1 / 1.6)}>−</button>
    </div>
  </div>

  <form class="form" onsubmit={(e) => e.preventDefault()}>
    {#if collection.tours.length > 1}
      <label>
        Tour
        <select bind:value={tourIndex}>
          {#each collection.tours as t, i (t.id)}<option value={i}>{t.title}</option>{/each}
        </select>
      </label>
    {/if}
    <p class="where">
      {#if region}Box: x {region.x}, y {region.y}, {region.w} × {region.h} pixels{:else}Drag on the Image to draw the box for this Scene.{/if}
    </p>
    <label>Title <input bind:value={title} placeholder="The river mouth" /></label>
    <label>
      Words
      <textarea bind:value={words} rows="7" placeholder="What a Reader should notice here. Markdown works."></textarea>
    </label>

    {#if problems.length > 0}
      <ul class="problems">{#each problems as p (p)}<li>{p}</li>{/each}</ul>
    {:else}
      <p class="file">This becomes <code>tours/{tour.id}/scenes/{file}</code>.</p>
    {/if}

    <div class="actions">
      {#if link}
        <a class="primary" href={link} target="_blank" rel="noopener">Commit this Scene on GitHub</a>
      {:else if !repo}
        <p class="note">This preview does not know its GitHub repository. Copy the text into <code>tours/{tour.id}/scenes/{file}</code>.</p>
      {/if}
      <button type="button" disabled={problems.length > 0} onclick={copy}>{copied ? 'Copied' : 'Copy the text'}</button>
    </div>
    <p class="note">The Scene appears in your Collection after GitHub rebuilds it, about a minute after you commit.</p>
  </form>
</div>

<style>
  .picker {
    display: grid;
    grid-template-columns: 1fr minmax(18rem, 24rem);
    gap: 1rem;
    height: 100%;
    min-height: 0;
  }
  .stage {
    position: relative;
    min-height: 20rem;
  }
  .image {
    position: absolute;
    inset: 0;
    background: #222;
    border-radius: 6px;
  }
  .image :global(.pf-drawn) {
    border: 3px solid #ffb000;
    background: rgb(255 176 0 / 0.15);
  }
  .image :global(.pf-existing) {
    border: 2px dashed rgb(255 255 255 / 0.85);
  }
  .image :global(.pf-existing)::after {
    content: attr(data-title);
    position: absolute;
    left: 0;
    top: 0;
    background: rgb(0 0 0 / 0.65);
    color: #fff;
    font-size: 0.75rem;
    padding: 0 0.3rem;
  }
  .mode {
    position: absolute;
    top: 0.5rem;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 0.25rem;
  }
  .form {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    overflow-y: auto;
  }
  label {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    font-weight: 600;
  }
  input,
  textarea,
  select {
    font: inherit;
    font-weight: 400;
    padding: 0.5rem;
    border: 1px solid #999;
    border-radius: 4px;
  }
  .where,
  .file,
  .note {
    margin: 0;
    font-size: 0.9rem;
  }
  .problems {
    margin: 0;
    color: #a40000;
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    align-items: center;
  }
  @media (max-width: 760px) {
    .picker {
      grid-template-columns: 1fr;
      grid-template-rows: 55vh auto;
    }
  }
</style>
