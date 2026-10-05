// What the Maker sees for each name in the format. The format's own names never reach the screen.
import type { ModuleName, SlotName } from '../core/names.ts';
import type { PRESETS } from '../core/names.ts';

export const MODULE_LABELS: Record<ModuleName, string> = {
  'scene-text': 'Scene words',
  'scene-list': 'List of Scenes',
  'prev-next': 'Previous / Next',
  'tour-switcher': 'Tour switcher',
  zoom: 'Zoom buttons',
  fullscreen: 'Full screen',
  share: 'Share',
  credits: 'Credits',
};

export const SLOT_LABELS: Record<SlotName, string> = {
  panel: 'Side panel',
  top: 'Top',
  'top-left': 'Top left',
  'top-right': 'Top right',
  bottom: 'Bottom',
  'bottom-left': 'Bottom left',
  'bottom-right': 'Bottom right',
};

export const PRESET_LABELS: Record<(typeof PRESETS)[number], { name: string; says: string }> = {
  neutral: { name: 'Calm', says: 'Light and quiet. Lets the Image speak.' },
  paper: { name: 'Paper', says: 'Warm, bookish, a serif on cream.' },
  character: { name: 'Lantern', says: 'Dark and warm, for night scenes and prints.' },
  ink: { name: 'Ink', says: 'Dark and crisp, modern type.' },
};
