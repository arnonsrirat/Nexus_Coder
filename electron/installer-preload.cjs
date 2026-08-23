const { contextBridge, ipcRenderer } = require('electron');

// Narrow, explicit surface for the setup window. The renderer never touches
// Node or the filesystem directly.
contextBridge.exposeInMainWorld('setup', {
  getInfo: () => ipcRenderer.invoke('setup:info'),
  browse: () => ipcRenderer.invoke('setup:browse'),
  install: (options) => ipcRenderer.invoke('setup:install', options),
  launch: (exePath) => ipcRenderer.invoke('setup:launch', exePath),
  uninstall: () => ipcRenderer.invoke('setup:uninstall'),
  openFolder: (dir) => ipcRenderer.invoke('setup:open-folder', dir),
  close: () => ipcRenderer.invoke('setup:close'),
  onProgress: (callback) => {
    const handler = (event, payload) => callback(payload);
    ipcRenderer.on('setup:progress', handler);
    return () => ipcRenderer.removeListener('setup:progress', handler);
  }
});
