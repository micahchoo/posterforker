// What a Maker may write in each file. One definition, read by the build and by /edit.
import { Schema } from 'effect';
import { MODULES, MOTIONS, PRESETS, SLOTS, type SlotName } from './names.ts';

export * from './names.ts';


const Text = Schema.String.check(Schema.isMinLength(1));
const Pixels = Schema.Finite.check(Schema.isGreaterThanOrEqualTo(0));
const Extent = Schema.Finite.check(Schema.isGreaterThan(0));
const Hex = Schema.String.check(Schema.isPattern(/^#[0-9a-fA-F]{6}$/, { message: 'must be a colour like #1a2b3c' }));

export const SceneMeta = Schema.Struct({
  title: Text,
  region: Schema.Struct({ x: Pixels, y: Pixels, w: Extent, h: Extent }),
});

export const TourFile = Schema.Struct({
  title: Text,
  /** A file in the tour folder (up to 25 MiB through the browser) or a Release asset name. */
  image: Schema.Union([Schema.Struct({ file: Text }), Schema.Struct({ release: Text })]),
  alt: Schema.optionalKey(Text),
});

const ModuleList = Schema.Array(Schema.Literals(MODULES));

export const CollectionFile = Schema.Struct({
  title: Text,
  tours: Schema.optionalKey(Schema.Array(Text)),
  credits: Schema.optionalKey(Text),
  layout: Schema.optionalKey(
    Schema.Struct(Object.fromEntries(SLOTS.map((s) => [s, Schema.optionalKey(ModuleList)])) as {
      [K in SlotName]: Schema.optionalKey<typeof ModuleList>;
    }),
  ),
});


export const ThemeFile = Schema.Struct({
  preset: Schema.optionalKey(Schema.Literals(PRESETS)),
  colors: Schema.optionalKey(
    Schema.Struct({
      background: Schema.optionalKey(Hex),
      panel: Schema.optionalKey(Hex),
      text: Schema.optionalKey(Hex),
      accent: Schema.optionalKey(Hex),
    }),
  ),
  fonts: Schema.optionalKey(Schema.Struct({ heading: Schema.optionalKey(Text), body: Schema.optionalKey(Text) })),
  radius: Schema.optionalKey(Schema.Finite.check(Schema.isGreaterThanOrEqualTo(0), Schema.isLessThanOrEqualTo(32))),
  panelOpacity: Schema.optionalKey(Schema.Finite.check(Schema.isGreaterThanOrEqualTo(0.5), Schema.isLessThanOrEqualTo(1))),
  motion: Schema.optionalKey(Schema.Literals(MOTIONS)),
});

export type SceneMeta = typeof SceneMeta.Type;
export type TourFile = typeof TourFile.Type;
export type CollectionFile = typeof CollectionFile.Type;
export type ThemeFile = typeof ThemeFile.Type;
