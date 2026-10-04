// WCAG 2.2 contrast, for the four Theme colours a Reader reads against.

export type ThemeColors = { background: string; panel: string; text: string; accent: string };

const channel = (v: number): number => {
  const s = v / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};

const luminance = (hex: string): number => {
  const n = Number.parseInt(hex.replace('#', ''), 16);
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
};

export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((p, q) => q - p) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

// Text needs 4.5:1 (WCAG 1.4.3); the accent marks controls and Scene outlines, 3:1 (1.4.11).
const PAIRS: ReadonlyArray<[keyof ThemeColors, keyof ThemeColors, number]> = [
  ['text', 'background', 4.5],
  ['text', 'panel', 4.5],
  ['accent', 'background', 3],
  ['accent', 'panel', 3],
];

export function themeContrastProblems(c: ThemeColors): string[] {
  return PAIRS.flatMap(([fg, bg, needs]) => {
    const ratio = contrastRatio(c[fg], c[bg]);
    return ratio >= needs ? [] : [`${fg} on ${bg} is ${ratio.toFixed(2)}:1, needs ${needs}:1`];
  });
}
