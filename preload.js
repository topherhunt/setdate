const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  scanFiles: (paths) => ipcRenderer.invoke('scan-files', paths),
  applyAbsolute: (args) => ipcRenderer.invoke('apply-absolute', args),
  applyOffset: (args) => ipcRenderer.invoke('apply-offset', args),
});
