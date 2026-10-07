const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const { USERS, SERVICES } = require('./seed');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data', 'pmc.db');
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
const db = new DatabaseSync(DB_PATH);

db.exec(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, role TEXT NOT NULL, initials TEXT, color TEXT
  );
  CREATE TABLE IF NOT EXISTS services (
    id TEXT PRIMARY KEY, student_id TEXT, student TEXT, initials TEXT, color TEXT,
    career TEXT, category TEXT, semester INTEGER, uni TEXT, title TEXT, price INTEGER,
    mode TEXT, distance REAL, rating REAL, reviews INTEGER, supervisor TEXT,
    featured INTEGER, scope TEXT, availability TEXT, hours INTEGER
  );
  CREATE TABLE IF NOT EXISTS verification (
    student_id TEXT NOT NULL, step INTEGER NOT NULL, PRIMARY KEY (student_id, step)
  );
  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    service_id TEXT NOT NULL, client_id TEXT NOT NULL,
    agreed INTEGER NOT NULL DEFAULT 0, slot TEXT,
    amount INTEGER, fee INTEGER,
    escrow TEXT NOT NULL DEFAULT 'none',           -- none | held | released | dispute
    supervision INTEGER NOT NULL DEFAULT 0,         -- pasos completados (0..3)
    rate_client INTEGER NOT NULL DEFAULT 0, rate_student INTEGER NOT NULL DEFAULT 0,
    rate_comment TEXT NOT NULL DEFAULT '', rated INTEGER NOT NULL DEFAULT 0,
    autoreply INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL, sender TEXT NOT NULL,   -- client | student | system
    text TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

function seed() {
  const insUser = db.prepare('INSERT OR REPLACE INTO users (id,name,role,initials,color) VALUES (?,?,?,?,?)');
  USERS.forEach(u => insUser.run(u.id, u.name, u.role, u.initials, u.color));

  const insSvc = db.prepare(`INSERT OR IGNORE INTO services
    (id,student_id,student,initials,color,career,category,semester,uni,title,price,mode,distance,rating,reviews,supervisor,featured,scope,availability,hours)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  SERVICES.forEach(s => insSvc.run(s.id, s.studentId, s.student, s.initials, s.color, s.career, s.category, s.semester,
    s.uni, s.title, s.price, s.mode, s.distance, s.rating, s.reviews, s.supervisor, s.featured, s.scope, s.availability, s.hours));
}

// Reinicia el estado de la demo (conserva usuarios y catálogo con su reputación inicial).
function resetDemo() {
  db.exec('DELETE FROM messages; DELETE FROM orders; DELETE FROM verification; DELETE FROM services;');
  seed();
}

seed();

module.exports = { db, resetDemo };
