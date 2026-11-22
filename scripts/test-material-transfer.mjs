import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const temp = await mkdtemp(path.join(tmpdir(), 'fragmente-material-transfer-'));
try {
  const source = await readFile(new URL('../src/materialTransfer.ts', import.meta.url), 'utf8');
  await writeFile(path.join(temp, 'materialTransfer.mjs'), ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText);
  const { decodeMaterials, planMaterialImport } = await import(pathToFileURL(path.join(temp, 'materialTransfer.mjs')));
  const date = '2026-11-22T10:00:00Z';
  const image = { type: 'image/png', data: Buffer.from('test pixels').toString('base64') };
  const bundle = { version: 1, boxes: [{ metadata: { id: 'default-box', name: 'Default', createdAt: date } }, { metadata: { id: 'poetry', name: 'Poetry', createdAt: date } }],
    sources: [{ metadata: { id: 'source-a', name: 'Page', createdAt: date, author: 'Joyce', isFavorite: true, cutRegions: [{ id: 'cut-a', sourcePageId: 'source-a', fragmentId: 'fragment-a', createdAt: date, x: 2, y: 3, width: 4, height: 5 }] }, image }],
    fragments: [{ metadata: { id: 'fragment-a', sourceType: 'cropped', createdAt: date, updatedAt: date, boxId: 'poetry', boxIds: ['poetry', 'default-box'], isFavorite: true, ocrStatus: 'done', ocrText: '雪', sourcePageId: 'source-a', cutRegionId: 'cut-a' }, image }] };
  const incoming = decodeMaterials(JSON.stringify(bundle));
  let local = { sources: [], fragments: [], boxes: [incoming.boxes[0]] };
  const first = await planMaterialImport(incoming, local);
  assert.equal(first.sources.length, 1); assert.equal(first.fragments.length, 1);
  assert.equal(first.fragments[0].ocrText, '雪'); assert.equal(first.sources[0].author, 'Joyce');
  local = { sources: first.sources, fragments: first.fragments, boxes: [...local.boxes, ...first.boxes] };
  const again = await planMaterialImport(incoming, local);
  assert.equal(again.fragments.length + again.sources.length + again.boxes.length, 0);
  const changed = structuredClone(incoming); changed.fragments[0].ocrText = '雪落';
  const conflict = await planMaterialImport(changed, local);
  assert.notEqual(conflict.fragments[0].id, local.fragments[0].id);
  assert.equal(conflict.sources[0].cutRegions[0].fragmentId, conflict.fragments[0].id);
  assert.equal(conflict.fragments[0].sourcePageId, conflict.sources[0].id);
  assert.equal(conflict.fragments[0].cutRegionId, conflict.sources[0].cutRegions[0].id);
  assert.equal(local.fragments[0].ocrText, '雪');
  const afterConflict = { sources: [...local.sources, ...conflict.sources], fragments: [...local.fragments, ...conflict.fragments], boxes: [...local.boxes, ...conflict.boxes] };
  const retry = await planMaterialImport(changed, afterConflict);
  assert.equal(retry.fragments.length + retry.sources.length + retry.boxes.length, 0);
  const invalid = structuredClone(bundle); invalid.sources[0].metadata.cutRegions[0].width = -1;
  assert.throws(() => decodeMaterials(JSON.stringify(invalid)));
  assert.throws(() => decodeMaterials(JSON.stringify({ ...bundle, version: 2 })));
  const duplicate = structuredClone(bundle); duplicate.fragments.push(duplicate.fragments[0]);
  assert.throws(() => decodeMaterials(JSON.stringify(duplicate)));
  console.log('Passed: metadata, favorites, multi-box links, idempotent imports, conflict copies, cut references, validation.');
} finally { await rm(temp, { recursive: true, force: true }); }
