import { mount } from 'svelte';
import type { SiteCollection } from '../core/names.ts';
import Edit from './Edit.svelte';

const collection = (await (await fetch(new URL('../collection.json', document.baseURI))).json()) as SiteCollection;
document.title = `Edit · ${collection.title}`;
mount(Edit, { target: document.getElementById('app')!, props: { collection } });
