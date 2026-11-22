const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('desktopLibrary', {
  startLanTransfer: snapshot => ipcRenderer.invoke('lan-transfer:start', snapshot),
  receiveLanTransfer: code => ipcRenderer.invoke('lan-transfer:receive', code),
  stopLanTransfer: () => ipcRenderer.invoke('lan-transfer:stop'),
  readClipboardImage: () => ipcRenderer.invoke('clipboard:read-image'),
  openFolder: () => ipcRenderer.invoke('library:openFolder'),
  getLocation: () => ipcRenderer.invoke('library:getLocation'),
  moveLibrary: () => ipcRenderer.invoke('library:move'),
  reclassify: (kind, type, bytes) => ipcRenderer.invoke('library:reclassify', kind, type, bytes),
  removeImage: (kind, bytes) => ipcRenderer.invoke('library:removeImage', kind, bytes),
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
