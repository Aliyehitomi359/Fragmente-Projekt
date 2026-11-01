const fs = require('node:fs/promises');
const { createReadStream } = require('node:fs');
const path = require('node:path');
const { createHash, randomUUID } = require('node:crypto');

function contains(parent, child) {
  const relative = path.relative(parent, child);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

async function exists(file) {
  try { await fs.lstat(file); return true; }
  catch (error) { if (error.code === 'ENOENT') return false; throw error; }
}

async function validateDestination(sourceRoot, sourceSession, parent) {
  const [root, session, realParent] = await Promise.all([sourceRoot, sourceSession, parent].map(p => fs.realpath(p)));
  const destination = path.join(realParent, path.basename(root));
  if (!(await fs.stat(realParent)).isDirectory()) throw new Error('Choose a destination folder.');
  if ([root, session].some(source => contains(source, destination) || contains(destination, source))) {
    throw new Error('Choose a location outside the current library and its editing database.');
  }
  if (await exists(destination)) throw new Error(`A folder named "${path.basename(root)}" already exists there. Nothing was overwritten. Choose another location.`);
  await fs.access(realParent, require('node:fs').constants.W_OK);
  return destination;
}

async function writeConfig(configPath, value) {
  const temporary = `${configPath}.${randomUUID()}.tmp`;
  try {
    await fs.mkdir(path.dirname(configPath), { recursive: true });
    await fs.writeFile(temporary, JSON.stringify(value, null, 2));
    await fs.rename(temporary, configPath);
  } finally { await fs.rm(temporary, { force: true }); }
}

async function digest(file) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest('hex');
}

async function copyVerified(source, destination, skip = new Set()) {
  await fs.mkdir(destination, { recursive: true });
  for (const entry of await fs.readdir(source, { withFileTypes: true })) {
    if (skip.has(entry.name)) continue;
    const from = path.join(source, entry.name), to = path.join(destination, entry.name);
    if (entry.isDirectory()) await copyVerified(from, to);
    else if (entry.isFile()) {
      await fs.copyFile(from, to, require('node:fs').constants.COPYFILE_EXCL);
      if (await digest(from) !== await digest(to)) throw new Error(`Copy verification failed: ${entry.name}`);
    } else throw new Error(`The library contains a link or unsupported file: ${entry.name}. No location was changed.`);
  }
}

// Runs only on the next launch, before opening any Chromium session or library.
async function finishPendingMove(configPath, config) {
  const request = config.pendingMove;
  if (!request) return config;
  const { sourceRoot, sourceSession, destination } = request;
  const checked = await validateDestination(sourceRoot, sourceSession, path.dirname(destination));
  if (checked !== destination) throw new Error('The destination location changed. Please try moving the library again.');
  const staging = path.join(path.dirname(destination), `.fragmente-move-${randomUUID()}`);
  await fs.mkdir(staging);
  try {
    await copyVerified(sourceRoot, staging, new Set(['browser-data']));
    await copyVerified(sourceSession, path.join(staging, 'browser-data'), new Set(['SingletonLock', 'SingletonSocket', 'SingletonCookie']));
    if (!(await exists(path.join(staging, '.fragmente-library.json')))) {
      await fs.writeFile(path.join(staging, '.fragmente-library.json'), JSON.stringify({ version: 1, createdAt: new Date().toISOString() }));
    }
    // Reserve a new folder rather than rename over a directory someone may have created.
    await fs.mkdir(destination);
    try {
      for (const entry of await fs.readdir(staging)) await fs.rename(path.join(staging, entry), path.join(destination, entry));
    } catch (error) {
      throw new Error(`The original library is safe. A partial copy remains at ${destination}. ${error.message}`);
    }
    const { pendingMove, ...previous } = config;
    const updated = { ...previous, libraryPath: destination, browserDataPath: path.join(destination, 'browser-data') };
    await writeConfig(configPath, updated);
    return updated;
  } finally {
    // This random staging directory is created and owned by this operation only.
    await fs.rm(staging, { recursive: true, force: true });
  }
}

module.exports = { validateDestination, writeConfig, finishPendingMove };
