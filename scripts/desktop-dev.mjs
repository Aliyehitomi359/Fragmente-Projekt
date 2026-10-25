import { createServer } from 'vite';
import { spawn } from 'node:child_process';
import { watch } from 'node:fs';
import { once } from 'node:events';
import electron from 'electron';

let server;
let child;
let watcher;
let timer;
let stopping = false;
let restarting = false;
let restartRequested = false;

async function shutdown(code = 0) {
  if (stopping) return;
  stopping = true;
  clearTimeout(timer);
  watcher?.close();
  if (child && child.exitCode === null) {
    const exited = once(child, 'exit');
    child.kill();
    await exited;
  }
  await server?.close();
  process.exit(code);
}

function launch() {
  const env = { ...process.env, FRAGMENTE_DESKTOP_DEV: '1' };
  delete env.ELECTRON_RUN_AS_NODE;
  child = spawn(electron, ['.'], { stdio: 'inherit', env });
  child.on('error', (error) => { console.error(error); void shutdown(1); });
  child.on('exit', (code) => {
    if (!restarting && !stopping) void shutdown(code ?? 0);
  });
}

async function restart() {
  if (restarting || stopping) { restartRequested = true; return; }
  restarting = true;
  if (child && child.exitCode === null) {
    const exited = once(child, 'exit');
    child.kill();
    await exited;
  }
  if (!stopping) launch();
  restarting = false;
  if (restartRequested) { restartRequested = false; void restart(); }
}

try {
  // Reuse the project's existing server; never silently switch away from port 5175.
  let response;
  try { response = await fetch('http://localhost:5175/', { signal: AbortSignal.timeout(1500) }); } catch {}
  if (response) {
    const html = await response.text();
    if (!html.includes('/src/main.tsx') || !html.includes('/@vite/client')) throw new Error('Port 5175 is occupied by another server. Stop it before starting the desktop preview.');
    console.log('Using existing Vite server at http://localhost:5175/');
  } else {
    server = await createServer();
    await server.listen();
  }
  launch();
  watcher = watch(new URL('../electron/', import.meta.url), (_event, filename) => {
    if (!filename || filename.endsWith('.test.cjs')) return;
    clearTimeout(timer);
    timer = setTimeout(() => void restart(), 300);
  });
  process.on('SIGINT', () => void shutdown());
  process.on('SIGTERM', () => void shutdown());
  console.log('Desktop preview: UI changes refresh automatically; Electron changes restart the app.');
  console.log('Test library: Desktop/Fragmente-Projekt Preview Library (separate from your installed app).');
} catch (error) { console.error(error.message); await shutdown(1); }
