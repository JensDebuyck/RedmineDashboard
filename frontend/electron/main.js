const { app, BrowserWindow, ipcMain } = require('electron');
const { join } = require('path');
const Database = require('better-sqlite3');
const { spawn } = require('child_process');

const dbPath = join(app.getPath('userData'), 'redmine.db');
const db = new Database(dbPath);

let flaskProcess = null;
let isQuitting = false;

db.pragma('journal_mode = WAL');

// ─────────────────────────────
// TABLES
// ─────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS notes (
                                     ticketId  INTEGER PRIMARY KEY,
                                     customer  TEXT,
                                     title     TEXT,
                                     priority  TEXT,
                                     createdAt TEXT,
                                     note      TEXT,
                                     updatedAt TEXT
  );

  CREATE TABLE IF NOT EXISTS stats (
                                     dateKey TEXT PRIMARY KEY,
                                     count   INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS seen_ids (
                                        ticketId INTEGER PRIMARY KEY
  );

  CREATE TABLE IF NOT EXISTS time_entries (
                                            id              INTEGER PRIMARY KEY AUTOINCREMENT,
                                            ticketId        INTEGER NOT NULL,
                                            startedAt       TEXT NOT NULL,
                                            stoppedAt       TEXT,
                                            seconds         INTEGER DEFAULT 0
  );
`);

// ─────────────────────────────
// NOTES
// ─────────────────────────────
ipcMain.handle('get-note', (_, ticketId) => {
  const row = db.prepare('SELECT note FROM notes WHERE ticketId = ?').get(ticketId);
  return row?.note ?? '';
});

ipcMain.handle('save-note', (_, ticket) => {
  db.prepare(`
    INSERT INTO notes (ticketId, customer, title, priority, createdAt, note, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(ticketId) DO UPDATE SET
      customer  = excluded.customer,
                                 title     = excluded.title,
                                 priority  = excluded.priority,
                                 createdAt = excluded.createdAt,
                                 note      = excluded.note,
                                 updatedAt = excluded.updatedAt
  `).run(
    ticket.ticketId,
    ticket.customer  ?? '',
    ticket.title     ?? '',
    ticket.priority  ?? '',
    ticket.createdAt ?? '',
    ticket.note      ?? '',
    new Date().toISOString()
  );
  return true;
});

ipcMain.handle('get-all-notes', () => {
  return db.prepare(`
    SELECT ticketId, customer, title, priority, note, updatedAt
    FROM notes
    WHERE note IS NOT NULL AND note != ''
    ORDER BY updatedAt DESC
  `).all();
});

// ─────────────────────────────
// STATS
// ─────────────────────────────
ipcMain.handle('get-stats', () => {
  const rows = db.prepare('SELECT dateKey, count FROM stats').all();
  const result = {};
  for (const row of rows) result[row.dateKey] = row.count;
  return result;
});

ipcMain.handle('save-stat', (_, dateKey, count) => {
  db.prepare(`
    INSERT INTO stats (dateKey, count) VALUES (?, ?)
      ON CONFLICT(dateKey) DO UPDATE SET count = excluded.count
  `).run(dateKey, count);
  return true;
});

// ─────────────────────────────
// SEEN IDS
// ─────────────────────────────
ipcMain.handle('get-seen-ids', () => {
  return db.prepare('SELECT ticketId FROM seen_ids').all().map(r => r.ticketId);
});

ipcMain.handle('save-seen-ids', (_, ids) => {
  const insert = db.prepare('INSERT OR IGNORE INTO seen_ids (ticketId) VALUES (?)');
  const tx = db.transaction((ids) => {
    for (const id of ids) insert.run(id);
  });
  tx(ids);
  return true;
});

// ─────────────────────────────
// TIMER
// ─────────────────────────────
ipcMain.handle('start-timer', (_, ticketId) => {
  const result = db.prepare(`
    INSERT INTO time_entries (ticketId, startedAt)
    VALUES (?, ?)
  `).run(ticketId, new Date().toISOString());
  return result.lastInsertRowid;
});

ipcMain.handle('stop-timer', (_, entryId, seconds) => {
  db.prepare(`
    UPDATE time_entries
    SET stoppedAt = ?, seconds = ?
    WHERE id = ?
  `).run(new Date().toISOString(), seconds, entryId);
  return true;
});

ipcMain.handle('get-total-time', (_, ticketId) => {
  const row = db.prepare(`
    SELECT COALESCE(SUM(seconds), 0) as total
    FROM time_entries
    WHERE ticketId = ? AND stoppedAt IS NOT NULL
  `).get(ticketId);
  return row?.total ?? 0;
});

ipcMain.handle('get-time-entries', (_, ticketId) => {
  return db.prepare(`
    SELECT id, startedAt, stoppedAt, seconds
    FROM time_entries
    WHERE ticketId = ?
    ORDER BY startedAt DESC
  `).all(ticketId);
});

// ─────────────────────────────
// FLASK
// ─────────────────────────────
const FLASK_URL = 'http://127.0.0.1:5000'; // pas aan indien nodig

function startFlask() {
  if (flaskProcess) return;

  const isPackaged = app.isPackaged;
  const scriptPath = isPackaged
    ? join(process.resourcesPath, 'redmine_proxy.py')
    : join(__dirname, '..', 'redmine_proxy.py');

  flaskProcess = spawn('python', [scriptPath], {
    stdio: 'ignore',
    detached: false
  });

  flaskProcess.on('exit', () => {
    flaskProcess = null;
    if (!isQuitting) {
      setTimeout(startFlask, 1000);
    }
  });

  flaskProcess.on('error', (err) => {
    console.error('❌ Flask kon niet starten:', err.message);
  });
}

function waitForFlask(retries = 20, delayMs = 500) {
  return new Promise((resolve, reject) => {
    const http = require('http');

    function attempt(remaining) {
      http.get(FLASK_URL, (res) => {
        resolve(); // Flask reageert → klaar
      }).on('error', () => {
        if (remaining <= 0) return reject(new Error('Flask startte niet op tijd'));
        setTimeout(() => attempt(remaining - 1), delayMs);
      });
    }

    attempt(retries);
  });
}


// ─────────────────────────────
// WINDOW
// ─────────────────────────────
function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: join(__dirname, 'preload.js'),
    }
  });

  mainWindow.loadFile(join(__dirname, '../dist/frontend/browser/index.html'));
}

app.whenReady().then(async () => {
  startFlask();

  try {
    await waitForFlask();
  } catch (err) {
    console.error('⚠️ Flask niet bereikbaar, venster wordt toch geopend:', err.message);
  }

  createWindow();

  const { shell } = require('electron');
  ipcMain.handle('open-external', (_, url) => shell.openExternal(url));
});

app.on('activate', () => {
  ensureFlaskRunning();
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('window-all-closed', () => {
  isQuitting = true;
  if (flaskProcess) flaskProcess.kill();
  if (process.platform !== 'darwin') app.quit();
});
