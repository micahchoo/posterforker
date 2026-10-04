import { describe, expect, it } from 'vitest';
import { contrastRatio, themeContrastProblems } from '../../src/core/contrast.ts';

describe('contrast', () => {
  it('measures WCAG contrast', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrastRatio('#777777', '#ffffff')).toBeCloseTo(4.48, 2);
  });

  it('names each pair that fails', () => {
    const problems = themeContrastProblems({ background: '#ffffff', panel: '#fafafa', text: '#999999', accent: '#2255cc' });
    expect(problems).toEqual([
      'text on background is 2.85:1, needs 4.5:1',
      'text on panel is 2.73:1, needs 4.5:1',
    ]);
  });

  it('passes a readable Theme', () => {
    expect(themeContrastProblems({ background: '#ffffff', panel: '#f4f4f4', text: '#1a1a1a', accent: '#1f4fbf' })).toEqual([]);
  });
});
