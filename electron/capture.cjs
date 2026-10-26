const { BrowserWindow, desktopCapturer, screen, systemPreferences, app } = require('electron');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { cropPixels } = require('./capture-geometry.cjs');

function createCapture({ getMainWindow, importCapture }) {
  let overlay, image, display, kind, captureId, captureName, saving = false, starting = false;
  let restoreMain = false;
  const area = screen.getPrimaryDisplay().workArea;
  const widget = new BrowserWindow({
    x: area.x + area.width - 220, y: area.y + area.height - 240,
    width: 76, height: 80, frame: false, transparent: true, resizable: false,
    alwaysOnTop: true, skipTaskbar: true, hasShadow: false,
    webPreferences: { preload: path.join(__dirname, 'capture-preload.cjs'), contextIsolation: true, sandbox: true, nodeIntegration: false },
  });
  widget.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  widget.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  widget.webContents.on('will-navigate', (event) => event.preventDefault());
  void widget.loadFile(path.join(__dirname, 'capture-widget.html'));
  function resize(expanded) {
    const bounds = widget.getBounds();
    const width = expanded ? 204 : 76, height = expanded ? 224 : 80;
    widget.setBounds({ x: bounds.x + bounds.width - width, y: bounds.y + bounds.height - height, width, height });
  }
  function status(text, error = false) {
    if (!widget.isDestroyed()) { resize(true); widget.webContents.send('capture-ui:state', { text, error }); }
  }
  function finish() {
    overlay?.destroy(); overlay = null; image = null;
    widget.showInactive();
    const main = getMainWindow();
    if (restoreMain && main && !main.isDestroyed()) main.show();
  }
  async function start(nextKind, retake = false) {
    if (starting || saving) return;
    if (overlay && !retake) return;
    starting = true;
    try {
      if (!['source', 'fragment'].includes(nextKind)) throw new Error('Invalid capture type.');
      if (process.platform === 'darwin' && ['denied', 'restricted'].includes(systemPreferences.getMediaAccessStatus('screen'))) {
        throw new Error('Allow Screen Recording in System Settings > Privacy & Security, then restart the app.');
      }
      kind = nextKind;
      captureId = `capture-${randomUUID()}`;
      const now = new Date();
      const pad = (value) => String(value).padStart(2, '0');
      captureName = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
      const main = getMainWindow();
      if (!retake) restoreMain = !!main?.isVisible() && !main.isMinimized();
      display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
      overlay?.destroy(); overlay = null;
      widget.hide(); main?.hide();
      // Let the compositor remove our windows before taking the one-shot image.
      await new Promise((resolve) => setTimeout(resolve, 250));
      const sources = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: {
        width: Math.round(display.size.width * display.scaleFactor), height: Math.round(display.size.height * display.scaleFactor),
      } });
      const source = sources.find((item) => item.display_id === String(display.id)) ?? (sources.length === 1 ? sources[0] : null);
      if (!source || source.thumbnail.isEmpty()) throw new Error('Screen capture unavailable. Check your screen recording permission.');
      image = source.thumbnail;
      overlay = new BrowserWindow({ ...display.bounds, frame: false, resizable: false, movable: false,
        alwaysOnTop: true, skipTaskbar: true, show: false,
        webPreferences: { preload: path.join(__dirname, 'capture-preload.cjs'), contextIsolation: true, sandbox: true, nodeIntegration: false },
      });
      overlay.setAlwaysOnTop(true, 'screen-saver');
      overlay.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
      overlay.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
      overlay.webContents.on('will-navigate', (event) => event.preventDefault());
      overlay.webContents.once('did-finish-load', () => {
        overlay?.webContents.send('capture-ui:state', { image: image.toDataURL(), kind, width: display.bounds.width, height: display.bounds.height });
        overlay?.show(); overlay?.focus();
      });
      await overlay.loadFile(path.join(__dirname, 'capture-overlay.html'));
    } catch (error) { finish(); status(error.message, true); }
    finally { starting = false; }
  }
  async function action(event, name, value) {
    const fromWidget = event.sender === widget.webContents && event.senderFrame === widget.webContents.mainFrame;
    const fromOverlay = overlay && event.sender === overlay.webContents && event.senderFrame === overlay.webContents.mainFrame;
    if (!fromWidget && !fromOverlay) throw new Error('Untrusted capture request.');
    if (fromWidget) {
      if (name === 'expand') { resize(!!value); return; }
      if (name === 'move' && value && Number.isFinite(value.x) && Number.isFinite(value.y)) {
        const area = screen.getDisplayNearestPoint({ x: Math.round(value.x), y: Math.round(value.y) }).workArea;
        const bounds = widget.getBounds();
        widget.setPosition(Math.round(Math.max(area.x, Math.min(area.x + area.width - bounds.width, value.x))), Math.round(Math.max(area.y, Math.min(area.y + area.height - bounds.height, value.y))));
        return;
      }
      if (name === 'start') return start(value);
      if (name === 'open') { const main = getMainWindow(); main?.restore(); main?.show(); main?.focus(); }
      if (name === 'quit') app.quit();
      return;
    }
    if (saving) return;
    if (name === 'cancel') { finish(); return; }
    if (name === 'retake') return start(kind, true);
    if (name === 'save') {
      saving = true;
      try {
        const cropped = kind === 'source' ? image : image.crop(cropPixels(value, display.bounds, image.getSize()));
        await importCapture({ id: captureId, kind, bytes: new Uint8Array(cropped.toPNG()), name: captureName });
        finish(); status('Saved in the app and your local Library.');
      } catch (error) {
        if (overlay && !overlay.isDestroyed()) overlay.webContents.send('capture-ui:state', { error: error.message });
      } finally { saving = false; }
    }
  }
  return { action, destroy: () => { overlay?.destroy(); widget.destroy(); } };
}
module.exports = { createCapture };
