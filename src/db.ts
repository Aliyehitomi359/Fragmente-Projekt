import { openDB, type DBSchema } from 'idb';
import type { CollageCanvas, Fragment, FragmentBox, SourcePage } from './types';

const DB_NAME = 'poem-collage-db';
const DB_VERSION = 1;
export const DEFAULT_BOX_ID = 'default-box';
export const DEFAULT_CANVAS_ID = 'main-canvas';

interface PoemCollageDB extends DBSchema {
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
    fragments: fragments.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    boxes: boxes.sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    canvases: canvases.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
  };
}

export async function saveSource(source: SourcePage) {
  const db = await dbPromise;
  await db.put('sources', source);
}

export async function deleteSource(sourceId: string) {
  const db = await dbPromise;
  await db.delete('sources', sourceId);
}

export async function saveFragment(fragment: Fragment) {
  const db = await dbPromise;
  await db.put('fragments', fragment);
}

export async function deleteFragment(fragmentId: string) {
  const db = await dbPromise;
  await db.delete('fragments', fragmentId);
}

export async function saveBox(box: FragmentBox) {
  const db = await dbPromise;
  await db.put('boxes', box);
}

export async function saveCanvas(canvas: CollageCanvas) {
  const db = await dbPromise;
  await db.put('canvases', canvas);
}

export async function deleteCanvas(canvasId: string) {
  const db = await dbPromise;
  await db.delete('canvases', canvasId);
}
