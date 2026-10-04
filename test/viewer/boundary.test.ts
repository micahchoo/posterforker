// The viewer is what every Reader downloads. It must not pull in the schema library
// (.claude/rules/posterforker-viewer-bundle.md).
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ALLOWED_CORE = new Set(['names.ts', 'theme.ts', 'geometry.ts', 'contrast.ts']);

const files = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? files(join(dir, d.name)) : [join(dir, d.name)]));

describe('viewer imports', () => {
  it('take from core only what needs no library', () => {
    const offending = files('src/viewer').flatMap((file) =>
      // `import type` is erased by the compiler and costs a Reader nothing.
      [...readFileSync(file, 'utf8').matchAll(/^\s*import\s+(?!type\b)[^;]*?from\s+'([^']+)'/gm)]
        .map((m) => m[1]!)
        .filter((spec) => spec === 'effect' || spec === 'marked' || spec === 'yaml' || (spec.includes('/core/') && !ALLOWED_CORE.has(spec.split('/').pop()!)))
        .map((spec) => `${file}: ${spec}`),
    );
    expect(offending).toEqual([]);
  });
});
