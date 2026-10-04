// A Tour becomes a IIIF Presentation 3 manifest: one Canvas, the Image painted through
// its level-0 Image service, and one W3C annotation per Scene.
import { xywh, type PixelRect } from './geometry.ts';

type Lang = { none: string[] };
const lang = (s: string): Lang => ({ none: [s] });

export type TourInput = {
  baseUrl: string;
  tourId: string;
  title: string;
  /** `service` is the tile folder relative to baseUrl; `full` the one whole-Image file
   * a level-0 service holds (libvips writes it at the smallest size), relative to it. */
  image: { width: number; height: number; service: string; full?: string };
  scenes: ReadonlyArray<{ id: string; title: string; region: PixelRect; html: string }>;
};

export function tourManifest(t: TourInput) {
  const base = t.baseUrl.replace(/\/$/, '');
  const id = `${base}/tours/${t.tourId}/manifest.json`;
  const canvasId = `${base}/tours/${t.tourId}/canvas`;
  const service = `${base}/${t.image.service}`;
  return {
    '@context': 'http://iiif.io/api/presentation/3/context.json',
    id,
    type: 'Manifest',
    label: lang(t.title),
    items: [
      {
        id: canvasId,
        type: 'Canvas',
        width: t.image.width,
        height: t.image.height,
        items: [
          {
            id: `${canvasId}/page`,
            type: 'AnnotationPage',
            items: [
              {
                id: `${canvasId}/page/image`,
                type: 'Annotation',
                motivation: 'painting',
                target: canvasId,
                body: {
                  id: `${service}/${t.image.full ?? 'full/max/0/default.jpg'}`,
                  type: 'Image',
                  format: 'image/jpeg',
                  width: t.image.width,
                  height: t.image.height,
                  service: [{ id: service, type: 'ImageService3', profile: 'level0' }],
                },
              },
            ],
          },
        ],
        annotations: [
          {
            id: `${canvasId}/scenes`,
            type: 'AnnotationPage',
            items: t.scenes.map((s) => ({
              id: `${canvasId}/scenes/${s.id}`,
              type: 'Annotation',
              motivation: 'describing',
              label: lang(s.title),
              body: { type: 'TextualBody', format: 'text/html', value: s.html },
              target: `${canvasId}#xywh=${xywh(s.region)}`,
            })),
          },
        ],
      },
    ],
  };
}

export type TourManifest = ReturnType<typeof tourManifest>;
