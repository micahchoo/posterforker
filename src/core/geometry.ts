// Two units for a rectangle, kept apart by the compiler.
// PixelRect: pixels of the full Image — what a Scene stores and IIIF's #xywh uses.
// NormRect: OpenSeadragon viewport units, where 1 is the Image's width.

declare const pixelUnit: unique symbol;
declare const normUnit: unique symbol;

type Rect = { readonly x: number; readonly y: number; readonly w: number; readonly h: number };
export type PixelRect = Rect & { readonly [pixelUnit]: true };
export type NormRect = Rect & { readonly [normUnit]: true };

export const pixelRect = (r: Rect): PixelRect => ({ x: r.x, y: r.y, w: r.w, h: r.h }) as PixelRect;
export const normRect = (r: Rect): NormRect => ({ x: r.x, y: r.y, w: r.w, h: r.h }) as NormRect;

export const toNorm = (r: PixelRect, imageWidth: number): NormRect =>
  normRect({ x: r.x / imageWidth, y: r.y / imageWidth, w: r.w / imageWidth, h: r.h / imageWidth });

export const toPixel = (r: NormRect, imageWidth: number): PixelRect =>
  pixelRect({ x: r.x * imageWidth, y: r.y * imageWidth, w: r.w * imageWidth, h: r.h * imageWidth });

export const xywh = (r: PixelRect): string => [r.x, r.y, r.w, r.h].map(Math.round).join(',');

export const area = (r: Rect): number => r.w * r.h;

/** Area shared by two rectangles in the same unit; 0 when they do not touch. */
export function overlap<R extends PixelRect | NormRect>(a: R, b: R): number {
  const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  return w > 0 && h > 0 ? w * h : 0;
}
