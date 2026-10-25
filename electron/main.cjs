const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const { createLibrary } = require('./library.cjs');
const fs = require('node:fs/promises');
const path = require('node:path');

const isDevelopment = !app.isPackaged && process.env.FRAGMENTE_DESKTOP_DEV === '1';
app.setName(isDevelopment ? 'Fragmente-Projekt Development' : 'Fragmente-Projekt');
if (isDevelopment) {
  app.setPath('userData', path.join(app.getPath('appData'), 'Fragmente-Projekt-Development'));
}
let mainWindow;
let library;

async function chooseLibrary() {
  if (isDevelopment) {
    const root = path.join(app.getPath('desktop'), 'Fragmente-Projekt Preview Library');
    const browserData = path.join(app.getPath('userData'), 'browser-data');
    await fs.mkdir(browserData, { recursive: true });
    await fs.mkdir(path.join(browserData, 'Cache', 'Cache_Data'), { recursive: true });
    await fs.mkdir(path.join(browserData, 'Shared Dictionary', 'cache'), { recursive: true });
    app.setPath('sessionData', browserData);
    library = await createLibrary(root);
    return true;
  }
  const configPath = path.join(app.getPath('userData'), 'library-location.json');
  let libraryPath;
  try {
    libraryPath = JSON.parse(await fs.readFile(configPath, 'utf8')).libraryPath;
    await fs.access(path.join(libraryPath, '.fragmente-library.json'));
  } catch (error) {
    if (libraryPath) {
      dialog.showErrorBox('Library unavailable', 'Your library folder could not be found. Reconnect its drive or restore the folder, then reopen the app. Your library has not been replaced.');
      return false;
    }
    const answer = await dialog.showMessageBox({
      type: 'info', title: 'Your local library',
      message: 'Choose a home for your Fragmente-Projekt library',
      detail: 'The app will create a dedicated folder and automatically save uploaded images, fragments, favorites, OCR and canvases there. Please do not delete or move this folder: it contains your work. Existing browser libraries can be brought in with Import library.',
      buttons: ['Choose folder', 'Quit'], defaultId: 0, cancelId: 1,
    });
    if (answer.response !== 0) return false;
    const selection = await dialog.showOpenDialog({ properties: ['openDirectory', 'createDirectory'] });
    if (selection.canceled) return false;
    libraryPath = path.join(selection.filePaths[0], 'Fragmente-Projekt Library');
    await fs.mkdir(libraryPath, { recursive: true });
    const marker = path.join(libraryPath, '.fragmente-library.json');
    try {
      await fs.writeFile(marker, JSON.stringify({ version: 1, createdAt: new Date().toISOString() }), { flag: 'wx' });
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
    }
    await fs.mkdir(path.dirname(configPath), { recursive: true });
    await fs.writeFile(configPath, JSON.stringify({ libraryPath }, null, 2));
  }
  const browserData = path.join(libraryPath, 'browser-data');
  await fs.mkdir(browserData, { recursive: true });
  app.setPath('sessionData', browserData);
  library = await createLibrary(libraryPath);
  return true;
}

function openWindow() {
  mainWindow = new BrowserWindow({
    width: 1440, height: 940, minWidth: 1080, minHeight: 700,
    title: isDevelopment ? 'Fragmente-Projekt · Development' : 'Fragmente-Projekt',
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), nodeIntegration: false, contextIsolation: true, sandbox: true },
  });
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.webContents.on('will-navigate', (event) => event.preventDefault());
  mainWindow.webContents.on('will-prevent-unload', (event) => event.preventDefault());
  if (isDevelopment) {
    mainWindow.on('page-title-updated', (event) => event.preventDefault());
    mainWindow.loadURL('http://localhost:5175/');
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }
  mainWindow.on('closed', () => { mainWindow = null; });
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) { mainWindow.restore(); mainWindow.focus(); }
  });
  app.whenReady().then(async () => {
    if (!(await chooseLibrary())) { app.quit(); return; }
    for (const method of ['scan', 'read', 'confirm', 'store', 'openFolder', 'reclassify']) {
      ipcMain.handle(`library:${method}`, (event, ...args) => {
        if (event.sender !== mainWindow?.webContents || event.senderFrame !== mainWindow.webContents.mainFrame) throw new Error('Untrusted sender');
        return library[method](...args);
      });
    }
    openWindow();
    app.on('activate', () => { if (!mainWindow) openWindow(); });
  }).catch((error) => {
    dialog.showErrorBox('Unable to open library', error.message);
    app.quit();
  });
  app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
}
