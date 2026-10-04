// Reads what a Maker wrote. Every failure names the file, the line and the field,
// because the Maker sees nothing but these messages.
import { Schema, SchemaIssue } from 'effect';
import { marked } from 'marked';
import { isMap, isScalar, LineCounter, parseDocument, type Document } from 'yaml';
import { pixelRect, type PixelRect } from './geometry.ts';
import { SceneMeta } from './schema.ts';

export type Problem = { file: string; line: number; message: string };
export type Read<T> = { ok: true; value: T } | { ok: false; problems: Problem[] };
export type Scene = { title: string; region: PixelRect; html: string };

const formatIssues = SchemaIssue.makeFormatterStandardSchemaV1();

/** Say what a value must be, in the Maker's words rather than the schema's. */
function phrase(message: string): string {
  if (message === 'Missing key') return 'is required';
  const literals = message.match(/^Expected ((?:"[^"]*"(?: \| )?)+)$/);
  if (literals) return `must be one of: ${[...literals[1]!.matchAll(/"([^"]*)"/g)].map((m) => m[1]).join(', ')}`;
  const type = message.match(/^Expected (string|number|boolean|array|object)$/);
  if (type) return `must be a${type[1] === 'array' || type[1] === 'object' ? 'n' : ''} ${type[1]}`;
  return message.replace(/^Expected (a value )?/, 'must be ');
}

type Ranged = { range?: [number, number, number] };

/** The line of the deepest part of `path` that exists — the key when it has one, so
 * `colors:` and not the first colour under it. A missing key points at its parent. */
function lineOf(doc: Document, counter: LineCounter, path: ReadonlyArray<PropertyKey>): number {
  for (let depth = path.length; depth >= 0; depth--) {
    const node = (depth === 0 ? doc.contents : doc.getIn(path.slice(0, depth), true)) as Ranged | undefined;
    if (!node?.range) continue;
    const parent = depth === 0 ? undefined : depth === 1 ? doc.contents : doc.getIn(path.slice(0, depth - 1), true);
    const key = isMap(parent)
      ? (parent.items.find((pair) => isScalar(pair.key) && pair.key.value === path[depth - 1])?.key as Ranged | undefined)
      : undefined;
    return counter.linePos((key?.range ?? node.range)[0]).line;
  }
  return 1;
}

function decodeYaml<S extends Schema.Top>(file: string, text: string, schema: S, firstLine: number): Read<S['Type']> {
  const counter = new LineCounter();
  const doc = parseDocument(text, { lineCounter: counter, prettyErrors: false });
  const syntax = doc.errors[0];
  if (syntax) {
    const line = syntax.linePos?.[0].line ?? counter.linePos(syntax.pos[0]).line;
    return { ok: false, problems: [{ file, line: line + firstLine - 1, message: syntax.message.split('\n')[0]! }] };
  }
  const decoded = Schema.decodeUnknownResult(schema as never, { errors: 'all' })(doc.toJS());
  if (decoded._tag === 'Success') return { ok: true, value: decoded.success as S['Type'] };
  const { issues } = formatIssues(decoded.failure.issue);
  return {
    ok: false,
    problems: issues.map((issue) => {
      const path = (issue.path ?? []).map((seg) => (typeof seg === 'object' ? seg.key : seg));
      return {
        file,
        line: lineOf(doc, counter, path) + firstLine - 1,
        message: `${path.map(String).join('.')} ${phrase(issue.message)}`.trim(),
      };
    }),
  };
}

/** The line of `path` in a YAML file, for problems found after decoding (a missing file). */
export function lineAt(text: string, path: ReadonlyArray<PropertyKey>): number {
  const counter = new LineCounter();
  return lineOf(parseDocument(text, { lineCounter: counter }), counter, path);
}

export const readYamlFile =<S extends Schema.Top>(file: string, text: string, schema: S): Read<S['Type']> =>
  decodeYaml(file, text, schema, 1);

const FRONT_MATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

export function readScene(file: string, text: string): Read<Scene> {
  const parts = text.match(FRONT_MATTER);
  if (!parts) {
    return { ok: false, problems: [{ file, line: 1, message: 'a Scene starts with front matter between two --- lines' }] };
  }
  const meta = decodeYaml(file, parts[1]!, SceneMeta, 2);
  if (!meta.ok) return meta;
  const html = marked.parse(parts[2]!.trim() + '\n', { async: false });
  return { ok: true, value: { title: meta.value.title, region: pixelRect(meta.value.region), html } };
}

/** The text of a Scene file, the inverse of readScene for what /edit produces. */
export function writeScene(scene: { title: string; region: PixelRect; words: string }): string {
  const { x, y, w, h } = scene.region;
  const r = (n: number) => Math.round(n);
  return `---\ntitle: ${JSON.stringify(scene.title)}\nregion: { x: ${r(x)}, y: ${r(y)}, w: ${r(w)}, h: ${r(h)} }\n---\n${scene.words.trim()}\n`;
}
