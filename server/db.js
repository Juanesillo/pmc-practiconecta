const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');
const S = require('./seed');

const SCHEMA_VERSION = 2;

function hashPassword(pw) {
  const salt = crypto.randomBytes(16).toString('hex');
  return salt + ':' + crypto.scryptSync(pw, salt, 32).toString('hex');
}

function checkPassword(pw, stored) {
  const [salt, hash] = String(stored).split(':');
  if (!salt || !hash) return false;
  const got = crypto.scryptSync(pw, salt, 32);
  const want = Buffer.from(hash, 'hex');
  return got.length === want.length && crypto.timingSafeEqual(got, want);
}

function openDb(file) {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

  // Versión de esquema distinta: es un prototipo, se descartan los datos antiguos.
  if (db.prepare('PRAGMA user_version').get().user_version !== SCHEMA_VERSION) {
    db.exec('PRAGMA foreign_keys = OFF;');
    for (const t of db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all()) {
      db.exec(`DROP TABLE IF EXISTS "${t.name}"`);
    }
    db.exec('PRAGMA foreign_keys = ON;');
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('cliente','estudiante','docente')),
      initials TEXT, color TEXT, pass_hash TEXT NOT NULL,
      uni TEXT, career TEXT, semester INTEGER, hours INTEGER NOT NULL DEFAULT 0,
      supervisor_id TEXT REFERENCES users(id),
      rating_sum REAL NOT NULL DEFAULT 0, rating_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS verification (
      student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      step INTEGER NOT NULL, PRIMARY KEY (student_id, step)
    );
    CREATE TABLE IF NOT EXISTS services (
      id TEXT PRIMARY KEY, student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      category TEXT NOT NULL, title TEXT NOT NULL, price INTEGER NOT NULL,
      mode TEXT NOT NULL, zone TEXT, distance REAL NOT NULL DEFAULT 3,
      scope TEXT NOT NULL, days TEXT NOT NULL, times TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1, featured INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      service_id TEXT NOT NULL REFERENCES services(id), client_id TEXT NOT NULL REFERENCES users(id),
      accept_client INTEGER NOT NULL DEFAULT 0, accept_student INTEGER NOT NULL DEFAULT 0,
      slot TEXT, amount INTEGER, fee INTEGER,
      escrow TEXT NOT NULL DEFAULT 'none' CHECK (escrow IN ('none','held','released','dispute','refunded')),
      supervision INTEGER NOT NULL DEFAULT 0,
      rate_client INTEGER, comment_client TEXT, rate_student INTEGER, comment_student TEXT,
      dispute_reason TEXT, autoreply INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS bookings (
      service_id TEXT NOT NULL, slot TEXT NOT NULL, order_id INTEGER NOT NULL,
      PRIMARY KEY (service_id, slot)
    );
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT, order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      sender TEXT NOT NULL, text TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      kind TEXT NOT NULL, text TEXT NOT NULL, order_id INTEGER,
      read INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  db.exec(`PRAGMA user_version = ${SCHEMA_VERSION}`);
  return db;
}

// Deja la base en el estado inicial de la demo. Conserva las cuentas semilla (y sus sesiones).
function seedDemo(db) {
  const seedIds = [...S.DOCENTES, ...S.CLIENTES, ...S.ESTUDIANTES].map(u => u.id);
  const marks = seedIds.map(() => '?').join(',');
  db.exec('DELETE FROM messages; DELETE FROM notifications; DELETE FROM bookings; DELETE FROM orders; DELETE FROM verification; DELETE FROM services;');
  db.prepare(`DELETE FROM users WHERE id NOT IN (${marks})`).run(...seedIds);

  const pw = hashPassword(S.DEMO_PASSWORD);
  const upsert = db.prepare(`INSERT INTO users (id,email,name,role,initials,color,pass_hash,uni,career,semester,hours,supervisor_id,rating_sum,rating_count)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET email=excluded.email, name=excluded.name, role=excluded.role, initials=excluded.initials,
      color=excluded.color, pass_hash=excluded.pass_hash, uni=excluded.uni, career=excluded.career, semester=excluded.semester,
      hours=excluded.hours, supervisor_id=excluded.supervisor_id, rating_sum=excluded.rating_sum, rating_count=excluded.rating_count`);
  for (const d of S.DOCENTES) upsert.run(d.id, d.email, d.name, 'docente', d.initials, d.color, pw, d.uni, d.career, null, 0, null, 0, 0);
  for (const c of S.CLIENTES) upsert.run(c.id, c.email, c.name, 'cliente', c.initials, c.color, pw, null, null, null, 0, null, 0, 0);
  for (const e of S.ESTUDIANTES) {
    upsert.run(e.id, e.email, e.name, 'estudiante', e.initials, e.color, pw, e.uni, e.career, e.semester, e.hours, e.supervisorId,
      +(e.rating * e.reviews).toFixed(2), e.reviews);
  }

  const ver = db.prepare('INSERT INTO verification (student_id, step) VALUES (?,?)');
  S.ESTUDIANTES.filter(e => e.verified).forEach(e => [0, 1, 2, 3].forEach(i => ver.run(e.id, i)));

  const svc = db.prepare(`INSERT INTO services (id,student_id,category,title,price,mode,zone,distance,scope,days,times,featured)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`);
  S.SERVICES.forEach(s => svc.run(s.id, s.studentId, s.category, s.title, s.price, s.mode, s.zone, s.distance, s.scope, s.days, s.times, s.featured));
}

module.exports = { openDb, seedDemo, hashPassword, checkPassword };
