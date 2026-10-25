const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');

const extensions = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.bmp': 'image/bmp', '.tif': 'image/tiff', '.tiff': 'image/tiff' };

async function createLibrary(root) {
  for (const folder of ['Sources', 'Fragments', 'Canvases', '.app-data']) {
    await fs.mkdir(path.join(root, folder), { recursive: true });
  }
  const ledgerPath = path.join(root, '.app-data', 'imports.json');
  let ledger = {};
  try { ledger = JSON.parse(await fs.readFile(ledgerPath, 'utf8')); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  let candidates = new Map();
  let previous = new Map();
  let writing = Promise.resolve();
  function saveLedger() {
    writing = writing.catch(() => {}).then(async () => {
      await fs.writeFile(`${ledgerPath}.tmp`, JSON.stringify(ledger));
      await fs.rename(`${ledgerPath}.tmp`, ledgerPath);
    });
    return writing;
  }

  async function store(kind, id, type, bytes, text = '') {
    if (!['source', 'fragment'].includes(kind) || typeof id !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(id)) throw new Error('Invalid image.');
    const extension = Object.keys(extensions).find((ext) => extensions[ext] === type);
    if (!extension) throw new Error('Unsupported image type.');
    const buffer = Buffer.from(bytes);
    const hash = crypto.createHash('sha256').update(buffer).digest('hex');
    const key = `${kind}:${hash}`;
    const folder = path.join(root, kind === 'source' ? 'Sources' : 'Fragments');
    const label = String(text).normalize('NFC').replace(/[<>:"/\\|?*\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().replace(/\.(png|jpe?g|webp|gif|bmp|tiff?)$/i, '').replace(/[. ]+$/g, '').slice(0, 60) || 'Untitled';
    let previousFile;
    for (const entry of await fs.readdir(folder, { withFileTypes: true })) {
      if (!entry.isFile() || !extensions[path.extname(entry.name).toLowerCase()]) continue;
      const file = path.join(folder, entry.name);
      const content = await fs.readFile(file);
      if (crypto.createHash('sha256').update(content).digest('hex') === hash) { previousFile = file; break; }
    }
    let target;
    const code = Number.parseInt(crypto.createHash('sha256').update(id).digest('hex').slice(0, 8), 16);
    for (let index = 1; ; index += 1) {
      if (index > 46656) throw new Error('No available three-character filename identifiers for this name.');
      const suffix = ((code + index - 1) % 46656).toString(36).toUpperCase().padStart(3, '0');
      target = path.join(folder, `${label}-${suffix}${extension}`);
      try { await fs.writeFile(target, buffer, { flag: 'wx' }); break; }
      catch (error) {
        if (error.code !== 'EEXIST') throw error;
        const existing = await fs.readFile(target);
        if (crypto.createHash('sha256').update(existing).digest('hex') === hash) break;
      }
    }
    if (previousFile && previousFile !== target) await fs.unlink(previousFile);
    ledger[key] = true;
    await saveLedger();
  }

  async function scan() {
    const next = new Map();
    const stable = new Map();
    for (const folder of ['', 'Sources', 'Fragments']) {
      for (const entry of await fs.readdir(path.join(root, folder), { withFileTypes: true })) {
        if (!entry.isFile() || !extensions[path.extname(entry.name).toLowerCase()]) continue;
        const relative = path.join(folder, entry.name);
        const file = path.join(root, relative);
        const stat = await fs.stat(file).catch(() => null);
        if (!stat || !stat.size) continue;
        const signature = `${stat.size}:${stat.mtimeMs}`;
        stable.set(relative, signature);
        if (previous.get(relative) !== signature) continue;
        const bytes = await fs.readFile(file);
        const hash = crypto.createHash('sha256').update(bytes).digest('hex');
        const kind = folder === 'Sources' ? 'source' : folder === 'Fragments' ? 'fragment' : null;
        const key = `${kind || 'root'}:${hash}`;
        if (ledger[key]) continue;
        const id = crypto.createHash('sha256').update(relative + hash).digest('hex');
        next.set(id, { id, name: entry.name, kind, relative, hash, key, signature });
      }
    }
    previous = stable;
    candidates = next;
    return [...next.values()].map(({ id, name, kind }) => ({ id, name, kind }));
  }

  async function read(id) {
    const item = candidates.get(id);
    if (!item) throw new Error('This file is no longer available. Refresh the list.');
    const bytes = await fs.readFile(path.join(root, item.relative));
    if (crypto.createHash('sha256').update(bytes).digest('hex') !== item.hash) throw new Error('File is still changing. Try again.');
    return { name: item.name, type: extensions[path.extname(item.name).toLowerCase()], bytes: new Uint8Array(bytes), hash: item.hash };
  }

  async function confirm(id, kind) {
    if (!['source', 'fragment'].includes(kind)) throw new Error('Invalid image type.');
    const item = candidates.get(id);
    if (!item) throw new Error('File no longer available.');
    await read(id);
    if (!item.kind) {
      const destination = path.join(root, kind === 'source' ? 'Sources' : 'Fragments', `${item.hash.slice(0, 12)}-${item.name}`);
      // Exclusive copy protects an existing file; unlink only after a successful copy.
      try { await fs.copyFile(path.join(root, item.relative), destination, 1); }
      catch (error) {
        if (error.code !== 'EEXIST') throw error;
        const saved = await fs.readFile(destination);
        if (crypto.createHash('sha256').update(saved).digest('hex') !== item.hash) throw error;
      }
      await fs.unlink(path.join(root, item.relative));
    }
    ledger[item.key] = true;
    ledger[`${kind}:${item.hash}`] = true;
    await saveLedger();
    candidates.delete(id);
  }
  async function reclassify(kind, type, bytes) {
    if (!['source', 'fragment'].includes(kind)) throw new Error('Invalid image type.');
    const buffer = Buffer.from(bytes);
    const hash = crypto.createHash('sha256').update(buffer).digest('hex');
    const extension = Object.keys(extensions).find((ext) => extensions[ext] === type);
    if (!extension) throw new Error('Unsupported image type.');
    const destination = path.join(root, kind === 'source' ? 'Sources' : 'Fragments', `${hash}${extension}`);
    try { await fs.writeFile(destination, buffer, { flag: 'wx' }); }
    catch (error) {
      if (error.code !== 'EEXIST') throw error;
      const existing = await fs.readFile(destination);
      if (crypto.createHash('sha256').update(existing).digest('hex') !== hash) throw error;
    }
    ledger[`${kind}:${hash}`] = true;
    await saveLedger();
    const oldFolder = path.join(root, kind === 'source' ? 'Fragments' : 'Sources');
    for (const entry of await fs.readdir(oldFolder, { withFileTypes: true })) {
      if (!entry.isFile() || !extensions[path.extname(entry.name).toLowerCase()]) continue;
      const file = path.join(oldFolder, entry.name);
      const content = await fs.readFile(file);
      if (crypto.createHash('sha256').update(content).digest('hex') === hash) await fs.unlink(file);
    }
  }
  const operations = { scan, read, confirm, store, reclassify, openFolder: async () => {
    const result = await require('electron').shell.openPath(root);
    if (result) throw new Error(result);
  } };
  let pending = Promise.resolve();
  return Object.fromEntries(Object.entries(operations).map(([name, operation]) => [name, (...args) => {
    const result = pending.then(() => operation(...args));
    pending = result.catch(() => {});
    return result;
  }]));
}
module.exports = { createLibrary };
