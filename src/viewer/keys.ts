// What a key press means to the viewer. Pure, so the decision is testable without a DOM.

export type KeyAction = 'next' | 'previous' | 'zoom-in' | 'zoom-out' | 'home';

export type KeyInput = {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  targetTag: string;
  targetEditable: boolean;
};

const ACTIONS: Record<string, KeyAction> = {
  ArrowRight: 'next',
  n: 'next',
  ArrowLeft: 'previous',
  p: 'previous',
  '+': 'zoom-in',
  '=': 'zoom-in',
  '-': 'zoom-out',
  '0': 'home',
};

const TYPING = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

export function keyAction(e: KeyInput): KeyAction | null {
  if (e.ctrlKey || e.metaKey || e.altKey) return null;
  if (e.targetEditable || TYPING.has(e.targetTag)) return null;
  return ACTIONS[e.key] ?? null;
}
