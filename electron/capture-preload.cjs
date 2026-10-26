const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('captureUI', {
  action: (action, value) => ipcRenderer.invoke('capture-ui:action', action, value),
  onState: (callback) => {
    const listener = (_event, state) => callback(state);
    ipcRenderer.on('capture-ui:state', listener);
    return () => ipcRenderer.removeListener('capture-ui:state', listener);
  },
});
