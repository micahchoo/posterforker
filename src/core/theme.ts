// A Theme as the viewer uses it: a preset with the Maker's choices laid over it.
import type { ThemeColors } from './contrast.ts';
import type { MOTIONS, PRESETS } from './names.ts';
import type { ThemeFile } from './schema.ts';

export type Theme = {
  colors: ThemeColors;
  fonts: { heading: string; body: string };
  radius: number;
  panelOpacity: number;
  motion: (typeof MOTIONS)[number];
};

export const PRESET_THEMES: Record<(typeof PRESETS)[number], Theme> = {
  neutral: {
    colors: { background: '#f4f3ef', panel: '#ffffff', text: '#1b1b1b', accent: '#1f5fbf' },
    fonts: { heading: 'system-ui', body: 'system-ui' },
    radius: 8,
    panelOpacity: 0.96,
    motion: 'gentle',
  },
  character: {
    colors: { background: '#1d1a16', panel: '#2a251f', text: '#f3ead9', accent: '#e0a43a' },
    fonts: { heading: 'Fraunces', body: 'Source Serif 4' },
    radius: 14,
    panelOpacity: 0.92,
    motion: 'lively',
  },
  paper: {
    colors: { background: '#efe8da', panel: '#fbf7ef', text: '#2b2118', accent: '#9c3d1c' },
    fonts: { heading: 'Literata', body: 'Literata' },
    radius: 4,
    panelOpacity: 0.97,
    motion: 'gentle',
  },
  ink: {
    colors: { background: '#0f1115', panel: '#1a1d24', text: '#e9edf3', accent: '#7fb2ff' },
    fonts: { heading: 'Space Grotesk', body: 'Inter' },
    radius: 10,
    panelOpacity: 0.94,
    motion: 'gentle',
  },
};

export function resolveTheme(file: ThemeFile): Theme {
  const base = PRESET_THEMES[file.preset ?? 'neutral'];
  return {
    colors: { ...base.colors, ...file.colors },
    fonts: { ...base.fonts, ...file.fonts },
    radius: file.radius ?? base.radius,
    panelOpacity: file.panelOpacity ?? base.panelOpacity,
    motion: file.motion ?? base.motion,
  };
}

/** Seconds OpenSeadragon takes to move to a Scene. */
export const MOTION_SECONDS: Record<Theme['motion'], number> = { none: 0, gentle: 1.6, lively: 0.9 };

/** Font names that are not on the Reader's computer already, so the viewer must load them. */
const GENERIC = new Set(['system-ui', 'serif', 'sans-serif', 'monospace', 'cursive', 'ui-serif', 'ui-sans-serif', 'ui-rounded']);
export const webFonts = (t: Theme): string[] => [...new Set([t.fonts.heading, t.fonts.body])].filter((f) => !GENERIC.has(f));

const stack = (font: string) => (GENERIC.has(font) ? font : `"${font}", system-ui`);

export const themeVariables = (t: Theme): Record<string, string> => ({
  '--pf-background': t.colors.background,
  '--pf-panel': t.colors.panel,
  '--pf-text': t.colors.text,
  '--pf-accent': t.colors.accent,
  '--pf-font-heading': stack(t.fonts.heading),
  '--pf-font-body': stack(t.fonts.body),
  '--pf-radius': `${t.radius}px`,
  '--pf-panel-opacity': String(t.panelOpacity),
  '--pf-motion': String(MOTION_SECONDS[t.motion]),
});
