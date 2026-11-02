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
    setVisibleOnAllWorkspaces(visible, options) { this.workspaceOptions = options; } setAlwaysOnTop() {} focus() {} moveTop() { this.raised = true; }
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
    hide() { this.visible = false; }, show() { this.visible = true; },
    restore() { this.restored = true; }, focus() { this.focused = true; } };
  Object.assign(main, new EventEmitter());
  main.on = EventEmitter.prototype.on;
  main.emit = EventEmitter.prototype.emit;
  main.removeListener = EventEmitter.prototype.removeListener;
  const display = { id: 1, scaleFactor: 2, bounds: { x: 0, y: 0, width: 1000, height: 800 }, size: { width: 1000, height: 800 }, workArea: { x: 0, y: 0, width: 1000, height: 800 } };
  const electron = { BrowserWindow: Window, app: { quit() {} },
    screen: { getPrimaryDisplay: () => display, getDisplayNearestPoint: () => display, getCursorScreenPoint: () => ({ x: 50, y: 50 }) },
    systemPreferences: { getMediaAccessStatus: () => permission },
    desktopCapturer: { async getSources() { scans++; return [{ display_id: '1', thumbnail }]; } } };
  const module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'capture.cjs'), 'utf8'), {
    module, require: (id) => id === 'electron' ? electron : require(id), __dirname,
    process: { platform: 'darwin' }, setTimeout, Uint8Array, Buffer, console,
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

test('rotated fragment pixels are saved and malformed images remain retryable', async () => {
  const { PNG } = require('pngjs');
  const png = PNG.sync.write(new PNG({ width: 12, height: 8, fill: true }));
  const saved = [];
  const f = fixture('granted', async payload => saved.push(payload));
  await f.controller.action(f.event(f.windows[0]), 'start', 'fragment');
  const region = { x: 10, y: 20, width: 100, height: 40 };
  await f.controller.action(f.event(f.windows[1]), 'save', { ...region, rotatedPng: 'invalid' });
  assert.equal(saved.length, 0);
  assert.equal(f.windows[1].destroyed, false);
  await f.controller.action(f.event(f.windows[1]), 'save', { ...region, rotatedPng: `data:image/png;base64,${png.toString('base64')}` });
  assert.equal(saved.length, 1);
  assert.deepEqual(Buffer.from(saved[0].bytes), png);
});

test('widget opens hidden or minimized main app without taking a screenshot', async () => {
  const f = fixture();
  f.main.hide();
  f.main.isMinimized = () => true;
  await f.controller.action(f.event(f.windows[0]), 'open');
  assert.equal(f.main.visible, true);
  assert.equal(f.main.focused, true);
  assert.equal(f.main.restored, true);
  assert.equal(f.scans(), 0);
});

test('macOS widget keeps Dock policy and receives first clicks while main is focused', async () => {
  const f = fixture();
  const widget = f.windows[0];
  assert.equal(widget.bounds.skipTaskbar, false);
  assert.equal(widget.bounds.acceptFirstMouse, true);
  assert.equal(widget.bounds.type, 'panel');
  assert.equal(widget.bounds.webPreferences.backgroundThrottling, false);
  assert.equal(widget.workspaceOptions.skipTransformProcessType, true);
  f.main.emit('focus');
  assert.equal(widget.raised, true);
  await f.controller.action(f.event(widget), 'start', 'fragment');
  assert.equal(f.windows[1].bounds.skipTaskbar, false);
  assert.equal(f.windows[1].workspaceOptions.skipTransformProcessType, true);
  f.controller.destroy();
  assert.equal(f.main.listenerCount?.('focus') ?? EventEmitter.prototype.listenerCount.call(f.main, 'focus'), 0);
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
