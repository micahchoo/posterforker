import { describe, expect, it } from 'vitest';
import { pixelRect } from '../../src/core/geometry.ts';
import { follow, uncovered } from '../../src/viewer/follow.ts';

const scene = (x: number, y: number, w: number, h: number) => ({ region: pixelRect({ x, y, w, h }) });

describe('follow', () => {
  // Scene 1 is far away; the view covers 60% of Scene 2 and 5% of Scene 3.
  const scenes = [scene(9000, 9000, 100, 100), scene(0, 0, 1000, 1000), scene(1000, 0, 1000, 1000)];

  it('picks the Scene that best matches the view', () => {
    expect(follow(pixelRect({ x: 400, y: 0, w: 650, h: 1000 }), scenes)).toBe(1);
  });

  it('picks none when the view touches no Scene', () => {
    expect(follow(pixelRect({ x: 5000, y: 5000, w: 500, h: 500 }), scenes)).toBeNull();
  });

  it('picks none when the view is a sliver of a Scene, or a Scene is a speck in the view', () => {
    expect(follow(pixelRect({ x: 950, y: 950, w: 40, h: 40 }), [scene(0, 0, 1000, 1000)])).toBeNull();
    expect(follow(pixelRect({ x: 0, y: 0, w: 10000, h: 10000 }), [scene(0, 0, 100, 100)])).toBeNull();
  });
});

describe('uncovered', () => {
  it('removes the part of the view a left panel hides', () => {
    const view = pixelRect({ x: 0, y: 0, w: 1000, h: 500 });
    expect(uncovered(view, { width: 1000, height: 500 }, { left: 300, bottom: 0 })).toEqual(
      pixelRect({ x: 300, y: 0, w: 700, h: 500 }),
    );
  });

  it('removes the part a bottom sheet hides', () => {
    const view = pixelRect({ x: 0, y: 0, w: 400, h: 800 });
    expect(uncovered(view, { width: 400, height: 800 }, { left: 0, bottom: 200 })).toEqual(
      pixelRect({ x: 0, y: 0, w: 400, h: 600 }),
    );
  });
});
