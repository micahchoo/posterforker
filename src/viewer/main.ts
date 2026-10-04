import { mount, unmount } from 'svelte';
import type { Layout, SiteCollection } from '../core/names.ts';
import type { ThemeFile } from '../core/schema.ts';
import { themeVariables, webFonts } from '../core/theme.ts';
import App from './App.svelte';
import { ViewerState } from './state.svelte.ts';

const collection = (await (await fetch(new URL('collection.json', document.baseURI))).json()) as SiteCollection;

/** Start (or restart) the viewer on a Collection: Theme on the page, App mounted. */
function start(c: SiteCollection) {
  const viewer = new ViewerState(c);
  document.title = c.title;
  for (const [name, value] of Object.entries(themeVariables(viewer.theme))) document.documentElement.style.setProperty(name, value);
  const fonts = webFonts(viewer.theme);
  document.getElementById('pf-fonts')?.remove();
  if (fonts.length > 0) {
    const link = document.createElement('link');
    link.id = 'pf-fonts';
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?${fonts.map((f) => `family=${encodeURIComponent(f)}:wght@400;600`).join('&')}&display=swap`;
    document.head.append(link);
  }
  const app = mount(App, { target: document.getElementById('app')!, props: { viewer } });
  viewer.readUrl();
  return app;
}

let app = start(collection);

// /edit shows this page in a frame and sends the Theme and layout being edited.
if (new URLSearchParams(location.search).has('preview')) {
  addEventListener('message', (e: MessageEvent<{ type?: string; theme: ThemeFile; layout: Layout }>) => {
    if (e.origin !== location.origin || e.data?.type !== 'pf-preview') return;
    void unmount(app);
    app = start({ ...collection, theme: e.data.theme, layout: e.data.layout });
  });
}
