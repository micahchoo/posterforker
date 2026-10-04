import { describe, expect, it } from 'vitest';
import { pixelRect } from '../../src/core/geometry.ts';
import { formatPlace, parsePlace } from '../../src/viewer/link.ts';

describe('link', () => {
  it('writes a Scene as a short hash and reads it back', () => {
    const hash = formatPlace({ tour: 'river', scene: '02' });
    expect(hash).toBe('#tour=river&scene=02');
    expect(parsePlace(hash)).toEqual({ tour: 'river', scene: '02' });
  });

  it('writes a free view in Image pixels', () => {
    const hash = formatPlace({ tour: 'river', view: pixelRect({ x: 10.4, y: 20, w: 300, h: 200.6 }) });
    expect(hash).toBe('#tour=river&xywh=10,20,300,201');
    expect(parsePlace(hash)).toEqual({ tour: 'river', view: pixelRect({ x: 10, y: 20, w: 300, h: 201 }) });
  });

  it('ignores what it cannot read', () => {
    expect(parsePlace('')).toEqual({});
    expect(parsePlace('#tour=river&xywh=1,2,x,4')).toEqual({ tour: 'river' });
    expect(parsePlace('#xywh=1,2,0,4')).toEqual({});
  });
});
