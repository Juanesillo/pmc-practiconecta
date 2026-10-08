const crypto = require('node:crypto');
const path = require('node:path');
const express = require('express');
const { openDb, seedDemo, hashPassword, checkPassword } = require('./db');
const S = require('./seed');

const SESSION_DAYS = 7;
const SUPERVISION_STEPS = 3;
const VERIFICATION_STEPS = 4;
const CATEGORIES = ['salud', 'legal', 'psico', 'ingenieria'];
const COLORS = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#14b8a6', '#ef4444'];
const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

const sha = s => crypto.createHash('sha256').update(s).digest('hex');
const round2 = n => Math.round(n * 100) / 100;
const money = n => '$' + Number(n).toLocaleString('es-CO');
const initialsOf = name => name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
const isTime = t => /^([01]\d|2[0-3]):[0-5]\d$/.test(t);

function dayLabel(days) {
  const d = days.split(',').map(Number).sort((a, b) => a - b);
  if (d.length === 7) return 'Todos los días';
  const ordered = d.map(x => (x === 0 ? 7 : x));
  const consecutive = ordered.every((x, i) => i === 0 || x === ordered[i - 1] + 1);
  if (d.length > 2 && consecutive) return `${DAY_NAMES[d[0]]}–${DAY_NAMES[d[d.length - 1]]}`;
  return d.map(x => DAY_NAMES[x]).join(', ');
}

function createApp({ dbFile = ':memory:', demo = true } = {}) {
  const db = openDb(dbFile);
  if (!db.prepare('SELECT 1 FROM users LIMIT 1').get()) seedDemo(db);

  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 'loopback');

  /* ---------- Seguridad básica ---------- */
  app.use((req, res, next) => {
    res.set({
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'same-origin',
      'Content-Security-Policy': "default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'"
    });
    next();
  });
  // Las peticiones que modifican datos solo se aceptan desde nuestro propio origen.
  app.use('/api', (req, res, next) => {
    const origin = req.get('origin');
    if (req.method !== 'GET' && origin) {
      try { if (new URL(origin).host !== req.get('host')) return res.status(403).json({ error: 'Origen no permitido' }); }
      catch (e) { return res.status(403).json({ error: 'Origen no permitido' }); }
    }
    next();
  });
  app.use(express.json({ limit: '10kb' }));

  /* ---------- Sesiones ---------- */
  const readCookie = (req, name) => {
    const m = (req.headers.cookie || '').split(';').map(s => s.trim()).find(s => s.startsWith(name + '='));
    return m ? decodeURIComponent(m.slice(name.length + 1)) : null;
  };

  function startSession(req, res, userId) {
    const token = crypto.randomBytes(32).toString('hex');
    db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?,?,?)')
      .run(sha(token), userId, Math.floor(Date.now() / 1000) + SESSION_DAYS * 86400);
    res.cookie('pmc_session', token, { httpOnly: true, sameSite: 'lax', secure: req.secure, maxAge: SESSION_DAYS * 86400 * 1000, path: '/' });
  }

  app.use((req, res, next) => {
    const token = readCookie(req, 'pmc_session');
    if (token) {
      const row = db.prepare(`SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
                              WHERE s.token_hash = ? AND s.expires_at > ?`).get(sha(token), Math.floor(Date.now() / 1000));
      if (row) req.user = row;
    }
    next();
  });

  const needAuth = (req, res, next) => (req.user ? next() : res.status(401).json({ error: 'Debes iniciar sesión' }));
  const needRole = (...roles) => (req, res, next) =>
    (roles.includes(req.user.role) ? next() : res.status(403).json({ error: `Acción solo para: ${roles.join(', ')}` }));
  const fail = (res, msg, code = 409) => res.status(code).json({ error: msg });

  /* ---------- Tiempo real (SSE) ---------- */
  const clients = new Set();
  const broadcast = () => clients.forEach(r => r.write('event: change\ndata: {}\n\n'));
  app.use('/api', (req, res, next) => {
    if (req.method !== 'GET') res.on('finish', () => { if (res.statusCode < 400) broadcast(); });
    next();
  });
  app.get('/api/events', needAuth, (req, res) => {
    res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
    res.write('retry: 3000\n\n');
    clients.add(res);
    const beat = setInterval(() => res.write(': ping\n\n'), 25000);
    req.on('close', () => { clearInterval(beat); clients.delete(res); });
  });

  /* ---------- Consultas y serializadores ---------- */
  const getUser = id => db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  const verifOf = id => {
    const v = Array(VERIFICATION_STEPS).fill(false);
    db.prepare('SELECT step FROM verification WHERE student_id = ?').all(id).forEach(r => { v[r.step] = true; });
    return v;
  };
  const rating = u => (u.rating_count ? round2(u.rating_sum / u.rating_count) : null);
  const userCard = u => ({ id: u.id, name: u.name, initials: u.initials, color: u.color, role: u.role, rating: rating(u), reviews: u.rating_count });

  const SERVICE_SQL = `SELECT s.*, u.name AS student, u.initials, u.color, u.career, u.semester, u.uni, u.hours,
      u.rating_sum, u.rating_count, u.supervisor_id, d.name AS supervisor,
      (SELECT COUNT(*) FROM verification v WHERE v.student_id = u.id) AS vcount
    FROM services s JOIN users u ON u.id = s.student_id LEFT JOIN users d ON d.id = u.supervisor_id`;
  const getService = id => db.prepare(SERVICE_SQL + ' WHERE s.id = ?').get(id);

  const serviceOut = s => ({
    id: s.id, studentId: s.student_id, student: s.student, initials: s.initials, color: s.color,
    career: s.career, semester: s.semester, uni: s.uni, hours: s.hours,
    category: s.category, title: s.title, price: s.price, mode: s.mode, zone: s.zone, distance: s.distance,
    scope: s.scope, days: s.days.split(',').map(Number), times: s.times.split(','), availability: `${dayLabel(s.days)} · ${s.times.split(',')[0]}–${s.times.split(',').slice(-1)[0]}`,
    active: !!s.active, featured: !!s.featured, verified: s.vcount === VERIFICATION_STEPS,
    rating: s.rating_count ? round2(s.rating_sum / s.rating_count) : null, reviews: s.rating_count,
    supervisorId: s.supervisor_id, supervisor: s.supervisor
  });

  const canSee = (user, o, svc) =>
    user.role === 'cliente' ? o.client_id === user.id
      : user.role === 'estudiante' ? svc.student_id === user.id
        : svc.supervisor_id === user.id;

  function orderOut(o) {
    const svc = getService(o.service_id);
    const client = getUser(o.client_id);
    const student = getUser(svc.student_id);
    const messages = db.prepare('SELECT id, sender, text, created_at AS at FROM messages WHERE order_id = ? ORDER BY id').all(o.id);
    return {
      id: o.id, serviceId: o.service_id, service: serviceOut(svc),
      client: userCard(client), student: userCard(student),
      acceptClient: !!o.accept_client, acceptStudent: !!o.accept_student, agreed: !!(o.accept_client && o.accept_student),
      slot: o.slot, amount: o.amount, fee: o.fee, paid: o.escrow !== 'none', escrow: o.escrow,
      supervision: Array.from({ length: SUPERVISION_STEPS }, (_, i) => i < o.supervision),
      serviceDone: o.supervision >= SUPERVISION_STEPS,
      ratingByClient: o.rate_client ? { value: o.rate_client, comment: o.comment_client || '' } : null,
      ratingByStudent: o.rate_student ? { value: o.rate_student, comment: o.comment_student || '' } : null,
      disputeReason: o.dispute_reason, autoreply: !!o.autoreply, messages, updatedAt: o.updated_at
    };
  }

  const touch = id => db.prepare("UPDATE orders SET updated_at = datetime('now') WHERE id = ?").run(id);
  const addMessage = (orderId, sender, text) => db.prepare('INSERT INTO messages (order_id, sender, text) VALUES (?,?,?)').run(orderId, sender, text);
  function notify(userId, kind, text, orderId = null) {
    if (!userId) return;
    if (kind === 'msg' && db.prepare('SELECT 1 FROM notifications WHERE user_id = ? AND order_id = ? AND kind = ? AND read = 0').get(userId, orderId, 'msg')) return;
    db.prepare('INSERT INTO notifications (user_id, kind, text, order_id) VALUES (?,?,?,?)').run(userId, kind, text, orderId);
  }

  // Horarios de los próximos 14 días según la disponibilidad del servicio, sin los ya reservados.
  function slotsFor(svc) {
    const days = svc.days.split(',').map(Number);
    const times = svc.times.split(',');
    const booked = new Set(db.prepare('SELECT slot FROM bookings WHERE service_id = ?').all(svc.id).map(r => r.slot));
    const out = [];
    const d = new Date();
    for (let i = 0; i < 14; i++, d.setDate(d.getDate() + 1)) {
      if (!days.includes(d.getDay())) continue;
      const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const list = times
        .filter(t => new Date(`${date}T${t}:00`) > new Date())
        .map(t => ({ time: t, free: !booked.has(`${date} ${t}`) }));
      if (list.length) out.push({ date, times: list });
    }
    return out;
  }

  /* ---------- Autenticación ---------- */
  const attempts = new Map();
  const tooMany = key => {
    const now = Date.now();
    const list = (attempts.get(key) || []).filter(t => now - t < 10 * 60 * 1000);
    attempts.set(key, list);
    return list.length >= 10;
  };

  app.get('/api/public/info', (req, res) => {
    res.json({
      demo,
      docentes: db.prepare("SELECT id, name, career, uni FROM users WHERE role = 'docente' ORDER BY name").all(),
      demoAccounts: demo ? db.prepare(`SELECT id, name, role FROM users WHERE id IN (${[...S.CLIENTES, ...S.ESTUDIANTES, ...S.DOCENTES].map(() => '?').join(',')})
        ORDER BY CASE role WHEN 'cliente' THEN 0 WHEN 'estudiante' THEN 1 ELSE 2 END, name`).all(...[...S.CLIENTES, ...S.ESTUDIANTES, ...S.DOCENTES].map(u => u.id)) : [],
      demoPassword: demo ? S.DEMO_PASSWORD : undefined
    });
  });

  app.post('/api/auth/register', (req, res) => {
    const b = req.body || {};
    const name = String(b.name || '').trim();
    const email = String(b.email || '').trim().toLowerCase();
    const password = String(b.password || '');
    const role = b.role;
    if (name.length < 2 || name.length > 60) return fail(res, 'Escribe tu nombre (2 a 60 caracteres)', 400);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 80) return fail(res, 'Correo inválido', 400);
    if (password.length < 8 || password.length > 100) return fail(res, 'La contraseña debe tener al menos 8 caracteres', 400);
    if (!['cliente', 'estudiante'].includes(role)) return fail(res, 'Rol inválido', 400);
    if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(email)) return fail(res, 'Ese correo ya está registrado');

    let extra = { uni: null, career: null, semester: null, supervisor: null };
    if (role === 'estudiante') {
      const sup = db.prepare("SELECT id FROM users WHERE id = ? AND role = 'docente'").get(b.supervisorId);
      const career = String(b.career || '').trim();
      const semester = Number(b.semester);
      if (!sup) return fail(res, 'Elige un docente supervisor', 400);
      if (career.length < 3 || career.length > 60) return fail(res, 'Indica tu carrera', 400);
      if (!Number.isInteger(semester) || semester < 1 || semester > 14) return fail(res, 'Semestre inválido', 400);
      extra = { uni: String(b.uni || 'Universidad Demo').trim().slice(0, 60), career, semester, supervisor: sup.id };
    }
    const id = 'u-' + crypto.randomBytes(5).toString('hex');
    db.prepare(`INSERT INTO users (id,email,name,role,initials,color,pass_hash,uni,career,semester,supervisor_id) VALUES (?,?,?,?,?,?,?,?,?,?,?)`)
      .run(id, email, name, role, initialsOf(name), COLORS[crypto.randomInt(COLORS.length)], hashPassword(password), extra.uni, extra.career, extra.semester, extra.supervisor);
    if (extra.supervisor) notify(extra.supervisor, 'verif', `${name} se registró y solicita tu aval como supervisor.`);
    startSession(req, res, id);
    res.status(201).json({ ok: true });
  });

  app.post('/api/auth/login', (req, res) => {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const key = `${req.ip}|${email}`;
    if (tooMany(key)) return fail(res, 'Demasiados intentos. Espera unos minutos.', 429);
    const u = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!u || !checkPassword(String(req.body?.password || ''), u.pass_hash)) {
      attempts.get(key).push(Date.now());
      return fail(res, 'Correo o contraseña incorrectos', 401);
    }
    startSession(req, res, u.id);
    res.json({ ok: true });
  });

  // Solo modo demo: entrar a una cuenta semilla sin contraseña (atajo para presentar).
  app.post('/api/auth/switch', (req, res) => {
    if (!demo) return fail(res, 'No disponible', 404);
    const ids = [...S.CLIENTES, ...S.ESTUDIANTES, ...S.DOCENTES].map(u => u.id);
    if (!ids.includes(req.body?.userId)) return fail(res, 'Cuenta no disponible', 400);
    const old = readCookie(req, 'pmc_session');
    if (old) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(sha(old));
    startSession(req, res, req.body.userId);
    res.json({ ok: true });
  });

  app.post('/api/auth/logout', (req, res) => {
    const token = readCookie(req, 'pmc_session');
    if (token) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(sha(token));
    res.clearCookie('pmc_session', { path: '/' });
    res.json({ ok: true });
  });

  /* ---------- Datos de la app ---------- */
  app.get('/api/bootstrap', needAuth, (req, res) => {
    const u = req.user;
    const services = db.prepare(SERVICE_SQL + ' WHERE s.active = 1 ORDER BY s.featured DESC, s.id').all()
      .map(serviceOut).filter(s => s.verified);
    const out = {
      me: { ...userCard(u), email: u.email, career: u.career, semester: u.semester, uni: u.uni, hours: u.hours, supervisorId: u.supervisor_id },
      services, feeRate: S.FEE_RATE, demo,
      notifications: db.prepare('SELECT id, kind, text, order_id AS orderId, read, created_at AS at FROM notifications WHERE user_id = ? ORDER BY id DESC LIMIT 30').all(u.id),
      docentes: db.prepare("SELECT id, name FROM users WHERE role = 'docente' ORDER BY name").all()
    };
    if (u.role === 'estudiante') {
      out.me.verification = verifOf(u.id);
      out.me.supervisor = u.supervisor_id ? getUser(u.supervisor_id).name : null;
      out.myServices = db.prepare(SERVICE_SQL + ' WHERE s.student_id = ? ORDER BY s.created_at DESC, s.id').all(u.id).map(serviceOut);
    }
    if (u.role === 'docente') {
      out.myStudents = db.prepare("SELECT * FROM users WHERE role = 'estudiante' AND supervisor_id = ? ORDER BY name").all(u.id).map(st => ({
        ...userCard(st), career: st.career, semester: st.semester, uni: st.uni, hours: st.hours, verification: verifOf(st.id),
        services: db.prepare('SELECT COUNT(*) AS n FROM services WHERE student_id = ?').get(st.id).n
      }));
    }
    res.json(out);
  });

  app.post('/api/notifications/read', needAuth, (req, res) => {
    db.prepare('UPDATE notifications SET read = 1 WHERE user_id = ?').run(req.user.id);
    res.json({ ok: true });
  });

  /* ---------- Verificación ---------- */
  app.post('/api/verification/:step', needAuth, needRole('estudiante'), (req, res) => {
    const step = Number(req.params.step);
    if (![0, 1, 2].includes(step)) return fail(res, 'Ese paso lo valida el docente supervisor', 400);
    db.prepare('INSERT OR IGNORE INTO verification (student_id, step) VALUES (?,?)').run(req.user.id, step);
    if (verifOf(req.user.id).slice(0, 3).every(Boolean) && req.user.supervisor_id) {
      notify(req.user.supervisor_id, 'verif', `${req.user.name} completó su verificación y espera tu aval.`);
    }
    res.json({ ok: true });
  });

  app.post('/api/students/:id/endorse', needAuth, needRole('docente'), (req, res) => {
    const st = getUser(req.params.id);
    if (!st || st.role !== 'estudiante' || st.supervisor_id !== req.user.id) return fail(res, 'Ese estudiante no está a tu cargo', 403);
    if (!verifOf(st.id).slice(0, 3).every(Boolean)) return fail(res, 'El estudiante aún no completa su verificación');
    db.prepare('INSERT OR IGNORE INTO verification (student_id, step) VALUES (?,3)').run(st.id);
    notify(st.id, 'verif', `${req.user.name} avaló tu perfil. ¡Ya puedes publicar servicios!`);
    res.json({ ok: true });
  });

  /* ---------- Servicios ---------- */
  function parseService(b) {
    const title = String(b.title || '').trim();
    const scope = String(b.scope || '').trim();
    const price = Number(b.price);
    const zone = String(b.zone || '').trim().slice(0, 80);
    const days = [...new Set((Array.isArray(b.days) ? b.days : []).map(Number))].filter(d => Number.isInteger(d) && d >= 0 && d <= 6).sort();
    const times = [...new Set(Array.isArray(b.times) ? b.times.map(String) : [])].filter(isTime).sort();
    if (title.length < 3 || title.length > 80) return { error: 'El título debe tener entre 3 y 80 caracteres' };
    if (scope.length < 10 || scope.length > 300) return { error: 'Describe el alcance (10 a 300 caracteres)' };
    if (!Number.isInteger(price) || price < 5000 || price > 500000) return { error: 'El precio debe estar entre $5.000 y $500.000' };
    if (!CATEGORIES.includes(b.category)) return { error: 'Categoría inválida' };
    if (!['presencial', 'virtual'].includes(b.mode)) return { error: 'Modalidad inválida' };
    if (!days.length) return { error: 'Elige al menos un día disponible' };
    if (!times.length || times.length > 8) return { error: 'Indica entre 1 y 8 horarios (HH:MM)' };
    return { value: { title, scope, price, zone, category: b.category, mode: b.mode, days: days.join(','), times: times.join(',') } };
  }

  app.post('/api/services', needAuth, needRole('estudiante'), (req, res) => {
    if (!verifOf(req.user.id).every(Boolean)) return fail(res, 'Tu perfil debe estar verificado y avalado para publicar');
    const p = parseService(req.body || {});
    if (p.error) return fail(res, p.error, 400);
    const v = p.value;
    const id = 's-' + crypto.randomBytes(4).toString('hex');
    db.prepare(`INSERT INTO services (id,student_id,category,title,price,mode,zone,distance,scope,days,times) VALUES (?,?,?,?,?,?,?,?,?,?,?)`)
      .run(id, req.user.id, v.category, v.title, v.price, v.mode, v.zone || (v.mode === 'virtual' ? 'Videollamada' : 'Por definir'), v.mode === 'virtual' ? 0 : 3, v.scope, v.days, v.times);
    res.status(201).json(serviceOut(getService(id)));
  });

  app.patch('/api/services/:id', needAuth, needRole('estudiante'), (req, res) => {
    const s = getService(req.params.id);
    if (!s || s.student_id !== req.user.id) return fail(res, 'Servicio no encontrado', 404);
    if (Object.keys(req.body || {}).length === 1 && 'active' in req.body) {
      db.prepare('UPDATE services SET active = ? WHERE id = ?').run(req.body.active ? 1 : 0, s.id);
      return res.json(serviceOut(getService(s.id)));
    }
    const p = parseService({ ...serviceOut(s), ...req.body });
    if (p.error) return fail(res, p.error, 400);
    const v = p.value;
    db.prepare('UPDATE services SET category=?, title=?, price=?, mode=?, zone=?, scope=?, days=?, times=? WHERE id=?')
      .run(v.category, v.title, v.price, v.mode, v.zone, v.scope, v.days, v.times, s.id);
    res.json(serviceOut(getService(s.id)));
  });

  app.get('/api/services/:id/slots', needAuth, (req, res) => {
    const s = getService(req.params.id);
    if (!s) return fail(res, 'Servicio no encontrado', 404);
    res.json(slotsFor(s));
  });

  /* ---------- Órdenes ---------- */
  app.get('/api/orders', needAuth, (req, res) => {
    const rows = db.prepare('SELECT * FROM orders ORDER BY id DESC').all()
      .filter(o => canSee(req.user, o, getService(o.service_id)));
    res.json(rows.map(orderOut));
  });

  app.post('/api/orders', needAuth, needRole('cliente'), (req, res) => {
    const svc = getService(String(req.body?.serviceId || ''));
    if (!svc || !svc.active || svc.vcount !== VERIFICATION_STEPS) return fail(res, 'Servicio no disponible', 404);
    let o = db.prepare("SELECT * FROM orders WHERE client_id = ? AND service_id = ? AND escrow IN ('none','held','dispute') ORDER BY id DESC").get(req.user.id, svc.id);
    if (!o) {
      const id = db.prepare('INSERT INTO orders (service_id, client_id) VALUES (?,?)').run(svc.id, req.user.id).lastInsertRowid;
      addMessage(id, 'student', `Hola ${req.user.name.split(' ')[0]}, soy ${svc.student.split(' ')[0]}. Vi que te interesa “${svc.title}”. ¿En qué te puedo ayudar?`);
      notify(svc.student_id, 'order', `${req.user.name} quiere contratar “${svc.title}”.`, id);
      o = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
    }
    res.json(orderOut(o));
  });

  // Carga la orden y comprueba que el usuario pueda verla.
  const withOrder = fn => (req, res) => {
    const o = db.prepare('SELECT * FROM orders WHERE id = ?').get(Number(req.params.id));
    if (!o) return fail(res, 'Orden no encontrada', 404);
    const svc = getService(o.service_id);
    if (!canSee(req.user, o, svc)) return fail(res, 'No tienes acceso a esta orden', 403);
    return fn(o, svc, req, res);
  };
  const reply = (res, id) => res.json(orderOut(db.prepare('SELECT * FROM orders WHERE id = ?').get(id)));
  const other = (o, svc, user) => (user.id === o.client_id ? svc.student_id : o.client_id);

  app.get('/api/orders/:id', needAuth, withOrder((o, svc, req, res) => res.json(orderOut(o))));

  app.post('/api/orders/:id/messages', needAuth, needRole('cliente', 'estudiante'), withOrder((o, svc, req, res) => {
    const text = String(req.body?.text || '').trim().slice(0, 200);
    if (!text) return fail(res, 'Mensaje vacío', 400);
    const sender = req.user.role === 'cliente' ? 'client' : 'student';
    addMessage(o.id, sender, text);
    touch(o.id);
    notify(other(o, svc, req.user), 'msg', `Nuevo mensaje de ${req.user.name} en “${svc.title}”.`, o.id);
    if (sender === 'client' && o.autoreply) {
      const n = db.prepare("SELECT COUNT(*) AS n FROM messages WHERE order_id = ? AND sender = 'client'").get(o.id).n;
      setTimeout(() => {
        try { addMessage(o.id, 'student', S.CHAT_SCRIPT[Math.min(n - 1, S.CHAT_SCRIPT.length - 1)]); broadcast(); } catch (e) { /* demo reiniciada */ }
      }, 800);
    }
    reply(res, o.id);
  }));

  app.post('/api/orders/:id/autoreply', needAuth, needRole('cliente'), withOrder((o, svc, req, res) => {
    db.prepare('UPDATE orders SET autoreply = ? WHERE id = ?').run(req.body?.on ? 1 : 0, o.id);
    reply(res, o.id);
  }));

  // Ambas partes deben aceptar las condiciones antes de agendar.
  app.post('/api/orders/:id/accept', needAuth, needRole('cliente', 'estudiante'), withOrder((o, svc, req, res) => {
    if (o.escrow !== 'none') return fail(res, 'La cita ya está confirmada');
    const col = req.user.role === 'cliente' ? 'accept_client' : 'accept_student';
    db.prepare(`UPDATE orders SET ${col} = 1 WHERE id = ?`).run(o.id);
    if (req.user.role === 'cliente' && o.autoreply) db.prepare('UPDATE orders SET accept_student = 1 WHERE id = ?').run(o.id);
    const fresh = db.prepare('SELECT * FROM orders WHERE id = ?').get(o.id);
    if (fresh.accept_client && fresh.accept_student && !(o.accept_client && o.accept_student)) {
      addMessage(o.id, 'system', `${svc.title} · ${money(svc.price)} · supervisa ${svc.supervisor}.`);
      notify(o.client_id, 'order', `Condiciones acordadas para “${svc.title}”. Ya puedes agendar.`, o.id);
      notify(svc.student_id, 'order', `Condiciones acordadas con ${getUser(o.client_id).name}.`, o.id);
    } else if (req.user.role === 'estudiante') {
      notify(o.client_id, 'order', `${req.user.name} aceptó las condiciones de “${svc.title}”.`, o.id);
    }
    touch(o.id);
    reply(res, o.id);
  }));

  // Agenda un horario libre y deja el pago retenido (escrow simulado).
  app.post('/api/orders/:id/book', needAuth, needRole('cliente'), withOrder((o, svc, req, res) => {
    const slot = String(req.body?.slot || '');
    if (!o.accept_client || !o.accept_student) return fail(res, 'Primero deben aceptar las condiciones ambas partes');
    if (o.escrow !== 'none') return fail(res, 'La cita ya está confirmada');
    const [date, time] = slot.split(' ');
    const free = slotsFor(svc).find(d => d.date === date)?.times.find(t => t.time === time)?.free;
    if (!free) return fail(res, 'Ese horario ya no está disponible');
    const fee = Math.round(svc.price * S.FEE_RATE);
    try {
      db.prepare('INSERT INTO bookings (service_id, slot, order_id) VALUES (?,?,?)').run(svc.id, slot, o.id);
    } catch (e) { return fail(res, 'Ese horario acaba de ser reservado'); }
    db.prepare("UPDATE orders SET slot = ?, amount = ?, fee = ?, escrow = 'held' WHERE id = ?").run(slot, svc.price + fee, fee, o.id);
    addMessage(o.id, 'system', `Cita agendada para ${slot}. Pago de ${money(svc.price + fee)} retenido por la plataforma.`);
    notify(svc.student_id, 'order', `${req.user.name} agendó “${svc.title}” el ${slot}. Pago retenido.`, o.id);
    notify(svc.supervisor_id, 'order', `Nueva práctica a supervisar: ${svc.student} · “${svc.title}” el ${slot}.`, o.id);
    notify(o.client_id, 'order', `Recordatorio programado: te avisaremos antes de tu cita del ${slot}.`, o.id);
    touch(o.id);
    reply(res, o.id);
  }));

  app.post('/api/orders/:id/cancel', needAuth, needRole('cliente'), withOrder((o, svc, req, res) => {
    if (o.escrow !== 'held' || o.supervision > 0) return fail(res, 'Solo se puede cancelar antes de iniciar la supervisión');
    db.prepare("UPDATE orders SET escrow = 'refunded' WHERE id = ?").run(o.id);
    db.prepare('DELETE FROM bookings WHERE order_id = ?').run(o.id);
    notify(svc.student_id, 'order', `${req.user.name} canceló la cita de “${svc.title}”. Se reembolsó el pago.`, o.id);
    notify(svc.supervisor_id, 'order', `Cita cancelada: ${svc.student} · “${svc.title}”.`, o.id);
    touch(o.id);
    reply(res, o.id);
  }));

  app.post('/api/orders/:id/supervision/advance', needAuth, needRole('docente'), withOrder((o, svc, req, res) => {
    if (o.escrow !== 'held') return fail(res, 'La cita debe estar confirmada con el pago retenido');
    if (o.supervision >= SUPERVISION_STEPS) return reply(res, o.id);
    db.prepare('UPDATE orders SET supervision = supervision + 1 WHERE id = ?').run(o.id);
    const done = o.supervision + 1 >= SUPERVISION_STEPS;
    const msg = done ? `${req.user.name} cerró el servicio “${svc.title}”.` : `Supervisión en curso (${o.supervision + 1}/${SUPERVISION_STEPS}) en “${svc.title}”.`;
    notify(o.client_id, 'order', msg + (done ? ' Ya puedes calificar y liberar el pago.' : ''), o.id);
    notify(svc.student_id, 'order', msg, o.id);
    touch(o.id);
    reply(res, o.id);
  }));

  // Cada parte califica a la otra una vez. La reputación se acumula en el perfil.
  app.post('/api/orders/:id/rate', needAuth, needRole('cliente', 'estudiante'), withOrder((o, svc, req, res) => {
    const value = Number(req.body?.value);
    const comment = String(req.body?.comment || '').trim().slice(0, 160);
    if (o.supervision < SUPERVISION_STEPS) return fail(res, 'El docente aún no cierra el servicio');
    if (!Number.isInteger(value) || value < 1 || value > 5) return fail(res, 'Calificación inválida', 400);
    const isClient = req.user.role === 'cliente';
    if (isClient ? o.rate_client : o.rate_student) return fail(res, 'Ya calificaste este servicio');
    db.prepare(isClient ? 'UPDATE orders SET rate_client = ?, comment_client = ? WHERE id = ?' : 'UPDATE orders SET rate_student = ?, comment_student = ? WHERE id = ?')
      .run(value, comment, o.id);
    const target = isClient ? svc.student_id : o.client_id;
    db.prepare('UPDATE users SET rating_sum = rating_sum + ?, rating_count = rating_count + 1 WHERE id = ?').run(value, target);
    notify(target, 'rating', `${req.user.name} te calificó con ${value}/5.`, o.id);
    touch(o.id);
    reply(res, o.id);
  }));

  app.post('/api/orders/:id/release', needAuth, needRole('cliente'), withOrder((o, svc, req, res) => {
    if (o.escrow !== 'held') return fail(res, 'No hay un pago retenido para liberar');
    if (o.supervision < SUPERVISION_STEPS) return fail(res, 'El docente debe cerrar el servicio primero');
    db.prepare("UPDATE orders SET escrow = 'released' WHERE id = ?").run(o.id);
    notify(svc.student_id, 'payment', `Pago liberado: ${money(o.amount - o.fee)} por “${svc.title}”.`, o.id);
    touch(o.id);
    reply(res, o.id);
  }));

  app.post('/api/orders/:id/dispute', needAuth, needRole('cliente', 'estudiante'), withOrder((o, svc, req, res) => {
    const reason = String(req.body?.reason || '').trim().slice(0, 200);
    if (o.escrow !== 'held') return fail(res, 'Solo se puede reportar un pago retenido');
    if (reason.length < 5) return fail(res, 'Cuéntanos brevemente qué pasó (mín. 5 caracteres)', 400);
    db.prepare("UPDATE orders SET escrow = 'dispute', dispute_reason = ? WHERE id = ?").run(reason, o.id);
    addMessage(o.id, 'system', `${req.user.name} reportó un problema: ${reason}`);
    notify(svc.supervisor_id, 'dispute', `Problema reportado en “${svc.title}”: ${reason}`, o.id);
    notify(other(o, svc, req.user), 'dispute', `${req.user.name} reportó un problema en “${svc.title}”. El pago sigue retenido.`, o.id);
    touch(o.id);
    reply(res, o.id);
  }));

  app.post('/api/orders/:id/resolve', needAuth, needRole('docente'), withOrder((o, svc, req, res) => {
    const outcome = req.body?.outcome;
    if (o.escrow !== 'dispute') return fail(res, 'No hay una disputa abierta');
    if (!['release', 'refund'].includes(outcome)) return fail(res, 'Resultado inválido', 400);
    db.prepare('UPDATE orders SET escrow = ? WHERE id = ?').run(outcome === 'release' ? 'released' : 'refunded', o.id);
    if (outcome === 'refund') db.prepare('DELETE FROM bookings WHERE order_id = ?').run(o.id);
    const txt = outcome === 'release' ? 'Se liberó el pago al estudiante.' : 'Se reembolsó el pago al cliente.';
    addMessage(o.id, 'system', `${req.user.name} resolvió la disputa. ${txt}`);
    notify(o.client_id, 'dispute', `Disputa resuelta en “${svc.title}”. ${txt}`, o.id);
    notify(svc.student_id, 'dispute', `Disputa resuelta en “${svc.title}”. ${txt}`, o.id);
    touch(o.id);
    reply(res, o.id);
  }));

  /* ---------- Demo ---------- */
  app.post('/api/reset', needAuth, (req, res) => {
    if (!demo) return fail(res, 'No disponible', 404);
    seedDemo(db);
    res.json({ ok: true });
  });

  app.use('/api', (req, res) => res.status(404).json({ error: 'No encontrado' }));
  app.use(express.static(path.join(__dirname, '..', 'public')));
  app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'JSON inválido' });
    console.error(err);
    res.status(500).json({ error: 'Error interno' });
  });

  app.locals.db = db;
  return app;
}

module.exports = { createApp };
