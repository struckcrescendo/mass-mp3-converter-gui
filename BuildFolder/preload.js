const { contextBridge, ipcRenderer } = require('electron');

// Expose a limited set of IPC methods to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
    selectFolder: () => ipcRenderer.invoke('select-folder'),
    selectFile: () => ipcRenderer.invoke('select-file'),
    convertAudio: (args) => ipcRenderer.invoke('convert-audio', args),
    checkFFmpeg: () => ipcRenderer.invoke('check-ffmpeg')
});
