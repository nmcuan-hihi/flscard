const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('flashcardAPI', {
  loadWords: () => ipcRenderer.invoke('words:load'),
  saveWords: words => ipcRenderer.invoke('words:save', words),
  importExcel: () => ipcRenderer.invoke('excel:import')
});
