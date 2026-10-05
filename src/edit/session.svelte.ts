// One editing session: the files as loaded, the Maker's steps on top, and the Save.
// Every component reads and changes the Collection through this object only.
import { pixelRect, type PixelRect } from '../core/geometry.ts';
import type { Layout, SiteCollection } from '../core/names.ts';
import type { ThemeFile } from '../core/schema.ts';
import { changes, newSceneId, readDraft, record, replay, type FileChange, type SceneDraft, type Step } from './draft.ts';
import { loadFiles, publishState, save, SavedElsewhere, type Connection } from './github.ts';

export type SaveStatus =
  | { kind: 'idle' }
  | { kind: 'saving' }
  | { kind: 'publishing'; commit: string }
  | { kind: 'live'; commit: string }
  | { kind: 'failed'; message: string };

const POLL_MS = 4000;

export class EditSession {
  readonly collection: SiteCollection;
  readonly connection: Connection | null;

  files = $state.raw<Record<string, string>>({});
  head = $state<string | null>(null);
  steps = $state.raw<Step[]>([]);
  loaded = $state(false);
  tourIndex = $state(0);
  selected = $state<string | null>(null);
  status = $state<SaveStatus>({ kind: 'idle' });
  notice = $state('');
  /** Bumped to ask the Scene form to put the cursor in Title. */
  focusTitle = $state(0);
  /** Lent by the Stage while an Image is on screen. */
  viewOf: (() => PixelRect) | null = null;
  flyTo: ((region: PixelRect) => void) | null = null;

  readonly draft = $derived(replay(readDraft(this.files), this.steps));
  readonly pending: FileChange[] = $derived(changes(this.files, this.draft));
  readonly scenes: SceneDraft[] = $derived(this.draft.tours.find((t) => t.id === this.tour.id)?.scenes ?? []);
  readonly scene: SceneDraft | null = $derived(this.scenes.find((s) => s.id === this.selected) ?? null);

  get tour() {
    return this.collection.tours[this.tourIndex]!;
  }

  constructor(collection: SiteCollection, connection: Connection | null) {
    this.collection = collection;
    this.connection = connection;
  }

  get #storeKey() {
    return `pf-edit:${this.collection.repository ?? location.pathname}`;
  }

  async load() {
    if (this.connection) {
      const loaded = await loadFiles(this.connection);
      this.files = loaded.files;
      this.head = loaded.head;
    } else {
      const sources = (await (await fetch(new URL('sources.json', document.baseURI))).json()) as { commit?: string; files: Record<string, string> };
      this.files = sources.files;
      this.head = sources.commit ?? null;
    }
    // Unsaved work from before a reload comes back; it replays on whatever is current now.
    try {
      const kept = JSON.parse(localStorage.getItem(this.#storeKey) ?? '[]') as Step[];
      if (kept.length > 0) {
        this.steps = kept;
        this.say('Your unsaved changes are back.');
      }
    } catch {
      /* storage blocked or unreadable: start clean */
    }
    this.loaded = true;
  }

  #persist() {
    try {
      if (this.steps.length > 0) localStorage.setItem(this.#storeKey, JSON.stringify(this.steps));
      else localStorage.removeItem(this.#storeKey);
    } catch {
      /* storage blocked: the work still lives until the tab closes */
    }
  }

  do(step: Step) {
    this.steps = record(this.steps, step);
    if (this.status.kind === 'live' || this.status.kind === 'failed') this.status = { kind: 'idle' };
    this.#persist();
  }

  undo() {
    this.steps = this.steps.slice(0, -1);
    if (this.selected && !this.scenes.some((s) => s.id === this.selected)) this.selected = null;
    this.#persist();
  }

  // ---- What the Maker does ----

  select(id: string | null, fly = false) {
    this.selected = id;
    const scene = this.scenes.find((s) => s.id === id);
    if (fly && scene) this.flyTo?.(scene.region);
  }
  /** A new Scene in the middle of what the Maker is looking at, ready to be named. */
  addSceneHere() {
    const { width, height } = this.tour;
    const v = this.viewOf?.() ?? { x: 0, y: 0, w: width, h: height };
    const w = Math.min(v.w * 0.4, width);
    const h = Math.min(v.h * 0.4, height);
    const x = Math.min(Math.max(0, v.x + (v.w - w) / 2), width - w);
    const y = Math.min(Math.max(0, v.y + (v.h - h) / 2), height - h);
    this.addScene(pixelRect({ x, y, w, h }));
    this.focusTitle++;
  }
  addScene(region: PixelRect) {
    const id = newSceneId(this.draft, this.tour.id);
    this.do({ kind: 'add', tour: this.tour.id, id, region });
    this.do({ kind: 'update', tour: this.tour.id, id, patch: { title: 'New scene' } });
    this.selected = id;
    return id;
  }
  updateScene(id: string, patch: Partial<Pick<SceneDraft, 'title' | 'region' | 'words'>>) {
    this.do({ kind: 'update', tour: this.tour.id, id, patch });
  }
  moveScene(id: string, to: number) {
    this.do({ kind: 'move', tour: this.tour.id, id, to: Math.max(0, Math.min(to, this.scenes.length - 1)) });
  }
  deleteScene(id: string) {
    const title = this.scenes.find((s) => s.id === id)?.title ?? 'Scene';
    this.do({ kind: 'delete', tour: this.tour.id, id });
    if (this.selected === id) this.selected = null;
    this.say(`Deleted “${title}”. Undo brings it back.`);
  }
  setTheme(theme: ThemeFile) {
    this.do({ kind: 'theme', theme });
  }
  setLayout(layout: Layout) {
    this.do({ kind: 'layout', layout });
  }

  say(message: string) {
    this.notice = message;
    setTimeout(() => {
      if (this.notice === message) this.notice = '';
    }, 6000);
  }

  // ---- Save ----

  get #message(): string {
    const scenes = this.pending.filter((c) => c.path.endsWith('.md')).length;
    const parts = [
      scenes > 0 ? `${scenes} Scene${scenes === 1 ? '' : 's'}` : '',
      this.pending.some((c) => c.path === 'theme.yml') ? 'the look' : '',
      this.pending.some((c) => c.path === 'collection.yml') ? 'the layout' : '',
      this.pending.some((c) => c.path.endsWith('tour.yml')) && scenes === 0 ? 'the Scene order' : '',
    ].filter(Boolean);
    return `Edit ${parts.join(', ').replace(/, ([^,]*)$/, ' and $1') || 'the Collection'} in /edit`;
  }

  async save() {
    const c = this.connection;
    if (!c || !this.head || this.pending.length === 0) return;
    this.status = { kind: 'saving' };
    const writing = this.pending;
    try {
      const { commit } = await save(c, this.head, writing, this.#message);
      const next = { ...this.files };
      for (const ch of writing) {
        if ('text' in ch) next[ch.path] = ch.text;
        else delete next[ch.path];
      }
      // New Scenes now have their saved names; select by position, not by the old id.
      const at = this.selected ? this.scenes.findIndex((s) => s.id === this.selected) : -1;
      this.files = next;
      this.head = commit;
      this.steps = [];
      this.#persist();
      this.selected = at >= 0 ? (this.scenes[at]?.id ?? null) : null;
      this.status = { kind: 'publishing', commit };
      void this.#follow(commit);
    } catch (e) {
      if (e instanceof SavedElsewhere) {
        // Load their version and keep the Maker's steps on top of it: nothing is lost.
        const loaded = await loadFiles(c);
        this.files = loaded.files;
        this.head = loaded.head;
        this.status = { kind: 'idle' };
        this.say('Someone else saved while you were editing. Your changes are now on top of theirs: check them, then Save again.');
      } else {
        this.status = { kind: 'failed', message: e instanceof Error ? e.message : String(e) };
      }
    }
  }

  async #follow(commit: string) {
    const c = this.connection!;
    for (let tries = 0; tries < 150; tries++) {
      await new Promise((r) => setTimeout(r, POLL_MS));
      if (this.status.kind !== 'publishing' || this.status.commit !== commit) return;
      const state = await publishState(c, commit).catch(() => 'publishing' as const);
      if (state === 'live') {
        this.status = { kind: 'live', commit };
        return;
      }
      if (state === 'failed') {
        this.status = { kind: 'failed', message: 'GitHub could not publish this version. Its run shows why.' };
        return;
      }
    }
  }
}
