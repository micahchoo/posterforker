// The names a Maker may write, and the shape the build hands the viewer.
// No dependencies: the viewer imports this file, and must not pull in the schema library.
import type { ThemeFile } from './schema.ts';

export const SLOTS = ['panel', 'top', 'top-left', 'top-right', 'bottom', 'bottom-left', 'bottom-right'] as const;
export const MODULES = ['scene-text', 'scene-list', 'prev-next', 'tour-switcher', 'zoom', 'fullscreen', 'share', 'credits'] as const;
export type SlotName = (typeof SLOTS)[number];
export type ModuleName = (typeof MODULES)[number];
export type Layout = Partial<Record<SlotName, ModuleName[]>>;

export const MOTIONS = ['none', 'gentle', 'lively'] as const;
export const PRESETS = ['neutral', 'character'] as const;

/** Where the Modules sit when collection.yml says nothing. */
export const DEFAULT_LAYOUT: Layout = {
  panel: ['scene-text', 'scene-list', 'prev-next'],
  top: ['tour-switcher'],
  'top-right': ['share', 'fullscreen'],
  'bottom-right': ['zoom'],
  'bottom-left': ['credits'],
};

/** collection.json: what the build hands the viewer. Paths are relative to the site root. */
export type SiteCollection = {
  title: string;
  /** "owner/name" and branch on GitHub, so /edit can open the right pages. Absent in a local preview. */
  repository?: string;
  branch?: string;
  credits?: string;
  layout: Layout;
  theme: ThemeFile;
  tours: Array<{
    id: string;
    title: string;
    alt?: string;
    manifest: string;
    tiles: string;
    width: number;
    height: number;
    thumbnail: string;
  }>;
};
