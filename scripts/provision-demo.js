#!/usr/bin/env node
/**
 * Aprovisiona un elenco de prueba (docentes, estudiantes verificados y avalados con
 * servicios publicados, y clientes) contra una instancia de UniServ, usando solo la
 * API pública. Las cuentas quedan como registros REALES: a diferencia de las cuentas
 * semilla, no las borra `purgeSeed` al arrancar con DEMO=0.
 *
 *   node scripts/provision-demo.js --url https://uniserv.dvergaram.dev --code <DOCENTE_CODE>
 *
 * Opciones:
 *   --url <base>        URL de la instancia (por defecto http://localhost:3000)
 *   --code <codigo>     DOCENTE_CODE del servidor. Obligatorio para crear docentes.
 *   --password <pw>     Contraseña de todas las cuentas (por defecto UniServ2026*)
 *   --cases             Además crea dos casos: uno cerrado y calificado, otro en supervisión.
 *   --check             No escribe nada: solo informa qué hay en la instancia.
 *   --dry-run           Muestra el plan y termina.
 *
 * Es idempotente: si una cuenta ya existe, inicia sesión y continúa; si un servicio
 * ya está publicado, no lo duplica.
 */

'use strict';

/* ----------------------------- CLI ----------------------------- */
const argv = process.argv.slice(2);
const arg = (flag, fallback) => {
  const i = argv.indexOf(flag);
  return i !== -1 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : fallback;
};
const has = flag => argv.includes(flag);

const BASE = (arg('--url', process.env.UNISERV_URL || 'http://localhost:3000')).replace(/\/+$/, '');
const CODE = arg('--code', process.env.DOCENTE_CODE || '');
const PASSWORD = arg('--password', process.env.DEMO_PASSWORD || 'UniServ2026*');
const WITH_CASES = has('--cases');
const CHECK_ONLY = has('--check');
const DRY_RUN = has('--dry-run');

/* --------------------------- El elenco -------------------------- */
// Universidades ficticias a propósito: no se le atribuye a una institución real haber
// verificado a estas personas. El pie de la app ya advierte que todo es un prototipo.
const DOCENTES = [
  { key: 'doc-salud', name: 'Dra. Patricia Aguirre', email: 'patricia.aguirre@uniserv.demo', career: 'Odontología',                    uni: 'Universidad Demo del Norte' },
  { key: 'doc-legal', name: 'Dr. Esteban Cárdenas',  email: 'esteban.cardenas@uniserv.demo', career: 'Derecho (consultorio jurídico)', uni: 'Universidad Demo Central' },
  { key: 'doc-psico', name: 'Psic. Marcela Duarte',  email: 'marcela.duarte@uniserv.demo',   career: 'Psicología',                     uni: 'Universidad Demo del Norte' },
];

const ESTUDIANTES = [
  { key: 'est-mariana', name: 'Mariana Castillo', email: 'mariana.castillo@uniserv.demo', career: 'Odontología', semester: 9,  uni: 'Universidad Demo del Norte',  supervisor: 'doc-salud',
    service: { category: 'salud', title: 'Valoración y limpieza dental', price: 35000, mode: 'presencial', zone: 'Clínica odontológica, Sede Norte',
      scope: 'Valoración inicial, limpieza y orientación de higiene. No incluye tratamientos de conducto ni cirugías.', days: [1,2,3,4,5], times: ['14:00','15:30','17:00'] } },
  { key: 'est-tomas',   name: 'Tomás Restrepo',   email: 'tomas.restrepo@uniserv.demo',   career: 'Odontología', semester: 8,  uni: 'Universidad Demo del Norte',  supervisor: 'doc-salud',
    service: { category: 'salud', title: 'Control de caries y sellantes', price: 45000, mode: 'presencial', zone: 'Clínica odontológica, Sede Norte',
      scope: 'Detección de caries superficiales y aplicación de sellantes bajo supervisión docente.', days: [2,3,4,5,6], times: ['08:00','09:30','11:00'] } },
  { key: 'est-lucia',   name: 'Lucía Bermúdez',   email: 'lucia.bermudez@uniserv.demo',   career: 'Derecho',     semester: 9,  uni: 'Universidad Demo Central',    supervisor: 'doc-legal',
    service: { category: 'legal', title: 'Revisión de contrato de arriendo', price: 30000, mode: 'virtual', zone: 'Videollamada',
      scope: 'Revisión de cláusulas, riesgos y recomendaciones por escrito. No incluye representación ante juzgados.', days: [1,2,3,4,5], times: ['09:00','11:00','16:30'] } },
  { key: 'est-felipe',  name: 'Felipe Ocampo',    email: 'felipe.ocampo@uniserv.demo',    career: 'Derecho',     semester: 8,  uni: 'Universidad Demo Central',    supervisor: 'doc-legal',
    service: { category: 'legal', title: 'Derecho de petición y tutela básica', price: 20000, mode: 'virtual', zone: 'Videollamada',
      scope: 'Redacción y orientación de derechos de petición. La tutela se radica con aval del docente supervisor.', days: [1,2,3,4,5], times: ['10:00','15:00'] } },
  { key: 'est-natalia', name: 'Natalia Suárez',   email: 'natalia.suarez@uniserv.demo',   career: 'Psicología',  semester: 9,  uni: 'Universidad Demo del Norte',  supervisor: 'doc-psico',
    service: { category: 'psico', title: 'Orientación psicológica breve', price: 25000, mode: 'virtual', zone: 'Videollamada',
      scope: 'Sesión de escucha y orientación. No sustituye un tratamiento clínico ni emite diagnósticos.', days: [1,2,3,4,5,6], times: ['18:00','19:30','20:30'] } },
  { key: 'est-julian',  name: 'Julián Mesa',      email: 'julian.mesa@uniserv.demo',      career: 'Psicología',  semester: 10, uni: 'Universidad Demo del Norte',  supervisor: 'doc-psico',
    service: { category: 'psico', title: 'Taller de manejo de ansiedad académica', price: 28000, mode: 'virtual', zone: 'Videollamada',
      scope: 'Sesión guiada con técnicas de respiración y organización del estudio para época de parciales.', days: [2,4,6], times: ['17:00','19:00'] } },
];

const CLIENTES = [
  { key: 'cli-carolina', name: 'Carolina Pardo', email: 'carolina.pardo@uniserv.demo' },
  { key: 'cli-andres',   name: 'Andrés Gómez',   email: 'andres.gomez@uniserv.demo' },
];

/* --------------------------- Utilidades -------------------------- */
const jar = new Map();            // key -> cookie de sesión
const log = (...a) => console.log(...a);
const ok   = m => log(`  \x1b[32m✓\x1b[0m ${m}`);
const skip = m => log(`  \x1b[90m·\x1b[0m ${m}`);
const bad  = m => log(`  \x1b[31m✗\x1b[0m ${m}`);

let failures = 0;

async function call(path, { method = 'GET', body, as } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (as && jar.has(as)) headers.Cookie = jar.get(as);
  const res = await fetch(BASE + path, {
    method, headers, body: body === undefined ? undefined : JSON.stringify(body), redirect: 'manual',
  });
  const setCookie = typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : [];
  if (as && setCookie.length) jar.set(as, setCookie.map(c => c.split(';')[0]).join('; '));
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { status: res.status, ok: res.ok, data };
}

const errorOf = r => (r.data && r.data.error) || (typeof r.data === 'string' ? r.data.slice(0, 120) : `HTTP ${r.status}`);

/** Registra la cuenta; si el correo ya existe, inicia sesión. Devuelve 'creada' | 'existente'. */
async function ensureAccount(key, payload) {
  const reg = await call('/api/auth/register', { method: 'POST', body: { ...payload, password: PASSWORD }, as: key });
  if (reg.ok) return 'creada';
  const login = await call('/api/auth/login', { method: 'POST', body: { email: payload.email, password: PASSWORD }, as: key });
  if (login.ok) return 'existente';
  throw new Error(`${payload.email}: ${errorOf(reg)} / al iniciar sesión: ${errorOf(login)}`);
}

/* ---------------------------- Informe ---------------------------- */
async function report() {
  const info = await call('/api/public/info');
  if (!info.ok) throw new Error(`No se pudo leer ${BASE}/api/public/info (${errorOf(info)})`);
  const d = info.data;
  log(`\nInstancia  ${BASE}`);
  log(`  modo DEMO ................ ${d.demo ? 'activado (cuentas de ejemplo visibles)' : 'desactivado (producción)'}`);
  log(`  registro de docentes ..... ${d.docenteSignup ? 'habilitado (DOCENTE_CODE definido)' : 'DESHABILITADO (falta DOCENTE_CODE)'}`);
  log(`  docentes registrados ..... ${d.docentes.length}`);
  for (const t of d.docentes) log(`      · ${t.name} — ${t.career}${t.uni ? ' · ' + t.uni : ''}`);
  return d;
}

/* -------------------------- Casos de prueba ----------------------- */
async function runCase({ clientKey, studentKey, title, finish }) {
  const boot = await call('/api/bootstrap', { as: clientKey });
  if (!boot.ok) throw new Error(`bootstrap del cliente: ${errorOf(boot)}`);
  const svc = boot.data.services.find(s => s.title === title);
  if (!svc) throw new Error(`el cliente no ve el servicio “${title}”`);

  const order = await call('/api/orders', { method: 'POST', body: { serviceId: svc.id }, as: clientKey });
  if (!order.ok) throw new Error(`crear la orden: ${errorOf(order)}`);
  const id = order.data.id;

  if (order.data.escrow !== 'none') { skip(`“${title}”: ya existe un caso (orden ${id}, estado ${order.data.escrow})`); return id; }

  await call(`/api/orders/${id}/messages`, { method: 'POST', body: { text: 'Hola, me interesa. ¿Qué incluye exactamente?' }, as: clientKey });
  await call(`/api/orders/${id}/messages`, { method: 'POST', body: { text: 'Perfecto, me sirve. ¿Agendamos?' }, as: studentKey });
  await call(`/api/orders/${id}/accept`, { method: 'POST', body: {}, as: clientKey });
  const acc = await call(`/api/orders/${id}/accept`, { method: 'POST', body: {}, as: studentKey });
  if (!acc.ok) throw new Error(`aceptar condiciones: ${errorOf(acc)}`);

  const slots = await call(`/api/services/${svc.id}/slots`, { as: clientKey });
  if (!slots.ok) throw new Error(`consultar horarios: ${errorOf(slots)}`);
  const day = slots.data.find(d => d.times.some(t => t.free));
  if (!day) throw new Error('no hay horarios libres para agendar');
  const time = day.times.find(t => t.free);
  const booked = await call(`/api/orders/${id}/book`, { method: 'POST', body: { slot: `${day.date} ${time.time}` }, as: clientKey });
  if (!booked.ok) throw new Error(`agendar y retener el pago: ${errorOf(booked)}`);
  if (booked.data.escrow !== 'held') throw new Error(`el pago no quedó retenido (estado ${booked.data.escrow})`);

  const supKey = ESTUDIANTES.find(e => e.key === studentKey).supervisor;
  const steps = finish ? 3 : 1;
  for (let i = 0; i < steps; i++) {
    const adv = await call(`/api/orders/${id}/supervision/advance`, { method: 'POST', body: {}, as: supKey });
    if (!adv.ok) throw new Error(`registrar supervisión (paso ${i + 1}): ${errorOf(adv)}`);
  }
  if (!finish) return id;

  const r1 = await call(`/api/orders/${id}/rate`, { method: 'POST', body: { value: 5, comment: 'Muy puntual y clara explicando el procedimiento.' }, as: clientKey });
  if (!r1.ok) throw new Error(`calificación del cliente: ${errorOf(r1)}`);
  const r2 = await call(`/api/orders/${id}/rate`, { method: 'POST', body: { value: 5, comment: 'Cliente puntual y atento.' }, as: studentKey });
  if (!r2.ok) throw new Error(`calificación del estudiante: ${errorOf(r2)}`);
  const rel = await call(`/api/orders/${id}/release`, { method: 'POST', body: {}, as: clientKey });
  if (!rel.ok) throw new Error(`liberar el pago: ${errorOf(rel)}`);
  if (rel.data.escrow !== 'released') throw new Error(`el pago no quedó liberado (estado ${rel.data.escrow})`);
  return id;
}

/* ----------------------------- Main ------------------------------ */
(async () => {
  const info = await report();
  if (CHECK_ONLY) return;

  if (DRY_RUN) {
    log(`\nPlan: ${DOCENTES.length} docentes, ${ESTUDIANTES.length} estudiantes con un servicio cada uno, ${CLIENTES.length} clientes.`);
    log(`Contraseña de todas las cuentas: ${PASSWORD}`);
    return;
  }
  if (!info.docenteSignup && !CODE) {
    throw new Error('El registro de docentes está deshabilitado en esta instancia.\n' +
      '  Define DOCENTE_CODE en el servidor, reinícialo y vuelve a correr esto con --code <ese código>.');
  }

  log('\nDocentes');
  for (const d of DOCENTES) {
    const state = await ensureAccount(d.key, { name: d.name, email: d.email, role: 'docente', career: d.career, uni: d.uni, inviteCode: CODE });
    (state === 'creada' ? ok : skip)(`${d.name} — ${d.career} (${state})`);
  }

  const fresh = await call('/api/public/info');
  const byName = new Map(fresh.data.docentes.map(t => [t.name, t.id]));
  for (const d of DOCENTES) {
    d.id = byName.get(d.name);
    if (!d.id) { bad(`no quedó registrado el docente ${d.name}`); failures++; }
  }

  log('\nEstudiantes');
  for (const e of ESTUDIANTES) {
    const sup = DOCENTES.find(d => d.key === e.supervisor);
    try {
      const state = await ensureAccount(e.key, {
        name: e.name, email: e.email, role: 'estudiante',
        career: e.career, semester: e.semester, uni: e.uni, supervisorId: sup.id,
      });
      // Por si la cuenta ya existía sin supervisor asignado.
      await call('/api/me/supervisor', { method: 'POST', body: { supervisorId: sup.id }, as: e.key });
      for (const step of [0, 1, 2]) {
        const v = await call(`/api/verification/${step}`, { method: 'POST', body: {}, as: e.key });
        if (!v.ok) throw new Error(`verificación paso ${step}: ${errorOf(v)}`);
      }
      const me = await call('/api/bootstrap', { as: e.key });
      const end = await call(`/api/students/${me.data.me.id}/endorse`, { method: 'POST', body: {}, as: sup.key });
      if (!end.ok) throw new Error(`aval del docente: ${errorOf(end)}`);

      const mine = await call('/api/bootstrap', { as: e.key });
      const existing = (mine.data.myServices || []).find(s => s.title === e.service.title);
      if (existing) {
        skip(`${e.name} — ${e.service.title} (servicio ya publicado)`);
      } else {
        const svc = await call('/api/services', { method: 'POST', body: e.service, as: e.key });
        if (!svc.ok) throw new Error(`publicar el servicio: ${errorOf(svc)}`);
        ok(`${e.name} — verificada, avalada por ${sup.name}, servicio “${e.service.title}” publicado (${state})`);
      }
    } catch (err) {
      bad(`${e.name}: ${err.message}`); failures++;
    }
  }

  log('\nClientes');
  for (const c of CLIENTES) {
    try {
      const state = await ensureAccount(c.key, { name: c.name, email: c.email, role: 'cliente' });
      (state === 'creada' ? ok : skip)(`${c.name} (${state})`);
    } catch (err) { bad(`${c.name}: ${err.message}`); failures++; }
  }

  if (WITH_CASES) {
    log('\nCasos de prueba');
    try {
      await runCase({ clientKey: 'cli-carolina', studentKey: 'est-mariana', title: 'Valoración y limpieza dental', finish: true });
      ok('Caso completo: contacto → acuerdo → agenda → pago retenido → supervisión → cierre → calificación → pago liberado');
    } catch (err) { bad(`caso completo: ${err.message}`); failures++; }
    try {
      await runCase({ clientKey: 'cli-andres', studentKey: 'est-lucia', title: 'Revisión de contrato de arriendo', finish: false });
      ok('Caso en curso: pago retenido y supervisión iniciada (queda visible para la demo en vivo)');
    } catch (err) { bad(`caso en curso: ${err.message}`); failures++; }
  }

  const after = await call('/api/public/info');
  log(`\nResultado`);
  log(`  docentes en la instancia .. ${after.data.docentes.length}`);
  log(`  contraseña de las cuentas . ${PASSWORD}`);
  log(failures ? `  \x1b[31m${failures} fallo(s)\x1b[0m` : '  \x1b[32msin fallos\x1b[0m');
  process.exitCode = failures ? 1 : 0;
})().catch(err => {
  console.error(`\n\x1b[31mError:\x1b[0m ${err.message}`);
  process.exitCode = 1;
});
