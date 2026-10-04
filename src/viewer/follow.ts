// Scene following: as a Reader pans freely, the panel shows the Scene that best matches
// what they look at.
//
// The rule is ported from the Beehive Poster Viewer's calcProximateScene:
// Copyright (c) 2014 Jonathan Rochkind. Permission is hereby granted, free of charge, to
// any person obtaining a copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including without limitation
// the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is furnished to do
// so, subject to the following conditions: The above copyright notice and this permission
// notice shall be included in all copies or substantial portions of the Software.
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND.
import { area, overlap, pixelRect, type PixelRect } from '../core/geometry.ts';

/** A Scene counts only if the view shows more than this share of it, and it fills more than this share of the view. */
const MIN_SHARE = 0.1;
/** Seeing more of a Scene matters a little more than the Scene filling the view. */
const SCENE_WEIGHT = 1.2;

/** Index of the Scene that best matches `view`, or null when none is a fair match. */
export function follow(view: PixelRect, scenes: ReadonlyArray<{ region: PixelRect }>): number | null {
  let best: number | null = null;
  let bestScore = 0;
  scenes.forEach(({ region }, i) => {
    const shared = overlap(view, region);
    if (shared === 0) return;
    const ofScene = shared / area(region);
    const ofView = shared / area(view);
    const score = SCENE_WEIGHT * ofScene + ofView;
    if (ofScene > MIN_SHARE && ofView > MIN_SHARE && score > bestScore) {
      best = i;
      bestScore = score;
    }
  });
  return best;
}

export type Insets = { left: number; bottom: number };

/** The part of `view` the Reader can see past the panel; `insets` are screen pixels. */
export function uncovered(view: PixelRect, screen: { width: number; height: number }, insets: Insets): PixelRect {
  const sx = view.w / screen.width;
  const sy = view.h / screen.height;
  return pixelRect({
    x: view.x + insets.left * sx,
    y: view.y,
    w: view.w - insets.left * sx,
    h: view.h - insets.bottom * sy,
  });
}

/** The view to ask for so that `region` lands in the uncovered part of the screen. */
export function behindPanel(region: PixelRect, screen: { width: number; height: number }, insets: Insets): PixelRect {
  const free = { width: screen.width - insets.left, height: screen.height - insets.bottom };
  // Scale so the region fits the free area, with a margin, then grow the view by the insets.
  const scale = Math.max(region.w / free.width, region.h / free.height) * 1.1;
  const w = screen.width * scale;
  const h = screen.height * scale;
  const freeCenterX = (insets.left + free.width / 2) * scale;
  const freeCenterY = (free.height / 2) * scale;
  return pixelRect({ x: region.x + region.w / 2 - freeCenterX, y: region.y + region.h / 2 - freeCenterY, w, h });
}
