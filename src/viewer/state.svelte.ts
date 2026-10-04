// The one object a Module talks to. Built-in Modules use nothing else, so this is also
// the API a third-party Module will get.
import { pixelRect, type PixelRect } from '../core/geometry.ts';
import type { SiteCollection } from '../core/names.ts';
import { resolveTheme, type Theme } from '../core/theme.ts';
import { follow, type Insets } from './follow.ts';
import { formatPlace, parsePlace } from './link.ts';

export type SceneView = { id: string; title: string; html: string; region: PixelRect };

/** What Tour.svelte lends the state while an Image is on screen. */
export type Camera = {
  show(region: PixelRect, immediately?: boolean): void;
  zoomBy(factor: number): void;
  home(): void;
  view(): PixelRect;
};

type Annotation = { id: string; label?: { none?: string[] }; body: { value: string }; target: string };

/** The Scenes of a Tour, read back from the manifest the build wrote. */
export function scenesOf(manifest: { items: Array<{ annotations?: Array<{ items: Annotation[] }> }> }): SceneView[] {
  const items = manifest.items[0]?.annotations?.[0]?.items ?? [];
  return items.flatMap((a) => {
    const m = a.target.match(/#xywh=(\d+),(\d+),(\d+),(\d+)$/);
    if (!m) return [];
    const [x, y, w, h] = m.slice(1).map(Number) as [number, number, number, number];
    return [{ id: a.id.split('/').pop()!, title: a.label?.none?.[0] ?? '', html: a.body.value, region: pixelRect({ x, y, w, h }) }];
  });
}

export class ViewerState {
  readonly collection: SiteCollection;
  readonly theme: Theme;
  tourIndex = $state(0);
  scenes = $state.raw<SceneView[]>([]);
  /** null: the Reader is looking at the whole Image, or somewhere no Scene covers. */
  sceneIndex = $state<number | null>(null);
  ready = $state(false);
  insets = $state<Insets>({ left: 0, bottom: 0 });
  message = $state('');

  #camera: Camera | null = null;
  #pending: { scene?: string; view?: PixelRect } | null = null;

  constructor(collection: SiteCollection) {
    this.collection = collection;
    this.theme = resolveTheme(collection.theme);
  }

  get tour() {
    return this.collection.tours[this.tourIndex]!;
  }
  get scene(): SceneView | null {
    return this.sceneIndex === null ? null : (this.scenes[this.sceneIndex] ?? null);
  }
  get reducedMotion(): boolean {
    return this.theme.motion === 'none' || matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /** Called by Tour.svelte once the Image of the current Tour is on screen. */
  attach(camera: Camera, scenes: SceneView[]) {
    this.#camera = camera;
    this.scenes = scenes;
    this.ready = true;
    const pending = this.#pending;
    this.#pending = null;
    const index = pending?.scene ? scenes.findIndex((s) => s.id === pending.scene) : -1;
    if (pending?.scene && index < 0) this.say(`This link names a Scene, “${pending.scene}”, that this Tour does not have.`, 8000);
    if (index >= 0) this.goToScene(index, true);
    else if (pending?.view) camera.show(pending.view, true);
    else this.sceneIndex = null;
  }
  detach() {
    this.#camera = null;
    this.ready = false;
  }

  openTour(index: number, then: { scene?: string; view?: PixelRect } = {}) {
    if (index === this.tourIndex && this.ready) {
      this.#pending = then;
      if (this.#camera) this.attach(this.#camera, this.scenes);
      return;
    }
    this.#pending = then;
    this.sceneIndex = null;
    this.tourIndex = index;
    this.#writeUrl();
  }

  goToScene(index: number, immediately = false) {
    const scene = this.scenes[index];
    if (!scene || !this.#camera) return;
    this.sceneIndex = index;
    this.#camera.show(scene.region, immediately || this.reducedMotion);
    this.#writeUrl();
  }
  next() {
    this.goToScene(this.sceneIndex === null ? 0 : Math.min(this.sceneIndex + 1, this.scenes.length - 1));
  }
  previous() {
    if (this.sceneIndex !== null && this.sceneIndex > 0) this.goToScene(this.sceneIndex - 1);
  }
  zoomIn() {
    this.#camera?.zoomBy(1.6);
  }
  zoomOut() {
    this.#camera?.zoomBy(1 / 1.6);
  }
  home() {
    this.sceneIndex = null;
    this.#camera?.home();
    this.#writeUrl();
  }

  /** The Reader moved the Image themselves: show the Scene that matches, move nothing. */
  followView() {
    if (!this.#camera) return;
    const view = this.#camera.view();
    this.sceneIndex = follow(view, this.scenes);
    this.#writeUrl(view);
  }

  /** A URL that opens exactly what the Reader sees now. */
  get link(): string {
    return location.href;
  }

  #writeUrl(view?: PixelRect) {
    const hash = formatPlace({
      tour: this.tour.id,
      ...(this.scene ? { scene: this.scene.id } : view ? { view } : {}),
    });
    if (location.hash !== hash) history.replaceState(null, '', hash);
  }

  /** Follow a URL the Reader opened or went back to. */
  readUrl() {
    const place = parsePlace(location.hash);
    const index = place.tour ? this.collection.tours.findIndex((t) => t.id === place.tour) : 0;
    if (index < 0) this.say(`This link names a Tour, “${place.tour}”, that this Collection does not have.`, 8000);
    this.openTour(Math.max(index, 0), { ...(place.scene ? { scene: place.scene } : {}), ...(place.view ? { view: place.view } : {}) });
  }

  say(message: string, ms = 2500) {
    this.message = message;
    setTimeout(() => {
      if (this.message === message) this.message = '';
    }, ms);
  }
}
