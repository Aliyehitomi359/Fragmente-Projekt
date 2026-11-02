import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const dir = await mkdtemp(path.join(os.tmpdir(), 'fragmente-merge-test-'));
try {
  const source = await readFile(new URL('../src/mergeFragments.ts', import.meta.url), 'utf8');
  await writeFile(path.join(dir, 'merge.mjs'), ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText);
  const { mergeLayout, joinedFragmentText, mergeFragmentImages } = await import(pathToFileURL(path.join(dir, 'merge.mjs')));
  const sizes = [{ width: 200, height: 30 }, { width: 100, height: 40 }];
  assert.deepEqual(mergeLayout(sizes, 'horizontal', 0), { width: 300, height: 40, positions: [{ x: 0, y: 5 }, { x: 200, y: 0 }] });
  assert.deepEqual(mergeLayout(sizes, 'vertical', 8), { width: 200, height: 78, positions: [{ x: 0, y: 0 }, { x: 0, y: 38 }] });
  assert.equal(joinedFragmentText('雪花', '微微地'), '雪花微微地');
  assert.equal(joinedFragmentText('falling', 'softly'), 'falling softly');
  assert.equal(joinedFragmentText('', 'words'), 'words');
  assert.throws(() => mergeLayout(sizes, 'horizontal', -1));
  assert.throws(() => mergeLayout([{ width: 17000, height: 20 }, sizes[1]], 'horizontal', 0));
  let opened = 0, closed = 0;
  const draws = [];
  globalThis.createImageBitmap = async () => ({ ...sizes[opened++ % 2], close() { closed++; } });
  globalThis.document = { createElement: () => ({ getContext: () => ({ drawImage(...args) { draws.push(args); } }), toBlob: cb => cb(new Blob(['png'], { type: 'image/png' })) }) };
  const result = await mergeFragmentImages([new Blob(), new Blob()], 'horizontal', 0);
  assert.equal(result.type, 'image/png');
  assert.equal(closed, 2);
  assert.equal(draws.length, 2);
  assert.ok(draws.every(args => args.length === 3)); // Draw at native size, never stretch text.
  globalThis.createImageBitmap = async () => { if (++opened === 4) throw new Error('invalid image'); return { ...sizes[0], close() { closed++; } }; };
  await assert.rejects(mergeFragmentImages([new Blob(), new Blob()], 'horizontal', 0));
  assert.equal(closed, 3);
  console.log('Passed: native-size layout, gap, Chinese/English text, bounds, PNG composition and bitmap cleanup.');
} finally { await rm(dir, { recursive: true, force: true }); }
