const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = path.join(DATA_DIR, 'gestor-correo.db');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS cuentas (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario       TEXT NOT NULL UNIQUE,
    email         TEXT,
    creado_en     TEXT NOT NULL DEFAULT (datetime('now')),
    activo        INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS snapshots (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    cuenta_id       INTEGER NOT NULL REFERENCES cuentas(id) ON DELETE CASCADE,
    fecha           TEXT NOT NULL DEFAULT (datetime('now')),
    mb_usado        REAL NOT NULL,
    mb_cuota        REAL,
    mensajes_usado  INTEGER NOT NULL DEFAULT 0,
    mensajes_limite INTEGER,
    suspendida      INTEGER NOT NULL DEFAULT 0,
    porcentaje      REAL
  );

  CREATE INDEX IF NOT EXISTS idx_snapshots_cuenta_fecha ON snapshots(cuenta_id, fecha DESC);
  CREATE INDEX IF NOT EXISTS idx_snapshots_fecha ON snapshots(fecha DESC);

  CREATE TABLE IF NOT EXISTS settings (
    clave         TEXT PRIMARY KEY,
    valor         TEXT,
    actualizado_en TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS usuarios (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario        TEXT NOT NULL UNIQUE,
    password_hash  TEXT NOT NULL,
    creado_en      TEXT NOT NULL DEFAULT (datetime('now')),
    ultimo_login   TEXT
  );

  CREATE TABLE IF NOT EXISTS sync_log (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    fecha         TEXT NOT NULL DEFAULT (datetime('now')),
    origen        TEXT NOT NULL,
    exito         INTEGER NOT NULL,
    cuentas_total INTEGER,
    mensaje       TEXT
  );
`);

module.exports = db;
