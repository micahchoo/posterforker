// Two static apps, built into the engine's dist/: the viewer (a Collection's home page)
// and /edit (the Scene picker and Theme editor). `vite build --mode edit` builds the second.
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => {
  const app = mode === 'edit' ? 'edit' : 'viewer';
  return {
    root: resolve(import.meta.dirname, 'src', app),
    base: './',
    plugins: [svelte()],
    build: { outDir: resolve(import.meta.dirname, 'dist', app), emptyOutDir: true, target: 'es2022' },
  };
});
