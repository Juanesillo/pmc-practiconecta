const path = require('node:path');
const express = require('express');
const { db, resetDemo } = require('./db');
const { CHAT_SCRIPT, FEE_RATE } = require('./seed');

const PORT = process.env.PORT || 3000;
const SUPERVISION_STEPS = 3;
const VERIFICATION_STEPS = 4;
const app = express();
app.use(express.json({ limit: '10kb' }));

/* ---------- Helpers ---------- */

const serviceOut = s => ({
  id: s.id, studentId: s.student_id, student: s.student, initials: s.initials, color: s.color,
  career: s.career, category: s.category, semester: s.semester, uni: s.uni, title: s.title,
  price: s.price, mode: s.mode, distance: s.distance, rating: s.rating, reviews: s.reviews,
  supervisor: s.supervisor, featured: !!s.featured, scope: s.scope, availability: s.availability, hours: s.hours
});

function orderOut(o) {
  const messages = db.prepare('SELECT id, sender, text FROM messages WHERE order_id = ? ORDER BY id').all(o.id);
  return {
    id: o.id, serviceId: o.service_id, clientId: o.client_id,
    agreed: !!o.agreed, slot: o.slot, amount: o.amount, fee: o.fee,
    paid: o.escrow !== 'none', escrow: o.escrow,
    supervision: Array.from({ length: SUPERVISION_STEPS }, (_, i) => i < o.supervision),
    serviceDone: o.supervision >= SUPERVISION_STEPS,
    ratings: { client: o.rate_client, student: o.rate_student, comment: o.rate_comment },
    rated: !!o.rated, autoreply: !!o.autoreply, messages
  };
}

const getOrder = id => db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
const getUser = id => db.prepare('SELECT * FROM users WHERE id = ?').get(id);
const touch = id => db.prepare("UPDATE orders SET updated_at = datetime('now') WHERE id = ?").run(id);
const addMessage = (orderId, sender, text) =>
  db.prepare('INSERT INTO messages (order_id, sender, text) VALUES (?,?,?)').run(orderId, sender, text);

// Envuelve un handler que necesita una orden existente.
const withOrder = fn => (req, res) => {
  const o = getOrder(Number(req.params.id));
  if (!o) return res.status(404).json({ error: 'Orden no encontrada' });
  return fn(o, req, res);
};
const fail = (res, msg, code = 409) => res.status(code).json({ error: msg });

/* ---------- API ---------- */

app.get('/api/bootstrap', (req, res) => {
  const verif = {};
  for (const r of db.prepare('SELECT student_id, step FROM verification').all()) {
    (verif[r.student_id] ||= Array(VERIFICATION_STEPS).fill(false))[r.step] = true;
  }
  res.json({
    users: db.prepare('SELECT id, name, role, initials, color FROM users').all(),
    services: db.prepare('SELECT * FROM services ORDER BY featured DESC, id').all().map(serviceOut),
    verification: verif,
    feeRate: FEE_RATE
  });
});

app.post('/api/students/:id/verify/:step', (req, res) => {
  const step = Number(req.params.step);
  const isStudent = db.prepare('SELECT 1 FROM services WHERE student_id = ?').get(req.params.id);
  if (!isStudent) return fail(res, 'Estudiante no encontrado', 404);
  if (!Number.isInteger(step) || step < 0 || step >= VERIFICATION_STEPS) return fail(res, 'Paso inválido', 400);
  db.prepare('INSERT OR IGNORE INTO verification (student_id, step) VALUES (?,?)').run(req.params.id, step);
  res.json({ ok: true });
});

app.get('/api/orders', (req, res) => {
  const user = getUser(String(req.query.userId || ''));
  if (!user) return fail(res, 'Usuario inválido', 400);
  let rows;
  if (user.role === 'cliente') {
    rows = db.prepare('SELECT * FROM orders WHERE client_id = ? ORDER BY id DESC').all(user.id);
  } else if (user.role === 'estudiante') {
    rows = db.prepare(`SELECT o.* FROM orders o JOIN services s ON s.id = o.service_id
                       WHERE s.student_id = ? ORDER BY o.id DESC`).all(user.id);
  } else {
    rows = db.prepare('SELECT * FROM orders ORDER BY id DESC').all();
  }
  res.json(rows.map(orderOut));
});

// Crea la orden (o devuelve la abierta del mismo cliente y servicio).
app.post('/api/orders', (req, res) => {
  const { serviceId, clientId } = req.body || {};
  const client = getUser(clientId);
  if (!client || client.role !== 'cliente') return fail(res, 'Solo un cliente puede contactar un servicio', 400);
  if (!db.prepare('SELECT 1 FROM services WHERE id = ?').get(serviceId)) return fail(res, 'Servicio no encontrado', 404);
  let o = db.prepare("SELECT * FROM orders WHERE client_id = ? AND service_id = ? AND escrow != 'released' ORDER BY id DESC")
    .get(clientId, serviceId);
  if (!o) {
    const id = db.prepare('INSERT INTO orders (service_id, client_id) VALUES (?,?)').run(serviceId, clientId).lastInsertRowid;
    const s = db.prepare('SELECT student, title FROM services WHERE id = ?').get(serviceId);
    addMessage(id, 'student', `Hola ${client.name.split(' ')[0]}, soy ${s.student.split(' ')[0]}. Vi que te interesa “${s.title}”. ¿En qué te puedo ayudar?`);
    o = getOrder(id);
  }
  res.json(orderOut(o));
});

app.get('/api/orders/:id', withOrder((o, req, res) => res.json(orderOut(o))));

app.post('/api/orders/:id/messages', withOrder((o, req, res) => {
  const user = getUser(req.body?.userId);
  const text = String(req.body?.text || '').trim().slice(0, 200);
  if (!user || user.role === 'docente') return fail(res, 'Este usuario no puede escribir en el chat', 400);
  if (!text) return fail(res, 'Mensaje vacío', 400);
  const sender = user.role === 'cliente' ? 'client' : 'student';
  addMessage(o.id, sender, text);
  touch(o.id);
  // Modo demo en solitario: el estudiante responde con un guion si escribió el cliente.
  if (sender === 'client' && o.autoreply) {
    const n = db.prepare("SELECT COUNT(*) AS n FROM messages WHERE order_id = ? AND sender = 'client'").get(o.id).n;
    setTimeout(() => {
      try { addMessage(o.id, 'student', CHAT_SCRIPT[Math.min(n - 1, CHAT_SCRIPT.length - 1)]); } catch (e) { /* demo reiniciada */ }
    }, 800);
  }
  res.json(orderOut(getOrder(o.id)));
}));

app.post('/api/orders/:id/autoreply', withOrder((o, req, res) => {
  db.prepare('UPDATE orders SET autoreply = ? WHERE id = ?').run(req.body?.on ? 1 : 0, o.id);
  res.json(orderOut(getOrder(o.id)));
}));

app.post('/api/orders/:id/agree', withOrder((o, req, res) => {
  if (o.agreed) return res.json(orderOut(o));
  const clientMsgs = db.prepare("SELECT COUNT(*) AS n FROM messages WHERE order_id = ? AND sender = 'client'").get(o.id).n;
  if (!clientMsgs) return fail(res, 'Escribe al menos un mensaje antes de acordar');
  const s = db.prepare('SELECT title, price, supervisor FROM services WHERE id = ?').get(o.service_id);
  db.prepare('UPDATE orders SET agreed = 1 WHERE id = ?').run(o.id);
  addMessage(o.id, 'system', `${s.title} · $${s.price.toLocaleString('es-CO')} · supervisa ${s.supervisor}.`);
  touch(o.id);
  res.json(orderOut(getOrder(o.id)));
}));

// Agenda y retiene el pago (escrow simulado: solo cambia un estado).
app.post('/api/orders/:id/book', withOrder((o, req, res) => {
  const slot = String(req.body?.slot || '').slice(0, 20);
  if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(slot)) return fail(res, 'Horario inválido', 400);
  if (o.escrow !== 'none') return fail(res, 'La cita ya está confirmada');
  const price = db.prepare('SELECT price FROM services WHERE id = ?').get(o.service_id).price;
  const fee = Math.round(price * FEE_RATE);
  db.prepare("UPDATE orders SET slot = ?, amount = ?, fee = ?, escrow = 'held', agreed = 1 WHERE id = ?")
    .run(slot, price + fee, fee, o.id);
  touch(o.id);
  res.json(orderOut(getOrder(o.id)));
}));

app.post('/api/orders/:id/supervision/advance', withOrder((o, req, res) => {
  if (o.supervision >= SUPERVISION_STEPS) return res.json(orderOut(o));
  db.prepare('UPDATE orders SET supervision = supervision + 1 WHERE id = ?').run(o.id);
  touch(o.id);
  res.json(orderOut(getOrder(o.id)));
}));

app.post('/api/orders/:id/rate', withOrder((o, req, res) => {
  const c = Number(req.body?.client), s = Number(req.body?.student);
  const comment = String(req.body?.comment || '').slice(0, 160);
  if (o.supervision < SUPERVISION_STEPS) return fail(res, 'El docente aún no cierra el servicio');
  if (o.rated) return fail(res, 'Ya se calificó este servicio');
  if (![c, s].every(v => Number.isInteger(v) && v >= 1 && v <= 5)) return fail(res, 'Calificación inválida', 400);
  db.prepare('UPDATE orders SET rate_client = ?, rate_student = ?, rate_comment = ?, rated = 1 WHERE id = ?').run(c, s, comment, o.id);
  // La reputación del estudiante se actualiza con la calificación del cliente.
  db.prepare('UPDATE services SET rating = ROUND((rating * reviews + ?) / (reviews + 1), 2), reviews = reviews + 1 WHERE id = ?')
    .run(c, o.service_id);
  touch(o.id);
  res.json(orderOut(getOrder(o.id)));
}));

app.post('/api/orders/:id/release', withOrder((o, req, res) => {
  if (o.escrow !== 'held') return fail(res, 'No hay un pago retenido para liberar');
  if (o.supervision < SUPERVISION_STEPS) return fail(res, 'El docente debe cerrar el servicio primero');
  db.prepare("UPDATE orders SET escrow = 'released' WHERE id = ?").run(o.id);
  touch(o.id);
  res.json(orderOut(getOrder(o.id)));
}));

app.post('/api/orders/:id/dispute', withOrder((o, req, res) => {
  if (o.escrow !== 'held') return fail(res, 'Solo se puede reportar un pago retenido');
  db.prepare("UPDATE orders SET escrow = 'dispute' WHERE id = ?").run(o.id);
  touch(o.id);
  res.json(orderOut(getOrder(o.id)));
}));

app.post('/api/reset', (req, res) => { resetDemo(); res.json({ ok: true }); });

app.use('/api', (req, res) => res.status(404).json({ error: 'No encontrado' }));

/* ---------- Estáticos ---------- */
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Error interno' });
});

app.listen(PORT, () => console.log(`PractiConecta escuchando en http://localhost:${PORT}`));
