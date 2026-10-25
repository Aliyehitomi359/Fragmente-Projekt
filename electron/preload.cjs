const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('desktopLibrary', {
  openFolder: () => ipcRenderer.invoke('library:openFolder'),
  reclassify: (kind, type, bytes) => ipcRenderer.invoke('library:reclassify', kind, type, bytes),
  scan: () => ipcRenderer.invoke('library:scan'),
  read: (id) => ipcRenderer.invoke('library:read', id),
  confirm: (id, kind) => ipcRenderer.invoke('library:confirm', id, kind),
  store: (kind, id, type, bytes, text) => ipcRenderer.invoke('library:store', kind, id, type, bytes, text),
});
