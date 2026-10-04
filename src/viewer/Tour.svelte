<script lang="ts">
  // Owns OpenSeadragon. Lends the state a Camera; everything else is the state's job.
  import OpenSeadragon from 'openseadragon';
  import { normRect, toNorm, toPixel, type PixelRect } from '../core/geometry.ts';
  import { MOTION_SECONDS } from '../core/theme.ts';
  import { behindPanel, uncovered } from './follow.ts';
  import { scenesOf, type ViewerState } from './state.svelte.ts';

  let { viewer }: { viewer: ViewerState } = $props();
  let host: HTMLDivElement;
  let outlineOf: (region: PixelRect | null) => void = () => {};

  $effect(() => outlineOf(viewer.scene?.region ?? null));

  /** level-0 tiles are fetched beside info.json, wherever the site is hosted (docs/spikes). */
  async function tileSource(tiles: string) {
    const url = new URL(`${tiles}/info.json`, document.baseURI);
    const info = await (await fetch(url)).json();
    return { ...info, id: url.href.replace(/\/info\.json$/, '') };
  }

  $effect(() => {
    const tour = viewer.tour;
    const width = tour.width;
    let cancelled = false;
    // Only a move the Reader made is followed. OpenSeadragon also animates on its own (opening
    // an Image, a resize), and a Scene the state chose is already chosen.
    let readerMoved = false;

    const osd = OpenSeadragon({
      element: host,
      showNavigationControl: false,
      animationTime: viewer.reducedMotion ? 0 : MOTION_SECONDS[viewer.theme.motion] / 1.5,
      springStiffness: 8,
      visibilityRatio: 0.6,
      constrainDuringPan: true,
      gestureSettingsMouse: { clickToZoom: false },
      // Keys are the state's; OpenSeadragon's own would move the Image twice.
      keyboardShortcutsEnabled: false,
    } as OpenSeadragon.Options);

    const screen = () => ({ width: host.clientWidth, height: host.clientHeight });
    const camera = {
      show(region: PixelRect, immediately = false) {
        readerMoved = false;
        const target = toNorm(behindPanel(region, screen(), viewer.insets), width);
        osd.viewport.fitBounds(new OpenSeadragon.Rect(target.x, target.y, target.w, target.h), immediately);
      },
      zoomBy(factor: number) {
        readerMoved = true;
        osd.viewport.zoomBy(factor);
        osd.viewport.applyConstraints();
      },
      home() {
        readerMoved = false;
        osd.viewport.goHome(viewer.reducedMotion);
      },
      view(): PixelRect {
        const b = osd.viewport.getBounds(true);
        return uncovered(toPixel(normRect({ x: b.x, y: b.y, w: b.width, h: b.height }), width), screen(), viewer.insets);
      },
    };

    // The current Scene, outlined on the Image so the Reader sees what the words are about.
    const outline = document.createElement('div');
    outline.className = 'pf-scene-outline';
    const showOutline = (region: PixelRect | null) => {
      osd.removeOverlay(outline);
      if (!region) return;
      const r = toNorm(region, width);
      osd.addOverlay({ element: outline, location: new OpenSeadragon.Rect(r.x, r.y, r.w, r.h) });
    };
    outlineOf = showOutline;

    for (const gesture of ['canvas-drag', 'canvas-scroll', 'canvas-pinch', 'canvas-double-click'] as const) {
      osd.addHandler(gesture, () => (readerMoved = true));
    }
    osd.addHandler('animation-finish', () => {
      if (!readerMoved) return;
      readerMoved = false;
      viewer.followView();
    });

    Promise.all([tileSource(tour.tiles), fetch(new URL(tour.manifest, document.baseURI)).then((r) => r.json())]).then(
      ([source, manifest]) => {
        if (cancelled) return;
        osd.addOnceHandler('open', () => viewer.attach(camera, scenesOf(manifest)));
        osd.open(source);
      },
    );

    return () => {
      outlineOf = () => {};
      cancelled = true;
      viewer.detach();
      osd.destroy();
    };
  });
</script>

<div class="tour" bind:this={host} role="img" aria-label={viewer.tour.alt ?? viewer.tour.title}></div>

<style>
  .tour :global(.pf-scene-outline) {
    border: 3px solid var(--pf-accent);
    border-radius: calc(var(--pf-radius) * 0.5);
    box-shadow: 0 0 0 9999px rgb(0 0 0 / 0.18);
    pointer-events: none;
  }
  .tour {
    position: absolute;
    inset: 0;
    background: var(--pf-background);
  }
</style>
