#!/usr/bin/env node
/**
 * Aprovisiona un elenco de prueba (docentes, estudiantes verificados y avalados con
 * servicios publicados, clientes y casos en distintos estados) contra una instancia de
 * UniServ, usando solo la API pública. Las cuentas quedan como registros REALES: a
 * diferencia de las cuentas semilla, no las borra `purgeSeed` al arrancar con DEMO=0.
 *
 *   node scripts/provision-demo.js --url https://uniserv.dvergaram.dev --cases
 *
 * Opciones:
 *   --url <base>        URL de la instancia (por defecto http://localhost:3000)
 *   --code <codigo>     Código de invitación de docentes. Por defecto usa el mismo valor
 *                       provisional que server/index.js; solo hace falta pasarlo si el
 *                       servidor define DOCENTE_CODE.
 *   --password <pw>     Contraseña de todas las cuentas (por defecto UniServ2026*)
 *   --cases             Crea los casos: servicios cerrados con reseñas, uno en supervisión,
 *                       uno por agendar, uno con disputa abierta y uno reembolsado.
 *   --check             No escribe nada: solo informa qué hay en la instancia.
 *   --dry-run           Muestra el plan y termina.
 *
 * Es idempotente: si una cuenta ya existe, inicia sesión y continúa; si un servicio ya
 * está publicado no lo duplica, y si un cliente ya tiene un caso con ese servicio lo deja
 * como está.
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
// Mismo valor por defecto que server/index.js mientras el código de docente esté
// hardcodeado (provisional, ver el comentario allí).
const CODE = arg('--code', process.env.DOCENTE_CODE || 'uniserv-docente-2026');
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
  { key: 'doc-ing',   name: 'Ing. Rodrigo Lemus',    email: 'rodrigo.lemus@uniserv.demo',    career: 'Ingeniería de Sistemas',         uni: 'Universidad Demo Técnica' },
];

const ESTUDIANTES = [
  { key: 'est-mariana', name: 'Mariana Castillo', email: 'mariana.castillo@uniserv.demo', career: 'Odontología', semester: 9, uni: 'Universidad Demo del Norte', supervisor: 'doc-salud',
    service: { category: 'salud', title: 'Valoración y limpieza dental', price: 35000, mode: 'presencial', zone: 'Clínica odontológica, Sede Norte',
      scope: 'Valoración inicial, limpieza y orientación de higiene. No incluye tratamientos de conducto ni cirugías.', days: [1,2,3,4,5], times: ['14:00','15:30','17:00'] } },
  { key: 'est-tomas', name: 'Tomás Restrepo', email: 'tomas.restrepo@uniserv.demo', career: 'Odontología', semester: 8, uni: 'Universidad Demo del Norte', supervisor: 'doc-salud',
    service: { category: 'salud', title: 'Control de caries y sellantes', price: 45000, mode: 'presencial', zone: 'Clínica odontológica, Sede Norte',
      scope: 'Detección de caries superficiales y aplicación de sellantes bajo supervisión docente.', days: [2,3,4,5,6], times: ['08:00','09:30','11:00'] } },
  { key: 'est-camilo', name: 'Camilo Zapata', email: 'camilo.zapata@uniserv.demo', career: 'Odontología', semester: 10, uni: 'Universidad Demo del Norte', supervisor: 'doc-salud',
    service: { category: 'salud', title: 'Blanqueamiento dental supervisado', price: 90000, mode: 'presencial', zone: 'Clínica odontológica, Sede Norte',
      scope: 'Sesión de blanqueamiento con valoración previa. Incluye control a la semana. No apto para gestantes.', days: [1,3,5], times: ['10:00','13:00','16:00'] } },
  { key: 'est-lucia', name: 'Lucía Bermúdez', email: 'lucia.bermudez@uniserv.demo', career: 'Derecho', semester: 9, uni: 'Universidad Demo Central', supervisor: 'doc-legal',
    service: { category: 'legal', title: 'Revisión de contrato de arriendo', price: 30000, mode: 'virtual', zone: 'Videollamada',
      scope: 'Revisión de cláusulas, riesgos y recomendaciones por escrito. No incluye representación ante juzgados.', days: [1,2,3,4,5], times: ['09:00','11:00','16:30'] } },
  { key: 'est-felipe', name: 'Felipe Ocampo', email: 'felipe.ocampo@uniserv.demo', career: 'Derecho', semester: 8, uni: 'Universidad Demo Central', supervisor: 'doc-legal',
    service: { category: 'legal', title: 'Derecho de petición y tutela básica', price: 20000, mode: 'virtual', zone: 'Videollamada',
      scope: 'Redacción y orientación de derechos de petición. La tutela se radica con aval del docente supervisor.', days: [1,2,3,4,5], times: ['10:00','15:00'] } },
  { key: 'est-andrea', name: 'Andrea Pineda', email: 'andrea.pineda@uniserv.demo', career: 'Derecho', semester: 10, uni: 'Universidad Demo Central', supervisor: 'doc-legal',
    service: { category: 'legal', title: 'Orientación en derecho laboral', price: 45000, mode: 'virtual', zone: 'Videollamada',
      scope: 'Revisión de liquidación, contrato o carta de renuncia, con concepto escrito. No incluye demanda laboral.', days: [2,4], times: ['08:00','17:00','19:00'] } },
  { key: 'est-natalia', name: 'Natalia Suárez', email: 'natalia.suarez@uniserv.demo', career: 'Psicología', semester: 9, uni: 'Universidad Demo del Norte', supervisor: 'doc-psico',
    service: { category: 'psico', title: 'Orientación psicológica breve', price: 25000, mode: 'virtual', zone: 'Videollamada',
      scope: 'Sesión de escucha y orientación. No sustituye un tratamiento clínico ni emite diagnósticos.', days: [1,2,3,4,5,6], times: ['18:00','19:30','20:30'] } },
  { key: 'est-julian', name: 'Julián Mesa', email: 'julian.mesa@uniserv.demo', career: 'Psicología', semester: 10, uni: 'Universidad Demo del Norte', supervisor: 'doc-psico',
    service: { category: 'psico', title: 'Taller de manejo de ansiedad académica', price: 28000, mode: 'virtual', zone: 'Videollamada',
      scope: 'Sesión guiada con técnicas de respiración y organización del estudio para época de parciales.', days: [2,4,6], times: ['17:00','19:00'] } },
  { key: 'est-daniel', name: 'Daniel Ferrer', email: 'daniel.ferrer@uniserv.demo', career: 'Ingeniería de Sistemas', semester: 9, uni: 'Universidad Demo Técnica', supervisor: 'doc-ing',
    service: { category: 'ingenieria', title: 'Landing page para tu negocio', price: 180000, mode: 'virtual', zone: 'Videollamada',
      scope: 'Página de una sola sección con formulario de contacto y publicación. Dos rondas de ajustes incluidas.', days: [1,2,3,4,5], times: ['09:00','14:00','18:00'] } },
  { key: 'est-valeria', name: 'Valeria Ossa', email: 'valeria.ossa@uniserv.demo', career: 'Ingeniería de Sistemas', semester: 10, uni: 'Universidad Demo Técnica', supervisor: 'doc-ing',
    service: { category: 'ingenieria', title: 'Puesta a punto de tu computador', price: 60000, mode: 'presencial', zone: 'Visita a domicilio, Sede Técnica',
      scope: 'Limpieza del sistema, respaldo de archivos y configuración de seguridad básica. No incluye repuestos.', days: [0,6], times: ['09:00','11:00','14:00'] } },
];

const CLIENTES = [
  { key: 'cli-carolina', name: 'Carolina Pardo', email: 'carolina.pardo@uniserv.demo' },
  { key: 'cli-andres',   name: 'Andrés Gómez',   email: 'andres.gomez@uniserv.demo' },
  { key: 'cli-monica',   name: 'Mónica Salazar', email: 'monica.salazar@uniserv.demo' },
  { key: 'cli-javier',   name: 'Javier Rincón',  email: 'javier.rincon@uniserv.demo' },
  { key: 'cli-paula',    name: 'Paula Ríos',     email: 'paula.rios@uniserv.demo' },
  { key: 'cli-oscar',    name: 'Óscar Beltrán',  email: 'oscar.beltran@uniserv.demo' },
];

/* ----------------------------- Casos ---------------------------- */
// Estados, de menos a más avanzado:
//   contacted   conversación abierta, sin acuerdo
//   agreed      ambas partes aceptaron; falta agendar
//   held        agendado y con el pago retenido
//   supervision el docente empezó a registrar la supervisión
//   closed      servicio cerrado; falta calificar y liberar
//   released    calificado por ambos y pago liberado  (es el que deja reputación)
//   dispute     problema reportado, pago retenido a la espera del docente
//   refunded    el docente resolvió la disputa con reembolso
const CASOS = [
  // Servicios cerrados: son los que construyen la reputación de cada estudiante.
  { client: 'cli-carolina', student: 'est-mariana', state: 'released', rate: [5, 5], comment: 'Muy puntual y clara explicando el procedimiento.' },
  { client: 'cli-monica',   student: 'est-mariana', state: 'released', rate: [5, 5], comment: 'Quedé muy conforme, repetiría sin dudarlo.' },
  { client: 'cli-javier',   student: 'est-mariana', state: 'released', rate: [4, 5], comment: 'Buen trabajo, la cita empezó unos minutos tarde.' },
  { client: 'cli-paula',    student: 'est-tomas',   state: 'released', rate: [5, 5], comment: 'Explicó todo con paciencia y la docente estuvo pendiente.' },
  { client: 'cli-oscar',    student: 'est-tomas',   state: 'released', rate: [4, 4], comment: 'Cumplió con lo acordado.' },
  { client: 'cli-oscar',    student: 'est-camilo',  state: 'released', rate: [5, 5], comment: 'El resultado se nota y el control de seguimiento fue un plus.' },
  { client: 'cli-carolina', student: 'est-lucia',   state: 'released', rate: [5, 5], comment: 'Me señaló dos cláusulas que no había visto. Muy útil.' },
  { client: 'cli-monica',   student: 'est-lucia',   state: 'released', rate: [5, 4], comment: 'Respuesta rápida y concepto escrito muy claro.' },
  { client: 'cli-javier',   student: 'est-felipe',  state: 'released', rate: [4, 5], comment: 'El derecho de petición quedó bien redactado.' },
  { client: 'cli-monica',   student: 'est-andrea',  state: 'released', rate: [5, 5], comment: 'Revisó mi liquidación y encontró un error a mi favor.' },
  { client: 'cli-paula',    student: 'est-natalia', state: 'released', rate: [5, 5], comment: 'Me sentí escuchada en todo momento.' },
  { client: 'cli-oscar',    student: 'est-natalia', state: 'released', rate: [5, 5], comment: 'Muy profesional para ser una sesión breve.' },
  { client: 'cli-carolina', student: 'est-julian',  state: 'released', rate: [4, 5], comment: 'Las técnicas me sirvieron para la semana de parciales.' },
  { client: 'cli-monica',   student: 'est-daniel',  state: 'released', rate: [5, 5], comment: 'La página quedó publicada en tres días. Impecable.' },
  { client: 'cli-javier',   student: 'est-daniel',  state: 'released', rate: [5, 4], comment: 'Cumplió con las dos rondas de ajustes sin problema.' },
  { client: 'cli-paula',    student: 'est-valeria', state: 'released', rate: [4, 5], comment: 'El computador quedó mucho más rápido.' },

  // Casos vivos, para mostrar el flujo durante la demo.
  { client: 'cli-andres',   student: 'est-lucia',   state: 'supervision' },
  { client: 'cli-andres',   student: 'est-natalia', state: 'closed' },
  { client: 'cli-javier',   student: 'est-camilo',  state: 'agreed' },
  { client: 'cli-paula',    student: 'est-julian',  state: 'contacted' },
  { client: 'cli-oscar',    student: 'est-daniel',  state: 'dispute',  reason: 'La entrega se pasó dos días de la fecha acordada.' },
  { client: 'cli-carolina', student: 'est-felipe',  state: 'refunded', reason: 'Resolví el trámite por mi cuenta antes de la cita.' },
];

const LADDER = {
  contacted:   {},
  agreed:      { accept: true },
  held:        { accept: true, book: true },
  supervision: { accept: true, book: true, advance: 1 },
  closed:      { accept: true, book: true, advance: 3 },
  released:    { accept: true, book: true, advance: 3, rate: true, release: true },
  dispute:     { accept: true, book: true, dispute: true },
  refunded:    { accept: true, book: true, dispute: true, resolve: 'refund' },
};

const CHAT = [
  ['Hola, me interesa. ¿Qué incluye exactamente?', 'Hola, con gusto. Incluye lo que ves en la ficha y lo hago con la supervisión de mi docente.'],
  ['Buenas, ¿tienes disponibilidad esta semana?', '¡Claro! Puedes ver los horarios libres en la agenda y elegir el que te sirva.'],
  ['¿El precio publicado es el valor final?', 'Sí, es el valor final. La comisión se ve antes de pagar y el dinero queda retenido hasta el cierre.'],
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
const byKey = (list, key) => list.find(x => x.key === key);

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
async function runCase(c, index) {
  const est = byKey(ESTUDIANTES, c.student);
  const title = est.service.title;
  const plan = LADDER[c.state];
  if (!plan) throw new Error(`estado desconocido: ${c.state}`);

  const boot = await call('/api/bootstrap', { as: c.client });
  if (!boot.ok) throw new Error(`bootstrap del cliente: ${errorOf(boot)}`);
  const svc = boot.data.services.find(s => s.title === title);
  if (!svc) throw new Error(`el cliente no ve el servicio “${title}”`);

  // Idempotencia: si este cliente ya tiene un caso con este servicio, no se toca.
  const mine = await call('/api/orders', { as: c.client });
  if (mine.ok && Array.isArray(mine.data) && mine.data.some(o => o.serviceId === svc.id)) return 'existente';

  const order = await call('/api/orders', { method: 'POST', body: { serviceId: svc.id }, as: c.client });
  if (!order.ok) throw new Error(`crear la orden: ${errorOf(order)}`);
  const id = order.data.id;

  const [fromClient, fromStudent] = CHAT[index % CHAT.length];
  await call(`/api/orders/${id}/messages`, { method: 'POST', body: { text: fromClient }, as: c.client });
  await call(`/api/orders/${id}/messages`, { method: 'POST', body: { text: fromStudent }, as: c.student });
  if (!plan.accept) return 'creado';

  await call(`/api/orders/${id}/accept`, { method: 'POST', body: {}, as: c.client });
  const acc = await call(`/api/orders/${id}/accept`, { method: 'POST', body: {}, as: c.student });
  if (!acc.ok) throw new Error(`aceptar condiciones: ${errorOf(acc)}`);
  if (!plan.book) return 'creado';

  const slots = await call(`/api/services/${svc.id}/slots`, { as: c.client });
  if (!slots.ok) throw new Error(`consultar horarios: ${errorOf(slots)}`);
  const day = (slots.data || []).find(d => d.times.some(t => t.free));
  if (!day) throw new Error('no quedan horarios libres para agendar');
  const time = day.times.find(t => t.free);
  const booked = await call(`/api/orders/${id}/book`, { method: 'POST', body: { slot: `${day.date} ${time.time}` }, as: c.client });
  if (!booked.ok) throw new Error(`agendar y retener el pago: ${errorOf(booked)}`);
  if (booked.data.escrow !== 'held') throw new Error(`el pago no quedó retenido (estado ${booked.data.escrow})`);

  if (plan.dispute) {
    const dis = await call(`/api/orders/${id}/dispute`, { method: 'POST', body: { reason: c.reason }, as: c.client });
    if (!dis.ok) throw new Error(`reportar el problema: ${errorOf(dis)}`);
    if (!plan.resolve) return 'creado';
    const res = await call(`/api/orders/${id}/resolve`, { method: 'POST', body: { outcome: plan.resolve }, as: est.supervisor });
    if (!res.ok) throw new Error(`resolver la disputa: ${errorOf(res)}`);
    return 'creado';
  }

  for (let i = 0; i < (plan.advance || 0); i++) {
    const adv = await call(`/api/orders/${id}/supervision/advance`, { method: 'POST', body: {}, as: est.supervisor });
    if (!adv.ok) throw new Error(`registrar supervisión (paso ${i + 1}): ${errorOf(adv)}`);
  }
  if (!plan.rate) return 'creado';

  const [vClient, vStudent] = c.rate;
  const r1 = await call(`/api/orders/${id}/rate`, { method: 'POST', body: { value: vClient, comment: c.comment }, as: c.client });
  if (!r1.ok) throw new Error(`calificación del cliente: ${errorOf(r1)}`);
  const r2 = await call(`/api/orders/${id}/rate`, { method: 'POST', body: { value: vStudent, comment: 'Cliente puntual y claro con lo que necesitaba.' }, as: c.student });
  if (!r2.ok) throw new Error(`calificación del estudiante: ${errorOf(r2)}`);
  if (!plan.release) return 'creado';

  const rel = await call(`/api/orders/${id}/release`, { method: 'POST', body: {}, as: c.client });
  if (!rel.ok) throw new Error(`liberar el pago: ${errorOf(rel)}`);
  if (rel.data.escrow !== 'released') throw new Error(`el pago no quedó liberado (estado ${rel.data.escrow})`);
  return 'creado';
}

/* ----------------------------- Main ------------------------------ */
(async () => {
  const info = await report();
  if (CHECK_ONLY) return;

  if (DRY_RUN) {
    log(`\nPlan: ${DOCENTES.length} docentes, ${ESTUDIANTES.length} estudiantes con un servicio cada uno, ` +
        `${CLIENTES.length} clientes y ${CASOS.length} casos.`);
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
  const idByName = new Map(fresh.data.docentes.map(t => [t.name, t.id]));
  for (const d of DOCENTES) {
    d.id = idByName.get(d.name);
    if (!d.id) { bad(`no quedó registrado el docente ${d.name}`); failures++; }
  }

  log('\nEstudiantes');
  for (const e of ESTUDIANTES) {
    const sup = byKey(DOCENTES, e.supervisor);
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

      if ((me.data.myServices || []).some(s => s.title === e.service.title)) {
        skip(`${e.name} — ${e.service.title} (servicio ya publicado)`);
      } else {
        const svc = await call('/api/services', { method: 'POST', body: e.service, as: e.key });
        if (!svc.ok) throw new Error(`publicar el servicio: ${errorOf(svc)}`);
        ok(`${e.name} — avalada por ${sup.name}, servicio “${e.service.title}” publicado (${state})`);
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
    log('\nCasos');
    const tally = { creado: 0, existente: 0 };
    for (const [i, c] of CASOS.entries()) {
      const quien = `${byKey(CLIENTES, c.client).name} → ${byKey(ESTUDIANTES, c.student).name}`;
      try {
        const r = await runCase(c, i);
        tally[r]++;
        if (r === 'creado') ok(`${c.state.padEnd(11)} ${quien}`);
        else skip(`${c.state.padEnd(11)} ${quien} (ya existía)`);
      } catch (err) { bad(`${c.state} ${quien}: ${err.message}`); failures++; }
    }
    log(`  ${tally.creado} creados, ${tally.existente} ya existían`);
  }

  const after = await call('/api/public/info');
  log('\nResultado');
  log(`  docentes en la instancia .. ${after.data.docentes.length}`);
  log(`  contraseña de las cuentas . ${PASSWORD}`);
  log(failures ? `  \x1b[31m${failures} fallo(s)\x1b[0m` : '  \x1b[32msin fallos\x1b[0m');
  process.exitCode = failures ? 1 : 0;
})().catch(err => {
  console.error(`\n\x1b[31mError:\x1b[0m ${err.message}`);
  process.exitCode = 1;
});
