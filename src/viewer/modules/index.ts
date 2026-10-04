// The built-in Modules, by the name a Maker writes in collection.yml.
// Every Module is a component that takes one prop: `viewer`, the ViewerState.
import type { Component } from 'svelte';
import type { ModuleName } from '../../core/names.ts';
import type { ViewerState } from '../state.svelte.ts';
import Credits from './Credits.svelte';
import Fullscreen from './Fullscreen.svelte';
import PrevNext from './PrevNext.svelte';
import SceneList from './SceneList.svelte';
import SceneText from './SceneText.svelte';
import Share from './Share.svelte';
import TourSwitcher from './TourSwitcher.svelte';
import Zoom from './Zoom.svelte';

export type ModuleComponent = Component<{ viewer: ViewerState }>;

export const MODULE_COMPONENTS: Record<ModuleName, ModuleComponent> = {
  'scene-text': SceneText,
  'scene-list': SceneList,
  'prev-next': PrevNext,
  'tour-switcher': TourSwitcher,
  zoom: Zoom,
  fullscreen: Fullscreen,
  share: Share,
  credits: Credits,
};
