const { app, BrowserWindow, ipcMain } = require('electron');
const { join } = require('path');
const Database = require('better-sqlite3');

const dbPath = join(app.getPath('userData'), 'redmine.db');
const db = new Database(dbPath);

// ✅ WAL mode voorkomt database locks
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

  CREATE TABLE IF NOT EXISTS time_logs (
                                         id INTEGER PRIMARY KEY AUTOINCREMENT,
                                         ticketId INTEGER,
                                         startTime TEXT,
                                         endTime TEXT,
                                         durationSeconds INTEGER
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
  // ✅ better-sqlite3 is synchroon — geen Promise.resolve() nodig
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
    ticket.customer ?? '',
    ticket.title    ?? '',
    ticket.priority ?? '',
    ticket.createdAt ?? '',
    ticket.note     ?? '',
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
  // ✅ transaction voor bulk inserts — sneller en atomisch
  const tx = db.transaction((ids) => {
    for (const id of ids) insert.run(id);
  });
  tx(ids);
  return true;
});

ipcMain.handle('start-timer', (event, ticketId) => {
  const stmt = db.prepare(`
    INSERT INTO time_logs (ticketId, startTime)
    VALUES (?, datetime('now'))
  `);

  const result = stmt.run(ticketId);
  return result.lastInsertRowid;
});

ipcMain.handle('stop-timer', (event, logId) => {
  const log = db.prepare(`
    SELECT * FROM time_logs WHERE id = ?
  `).get(logId);

  const endTime = new Date().toISOString();

  const duration = Math.floor(
    (new Date(endTime) - new Date(log.startTime)) / 1000
  );

  db.prepare(`
    UPDATE time_logs
    SET endTime = ?, durationSeconds = ?
    WHERE id = ?
  `).run(endTime, duration, logId);

  return true;
});

ipcMain.handle('get-time-logs', (event, ticketId) => {
  return db.prepare(`
    SELECT * FROM time_logs
    WHERE ticketId = ?
    ORDER BY startTime DESC
  `).all(ticketId);
});
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
  mainWindow.webContents.openDevTools();
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
