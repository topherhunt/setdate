const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('api', {
  pickFiles: () => ipcRenderer.invoke('pick-files'),
  scanFiles: (paths) => ipcRenderer.invoke('scan-files', paths),
  applyAbsolute: (args) => ipcRenderer.invoke('apply-absolute', args),
  applyOffset: (args) => ipcRenderer.invoke('apply-offset', args),
  getPathForFile: (file) => webUtils.getPathForFile(file),
});
