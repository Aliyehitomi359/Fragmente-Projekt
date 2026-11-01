const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { validateDestination, writeConfig, finishPendingMove } = require('./library-move.cjs');

async function fixture(run) {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'fragmente-move-'));
  try {
    const root = path.join(temp, 'old', 'Library');
    const session = path.join(temp, 'profile', 'browser-data');
    const parent = path.join(temp, 'desktop');
    await fs.mkdir(path.join(root, 'Sources'), { recursive: true });
    await fs.mkdir(path.join(root, 'Fragments'), { recursive: true });
    await fs.mkdir(path.join(root, '.app-data'), { recursive: true });
    await fs.mkdir(path.join(root, 'Canvases'), { recursive: true });
    await fs.mkdir(path.join(session, 'IndexedDB', 'blobs'), { recursive: true });
    await fs.mkdir(parent);
    await fs.writeFile(path.join(root, 'Sources', 'page.png'), 'source pixels');
    await fs.writeFile(path.join(root, 'Fragments', 'word.png'), 'fragment pixels');
    await fs.writeFile(path.join(root, '.app-data', 'imports.json'), '{"collected":true}');
    await fs.writeFile(path.join(session, 'IndexedDB', 'metadata'), JSON.stringify({ ocr: '雪', favorites: ['one'], boxes: ['poem'], canvases: [{ placements: [1, 2] }] }));
    await fs.writeFile(path.join(session, 'IndexedDB', 'blobs', 'image'), 'database blob');
    const configPath = path.join(temp, 'location.json');
    const destination = await validateDestination(root, session, parent);
    const config = { libraryPath: root, pendingMove: { sourceRoot: root, sourceSession: session, destination } };
    await writeConfig(configPath, config);
    await run({ temp, root, session, parent, configPath, destination, config });
  } finally { await fs.rm(temp, { recursive: true, force: true }); }
}

test('moves complete library and separate browser profile, preserves old files, commits new location last', async () => {
  await fixture(async ({ root, session, configPath, destination, config }) => {
    const updated = await finishPendingMove(configPath, config);
    assert.equal(updated.libraryPath, destination);
    assert.equal(updated.browserDataPath, path.join(destination, 'browser-data'));
    assert.equal(updated.pendingMove, undefined);
    for (const relative of ['Sources/page.png', 'Fragments/word.png', '.app-data/imports.json']) {
      assert.deepEqual(await fs.readFile(path.join(root, relative)), await fs.readFile(path.join(destination, relative)));
    }
    for (const relative of ['IndexedDB/metadata', 'IndexedDB/blobs/image']) {
      assert.deepEqual(await fs.readFile(path.join(session, relative)), await fs.readFile(path.join(destination, 'browser-data', relative)));
    }
    assert.deepEqual(JSON.parse(await fs.readFile(configPath)), updated);
    await fs.access(path.join(destination, '.fragmente-library.json'));
    assert.deepEqual(await finishPendingMove(configPath, updated), updated);
  });
});

test('copies installed browser data from inside the library and ignores only transient top-level singleton files', async () => {
  await fixture(async ({ root, session, parent, configPath, config }) => {
    const localSession = path.join(root, 'browser-data');
    await fs.cp(session, localSession, { recursive: true });
    await fs.writeFile(path.join(localSession, 'SingletonLock'), 'stale process lock');
    config.pendingMove.sourceSession = localSession;
    config.pendingMove.destination = await validateDestination(root, localSession, parent);
    const updated = await finishPendingMove(configPath, config);
    assert.equal(await fs.readFile(path.join(updated.browserDataPath, 'IndexedDB', 'blobs', 'image'), 'utf8'), 'database blob');
    await assert.rejects(fs.access(path.join(updated.browserDataPath, 'SingletonLock')));
    await fs.access(path.join(localSession, 'SingletonLock'));
  });
});

test('rejects nested, same and occupied locations without overwriting or changing configuration', async () => {
  await fixture(async ({ root, session, parent, destination, configPath, config }) => {
    await assert.rejects(validateDestination(root, session, root), /outside/);
    await assert.rejects(validateDestination(root, session, session), /outside/);
    await assert.rejects(validateDestination(root, session, path.dirname(root)), /outside/);
    await fs.mkdir(destination);
    await fs.writeFile(path.join(destination, 'keep.txt'), 'do not overwrite');
    await assert.rejects(finishPendingMove(configPath, config), /already exists/);
    assert.equal(await fs.readFile(path.join(destination, 'keep.txt'), 'utf8'), 'do not overwrite');
    assert.deepEqual(JSON.parse(await fs.readFile(configPath)), config);
    await fs.access(path.join(root, 'Sources', 'page.png'));
  });
});

test('failed copy leaves original and configuration intact and removes its private staging directory', async () => {
  await fixture(async ({ root, session, parent, configPath, destination, config }) => {
    await fs.symlink(path.join(root, 'Sources', 'page.png'), path.join(session, 'unexpected-link'));
    await assert.rejects(finishPendingMove(configPath, config), /link or unsupported/);
    assert.deepEqual(JSON.parse(await fs.readFile(configPath)), config);
    await assert.rejects(fs.access(destination));
    assert.deepEqual(await fs.readdir(parent), []);
    assert.equal(await fs.readFile(path.join(root, 'Sources', 'page.png'), 'utf8'), 'source pixels');
  });
});
