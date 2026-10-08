const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../server/app');

let server, base;

before(async () => {
  server = createApp({ dbFile: ':memory:', demo: true }).listen(0);
  await new Promise(r => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());

// Cliente HTTP mínimo con su propia cookie de sesión.
function session() {
  let cookie = '';
  const call = async (method, path, body) => {
    const res = await fetch(base + '/api' + path, {
      method,
      headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
      body: body ? JSON.stringify(body) : undefined
    });
    const set = res.headers.get('set-cookie');
    if (set) cookie = set.split(';')[0];
    return { status: res.status, body: await res.json().catch(() => ({})) };
  };
  return { call, as: id => call('POST', '/auth/switch', { userId: id }), get: p => call('GET', p), post: (p, b) => call('POST', p, b || {}) };
}

const login = async id => { const s = session(); await s.as(id); return s; };

test('sin sesión no se accede a los datos', async () => {
  const s = session();
  assert.equal((await s.get('/bootstrap')).status, 401);
  assert.equal((await s.get('/orders')).status, 401);
});

test('login con contraseña, rechazo de credenciales malas y registro', async () => {
  const s = session();
  assert.equal((await s.post('/auth/login', { email: 'juan@demo.com', password: 'mala' })).status, 401);
  assert.equal((await s.post('/auth/login', { email: 'juan@demo.com', password: 'demo1234' })).status, 200);
  assert.equal((await s.get('/bootstrap')).body.me.role, 'cliente');

  const n = session();
  const dup = await n.post('/auth/register', { name: 'Otro', email: 'juan@demo.com', password: 'abcdefgh', role: 'cliente' });
  assert.equal(dup.status, 409);
  const ok = await n.post('/auth/register', { name: 'Nuevo Cliente', email: 'nuevo@demo.com', password: 'abcdefgh', role: 'cliente' });
  assert.equal(ok.status, 201);
  assert.equal((await n.get('/bootstrap')).body.me.name, 'Nuevo Cliente');
  const bad = await session().post('/auth/register', { name: 'X Y', email: 'x@y.com', password: 'abcdefgh', role: 'docente' });
  assert.equal(bad.status, 400);
});

test('los orígenes externos no pueden modificar datos', async () => {
  const res = await fetch(base + '/api/auth/logout', { method: 'POST', headers: { Origin: 'https://evil.example', 'Content-Type': 'application/json' }, body: '{}' });
  assert.equal(res.status, 403);
});

test('verificación: el aval solo lo da el docente supervisor y habilita publicar', async () => {
  const laura = await login('u-laura');
  const svc = { title: 'Escucha activa', scope: 'Sesión breve de orientación.', price: 20000, category: 'psico', mode: 'virtual', days: [1, 3], times: ['10:00'] };
  assert.equal((await laura.post('/services', svc)).status, 409, 'sin verificar no puede publicar');
  assert.equal((await laura.post('/verification/3')).status, 400, 'no puede avalarse sola');
  for (const i of [0, 1, 2]) assert.equal((await laura.post(`/verification/${i}`)).status, 200);

  const otro = await login('d-martha');
  assert.equal((await otro.post('/students/u-laura/endorse')).status, 403, 'otro docente no puede avalar');
  const elena = await login('d-elena');
  assert.equal((await elena.post('/students/u-laura/endorse')).status, 200);

  const pub = await laura.post('/services', svc);
  assert.equal(pub.status, 201);
  const cli = await login('u-client');
  assert.ok((await cli.get('/bootstrap')).body.services.some(s => s.id === pub.body.id), 'aparece en la búsqueda');
  assert.equal((await laura.call('PATCH', `/services/${pub.body.id}`, { active: false })).status, 200);
  assert.ok(!(await cli.get('/bootstrap')).body.services.some(s => s.id === pub.body.id), 'pausado no aparece');
});

test('flujo completo con permisos por rol y reputación', async () => {
  const cli = await login('u-client'), est = await login('u-camila'), doc = await login('d-martha'), otroDoc = await login('d-luis');
  const before = (await cli.get('/bootstrap')).body.services.find(s => s.id === 's1');

  const o = (await cli.post('/orders', { serviceId: 's1' })).body;
  assert.equal(o.escrow, 'none');
  assert.equal((await est.post('/orders', { serviceId: 's1' })).status, 403, 'solo clientes contactan');
  assert.equal((await otroDoc.get(`/orders/${o.id}`)).status, 403, 'otro docente no ve la orden');

  assert.equal((await doc.post(`/orders/${o.id}/messages`, { text: 'hola' })).status, 403, 'el docente no chatea');
  await cli.post(`/orders/${o.id}/messages`, { text: '¿Qué incluye?' });
  assert.equal((await cli.post(`/orders/${o.id}/autoreply`, { on: false })).status, 200);

  const slots = (await cli.get('/services/s1/slots')).body;
  const day = slots[0], slot = `${day.date} ${day.times.find(t => t.free).time}`;
  assert.equal((await cli.post(`/orders/${o.id}/book`, { slot })).status, 409, 'no agenda sin acuerdo de ambos');

  await cli.post(`/orders/${o.id}/accept`);
  assert.equal((await cli.get(`/orders/${o.id}`)).body.agreed, false, 'falta el estudiante');
  await est.post(`/orders/${o.id}/accept`);
  assert.equal((await cli.get(`/orders/${o.id}`)).body.agreed, true);

  assert.equal((await est.post(`/orders/${o.id}/book`, { slot })).status, 403, 'solo el cliente agenda');
  const booked = (await cli.post(`/orders/${o.id}/book`, { slot })).body;
  assert.equal(booked.escrow, 'held');
  assert.equal(booked.amount, 35000 + 1750);

  // Doble reserva del mismo horario por otro cliente
  const sofia = await login('u-sofia');
  const o2 = (await sofia.post('/orders', { serviceId: 's1' })).body;
  await sofia.post(`/orders/${o2.id}/autoreply`, { on: false });
  await sofia.post(`/orders/${o2.id}/accept`); await est.post(`/orders/${o2.id}/accept`);
  assert.equal((await sofia.post(`/orders/${o2.id}/book`, { slot })).status, 409, 'horario ya tomado');

  assert.equal((await cli.post(`/orders/${o.id}/release`)).status, 409, 'no libera antes del cierre docente');
  assert.equal((await est.post(`/orders/${o.id}/supervision/advance`)).status, 403);
  assert.equal((await otroDoc.post(`/orders/${o.id}/supervision/advance`)).status, 403);
  for (let i = 0; i < 3; i++) assert.equal((await doc.post(`/orders/${o.id}/supervision/advance`)).status, 200);

  assert.equal((await cli.post(`/orders/${o.id}/rate`, { value: 9 })).status, 400);
  assert.equal((await cli.post(`/orders/${o.id}/rate`, { value: 5, comment: 'Excelente' })).status, 200);
  assert.equal((await cli.post(`/orders/${o.id}/rate`, { value: 5 })).status, 409, 'solo una calificación');
  assert.equal((await est.post(`/orders/${o.id}/rate`, { value: 4 })).status, 200);
  const after = (await cli.get('/bootstrap')).body.services.find(s => s.id === 's1');
  assert.equal(after.reviews, before.reviews + 1);

  assert.equal((await est.post(`/orders/${o.id}/release`)).status, 403, 'solo el cliente libera');
  assert.equal((await cli.post(`/orders/${o.id}/release`)).body.escrow, 'released');
  const notes = (await est.get('/bootstrap')).body.notifications;
  assert.ok(notes.some(n => n.kind === 'payment'), 'el estudiante recibe aviso del pago');
});

test('cancelación reembolsa y libera el horario; disputa la resuelve el docente', async () => {
  const cli = await login('u-sofia'), est = await login('u-valentina'), doc = await login('d-camilo');
  const o = (await cli.post('/orders', { serviceId: 's3' })).body;
  await cli.post(`/orders/${o.id}/autoreply`, { on: false });
  await cli.post(`/orders/${o.id}/accept`); await est.post(`/orders/${o.id}/accept`);
  const slots = (await cli.get('/services/s3/slots')).body;
  const slot = `${slots[0].date} ${slots[0].times[0].time}`;
  await cli.post(`/orders/${o.id}/book`, { slot });
  assert.equal((await cli.post(`/orders/${o.id}/cancel`)).body.escrow, 'refunded');
  const free = (await cli.get('/services/s3/slots')).body[0].times[0].free;
  assert.equal(free, true, 'el horario vuelve a estar libre');

  const o2 = (await cli.post('/orders', { serviceId: 's3' })).body;
  await cli.post(`/orders/${o2.id}/autoreply`, { on: false });
  await cli.post(`/orders/${o2.id}/accept`); await est.post(`/orders/${o2.id}/accept`);
  await cli.post(`/orders/${o2.id}/book`, { slot });
  assert.equal((await cli.post(`/orders/${o2.id}/dispute`, { reason: 'x' })).status, 400, 'exige motivo');
  assert.equal((await cli.post(`/orders/${o2.id}/dispute`, { reason: 'El estudiante no se presentó' })).body.escrow, 'dispute');
  assert.equal((await cli.post(`/orders/${o2.id}/resolve`, { outcome: 'refund' })).status, 403, 'el cliente no resuelve');
  assert.equal((await doc.post(`/orders/${o2.id}/resolve`, { outcome: 'refund' })).body.escrow, 'refunded');
});

test('reiniciar la demo restablece los datos', async () => {
  const cli = await login('u-client');
  await cli.post('/orders', { serviceId: 's2' });
  assert.ok((await cli.get('/orders')).body.length > 0);
  assert.equal((await cli.post('/reset')).status, 200);
  assert.equal((await cli.get('/orders')).body.length, 0);
});
