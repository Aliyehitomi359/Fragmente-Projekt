import type { AppData, Fragment, FragmentBox, SourcePage } from './types';

type Metadata = Record<string, unknown>;
interface WireImage { type: string; data: string }
interface WireRecord { metadata: Metadata; image?: WireImage }
interface MaterialBundle { version: 1; sources: WireRecord[]; fragments: WireRecord[]; boxes: WireRecord[] }
export interface MaterialData { sources: SourcePage[]; fragments: Fragment[]; boxes: FragmentBox[] }
const LIMIT = 64 * 1024 * 1024;
const imageTypes = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/bmp', 'image/tiff']);
const sourceFields = ['id', 'name', 'createdAt', 'originalFileName', 'nameEdited', 'note', 'book', 'author', 'chapterOrPage', 'context', 'isFavorite', 'ocrText', 'ocrStatus', 'cutRegions'];
const fragmentFields = ['id', 'captureName', 'createdAt', 'updatedAt', 'sourceType', 'mergedFromFragmentIds', 'sourcePageId', 'cutRegionId', 'ocrText', 'ocrStatus', 'boxId', 'boxIds', 'isFavorite'];
function object(value: unknown): Metadata {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid material record.');
  return value as Metadata;
}
function text(value: unknown, max = 100000): value is string { return typeof value === 'string' && value.length <= max; }
function identifier(value: unknown): value is string { return typeof value === 'string' && /^[a-zA-Z0-9_-]{1,200}$/.test(value); }
function list(value: unknown): value is string[] { return Array.isArray(value) && value.length <= 5000 && value.every(identifier); }
function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.entries(value).filter(([, v]) => v !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${JSON.stringify(k)}:${stable(v)}`).join(',')}}`;
  return JSON.stringify(value);
}
async function digest(value: string | ArrayBuffer) {
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', typeof value === 'string' ? new TextEncoder().encode(value) : value))].map(n => n.toString(16).padStart(2, '0')).join('');
}
async function encodeImage(blob: Blob): Promise<WireImage> {
  return { type: blob.type, data: await new Promise<string>((resolve, reject) => {
    const reader = new FileReader(); reader.onerror = () => reject(new Error('Unable to read image.'));
    reader.onload = () => resolve(String(reader.result).split(',')[1]); reader.readAsDataURL(blob);
  }) };
}
export async function serializeMaterials(data: AppData) {
  if ([...data.sources, ...data.fragments].reduce((size, item) => size + item.imageBlob.size, 0) > 45 * 1024 * 1024) throw new Error('Materials exceed the 64 MB transfer limit after encoding.');
  const bundle: MaterialBundle = { version: 1, sources: [], fragments: [], boxes: [] };
  for (const store of ['sources', 'fragments'] as const) {
    for (const { imageBlob, ...metadata } of data[store]) bundle[store].push({ metadata, image: await encodeImage(imageBlob) });
  }
  bundle.boxes = data.boxes.map(box => ({ metadata: { ...box } }));
  const result = JSON.stringify(bundle);
  if (new TextEncoder().encode(result).length > LIMIT - 4096) throw new Error('Materials exceed the 64 MB transfer limit.');
  return result;
}
export function decodeMaterials(serialized: string): MaterialData {
  if (typeof serialized !== 'string' || new TextEncoder().encode(serialized).length > LIMIT) throw new Error('Transfer exceeds 64 MB.');
  const bundle = object(JSON.parse(serialized));
  if (bundle.version !== 1) throw new Error('Unsupported material transfer version.');
  const result: MaterialData = { sources: [], fragments: [], boxes: [] };
  for (const kind of ['boxes', 'sources', 'fragments'] as const) {
    const records = bundle[kind];
    if (!Array.isArray(records) || records.length > 5000) throw new Error('Invalid material list.');
    const ids = new Set<string>();
    for (const item of records) {
      const record = object(item), raw = object(record.metadata);
      if (!identifier(raw.id) || ids.has(raw.id) || !text(raw.createdAt, 128)) throw new Error('Invalid or duplicate material identifier.');
      ids.add(raw.id);
      const fields = kind === 'sources' ? sourceFields : kind === 'fragments' ? fragmentFields : ['id', 'name', 'createdAt'];
      const m: Metadata = Object.fromEntries(fields.filter(key => raw[key] !== undefined).map(key => [key, raw[key]]));
      for (const key of ['name', 'originalFileName', 'note', 'book', 'author', 'chapterOrPage', 'context', 'ocrText', 'captureName', 'updatedAt']) {
        if (m[key] !== undefined && !text(m[key])) throw new Error('Invalid material text.');
      }
      for (const key of ['nameEdited', 'isFavorite']) if (m[key] !== undefined && typeof m[key] !== 'boolean') throw new Error('Invalid material flag.');
      if (m.ocrStatus !== undefined && (typeof m.ocrStatus !== 'string' || !['idle', 'processing', 'done', 'error'].includes(m.ocrStatus))) throw new Error('Invalid OCR status.');
      if (m.ocrStatus === 'processing') m.ocrStatus = 'idle';
      if (kind === 'boxes') {
        if (!text(m.name, 500)) throw new Error('Invalid box name.');
        result.boxes.push(m as unknown as FragmentBox); continue;
      }
      if (kind === 'sources') {
        if (!text(m.name, 1000) || !Array.isArray(m.cutRegions) || m.cutRegions.length > 10000) throw new Error('Invalid source.');
        m.cutRegions = m.cutRegions.map(value => {
          const r = object(value);
          if (![r.id, r.sourcePageId, r.fragmentId].every(identifier) || r.sourcePageId !== m.id || !text(r.createdAt, 128)
            || !['x', 'y', 'width', 'height'].every(key => typeof r[key] === 'number' && Number.isFinite(r[key]) && Number(r[key]) >= 0 && Number(r[key]) <= 100000)) throw new Error('Invalid cut region.');
          return Object.fromEntries(['id', 'sourcePageId', 'fragmentId', 'createdAt', 'x', 'y', 'width', 'height'].map(key => [key, r[key]]));
        });
      } else {
        if (!identifier(m.boxId) || !text(m.updatedAt, 128) || typeof m.isFavorite !== 'boolean' || typeof m.sourceType !== 'string' || !['cropped', 'direct-upload', 'merged'].includes(m.sourceType) || m.ocrStatus === undefined) throw new Error('Invalid fragment.');
        for (const key of ['sourcePageId', 'cutRegionId']) if (m[key] !== undefined && !identifier(m[key])) throw new Error('Invalid source reference.');
        for (const key of ['boxIds', 'mergedFromFragmentIds']) if (m[key] !== undefined && !list(m[key])) throw new Error('Invalid material references.');
      }
      const image = object(record.image);
      if (!imageTypes.has(String(image.type)) || !text(image.data, LIMIT) || !image.data.length || !/^[A-Za-z0-9+/]*={0,2}$/.test(image.data)) throw new Error('Invalid transferred image.');
      const bytes = Uint8Array.from(atob(image.data), c => c.charCodeAt(0));
      const imageBlob = new Blob([bytes], { type: String(image.type) });
      if (kind === 'sources') result.sources.push({ ...m, imageBlob } as unknown as SourcePage);
      else result.fragments.push({ ...m, imageBlob } as unknown as Fragment);
    }
  }
  return result;
}
async function fingerprint(record: SourcePage | Fragment | FragmentBox) {
  if ('imageBlob' in record) {
    const { imageBlob, ...metadata } = record;
    const normalized = 'boxId' in metadata ? { ...metadata, boxIds: [...new Set(metadata.boxIds ?? [metadata.boxId])] } : metadata;
    return digest(stable(normalized) + await digest(await imageBlob.arrayBuffer()));
  }
  return digest(stable(record));
}
export async function planMaterialImport(incoming: MaterialData, local: MaterialData) {
  // Conflicting snapshots become a separate, deterministic copy, never a partial mix of two reference graphs.
  let conflictSnapshot = false;
  const hashes: string[] = [];
  for (const kind of ['boxes', 'sources', 'fragments'] as const) {
    const existing = new Map(local[kind].map(record => [record.id, record]));
    for (const record of incoming[kind]) {
      const hash = await fingerprint(record); hashes.push(`${kind}:${record.id}:${hash}`);
      const current = existing.get(record.id);
      if (current && !(kind === 'boxes' && record.id === 'default-box') && await fingerprint(current) !== hash) conflictSnapshot = true;
    }
  }
  const namespace = await digest(hashes.sort().join('\n'));
  const maps = { sources: new Map<string, string>(), fragments: new Map<string, string>(), boxes: new Map<string, string>() };
  const insert = { sources: new Set<string>(), fragments: new Set<string>(), boxes: new Set<string>() };
  let skipped = 0, conflicts = 0;
  for (const kind of ['boxes', 'sources', 'fragments'] as const) {
    const existing = new Map(local[kind].map(record => [record.id, record]));
    for (const record of incoming[kind]) {
      const current = existing.get(record.id);
      let id = record.id;
      if (kind === 'boxes' && id === 'default-box' && current) { maps[kind].set(id, id); skipped++; continue; }
      if (conflictSnapshot) { id = `lan-${await digest(`${namespace}:${kind}:${record.id}`)}`; if (current && !existing.has(id)) conflicts++; }
      else if (current) { maps[kind].set(id, id); skipped++; continue; }
      maps[kind].set(record.id, id);
      if (existing.has(id)) skipped++; else insert[kind].add(record.id);
    }
  }
  const cutIds = new Map<string, string>();
  for (const source of incoming.sources) for (const cut of source.cutRegions) {
    cutIds.set(`${source.id}:${cut.id}`, maps.sources.get(source.id) === source.id ? cut.id : `lan-cut-${await digest(`${maps.sources.get(source.id)}:${cut.id}`)}`);
  }
  const boxes = incoming.boxes.filter(b => insert.boxes.has(b.id)).map(b => ({ ...b, id: maps.boxes.get(b.id)! }));
  const fragments = incoming.fragments.filter(f => insert.fragments.has(f.id)).map(f => ({ ...f, id: maps.fragments.get(f.id)!,
    sourcePageId: f.sourcePageId ? maps.sources.get(f.sourcePageId) : undefined,
    cutRegionId: f.cutRegionId && f.sourcePageId ? cutIds.get(`${f.sourcePageId}:${f.cutRegionId}`) : undefined,
    mergedFromFragmentIds: f.mergedFromFragmentIds?.map(id => maps.fragments.get(id)).filter((id): id is string => !!id),
    boxId: maps.boxes.get(f.boxId) ?? 'default-box', boxIds: [...new Set((f.boxIds ?? [f.boxId]).map(id => maps.boxes.get(id) ?? 'default-box'))],
  }));
  const sources = incoming.sources.filter(s => insert.sources.has(s.id)).map(s => ({ ...s, id: maps.sources.get(s.id)!,
    cutRegions: s.cutRegions.filter(c => maps.fragments.has(c.fragmentId)).map(c => ({ ...c, id: cutIds.get(`${s.id}:${c.id}`)!, sourcePageId: maps.sources.get(s.id)!, fragmentId: maps.fragments.get(c.fragmentId)! })),
  }));
  return { sources, fragments, boxes, skipped, conflicts };
}
