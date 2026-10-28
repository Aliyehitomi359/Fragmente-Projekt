import { openDB, type DBSchema } from 'idb';
import type { CollageCanvas, Fragment, FragmentBox, SourcePage } from './types';
import { DEFAULT_BOX_ID, fragmentBoxIds, withFragmentBoxes } from './boxMembership';

export const IS_DEMO = typeof window !== 'undefined' && new URLSearchParams(window.location?.search ?? '').get('demo') === '1';
export const DEMO_LANGUAGE = typeof window !== 'undefined' && new URLSearchParams(window.location?.search ?? '').get('lang') === 'zh' ? 'zh' : 'en';
const DB_NAME = IS_DEMO ? `fragmente-dubliners-demo-v4-${DEMO_LANGUAGE}` : 'poem-collage-db';
const DB_VERSION = 1;
export { DEFAULT_BOX_ID } from './boxMembership';
export const DEFAULT_CANVAS_ID = 'main-canvas';

interface PoemCollageDB extends DBSchema {
  demoMeta: { key: string; value: boolean };
  sources: {
    key: string;
    value: SourcePage;
  };
  fragments: {
    key: string;
    value: Fragment;
    indexes: { 'by-box': string };
  };
  boxes: {
    key: string;
    value: FragmentBox;
  };
  canvases: {
    key: string;
    value: CollageCanvas;
  };
}

const dbPromise = openDB<PoemCollageDB>(DB_NAME, DB_VERSION, {
  upgrade(db) {
    db.createObjectStore('sources', { keyPath: 'id' });
    const fragmentStore = db.createObjectStore('fragments', { keyPath: 'id' });
    fragmentStore.createIndex('by-box', 'boxId');
    db.createObjectStore('boxes', { keyPath: 'id' });
    db.createObjectStore('canvases', { keyPath: 'id' });
    if (IS_DEMO) db.createObjectStore('demoMeta');
  },
});

export function nowIso() {
  return new Date().toISOString();
}

export async function ensureDefaults() {
  const db = await dbPromise;
  const tx = db.transaction(['boxes', 'canvases'], 'readwrite');
  const box = await tx.objectStore('boxes').get(DEFAULT_BOX_ID);
  const canvas = await tx.objectStore('canvases').get(DEFAULT_CANVAS_ID);
  const createdAt = nowIso();

  if (!box) {
    await tx.objectStore('boxes').put({
      id: DEFAULT_BOX_ID,
      name: 'Default Box',
      createdAt,
    });
  }

  if (!canvas) {
    await tx.objectStore('canvases').put({
      id: DEFAULT_CANVAS_ID,
      name: 'Poem Canvas',
      createdAt,
      updatedAt: createdAt,
      width: 900,
      height: 620,
      backgroundColor: '#fffaf0',
      placements: [],
    });
  }

  await tx.done;
}

export async function loadAllData() {
  await ensureDefaults();
  if (IS_DEMO) await (demoSeed ??= seedDemo());
  const db = await dbPromise;
  let [sources, fragments, boxes, canvases] = await Promise.all([
    db.getAll('sources'),
    db.getAll('fragments'),
    db.getAll('boxes'),
    db.getAll('canvases'),
  ]);

  if (canvases.length === 0) {
    throw new Error('Default canvas was not created.');
  }

  const fragmentIds = new Set(fragments.map((fragment) => fragment.id));
  const cleanedSources = sources.map((source) => ({
    ...source,
    cutRegions: source.cutRegions.filter((region) => fragmentIds.has(region.fragmentId)),
  }));
  const cleanedCanvases = canvases.map((canvas) => ({
    ...canvas,
    placements: canvas.placements.filter((placement) => fragmentIds.has(placement.fragmentId)),
  }));

  const sourcesChanged = cleanedSources.some((source, index) => source.cutRegions.length !== sources[index].cutRegions.length);
  const canvasesChanged = cleanedCanvases.some((canvas, index) => canvas.placements.length !== canvases[index].placements.length);

  if (sourcesChanged || canvasesChanged) {
    const tx = db.transaction(['sources', 'canvases'], 'readwrite');
    if (sourcesChanged) {
      await Promise.all(cleanedSources.map((source) => tx.objectStore('sources').put(source)));
    }
    if (canvasesChanged) {
      await Promise.all(
        cleanedCanvases.map((canvas) => tx.objectStore('canvases').put({ ...canvas, updatedAt: nowIso() })),
      );
    }
    await tx.done;
  }

  sources = cleanedSources;
  canvases = cleanedCanvases;

  return {
    sources: sources.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    fragments: fragments.map((fragment) => withFragmentBoxes(fragment, fragmentBoxIds(fragment))).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    boxes: boxes.sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    canvases: canvases.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
  };
}

let demoSeed: Promise<void> | undefined;
async function seedDemo() {
  const db = await dbPromise;
  if (await db.get('demoMeta', 'seeded')) return;
  const { createDemoData } = await import('./demoData');
  const sample = await createDemoData(DEMO_LANGUAGE);
  const tx = db.transaction(['sources', 'fragments', 'boxes', 'canvases', 'demoMeta'], 'readwrite');
  if (!(await tx.objectStore('demoMeta').get('seeded'))) {
    for (const source of sample.sources) await tx.objectStore('sources').put(source);
    for (const fragment of sample.fragments) await tx.objectStore('fragments').put(fragment);
    for (const box of sample.boxes) await tx.objectStore('boxes').put(box);
    for (const canvas of sample.canvases) await tx.objectStore('canvases').put(canvas);
    await tx.objectStore('demoMeta').put(true, 'seeded');
  }
  await tx.done;
}

export async function saveSource(source: SourcePage, syncFile = true) {
  const db = await dbPromise;
  await db.put('sources', source);
  if (window.desktopLibrary && syncFile) {
    await window.desktopLibrary.store('source', source.id, source.imageBlob.type, new Uint8Array(await source.imageBlob.arrayBuffer()), source.nameEdited ? source.name : source.ocrText || source.name);
  }
}

export async function deleteSource(sourceId: string) {
  const db = await dbPromise;
  await db.delete('sources', sourceId);
}

export async function saveFragment(fragment: Fragment, syncFile = true) {
  const db = await dbPromise;
  await db.put('fragments', withFragmentBoxes(fragment, fragmentBoxIds(fragment)));
  if (window.desktopLibrary && syncFile) {
    await window.desktopLibrary.store('fragment', fragment.id, fragment.imageBlob.type, new Uint8Array(await fragment.imageBlob.arrayBuffer()), fragment.captureName || fragment.ocrText || (fragment.imageBlob instanceof File ? fragment.imageBlob.name : ''));
  }
}

export async function deleteFragment(fragmentId: string) {
  const db = await dbPromise;
  await db.delete('fragments', fragmentId);
}

export async function saveBox(box: FragmentBox) {
  const db = await dbPromise;
  await db.put('boxes', box);
}

export async function deleteBox(boxId: string) {
  if (boxId === DEFAULT_BOX_ID) throw new Error('The default box cannot be deleted.');
  const db = await dbPromise;
  const tx = db.transaction(['boxes', 'fragments'], 'readwrite');
  const fragments = await tx.objectStore('fragments').getAll();
  for (const fragment of fragments.filter((item) => fragmentBoxIds(item).includes(boxId))) {
    const remaining = fragmentBoxIds(fragment).filter((id) => id !== boxId);
    await tx.objectStore('fragments').put(withFragmentBoxes({ ...fragment, updatedAt: nowIso() }, remaining));
  }
  await tx.objectStore('boxes').delete(boxId);
  await tx.done;
}

export async function saveCanvas(canvas: CollageCanvas) {
  const db = await dbPromise;
  await db.put('canvases', canvas);
}

export async function deleteCanvas(canvasId: string) {
  const db = await dbPromise;
  await db.delete('canvases', canvasId);
}

export async function convertLibraryImage(id: string, target: 'source' | 'fragment') {
  const db = await dbPromise;
  const original = target === 'source' ? await db.get('fragments', id) : await db.get('sources', id);
  if (!original) throw new Error('Image no longer exists.');
  if (window.desktopLibrary) await window.desktopLibrary.reclassify(target, original.imageBlob.type, new Uint8Array(await original.imageBlob.arrayBuffer()));
  const tx = db.transaction(['sources', 'fragments', 'canvases'], 'readwrite');
  if (target === 'source') {
    const fragment = original as Fragment;
    await tx.objectStore('sources').put({ id, name: fragment.ocrText?.slice(0, 20) || 'Converted source', imageBlob: fragment.imageBlob, createdAt: fragment.createdAt, ocrText: fragment.ocrText, ocrStatus: fragment.ocrStatus, isFavorite: fragment.isFavorite, cutRegions: [] });
    await tx.objectStore('fragments').delete(id);
    for (const source of await tx.objectStore('sources').getAll()) {
      await tx.objectStore('sources').put({ ...source, cutRegions: source.cutRegions.filter((region) => region.fragmentId !== id) });
    }
    for (const canvas of await tx.objectStore('canvases').getAll()) {
      await tx.objectStore('canvases').put({ ...canvas, placements: canvas.placements.filter((placement) => placement.fragmentId !== id) });
    }
  } else {
    const source = original as SourcePage;
    await tx.objectStore('fragments').put({ id, imageBlob: source.imageBlob, createdAt: source.createdAt, updatedAt: nowIso(), ocrText: source.ocrText, ocrStatus: source.ocrStatus ?? 'idle', isFavorite: source.isFavorite ?? false, sourceType: 'direct-upload', boxId: DEFAULT_BOX_ID });
    await tx.objectStore('sources').delete(id);
    for (const fragment of await tx.objectStore('fragments').getAll()) {
      if (fragment.sourcePageId === id) await tx.objectStore('fragments').put({ ...fragment, sourcePageId: undefined, cutRegionId: undefined });
    }
  }
  await tx.done;
  if (target === 'source') {
    const source = await db.get('sources', id);
    if (source) await saveSource(source);
  } else {
    const fragment = await db.get('fragments', id);
    if (fragment) await saveFragment(fragment);
  }
}
