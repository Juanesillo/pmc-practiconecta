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
  el.textContent = msg;
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
