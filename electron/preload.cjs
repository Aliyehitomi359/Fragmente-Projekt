const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('desktopLibrary', {
  readClipboardImage: () => ipcRenderer.invoke('clipboard:read-image'),
  openFolder: () => ipcRenderer.invoke('library:openFolder'),
  reclassify: (kind, type, bytes) => ipcRenderer.invoke('library:reclassify', kind, type, bytes),
  scan: () => ipcRenderer.invoke('library:scan'),
  read: (id) => ipcRenderer.invoke('library:read', id),
  confirm: (id, kind) => ipcRenderer.invoke('library:confirm', id, kind),
  store: (kind, id, type, bytes, text) => ipcRenderer.invoke('library:store', kind, id, type, bytes, text),
  onCapture: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on('capture:import', listener);
    void ipcRenderer.invoke('capture:ready');
    return () => ipcRenderer.removeListener('capture:import', listener);
  },
  completeCapture: (id, error) => ipcRenderer.invoke('capture:complete', id, error),
});
