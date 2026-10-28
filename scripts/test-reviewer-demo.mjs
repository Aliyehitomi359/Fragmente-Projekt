import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import 'fake-indexeddb/auto';

const dir = await mkdtemp(path.join(tmpdir(), 'fragmente-reviewer-test-'));
// Persistence tests only: image rendering is verified separately in the browser.
globalThis.document = { createElement: () => ({
  getContext: () => ({ fillRect() {}, fillText() {}, drawImage() {}, measureText: text => ({ width: text.length * 24 }) }),
  toBlob: callback => callback(new Blob(['sample'], { type: 'image/png' })),
}) };
globalThis.window = { location: { search: '' } };
globalThis.fetch = async () => ({ ok: true, blob: async () => new Blob(['sample']) });
globalThis.createImageBitmap = async () => ({ width: 2408, height: 356, close() {} });
try {
  for (const name of ['boxMembership', 'db', 'demoData']) {
    const source = await readFile(new URL(`../src/${name}.ts`, import.meta.url), 'utf8');
    const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
      .replaceAll("'./boxMembership'", "'./boxMembership.mjs'")
      .replaceAll("'./demoData'", "'./demoData.mjs'")
      .replaceAll("'idb'", JSON.stringify(import.meta.resolve('idb')));
    await writeFile(path.join(dir, `${name}.mjs`), output);
  }
  const url = pathToFileURL(path.join(dir, 'db.mjs')).href;
  const personal = await import(url);
  const fragment = { id: 'personal-test', imageBlob: new Blob(['private']), boxId: 'default-box', createdAt: '2026-10-26', updatedAt: '2026-10-26', sourceType: 'direct-upload', ocrStatus: 'done', isFavorite: true };
  await personal.saveFragment(fragment, false);
  window.location.search = '?demo=1';
  const demo = await import(url + '?reviewer');
  assert.equal(demo.IS_DEMO, true);
  const first = await demo.loadAllData();
  assert.equal(first.sources.length, 1);
  assert.equal(first.fragments.length, 6);
  assert.equal(first.canvases.length, 1);
  assert.ok(first.sources.every(source => source.cutRegions.length === 6));
  assert.ok(first.canvases[0].placements.every(p => first.fragments.some(f => f.id === p.fragmentId)));
  await demo.saveFragment({ ...first.fragments[0], ocrText: 'Reviewer edit' }, false);
  const refreshed = await demo.loadAllData();
  assert.equal(refreshed.fragments.length, 6);
  assert.equal(refreshed.fragments[0].ocrText, 'Reviewer edit');
  window.location.search = '?demo=1&lang=zh';
  const chinese = await import(url + '?chinese');
  assert.equal(chinese.DEMO_LANGUAGE, 'zh');
  const chineseSample = await chinese.loadAllData();
  assert.equal(chineseSample.sources[0].book, '都柏林人');
  assert.equal(chineseSample.fragments.length, 6);
  assert.ok(chineseSample.fragments.every(f => f.sourcePageId === 'dubliners-source'));
  assert.equal((await demo.loadAllData()).fragments[0].ocrText, 'Reviewer edit');
  const original = await personal.loadAllData();
  assert.equal(original.fragments.length, 1);
  assert.equal(original.fragments[0].id, 'personal-test');
  assert.equal(original.sources.length, 0);
  console.log('Passed: isolated sample DB, seeded references, no duplicates, edit persistence, personal library untouched.');
} finally {
  await rm(dir, { recursive: true, force: true });
}
