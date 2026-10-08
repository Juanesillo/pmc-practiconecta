// Núcleo del cliente: estado, API, utilidades y tiempo real.
const UI_KEY = 'pmc-ui-v3';

// Manejadores de la interfaz (delegación de eventos: data-act, data-change, data-form).
const ACTIONS = {};
const FORMS = {};

// Estado de la interfaz (por pestaña). Lo demás viene del servidor.
const ui = Object.assign({
  step: 0, orderId: null,
  filters: { category: 'all', maxPrice: 80000, mode: 'any', q: '' },
  draft: { value: 0, comment: '' },
  editSvc: null
}, (() => { try { return JSON.parse(sessionStorage.getItem(UI_KEY)) || {}; } catch (e) { return {}; } })());
ui.menu = null; // menú abierto (no se guarda)


/* Iconos (estilo Lucide, licencia ISC), en línea para no depender de nada externo. */
const ICONS = {
  'shield-check': '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  message: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
  calendar: '<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>',
  clipboard: '<rect width="8" height="4" x="8" y="2" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/>',
  lock: '<rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  star: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
  pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
  video: '<path d="m22 8-6 4 6 4V8Z"/><rect width="14" height="12" x="2" y="6" rx="2"/>',
  clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  cap: '<path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  'arrow-right': '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  'arrow-left': '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
  plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
  send: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
  user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  'heart-pulse': '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/><path d="M3.22 12H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27"/>',
  heart: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
  scale: '<path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/>',
  'hard-hat': '<path d="M2 18a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v2z"/><path d="M10 10V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5"/><path d="M4 15v-3a6 6 0 0 1 6-6"/><path d="M14 6a6 6 0 0 1 6 6v3"/>',
  grid: '<rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/>',
  wallet: '<path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/>',
  refresh: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
  alert: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  pencil: '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>',
  pause: '<rect x="14" y="4" width="4" height="16" rx="1"/><rect x="6" y="4" width="4" height="16" rx="1"/>',
  play: '<polygon points="6 3 20 12 6 21 6 3"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
  undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5 5.5 5.5 0 0 1-5.5 5.5H11"/>',
  tooth: '<path d="M12 5.5c-1-1.2-2.4-1.8-4-1.5-2.4.5-3.5 2.7-3 5.2.4 2 1.2 3 1.5 5 .3 2 .6 4.3 2 4.8 1.2.4 1.6-1.3 2-3 .3-1.2.8-2 1.5-2s1.2.8 1.5 2c.4 1.7.8 3.4 2 3 1.4-.5 1.7-2.8 2-4.8.3-2 1.1-3 1.5-5 .5-2.5-.6-4.7-3-5.2-1.6-.3-3 .3-4 1.5Z"/>',
  chevron: '<path d="m6 9 6 6 6-6"/>'
};
const icon = (name, size = 18) => `<svg class="ic" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;
const catIcon = id => ({ salud: 'heart-pulse', legal: 'scale', psico: 'heart', ingenieria: 'hard-hat' }[id] || 'grid');
const catLabel = id => CATEGORIES.find(c => c.id === id)?.label || '';

let D = null;          // bootstrap: me, services, notifications...
let orders = [];       // órdenes visibles para el usuario
let slots = {};        // horarios por servicio
let info = { demo: false, docentes: [], demoAccounts: [] };

const saveUi = () => { try { sessionStorage.setItem(UI_KEY, JSON.stringify(ui)); } catch (e) { /* sin storage */ } };
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const fmt = n => '$' + Number(n).toLocaleString('es-CO');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const role = () => D?.me.role;
const order = () => orders.find(o => o.id === ui.orderId) || orders[0] || null;
const serviceById = id => D.services.find(s => s.id === id) || D.myServices?.find(s => s.id === id);

function stars(n) {
  if (n == null) return '<span class="muted">Sin reseñas</span>';
  const full = Math.round(n);
  return `<span class="stars" aria-label="${n} de 5">${'★'.repeat(full)}<i>${'★'.repeat(5 - full)}</i></span> <b>${n}</b>`;
}

function avatar(u, cls = '') {
  return `<div class="avatar ${cls}" style="background:${esc(u.color)}">${esc(u.initials)}</div>`;
}

function toast(msg) {
  const el = $('#toast');
  el.innerHTML = `${icon('check', 16)}<span>${esc(msg)}</span>`;
  el.classList.add('show');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => el.classList.remove('show'), 3000);
}

async function api(path, method = 'GET', body) {
  const res = await fetch('/api' + path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined
  });
  const json = await res.json().catch(() => ({}));
  if (res.status === 401 && D) { D = null; render(); throw new Error('Tu sesión terminó. Inicia sesión de nuevo.'); }
  if (!res.ok) throw new Error(json.error || 'Error de servidor');
  return json;
}

// Ejecuta una acción; si falla muestra el error del servidor. Siempre refresca después.
async function act(fn, okMsg) {
  try { const r = await fn(); if (okMsg) toast(okMsg); await refresh(true); return r; }
  catch (e) { toast(e.message); await refresh(true); }
}

let lastSig = '';
async function refresh(force = false) {
  if (!D && !force) return;
  try {
    const boot = await api('/bootstrap');
    const list = await api('/orders');
    D = boot; orders = list;
    if (ui.orderId && !orders.some(o => o.id === ui.orderId)) ui.orderId = null;
    const o = order();
    if (ui.step === 3 && o && !o.paid) slots[o.serviceId] = await api(`/services/${o.serviceId}/slots`);
  } catch (e) { return; } // sin servidor o sin sesión: se conserva la vista
  const sig = JSON.stringify([D, orders, slots, ui.step, ui.orderId, ui.menu, ui.editSvc]);
  if (force || sig !== lastSig) { lastSig = sig; render(); }
}

/* Tiempo real: el servidor avisa cada cambio y se vuelve a consultar. */
let es = null, debounce = null;
function connectEvents() {
  if (es) es.close();
  es = new EventSource('/api/events');
  es.addEventListener('change', () => { clearTimeout(debounce); debounce = setTimeout(() => refresh(), 150); });
}
function disconnectEvents() { es?.close(); es = null; }
setInterval(() => refresh(), 20000); // respaldo si se corta la conexión

/* Estado legible de una orden. */
function orderStatus(o) {
  if (o.escrow === 'released') return { label: 'Pago liberado', tone: 'ok' };
  if (o.escrow === 'refunded') return { label: 'Reembolsado', tone: 'warn' };
  if (o.escrow === 'dispute') return { label: 'En disputa', tone: 'warn' };
  if (o.serviceDone) return { label: 'Servicio cerrado', tone: 'ok' };
  if (o.supervision.some(Boolean)) return { label: 'En supervisión', tone: 'info' };
  if (o.paid) return { label: 'Cita confirmada', tone: 'info' };
  if (o.agreed) return { label: 'Condiciones acordadas', tone: 'info' };
  return { label: 'En conversación', tone: 'info' };
}

// Qué debería pasar a continuación según el rol de quien mira.
function nextAction(o) {
  const r = role();
  const done = ['released', 'refunded'].includes(o.escrow);
  if (done) return o.escrow === 'released' ? '✔ Flujo completo: el pago fue liberado al estudiante.' : 'El pago fue reembolsado al cliente.';
  if (o.escrow === 'dispute') return r === 'docente' ? 'Hay una disputa: resuélvela en el paso “Pago retenido”.' : 'Disputa abierta: el pago sigue retenido hasta que el docente la resuelva.';
  if (!o.agreed) {
    const mine = r === 'cliente' ? o.acceptClient : o.acceptStudent;
    if (r === 'docente') return 'Las partes aún negocian las condiciones.';
    return mine ? 'Esperando que la otra parte acepte las condiciones.' : 'Siguiente: acepta las condiciones en el chat.';
  }
  if (!o.paid) return r === 'cliente' ? 'Siguiente: elige un horario y confirma (el pago queda retenido).' : 'Esperando que el cliente agende la cita.';
  if (!o.serviceDone) return r === 'docente' ? 'Siguiente: registra los pasos de supervisión hasta cerrar el servicio.' : 'Esperando la supervisión y el cierre del docente.';
  const mineRated = r === 'cliente' ? o.ratingByClient : r === 'estudiante' ? o.ratingByStudent : true;
  if (!mineRated) return 'Siguiente: califica la experiencia.';
  if (r === 'cliente') return 'Siguiente: confirma el servicio y libera el pago.';
  return 'Esperando que el cliente libere el pago.';
}
