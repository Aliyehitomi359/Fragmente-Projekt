const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readClipboardPng } = require('./clipboard-image.cjs');
const nativeImage = { createFromBuffer: (bytes) => ({ isEmpty: () => !bytes.length, toPNG: () => Buffer.from('normalized-png') }) };
test('Electron async clipboard API reads images and prefers PNG over other representations', async () => {
  let requested;
  const clipboard = { read: async () => [{ types: ['text/plain'] }, { types: ['image/jpeg', 'image/png'], getType: async (type) => { requested = type; return new Blob(['image']); } }] };
  assert.equal(Buffer.from(await readClipboardPng(clipboard, nativeImage)).toString(), 'normalized-png');
  assert.equal(requested, 'image/png');
});
test('empty, text-only and undecodable clipboards do not import images', async () => {
  for (const items of [[], [{ types: ['text/plain'] }], [{ types: ['image/png'], getType: async () => new Blob([]) }]]) {
    assert.equal(await readClipboardPng({ read: async () => items }, nativeImage), null);
  }
});
test('native clipboard read failures propagate rather than report success', async () => {
  await assert.rejects(readClipboardPng({ read: async () => { throw new Error('unavailable'); } }, nativeImage));
});

test('third-party macOS raw TIFF screenshots are converted to PNG', async () => {
  const UTIF = require('utif');
  const { PNG } = require('pngjs');
  const rgba = new Uint8Array([255, 0, 0, 255, 0, 255, 0, 255]);
  const tiff = UTIF.encodeImage(rgba.buffer, 2, 1);
  const clipboard = { read: async () => [{ types: ['electron application/osclipboard;format="public.tiff"'], getType: async () => new Blob([tiff]) }] };
  const result = PNG.sync.read(Buffer.from(await readClipboardPng(clipboard, nativeImage)));
  assert.equal(result.width, 2);
  assert.equal(result.height, 1);
  assert.deepEqual([...result.data], [...rgba]);
});

test('unavailable PNG representation falls back to another image', async () => {
  const clipboard = { read: async () => [{ types: ['image/png', 'image/jpeg'], getType: async (type) => {
    if (type === 'image/png') throw new Error('not available');
    return new Blob(['jpeg']);
  } }] };
  assert.ok(await readClipboardPng(clipboard, nativeImage));
});

test('unsupported third-party data reports format names, not image contents', async () => {
  const clipboard = { read: async () => [{ types: ['electron application/osclipboard;format="QQPrivate"'], getType: async () => new Blob(['private bytes']) }] };
  await assert.rejects(readClipboardPng(clipboard, { createFromBuffer: () => ({ isEmpty: () => true }) }), /QQPrivate/);
});
