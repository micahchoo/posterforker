<script lang="ts">
  // The look, in choices a Maker can judge by eye. A colour a Reader could not read is never offered.
  import { contrastRatio, themeContrastProblems } from '../core/contrast.ts';
  import { PRESETS } from '../core/names.ts';
  import type { ThemeFile } from '../core/schema.ts';
  import { PRESET_THEMES, resolveTheme } from '../core/theme.ts';
  import { PRESET_LABELS } from './labels.ts';
  import type { EditSession } from './session.svelte.ts';

  let { session }: { session: EditSession } = $props();

  const file = $derived(session.draft.theme);
  const theme = $derived(resolveTheme(file));
  const set = (patch: ThemeFile) => session.setTheme({ ...file, ...patch });

  const ACCENTS = ['#1f5fbf', '#0f7b6c', '#9c3d1c', '#b8336a', '#6b4bc4', '#a15c00', '#e0a43a', '#7fb2ff', '#5ad1a0', '#ff8a65', '#f2c94c'];
  // Only accents that stand out (3:1) on both the background and the panel of this look.
  const accents = $derived(ACCENTS.filter((a) => contrastRatio(a, theme.colors.background) >= 3 && contrastRatio(a, theme.colors.panel) >= 3));

  const TYPE = [
    { name: 'Modern', heading: 'system-ui', body: 'system-ui' },
    { name: 'Classic', heading: 'Fraunces', body: 'Source Serif 4' },
    { name: 'Bookish', heading: 'Literata', body: 'Literata' },
    { name: 'Crisp', heading: 'Space Grotesk', body: 'Inter' },
    { name: 'Easy to read', heading: 'Atkinson Hyperlegible', body: 'Atkinson Hyperlegible' },
  ];
  const CORNERS = [
    { name: 'Square', radius: 0 },
    { name: 'Soft', radius: 8 },
    { name: 'Round', radius: 18 },
  ];
  const MOTION = [
    { name: 'Still', motion: 'none' },
    { name: 'Gentle', motion: 'gentle' },
    { name: 'Lively', motion: 'lively' },
  ] as const;

  // Exact colours: a pick that would be unreadable is shown, explained, and not kept.
  let refused = $state('');
  function exact(key: 'background' | 'panel' | 'text' | 'accent', value: string) {
    const colors = { ...theme.colors, [key]: value };
    const problems = themeContrastProblems(colors);
    if (problems.length > 0) {
      refused = `Not kept — ${problems[0]}. Readers would struggle to read it.`;
      return;
    }
    refused = '';
    set({ colors: { ...file.colors, [key]: value } });
  }
</script>

<div class="look">
  <fieldset>
    <legend>Look</legend>
    <div class="cards">
      {#each PRESETS as p (p)}
        {@const t = PRESET_THEMES[p]}
        <label class="card" class:on={(file.preset ?? 'neutral') === p}>
          <input type="radio" name="look" checked={(file.preset ?? 'neutral') === p} onchange={() => session.setTheme({ preset: p })} />
          <span class="sample" style:background={t.colors.background}>
            <span class="panel" style:background={t.colors.panel} style:color={t.colors.text} style:border-radius="{t.radius / 2}px">
              <b style:font-family={t.fonts.heading}>Aa</b>
              <i style:background={t.colors.accent}></i>
            </span>
          </span>
          <span class="name">{PRESET_LABELS[p].name}</span>
          <span class="says">{PRESET_LABELS[p].says}</span>
        </label>
      {/each}
    </div>
  </fieldset>

  <fieldset>
    <legend>Accent colour</legend>
    <div class="swatches">
      {#each accents as a (a)}
        <button type="button" class="swatch" style:background={a} aria-label="Accent colour {a}" aria-pressed={theme.colors.accent === a} onclick={() => set({ colors: { ...file.colors, accent: a } })}></button>
      {/each}
    </div>
  </fieldset>

  <fieldset>
    <legend>Type</legend>
    <div class="row wrap">
      {#each TYPE as t (t.name)}
        <label class="chip" class:on={theme.fonts.heading === t.heading && theme.fonts.body === t.body}>
          <input type="radio" name="type" checked={theme.fonts.heading === t.heading && theme.fonts.body === t.body} onchange={() => set({ fonts: { heading: t.heading, body: t.body } })} />
          {t.name}
        </label>
      {/each}
    </div>
  </fieldset>

  <fieldset>
      <legend>Corners</legend>
      <div class="row">
        {#each CORNERS as c (c.name)}
          <label class="chip" class:on={theme.radius === c.radius}>
            <input type="radio" name="corners" checked={theme.radius === c.radius} onchange={() => set({ radius: c.radius })} />
            {c.name}
          </label>
        {/each}
      </div>
    </fieldset>
    <fieldset>
      <legend>Moving between Scenes</legend>
      <div class="row">
        {#each MOTION as m (m.name)}
          <label class="chip" class:on={theme.motion === m.motion}>
            <input type="radio" name="motion" checked={theme.motion === m.motion} onchange={() => set({ motion: m.motion })} />
            {m.name}
          </label>
        {/each}
      </div>
    </fieldset>

  <details>
    <summary>Choose exact colours</summary>
    <div class="exact">
      {#each [['background', 'Background'], ['panel', 'Panel'], ['text', 'Text'], ['accent', 'Accent']] as const as [key, label] (key)}
        <label class="inline"><input type="color" aria-label="{label} colour" value={theme.colors[key]} onchange={(e) => exact(key, e.currentTarget.value)} /> {label}</label>
      {/each}
    </div>
    {#if refused}<p class="refused" role="status">{refused}</p>{/if}
  </details>
</div>

<style>
  .look {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  fieldset {
    border: 0;
    padding: 0;
    margin: 0;
  }
  legend {
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #555;
    margin-bottom: 0.45rem;
  }
  /* The real radio covers its whole card or chip, invisibly: a click anywhere lands on it. */
  input[type='radio'] {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    margin: 0;
    opacity: 0;
    cursor: pointer;
  }
  .cards {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.6rem;
  }
  .card {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    padding: 0.5rem;
    border: 2px solid #ddd;
    border-radius: 12px;
    background: #fff;
    cursor: pointer;
  }
  .card.on {
    border-color: #1f5fbf;
    box-shadow: 0 0 0 3px #cfe0fa;
  }
  .card:focus-within {
    outline: 3px solid #1f5fbf;
    outline-offset: 2px;
  }
  .sample {
    display: block;
    height: 3.6rem;
    border-radius: 8px;
    padding: 0.5rem;
  }
  .panel {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    height: 100%;
    width: 60%;
    padding: 0 0.5rem;
  }
  .panel b {
    font-size: 1.2rem;
  }
  .panel i {
    width: 1.4rem;
    height: 0.4rem;
    border-radius: 2px;
  }
  .name {
    font-weight: 700;
  }
  .says {
    font-size: 0.78rem;
    color: #555;
  }
  .swatches {
    display: flex;
    flex-wrap: wrap;
    gap: 0.45rem;
  }
  .swatch {
    width: 2.2rem;
    height: 2.2rem;
    border-radius: 50%;
    border: 3px solid #fff;
    box-shadow: 0 0 0 1px #bbb;
    cursor: pointer;
  }
  .swatch[aria-pressed='true'] {
    box-shadow: 0 0 0 3px #111;
  }
  .row {
    display: flex;
    gap: 0.4rem;
  }
  .wrap {
    flex-wrap: wrap;
  }
  .chip {
    position: relative;
    padding: 0.45rem 0.8rem;
    border: 1px solid #c8c8c8;
    border-radius: 999px;
    background: #fff;
    cursor: pointer;
    white-space: nowrap;
  }
  .chip.on {
    background: #1b1b1b;
    color: #fff;
    border-color: #1b1b1b;
  }
  .chip:focus-within {
    outline: 3px solid #1f5fbf;
    outline-offset: 2px;
  }
  summary {
    cursor: pointer;
    color: #1f3f74;
  }
  .exact {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
    margin-top: 0.5rem;
  }
  .inline {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .refused {
    color: #a40000;
    font-size: 0.85rem;
  }
</style>
