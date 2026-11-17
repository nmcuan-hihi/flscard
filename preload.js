const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('flashcardAPI', {
  loadWords: () => ipcRenderer.invoke('words:load'),
  saveWords: data => ipcRenderer.invoke('words:save', data),
  importExcel: () => ipcRenderer.invoke('excel:import'),
  loadSettings: () => ipcRenderer.invoke('settings:load'),
  saveSettings: settings => ipcRenderer.invoke('settings:save', settings),
  translateText: (text, target = 'vi') => ipcRenderer.invoke('translate:google', text, target)
});
