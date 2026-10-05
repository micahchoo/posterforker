// The edit model: a Collection's files as /edit loaded them, the Maker's edits as plain
// data, and the file changes that one Save writes. Pure — no DOM, no GitHub.
import { isMap, isSeq, parseDocument, type Document } from 'yaml';
import type { PixelRect } from '../core/geometry.ts';
import type { Layout } from '../core/names.ts';
import { CollectionFile, ThemeFile, TourFile } from '../core/schema.ts';
import { playingOrder, readSceneSource, readYamlFile, writeScene } from '../core/source.ts';

export type SceneDraft = { id: string; title: string; region: PixelRect; words: string; isNew?: true };
export type TourDraft = { id: string; scenes: SceneDraft[] };
export type Draft = { tours: TourDraft[]; theme: ThemeFile; layout: Layout | undefined };
export type FileChange = { path: string; text: string } | { path: string; delete: true };

type Files = Readonly<Record<string, string>>;

const scenePath = (tour: string, id: string) => `tours/${tour}/scenes/${id}.md`;
const decoded = <T>(r: { ok: true; value: T } | { ok: false }): T | undefined => (r.ok ? r.value : undefined);

export function readDraft(files: Files): Draft {
  const collection = decoded(readYamlFile('collection.yml', files['collection.yml'] ?? '', CollectionFile));
  const folders = [...new Set(Object.keys(files).flatMap((p) => p.match(/^tours\/([^/]+)\//)?.[1] ?? []))].sort();
  const tours = (collection?.tours ?? folders).filter((t) => folders.includes(t)).map((id): TourDraft => {
    const meta = decoded(readYamlFile(`tours/${id}/tour.yml`, files[`tours/${id}/tour.yml`] ?? '', TourFile));
    const sources = new Map(
      Object.entries(files).flatMap(([path, text]) => {
        const sceneId = path.match(new RegExp(`^tours/${id}/scenes/([^/]+)\\.md$`))?.[1];
        const source = sceneId === undefined ? undefined : decoded(readSceneSource(path, text));
        return sceneId !== undefined && source ? [[sceneId, source] as const] : [];
      }),
    );
    const { order } = playingOrder([...sources.keys()], meta?.scenes);
    return { id, scenes: order.map((sceneId) => ({ id: sceneId, ...sources.get(sceneId)! })) };
  });
  return {
    tours,
    theme: decoded(readYamlFile('theme.yml', files['theme.yml'] ?? '', ThemeFile)) ?? {},
    layout: collection?.layout as Layout | undefined,
  };
}

// ---- Edits. Each returns a new Draft and leaves the old one as it was. ----

const withTour = (d: Draft, tour: string, f: (scenes: SceneDraft[]) => SceneDraft[]): Draft => ({
  ...d,
  tours: d.tours.map((t) => (t.id === tour ? { ...t, scenes: f(t.scenes) } : t)),
});

/** A file name from a title: "Mount Fuji!" → "mount-fuji", unique within the Tour. */
function freeId(title: string, taken: ReadonlyArray<string>): string {
  const slug =
    title
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'scene';
  let id = slug;
  for (let n = 2; taken.includes(id); n++) id = `${slug}-${n}`;
  return id;
}

/** A fresh id for a Scene not yet saved. Its file name comes from its title at Save. */
export const newSceneId = (d: Draft, tour: string): string =>
  freeId('new scene', d.tours.find((t) => t.id === tour)?.scenes.map((s) => s.id) ?? []);

export function addScene(d: Draft, tour: string, region: PixelRect): { draft: Draft; id: string } {
  const id = newSceneId(d, tour);
  return { draft: withTour(d, tour, (ss) => [...ss, { id, title: '', region, words: '', isNew: true }]), id };
}

export function updateScene(d: Draft, tour: string, id: string, patch: Partial<Pick<SceneDraft, 'title' | 'region' | 'words'>>): Draft {
  return withTour(d, tour, (ss) =>
    ss.map((s) => (s.id === id ? { ...s, ...patch } : s)),
  );
}

export const moveScene = (d: Draft, tour: string, id: string, to: number): Draft =>
  withTour(d, tour, (ss) => {
    const moving = ss.find((s) => s.id === id);
    if (!moving) return ss;
    const rest = ss.filter((s) => s !== moving);
    return [...rest.slice(0, to), moving, ...rest.slice(to)];
  });

export const deleteScene = (d: Draft, tour: string, id: string): Draft => withTour(d, tour, (ss) => ss.filter((s) => s.id !== id));

export const setTheme = (d: Draft, theme: ThemeFile): Draft => ({ ...d, theme });
export const setLayout = (d: Draft, layout: Layout): Draft => ({ ...d, layout });

// ---- Edits as steps: kept, undone and replayed, never a snapshot. ----

/** One thing the Maker did. Plain data, so the list survives a reload in localStorage. */
export type Step =
  | { readonly kind: 'add'; readonly tour: string; readonly id: string; readonly region: PixelRect }
  | { readonly kind: 'update'; readonly tour: string; readonly id: string; readonly patch: Partial<Pick<SceneDraft, 'title' | 'region' | 'words'>> }
  | { readonly kind: 'move'; readonly tour: string; readonly id: string; readonly to: number }
  | { readonly kind: 'delete'; readonly tour: string; readonly id: string }
  | { readonly kind: 'theme'; readonly theme: ThemeFile }
  | { readonly kind: 'layout'; readonly layout: Layout };

/** Add a Scene with the id the Maker's step chose, or a free one if that is taken now. */
function addWithId(d: Draft, tour: string, id: string, region: PixelRect): Draft {
  const taken = d.tours.find((t) => t.id === tour)?.scenes.map((s) => s.id) ?? [];
  const free = taken.includes(id) ? freeId(id, taken) : id;
  return withTour(d, tour, (ss) => [...ss, { id: free, title: '', region, words: '', isNew: true }]);
}

/** Add a step, merged into the last one when it continues it, so Undo takes back an edit, not a keystroke. */
export function record(steps: ReadonlyArray<Step>, step: Step): Step[] {
  const last = steps.at(-1);
  const continues =
    last &&
    last.kind === step.kind &&
    (step.kind === 'theme' || step.kind === 'layout' || ('id' in last && 'id' in step && last.id === step.id && last.tour === step.tour));
  if (!continues || step.kind === 'add' || step.kind === 'delete') return [...steps, step];
  const merged = step.kind === 'update' && last.kind === 'update' ? { ...step, patch: { ...last.patch, ...step.patch } } : step;
  return [...steps.slice(0, -1), merged];
}

export function apply(d: Draft, step: Step): Draft {
  switch (step.kind) {
    case 'add':
      return addWithId(d, step.tour, step.id, step.region);
    case 'update':
      return updateScene(d, step.tour, step.id, step.patch);
    case 'move':
      return moveScene(d, step.tour, step.id, step.to);
    case 'delete':
      return deleteScene(d, step.tour, step.id);
    case 'theme':
      return setTheme(d, step.theme);
    case 'layout':
      return setLayout(d, step.layout);
  }
}

/** The Maker's steps on top of a draft. A step whose Scene is gone does nothing. */
export const replay = (d: Draft, steps: ReadonlyArray<Step>): Draft => steps.reduce(apply, d);

// ---- What one Save writes. ----

const same = (a: unknown, b: unknown) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
const canonical = (v: unknown): unknown =>
  Array.isArray(v)
    ? v.map(canonical)
    : v && typeof v === 'object'
      ? Object.fromEntries(Object.entries(v).filter(([, x]) => x !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([k, x]) => [k, canonical(x)]))
      : v;
const roundRegion = (r: PixelRect) => ({ x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.w), h: Math.round(r.h) });

/** Replace a YAML document's whole value, keeping the comment written at its top.
 * With no blank line under it, YAML hangs that comment on the first key, not the document. */
function replaceContents(doc: Document, value: unknown): string {
  const contents = doc.contents;
  // doc.commentBefore, when present, is untouched by replacing the contents.
  const firstKey = isMap(contents) ? (contents.items[0]?.key as { commentBefore?: string | null } | undefined) : undefined;
  const onKey = firstKey?.commentBefore;
  const node = doc.createNode(value);
  doc.contents = node;
  // Put it back where it was: on the first key, or (if it had a blank line under it) on the document.
  const newKey = isMap(node) ? (node.items[0]?.key as { commentBefore?: string | null } | undefined) : undefined;
  if (onKey && newKey) newKey.commentBefore = onKey;
  else if (onKey) doc.commentBefore = onKey;
  return doc.toString();
}

const flowLists = (node: unknown) => {
  if (isMap(node)) for (const item of node.items) if (isSeq(item.value)) item.value.flow = true;
};

export function changes(files: Files, d: Draft): FileChange[] {
  const before = readDraft(files);
  const out: FileChange[] = [];

  for (const tour of d.tours) {
    const old = before.tours.find((t) => t.id === tour.id)?.scenes ?? [];
    // A new Scene's file is named after its title now, never over an existing file.
    const fileId = new Map<string, string>();
    const taken = tour.scenes.filter((s) => !s.isNew).map((s) => s.id);
    for (const s of tour.scenes.filter((x) => x.isNew)) {
      const id = freeId(s.title || 'scene', taken);
      taken.push(id);
      fileId.set(s.id, id);
    }
    const idOf = (s: SceneDraft) => fileId.get(s.id) ?? s.id;
    for (const s of tour.scenes) {
      const was = s.isNew ? undefined : old.find((o) => o.id === s.id);
      const now = { title: s.title, region: roundRegion(s.region), words: s.words.trim() };
      if (!was || !same(now, { title: was.title, region: roundRegion(was.region), words: was.words })) {
        out.push({ path: scenePath(tour.id, idOf(s)), text: writeScene(s) });
      }
    }
    for (const o of old) if (!tour.scenes.some((s) => !s.isNew && s.id === o.id)) out.push({ path: scenePath(tour.id, o.id), delete: true });

    // Write the order only when the build would not already play it from tour.yml as it is.
    const ids = tour.scenes.map(idOf);
    const tourPath = `tours/${tour.id}/tour.yml`;
    const doc = parseDocument(files[tourPath] ?? '');
    const listed = (doc.get('scenes') as { toJSON(): Array<string | number> } | undefined)?.toJSON();
    if (!same(playingOrder(ids, listed).order, ids)) {
      const seq = doc.createNode(ids);
      seq.flow = true;
      doc.set('scenes', seq);
      out.push({ path: tourPath, text: doc.toString() });
    }
  }

  if (!same(d.theme, before.theme)) out.push({ path: 'theme.yml', text: replaceContents(parseDocument(files['theme.yml'] ?? ''), d.theme) });

  if (d.layout && !same(d.layout, before.layout)) {
    const doc = parseDocument(files['collection.yml'] ?? '');
    const node = doc.createNode(d.layout);
    flowLists(node);
    doc.set('layout', node);
    out.push({ path: 'collection.yml', text: doc.toString() });
  }
  return out;
}
