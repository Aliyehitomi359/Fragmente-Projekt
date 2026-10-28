import { readFile, writeFile, readdir, rm } from 'node:fs/promises';
import path from 'node:path';

const root = new URL('../dist/', import.meta.url);
const portfolio = new Set([
  'index.html', 'zh.html', 'style.css', 'capture-animation.css', 'story.js',
  'desktop-capture-en.mp4', 'desktop-capture-zh.mp4', 'dubliners-en.png', 'dubliners-zh.png',
  ...['en', 'zh'].flatMap(lang => ['workbench', 'inspiration', 'canvas-picker', 'canvas'].map(name => `real-${name}-${lang}.png`)),
]);
// Publish only the active case study and built app, not abandoned design previews.
for (const entry of await readdir(root, { withFileTypes: true })) {
  if (!['index.html', 'assets', 'portfolio'].includes(entry.name)) {
    await rm(new URL(entry.name, root), { recursive: true, force: true });
  }
}
const portfolioRoot = new URL('portfolio/', root);
for (const entry of await readdir(portfolioRoot)) {
  if (!portfolio.has(entry)) await rm(new URL(entry, portfolioRoot), { recursive: true, force: true });
}
for (const file of portfolio) await readFile(new URL(file, portfolioRoot));
const index = new URL('index.html', root);
const html = await readFile(index, 'utf8');
const redirect = `<script>if(new URLSearchParams(location.search).get('demo')!=='1')location.replace(new URL('portfolio/index.html',location.href));</script>`;
await writeFile(index, html.replace('<head>', '<head>' + redirect));
await writeFile(new URL('.nojekyll', root), '');
console.log(`Pages artifact ready at ${path.resolve('dist')}: English story is the entry point; ?demo=1 opens the sample app.`);
