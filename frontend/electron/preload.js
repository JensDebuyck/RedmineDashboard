const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getNote:     (ticketId)       => ipcRenderer.invoke('get-note', ticketId),
  saveNote:    (ticket)         => ipcRenderer.invoke('save-note', ticket),
  getAllNotes: ()               => ipcRenderer.invoke('get-all-notes'),
  getStats:   ()               => ipcRenderer.invoke('get-stats'),
  getSeenIds: ()               => ipcRenderer.invoke('get-seen-ids'),
  saveStat:   (dateKey, count) => ipcRenderer.invoke('save-stat', dateKey, count),
  saveSeenIds:(ids)            => ipcRenderer.invoke('save-seen-ids', ids),
  startTimer: (ticketId)       => ipcRenderer.invoke('start-timer', ticketId),
  stopTimer: (logId)            => ipcRenderer.invoke('stop-timer', logId),
  getTimeLogs: (ticketId)       => ipcRenderer.invoke('get-time-logs', ticketId),
});
