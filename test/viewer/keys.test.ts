import { describe, expect, it } from 'vitest';
import { keyAction } from '../../src/viewer/keys.ts';

const key = (k: string, extra: Partial<{ target: string; ctrl: boolean }> = {}) => ({
  key: k,
  ctrlKey: extra.ctrl ?? false,
  metaKey: false,
  altKey: false,
  targetTag: extra.target ?? 'BODY',
  targetEditable: false,
});

describe('keyAction', () => {
  it('moves between Scenes', () => {
    expect(keyAction(key('ArrowRight'))).toBe('next');
    expect(keyAction(key('n'))).toBe('next');
    expect(keyAction(key('ArrowLeft'))).toBe('previous');
    expect(keyAction(key('p'))).toBe('previous');
  });

  it('zooms and shows the whole Image', () => {
    expect(keyAction(key('+'))).toBe('zoom-in');
    expect(keyAction(key('='))).toBe('zoom-in');
    expect(keyAction(key('-'))).toBe('zoom-out');
    expect(keyAction(key('0'))).toBe('home');
  });

  it('leaves typing and browser shortcuts alone', () => {
    expect(keyAction(key('n', { target: 'INPUT' }))).toBeNull();
    expect(keyAction(key('ArrowRight', { target: 'TEXTAREA' }))).toBeNull();
    expect(keyAction(key('+', { ctrl: true }))).toBeNull();
    expect(keyAction(key('q'))).toBeNull();
  });
});
