<script lang="ts">
  // The Theme and Layout editor. The preview is the real viewer, in a frame, sent each change.
  import { themeContrastProblems } from '../core/contrast.ts';
  import { MODULES, MOTIONS, PRESETS, SLOTS, type Layout, type ModuleName, type SiteCollection, type SlotName } from '../core/names.ts';
  import type { ThemeFile } from '../core/schema.ts';
  import { resolveTheme } from '../core/theme.ts';
  import { collectionYaml, editFileLink, themeYaml } from './links.ts';

  import { untrack } from 'svelte';

  let { collection, tab }: { collection: SiteCollection; tab: 'theme' | 'layout' } = $props();

  // The drafts start from what the Collection holds now, once; later edits are the Maker's.
  const original = untrack(() => collection);
  let draft = $state<ThemeFile>(structuredClone(original.theme));
  let layout = $state<Layout>(structuredClone(original.layout));
  let frame = $state<HTMLIFrameElement>();
  let copied = $state('');

  const theme = $derived(resolveTheme(draft));
  const problems = $derived(themeContrastProblems(theme.colors));
  const repo = original.repository && original.branch ? { repository: original.repository, branch: original.branch } : null;
  const themeText = $derived(themeYaml($state.snapshot(draft) as ThemeFile));
  const collectionText = $derived(
    collectionYaml({
      title: original.title,
      ...(original.credits ? { credits: original.credits } : {}),
      tours: original.tours.map((t) => t.id),
      layout: $state.snapshot(layout) as Layout,
    }),
  );

  const COLOR_LABELS = { background: 'Background', panel: 'Panel', text: 'Text', accent: 'Accent' } as const;
  const FONTS = ['system-ui', 'serif', 'Fraunces', 'Source Serif 4', 'Inter', 'Atkinson Hyperlegible', 'IBM Plex Sans', 'Literata', 'Space Grotesk'];

  const set = (patch: ThemeFile) => (draft = { ...draft, ...patch });
  function setColor(key: keyof typeof COLOR_LABELS, value: string) {
    set({ colors: { ...draft.colors, [key]: value } });
  }
  function setPreset(preset: (typeof PRESETS)[number]) {
    // A new preset starts clean: choices made over the old one rarely suit it.
    draft = { preset };
  }

  const slotOf = (m: ModuleName): SlotName | 'off' => SLOTS.find((s) => layout[s]?.includes(m)) ?? 'off';
  function moveModule(m: ModuleName, to: SlotName | 'off') {
    const next: Layout = {};
    for (const s of SLOTS) {
      const list = (layout[s] ?? []).filter((x) => x !== m);
      if (s === to) list.push(m);
      if (list.length > 0) next[s] = list;
    }
    layout = next;
  }
  function nudge(m: ModuleName, by: -1 | 1) {
    const s = slotOf(m);
    if (s === 'off') return;
    const list = [...(layout[s] ?? [])];
    const i = list.indexOf(m);
    const j = i + by;
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j]!, list[i]!];
    layout = { ...layout, [s]: list };
  }

  const send = () =>
    frame?.contentWindow?.postMessage({ type: 'pf-preview', theme: $state.snapshot(draft), layout: $state.snapshot(layout) }, location.origin);
  $effect(() => {
    void JSON.stringify(draft);
    void JSON.stringify(layout);
    send();
  });

  async function copy(which: 'theme' | 'collection') {
    await navigator.clipboard.writeText(which === 'theme' ? themeText : collectionText);
    copied = which;
    setTimeout(() => (copied = ''), 2000);
  }
</script>

<div class="editor">
  <div class="controls">
    {#if tab === 'theme'}
      <fieldset>
        <legend>Start from</legend>
        {#each PRESETS as p (p)}
          <label class="inline"><input type="radio" name="preset" checked={(draft.preset ?? 'neutral') === p} onchange={() => setPreset(p)} /> {p === 'neutral' ? 'Neutral' : 'With character'}</label>
        {/each}
      </fieldset>

      <fieldset>
        <legend>Colours</legend>
        {#each Object.entries(COLOR_LABELS) as [key, label] (key)}
          {@const k = key as keyof typeof COLOR_LABELS}
          <label class="inline">
            <input type="color" aria-label="{label} colour" value={theme.colors[k]} oninput={(e) => setColor(k, e.currentTarget.value)} />
            {label} <code>{theme.colors[k]}</code>
          </label>
        {/each}
        {#if problems.length > 0}
          <ul class="problems" aria-live="polite">{#each problems as p (p)}<li>Too faint: {p}</li>{/each}</ul>
        {/if}
      </fieldset>

      <fieldset>
        <legend>Fonts</legend>
        <datalist id="fonts">{#each FONTS as f (f)}<option value={f}></option>{/each}</datalist>
        <label>Heading font <input list="fonts" value={theme.fonts.heading} onchange={(e) => set({ fonts: { ...draft.fonts, heading: e.currentTarget.value } })} /></label>
        <label>Body font <input list="fonts" value={theme.fonts.body} onchange={(e) => set({ fonts: { ...draft.fonts, body: e.currentTarget.value } })} /></label>
        <p class="note">Any Google Fonts family works. Readers' browsers load it from Google.</p>
      </fieldset>

      <fieldset>
        <legend>Shape and motion</legend>
        <label>Corner radius: {theme.radius}px <input type="range" min="0" max="32" value={theme.radius} oninput={(e) => set({ radius: Number(e.currentTarget.value) })} /></label>
        <label>Panel opacity: {Math.round(theme.panelOpacity * 100)}% <input type="range" min="0.5" max="1" step="0.02" value={theme.panelOpacity} oninput={(e) => set({ panelOpacity: Number(e.currentTarget.value) })} /></label>
        <label>
          Motion between Scenes
          <select value={theme.motion} onchange={(e) => set({ motion: e.currentTarget.value as (typeof MOTIONS)[number] })}>
            <option value="none">None</option>
            <option value="gentle">Gentle</option>
            <option value="lively">Lively</option>
          </select>
        </label>
        <p class="note">Readers who ask their system for reduced motion get none, whatever you choose.</p>
      </fieldset>
    {:else}
      <fieldset>
        <legend>Where each Module sits</legend>
        <table>
          <tbody>
            {#each MODULES as m (m)}
              <tr>
                <th scope="row">{m}</th>
                <td>
                  <select value={slotOf(m)} onchange={(e) => moveModule(m, e.currentTarget.value as SlotName | 'off')} aria-label="Slot for {m}">
                    <option value="off">Off</option>
                    {#each SLOTS as s (s)}<option value={s}>{s}</option>{/each}
                  </select>
                </td>
                <td class="order">
                  <button type="button" aria-label="Move {m} earlier" disabled={slotOf(m) === 'off'} onclick={() => nudge(m, -1)}>↑</button>
                  <button type="button" aria-label="Move {m} later" disabled={slotOf(m) === 'off'} onclick={() => nudge(m, 1)}>↓</button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
        <p class="note">On a phone the panel becomes a sheet at the bottom; the viewer places the rest.</p>
      </fieldset>
    {/if}

    <section class="output">
      {#if tab === 'theme'}
        <h3>theme.yml</h3>
        <pre>{themeText}</pre>
        <div class="actions">
          <button type="button" disabled={problems.length > 0} onclick={() => copy('theme')}>{copied === 'theme' ? 'Copied' : 'Copy'}</button>
          {#if repo && problems.length === 0}<a href={editFileLink(repo, 'theme.yml')} target="_blank" rel="noopener">Open theme.yml on GitHub</a>{/if}
        </div>
        <p class="note">On GitHub: select everything in the file, paste, and commit.</p>
      {:else}
        <h3>collection.yml</h3>
        <pre>{collectionText}</pre>
        <div class="actions">
          <button type="button" onclick={() => copy('collection')}>{copied === 'collection' ? 'Copied' : 'Copy'}</button>
          {#if repo}<a href={editFileLink(repo, 'collection.yml')} target="_blank" rel="noopener">Open collection.yml on GitHub</a>{/if}
        </div>
        <p class="note">This replaces the whole file, so comments you wrote in it are lost.</p>
      {/if}
    </section>
  </div>

  <iframe bind:this={frame} src="../?preview" title="Preview of your Collection" onload={send}></iframe>
</div>

<style>
  .editor {
    display: grid;
    grid-template-columns: minmax(18rem, 24rem) 1fr;
    gap: 1rem;
    height: 100%;
    min-height: 0;
  }
  .controls {
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  fieldset {
    border: 1px solid #ccc;
    border-radius: 6px;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  legend {
    font-weight: 600;
  }
  label {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  label.inline {
    flex-direction: row;
    align-items: center;
    gap: 0.5rem;
  }
  input:not([type='color'], [type='radio']),
  select {
    font: inherit;
    padding: 0.4rem;
  }
  table {
    border-collapse: collapse;
  }
  th {
    text-align: left;
    font-weight: 400;
    font-family: monospace;
    padding-right: 0.5rem;
  }
  .order button {
    min-height: 2rem;
    padding: 0 0.5rem;
  }
  .problems {
    margin: 0;
    color: #a40000;
  }
  .note {
    margin: 0;
    font-size: 0.85rem;
    opacity: 0.8;
  }
  pre {
    background: #f3f3f3;
    padding: 0.5rem;
    border-radius: 4px;
    overflow-x: auto;
    margin: 0;
  }
  h3 {
    margin: 0 0 0.25rem;
    font-family: monospace;
  }
  .actions {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    margin: 0.5rem 0;
  }
  iframe {
    width: 100%;
    height: 100%;
    min-height: 24rem;
    border: 1px solid #ccc;
    border-radius: 6px;
  }
  @media (max-width: 760px) {
    .editor {
      grid-template-columns: 1fr;
    }
    iframe {
      height: 60vh;
    }
  }
</style>
