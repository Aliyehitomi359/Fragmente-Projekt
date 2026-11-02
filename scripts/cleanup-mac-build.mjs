import { readdir, rename, stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const release = fileURLToPath(new URL('../release/', import.meta.url));

// Keep distributable installers, but move unpacked app bundles out of Spotlight's way.
if (process.platform === 'darwin') {
  const artifacts = await readdir(release);
  if (!artifacts.some(name => name.endsWith('.dmg') && name.startsWith('Fragmente-Projekt-'))) {
    throw new Error('No DMG found; leaving unpacked applications untouched.');
  }
  for (const directory of artifacts.filter(name => /^mac(?:-|$)/.test(name))) {
    const root = path.join(release, directory);
    if (!(await stat(root)).isDirectory()) continue;
    for (const name of await readdir(root)) {
      if (!name.startsWith('Fragmente-Projekt') || !name.endsWith('.app')) continue;
      const destination = path.join(homedir(), '.Trash', `${name.slice(0, -4)}-build-${Date.now()}.app`);
      await rename(path.join(root, name), destination);
      console.log(`Moved unpacked build to Trash: ${name}`);
    }
  }
}
