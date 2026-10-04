import { describe, expect, it } from 'vitest';
import { pixelRect } from '../../src/core/geometry.ts';
import { tourManifest } from '../../src/core/manifest.ts';

const input = {
  baseUrl: 'https://maker.github.io/col',
  tourId: 'river',
  title: 'The river map',
  image: { width: 10000, height: 8000, service: 'tiles/river' },
  scenes: [
    { id: '01', title: 'The river', region: pixelRect({ x: 1200, y: 3400, w: 2400, h: 1600 }), html: '<p>Hello</p>' },
  ],
};

describe('tourManifest', () => {
  it('targets each Scene region with #xywh in Image pixels', () => {
    const m = tourManifest(input);
    const canvas = m.items[0]!;
    const scene = canvas.annotations[0]!.items[0]!;
    expect(scene.target).toBe(`${canvas.id}#xywh=1200,3400,2400,1600`);
    expect(scene.body).toEqual({ type: 'TextualBody', format: 'text/html', value: '<p>Hello</p>' });
    expect(scene.label).toEqual({ none: ['The river'] });
  });

  it('paints the Image through its IIIF Image service', () => {
    const m = tourManifest(input);
    const canvas = m.items[0]!;
    expect(canvas).toMatchObject({ type: 'Canvas', width: 10000, height: 8000 });
    const painting = canvas.items[0]!.items[0]!;
    expect(painting.motivation).toBe('painting');
    expect(painting.body.service[0]).toEqual({
      id: 'https://maker.github.io/col/tiles/river',
      type: 'ImageService3',
      profile: 'level0',
    });
  });

  it('is a Presentation 3 manifest with an absolute id', () => {
    const m = tourManifest(input);
    expect(m['@context']).toBe('http://iiif.io/api/presentation/3/context.json');
    expect(m.id).toBe('https://maker.github.io/col/tours/river/manifest.json');
    expect(m.label).toEqual({ none: ['The river map'] });
  });
});
