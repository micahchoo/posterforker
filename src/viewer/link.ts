// A place in a Collection, written into the URL so a Reader can share it.
import { pixelRect, xywh, type PixelRect } from '../core/geometry.ts';

export type Place = { tour?: string; scene?: string; view?: PixelRect };

export function formatPlace(p: Place): string {
  const params = new URLSearchParams();
  if (p.tour) params.set('tour', p.tour);
  if (p.scene) params.set('scene', p.scene);
  else if (p.view) params.set('xywh', xywh(p.view));
  // URLSearchParams escapes the commas; they are safe in a fragment and easier to read.
  return `#${params.toString().replace(/%2C/g, ',')}`;
}

export function parsePlace(hash: string): Place {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  const place: Place = {};
  const tour = params.get('tour');
  if (tour) place.tour = tour;
  const scene = params.get('scene');
  if (scene) place.scene = scene;
  const nums = params.get('xywh')?.split(',').map(Number);
  if (nums?.length === 4 && nums.every(Number.isFinite) && nums[2]! > 0 && nums[3]! > 0) {
    const [x, y, w, h] = nums as [number, number, number, number];
    if (place.tour) place.view = pixelRect({ x, y, w, h });
  }
  return place;
}
