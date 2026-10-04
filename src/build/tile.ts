// IIIF Image API 3, level 0: static tiles a static host can serve. libvips does the work
// through sharp (ADR-0003; docs/spikes/2026-10-04-tiling.md).
import { Data, Effect } from 'effect';
import { readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

export class TileFailed extends Data.TaggedError('TileFailed')<{ reason: string }> {}

export type Tiled = { width: number; height: number; /** relative to the tile folder */ full: string };

export const tileImage = (src: string, outDir: string): Effect.Effect<Tiled, TileFailed> =>
  Effect.tryPromise({
    try: async () => {
      rmSync(outDir, { recursive: true, force: true });
      const info = await sharp(src, { limitInputPixels: false })
        .rotate() // honour EXIF orientation, so the Scene picker and the tiles agree
        .jpeg({ quality: 85, mozjpeg: true })
        .tile({ layout: 'iiif3', size: 512, id: 'https://posterforker.invalid' })
        .toFile(outDir);
      // libvips writes the one whole-Image file at the smallest level: full/<w>,<h>/0/default.jpg
      const [size] = readdirSync(join(outDir, 'full'));
      if (!size) throw new Error('libvips wrote no full/ image');
      return { width: info.width, height: info.height, full: `full/${size}/0/default.jpg` };
    },
    catch: (e) => new TileFailed({ reason: e instanceof Error ? e.message : String(e) }),
  });
