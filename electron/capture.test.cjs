const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function fixture(permission = 'granted', save = async () => {}) {
  const windows = [], messages = [];
  let scans = 0, crop;
  class Window extends EventEmitter {
    constructor(options) {
      super(); this.bounds = options; this.visible = true; this.destroyed = false;
      this.webContents = new EventEmitter(); this.webContents.mainFrame = {};
      this.webContents.setWindowOpenHandler = () => {};
      this.webContents.send = (channel, state) => messages.push({ channel, state });
      windows.push(this);
    }
    setVisibleOnAllWorkspaces() {} setAlwaysOnTop() {} focus() {}
    getBounds() { return this.bounds; } setBounds(bounds) { this.bounds = bounds; }
    setPosition(x, y) { Object.assign(this.bounds, { x, y }); }
    isDestroyed() { return this.destroyed; } destroy() { this.destroyed = true; }
    hide() { this.visible = false; } show() { this.visible = true; } showInactive() { this.visible = true; }
    async loadFile() { this.webContents.emit('did-finish-load'); }
  }
  const thumbnail = { isEmpty: () => false, toDataURL: () => 'data:image/png;base64,AA==',
    getSize: () => ({ width: 2000, height: 1600 }), toPNG: () => Buffer.from('test-png'),
    crop: (rect) => { crop = rect; return thumbnail; } };
  const main = { visible: true, isVisible() { return this.visible; }, isMinimized: () => false, isDestroyed: () => false,
    hide() { this.visible = false; }, show() { this.visible = true; } };
  const display = { id: 1, scaleFactor: 2, bounds: { x: 0, y: 0, width: 1000, height: 800 }, size: { width: 1000, height: 800 }, workArea: { x: 0, y: 0, width: 1000, height: 800 } };
  const electron = { BrowserWindow: Window, app: { quit() {} },
    screen: { getPrimaryDisplay: () => display, getDisplayNearestPoint: () => display, getCursorScreenPoint: () => ({ x: 50, y: 50 }) },
    systemPreferences: { getMediaAccessStatus: () => permission },
    desktopCapturer: { async getSources() { scans++; return [{ display_id: '1', thumbnail }]; } } };
  const module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'capture.cjs'), 'utf8'), {
    module, require: (id) => id === 'electron' ? electron : require(id), __dirname,
    process: { platform: 'darwin' }, setTimeout, Uint8Array, console,
  });
  const controller = module.exports.createCapture({ getMainWindow: () => main, importCapture: save });
  const event = (window) => ({ sender: window.webContents, senderFrame: window.webContents.mainFrame });
  return { controller, windows, messages, main, event, scans: () => scans, crop: () => crop };
}

test('capture is user-triggered; pixels save only after explicit confirmation and acknowledgment', async () => {
  const saved = [];
  const f = fixture('granted', async (payload) => saved.push(payload));
  assert.equal(f.scans(), 0);
  await f.controller.action(f.event(f.windows[0]), 'start', 'fragment');
  assert.equal(saved.length, 0);
  await f.controller.action(f.event(f.windows[1]), 'save', { x: 10, y: 20, width: 100, height: 40 });
  assert.equal(saved.length, 1);
  assert.equal(saved[0].kind, 'fragment');
  assert.equal(JSON.stringify(f.crop()), JSON.stringify({ x: 20, y: 40, width: 200, height: 80 }));
  assert.equal(f.windows[1].destroyed, true);
  assert.ok(f.messages.some(({ state }) => state.text?.includes('Saved in the app')));
});

test('permission denial captures nothing and restores the widget', async () => {
  const f = fixture('denied');
  await f.controller.action(f.event(f.windows[0]), 'start', 'source');
  assert.equal(f.scans(), 0);
  assert.equal(f.windows[0].visible, true);
  assert.ok(f.messages.some(({ state }) => state.error && state.text.includes('Screen Recording')));
});

test('save failure remains retryable; cancellation discards; untrusted senders are rejected', async () => {
  const f = fixture('granted', async () => { throw new Error('disk unavailable'); });
  await assert.rejects(f.controller.action({ sender: {}, senderFrame: {} }, 'start', 'source'));
  await f.controller.action(f.event(f.windows[0]), 'start', 'source');
  await f.controller.action(f.event(f.windows[1]), 'save');
  assert.equal(f.windows[1].destroyed, false);
  assert.ok(f.messages.some(({ state }) => state.error === 'disk unavailable'));
  assert.ok(!f.messages.some(({ state }) => state.text?.includes('Saved in the app')));
  await f.controller.action(f.event(f.windows[1]), 'cancel');
  assert.equal(f.windows[1].destroyed, true);
  assert.equal(f.main.visible, true);
});
