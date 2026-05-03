const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Notes
  getNote:        (ticketId)        => ipcRenderer.invoke('get-note', ticketId),
  saveNote:       (ticket)          => ipcRenderer.invoke('save-note', ticket),
  getAllNotes:     ()                => ipcRenderer.invoke('get-all-notes'),

  // Stats
  getStats:       ()                => ipcRenderer.invoke('get-stats'),
  getSeenIds:     ()                => ipcRenderer.invoke('get-seen-ids'),
  saveStat:       (dateKey, count)  => ipcRenderer.invoke('save-stat', dateKey, count),
  saveSeenIds:    (ids)             => ipcRenderer.invoke('save-seen-ids', ids),

  // Timer
  startTimer:     (ticketId)        => ipcRenderer.invoke('start-timer', ticketId),
  stopTimer:      (entryId, secs)   => ipcRenderer.invoke('stop-timer', entryId, secs),
  getTotalTime:   (ticketId)        => ipcRenderer.invoke('get-total-time', ticketId),
  getTimeEntries: (ticketId)        => ipcRenderer.invoke('get-time-entries', ticketId),
});
