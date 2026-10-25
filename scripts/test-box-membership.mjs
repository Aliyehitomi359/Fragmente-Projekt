import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import 'fake-indexeddb/auto';

// Compile just the persistence modules into an isolated in-memory IndexedDB test.
const dir = await mkdtemp(path.join(tmpdir(), 'fragmente-box-test-'));
globalThis.window = {};
try {
  for (const name of ['boxMembership', 'db']) {
    const source = await readFile(new URL(`../src/${name}.ts`, import.meta.url), 'utf8');
    const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
      .replaceAll("'./boxMembership'", "'./boxMembership.mjs'")
      .replaceAll("'idb'", JSON.stringify(import.meta.resolve('idb')));
    await writeFile(path.join(dir, `${name}.mjs`), output);
  }
  const { fragmentBoxIds, withFragmentBoxes, DEFAULT_BOX_ID } = await import(pathToFileURL(path.join(dir, 'boxMembership.mjs')));
  const db = await import(pathToFileURL(path.join(dir, 'db.mjs')));
  assert.deepEqual(fragmentBoxIds({ boxId: 'legacy' }), ['legacy']);
  assert.deepEqual(fragmentBoxIds({ boxId: 'legacy', boxIds: [] }), [DEFAULT_BOX_ID]);
  const fragment = { id: 'test-fragment', boxId: DEFAULT_BOX_ID, imageBlob: new Blob(['image']), createdAt: '2026-10-25', updatedAt: '2026-10-25', sourceType: 'direct-upload', ocrStatus: 'done', isFavorite: true };
  await db.saveFragment(fragment, false);
  assert.deepEqual((await db.loadAllData()).fragments[0].boxIds, [DEFAULT_BOX_ID]);
  for (const id of ['a', 'b']) await db.saveBox({ id, name: id, createdAt: '2026-10-25' });
  await db.saveFragment(withFragmentBoxes(fragment, ['a', 'b', 'a']), false);
  let saved = (await db.loadAllData()).fragments[0];
  assert.deepEqual(saved.boxIds, ['a', 'b']);
  assert.equal(saved.boxId, 'a');
  const { imageBlob, ...metadata } = saved;
  await db.saveFragment({ ...JSON.parse(JSON.stringify(metadata)), imageBlob }, false);
  assert.deepEqual((await db.loadAllData()).fragments[0].boxIds, ['a', 'b']);
  await db.deleteBox('a');
  saved = (await db.loadAllData()).fragments[0];
  assert.deepEqual(saved.boxIds, ['b']);
  assert.equal(saved.isFavorite, true);
  assert.equal(saved.imageBlob.size, imageBlob.size);
  await db.deleteBox('b');
  assert.deepEqual((await db.loadAllData()).fragments[0].boxIds, [DEFAULT_BOX_ID]);
  await assert.rejects(db.deleteBox(DEFAULT_BOX_ID));
  console.log('Passed: legacy records, deduplication, multi-box persistence, metadata restore, box deletion, orphan fallback, default-box protection.');
} finally {
  await rm(dir, { recursive: true, force: true });
}
