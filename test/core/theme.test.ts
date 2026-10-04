import { describe, expect, it } from 'vitest';
import { themeContrastProblems } from '../../src/core/contrast.ts';
import { PRESET_THEMES, resolveTheme, themeVariables } from '../../src/core/theme.ts';

describe('theme', () => {
  it('ships presets that pass the contrast check', () => {
    for (const preset of Object.values(PRESET_THEMES)) expect(themeContrastProblems(preset.colors)).toEqual([]);
  });

  it('lays the Maker’s choices over the preset they name', () => {
    const t = resolveTheme({ preset: 'character', colors: { accent: '#ffcc00' }, radius: 0 });
    expect(t.colors).toEqual({ ...PRESET_THEMES.character.colors, accent: '#ffcc00' });
    expect(t.radius).toBe(0);
    expect(t.fonts).toEqual(PRESET_THEMES.character.fonts);
  });

  it('starts from neutral when no preset is named', () => {
    expect(resolveTheme({})).toEqual(PRESET_THEMES.neutral);
  });

  it('becomes CSS custom properties', () => {
    const v = themeVariables(resolveTheme({ colors: { text: '#111111' }, radius: 4, motion: 'none' }));
    expect(v['--pf-text']).toBe('#111111');
    expect(v['--pf-radius']).toBe('4px');
    expect(v['--pf-motion']).toBe('0');
  });
});
