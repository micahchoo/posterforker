import { describe, expect, it } from 'vitest';
import { overlap, pixelRect, toNorm, toPixel, xywh } from '../../src/core/geometry.ts';

describe('geometry', () => {
  it('converts Image pixels to viewport units and back, where 1 is the Image width', () => {
    const p = pixelRect({ x: 1000, y: 500, w: 2000, h: 1000 });
    expect(toNorm(p, 10000)).toEqual({ x: 0.1, y: 0.05, w: 0.2, h: 0.1 });
    expect(toPixel(toNorm(p, 10000), 10000)).toEqual(p);
  });

  it('writes whole pixels for #xywh', () => {
    expect(xywh(pixelRect({ x: 1.4, y: 2.6, w: 3.5, h: 4 }))).toBe('1,3,4,4');
  });

  it('measures overlap area, zero when apart', () => {
    const a = pixelRect({ x: 0, y: 0, w: 10, h: 10 });
    expect(overlap(a, pixelRect({ x: 5, y: 5, w: 10, h: 10 }))).toBe(25);
    expect(overlap(a, pixelRect({ x: 20, y: 0, w: 5, h: 5 }))).toBe(0);
  });
});
