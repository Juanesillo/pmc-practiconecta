// PractiConecta: cliente del prototipo. Los datos viven en el backend (API + SQLite).
const STEPS = [
  { id: 'perfil', label: 'Perfil verificado' },
  { id: 'busqueda', label: 'Búsqueda y matching' },
  { id: 'chat', label: 'Chat' },
  { id: 'agenda', label: 'Agendamiento' },
  { id: 'supervision', label: 'Supervisión y reputación' },
  { id: 'pago', label: 'Pago retenido' }
];

const UI_KEY = 'pmc-ui-v2';
const POLL_MS = 2500;

// Estado de la interfaz (por pestaña). Lo demás viene del servidor.
const ui = Object.assign({
  step: 0, userId: 'u-client', orderId: null, serviceId: null,
  filters: { category: 'all', maxPrice: 60000, mode: 'any' },
  draft: { client: 0, student: 0, comment: '' }
}, loadUi());

// Datos del servidor
let DATA = { users: [], services: [], verification: {}, feeRate: 0.05 };
let orders = [];
let verifying = false;

function loadUi() {
  try { return JSON.parse(sessionStorage.getItem(UI_KEY)) || {}; } catch (e) { return {}; }
}
function saveUi() {
  try { sessionStorage.setItem(UI_KEY, JSON.stringify(ui)); } catch (e) { /* sin storage */ }
}

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const fmt = n => '$' + Number(n).toLocaleString('es-CO');
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const currentUser = () => DATA.users.find(u => u.id === ui.userId) || DATA.users[0];
const order = () => orders.find(o => o.id === ui.orderId) || orders[0] || null;
const serviceById = id => DATA.services.find(s => s.id === id);
const selectedService = () => serviceById(order()?.serviceId || ui.serviceId) || DATA.services[0];
const verifSteps = () => DATA.verification[VERIFIED_STUDENT_ID] || Array(VERIFICATION_STEPS.length).fill(false);
const isVerified = () => verifSteps().every(Boolean);

/* ---------- API ---------- */

async function api(path, method = 'GET', body) {
  const res = await fetch('/api' + path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || 'Error de servidor');
  return json;
}

// Ejecuta una acción, muestra el error si falla y refresca los datos.
async function act(fn) {
  try { await fn(); } catch (e) { toast(e.message); }
  await refresh(true);
}

let lastSig = '';
async function refresh(force = false) {
  try {
    const [boot, list] = await Promise.all([api('/bootstrap'), api('/orders?userId=' + encodeURIComponent(ui.userId))]);
    DATA = boot; orders = list;
    if (ui.orderId && !orders.some(o => o.id === ui.orderId)) ui.orderId = null;
  } catch (e) { return; } // si el servidor no responde, se conserva la vista
  const sig = JSON.stringify([DATA, orders, ui.step, ui.userId, ui.orderId]);
  if (force || sig !== lastSig) { lastSig = sig; render(); }
}

/* ---------- Utilidades de UI ---------- */

function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => el.classList.remove('show'), 2600);
}

function go(step) {
  ui.step = Math.max(0, Math.min(STEPS.length - 1, step));
  saveUi();
  render();
  $('#view').focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function stars(n) {
  const full = Math.round(n);
  return '<span class="stars" aria-label="' + n + ' de 5">' + '★'.repeat(full) + '<i>' + '★'.repeat(5 - full) + '</i></span>';
}

// Coincidencia (matching) simulada: categoría, precio, modalidad y cercanía.
function matchScore(s) {
  const f = ui.filters;
  let score = 40;
  if (f.category === 'all' || f.category === s.category) score += 30; else score -= 25;
  if (s.price <= f.maxPrice) score += 15; else score -= 15;
  if (f.mode === 'any' || f.mode === s.mode) score += 8; else score -= 8;
  score += Math.max(0, 7 - s.distance);
  score += (s.rating - 4) * 5;
  return Math.max(5, Math.min(99, Math.round(score)));
}

function renderStepper() {
  $('#stepper').innerHTML = STEPS.map((s, i) => {
    const cls = i === ui.step ? 'active' : i < ui.step ? 'done' : '';
    return `<button type="button" class="step ${cls}" data-step="${i}" ${i === ui.step ? 'aria-current="step"' : ''}>
      <span class="step-n">${i < ui.step ? '✓' : i + 1}</span><span class="step-l">${s.label}</span></button>`;
  }).join('');
  $$('#stepper .step').forEach(b => b.addEventListener('click', () => go(+b.dataset.step)));
}

function renderUserSelect() {
  const sel = $('#user-select');
  sel.innerHTML = DATA.users.map(u => `<option value="${u.id}" ${u.id === ui.userId ? 'selected' : ''}>${esc(u.name)} · ${u.role}</option>`).join('');
}

function pageHead(role, title, lead) {
  return `<div class="page-head"><span class="role-chip">${role}</span><h1>${title}</h1><p class="lead">${lead}</p></div>`;
}

function navFooter(nextLabel, enabled, hint) {
  return `<div class="nav-footer">
    <button class="btn ghost" type="button" data-nav="prev" ${ui.step === 0 ? 'disabled' : ''}>← Anterior</button>
    <div class="nav-right">${hint && !enabled ? `<span class="hint">${hint}</span>` : ''}
    ${ui.step < STEPS.length - 1 ? `<button class="btn primary" type="button" data-nav="next" ${enabled ? '' : 'disabled'}>${nextLabel} →</button>` : ''}</div>
  </div>`;
}

function bindNav() {
  $$('[data-nav]').forEach(b => b.addEventListener('click', () => go(ui.step + (b.dataset.nav === 'next' ? 1 : -1))));
}

// Pantalla alternativa cuando todavía no hay una orden.
function noOrderView(head) {
  const isClient = currentUser().role === 'cliente';
  return head + `<section class="card empty-state">
    <p>${isClient
      ? 'Aún no has contactado a ningún estudiante.'
      : 'Todavía no hay conversaciones para este usuario. Cambia a <strong>Juan Pérez · cliente</strong> y contacta el servicio, o abre otra pestaña con ese usuario.'}</p>
    ${isClient ? '<button class="btn primary" type="button" data-nav-to="1">Buscar servicios</button>' : ''}
  </section>` + navFooter('Siguiente', false);
}

/* ---------- 1. Perfil verificado (estudiante) ---------- */

function viewPerfil() {
  const s = DATA.services.find(x => x.studentId === VERIFIED_STUDENT_ID) || DATA.services[0];
  const v = verifSteps();
  const done = v.filter(Boolean).length;
  const ok = isVerified();
  return pageHead('Estudiante', 'Perfil universitario verificado',
    'Antes de publicar servicios, el estudiante valida su identidad y vínculo académico. El perfil verificado es la base de confianza de la plataforma.') + `
  <section class="grid two">
    <article class="card profile">
      <div class="avatar xl" style="background:${s.color}">${s.initials}</div>
      <h2>${s.student} ${ok ? '<span class="badge ok">✔ Verificado</span>' : '<span class="badge warn">Pendiente</span>'}</h2>
      <p class="muted">${s.career} · ${s.semester}.º semestre<br>${s.uni}</p>
      <dl class="facts">
        <div><dt>Horas de práctica</dt><dd>${s.hours} h</dd></div>
        <div><dt>Reputación</dt><dd>${stars(s.rating)} ${s.rating} (${s.reviews})</dd></div>
        <div><dt>Docente supervisor</dt><dd>${s.supervisor}</dd></div>
      </dl>
      <p class="scope"><strong>Alcance autorizado:</strong> ${s.scope}</p>
    </article>
    <article class="card">
      <h2>Verificación (${done}/${VERIFICATION_STEPS.length})</h2>
      <div class="progress"><span style="width:${done / VERIFICATION_STEPS.length * 100}%"></span></div>
      <ul class="checklist">
        ${VERIFICATION_STEPS.map((x, i) => `<li class="${v[i] ? 'ok' : ''}">
          <span class="tick">${v[i] ? '✓' : ''}</span>
          <div><strong>${x.title}</strong><small>${v[i] ? x.detail : 'Pendiente de validación'}</small></div></li>`).join('')}
      </ul>
      <button class="btn primary block" id="btn-verify" type="button" ${ok || verifying ? 'disabled' : ''}>
        ${ok ? 'Perfil verificado' : 'Simular verificación'}</button>
      <p class="note">En el MVP la verificación se valida con el correo institucional y un aval docente; la integración automática con sistemas universitarios queda para una fase posterior.</p>
    </article>
  </section>` + navFooter('Buscar servicios', ok, 'Completa la verificación para continuar');
}

function bindPerfil() {
  $('#btn-verify')?.addEventListener('click', async () => {
    verifying = true;
    for (let i = 0; i < VERIFICATION_STEPS.length; i++) {
      if (verifSteps()[i]) continue;
      await act(() => api(`/students/${VERIFIED_STUDENT_ID}/verify/${i}`, 'POST'));
      await new Promise(r => setTimeout(r, 600));
    }
    verifying = false;
    toast('Perfil verificado ✔');
    refresh(true);
  });
}

/* ---------- 2. Búsqueda y matching (cliente) ---------- */

function viewBusqueda() {
  const f = ui.filters;
  const isClient = currentUser().role === 'cliente';
  const list = DATA.services
    .filter(s => (f.category === 'all' || s.category === f.category) && s.price <= f.maxPrice && (f.mode === 'any' || s.mode === f.mode))
    .map(s => ({ s, score: matchScore(s) }))
    .sort((a, b) => (b.s.featured ? 1 : 0) - (a.s.featured ? 1 : 0) || b.score - a.score);
  const o = order();
  return pageHead('Cliente', 'Busca un servicio y recibe coincidencias',
    'Filtra por categoría, precio y modalidad; la plataforma ordena por coincidencia, cercanía y reputación. Un servicio “Destacado” es una oferta promocionada.') + `
  <section class="filters card">
    <label>Categoría
      <select id="f-cat">${CATEGORIES.map(c => `<option value="${c.id}" ${f.category === c.id ? 'selected' : ''}>${c.label}</option>`).join('')}</select></label>
    <label>Precio máximo: <strong id="f-price-v">${fmt(f.maxPrice)}</strong>
      <input id="f-price" type="range" min="15000" max="80000" step="5000" value="${f.maxPrice}"></label>
    <label>Modalidad
      <select id="f-mode">
        ${[['any', 'Cualquiera'], ['presencial', 'Presencial'], ['virtual', 'Virtual']].map(([v, l]) => `<option value="${v}" ${f.mode === v ? 'selected' : ''}>${l}</option>`).join('')}
      </select></label>
  </section>
  <section class="results">
    ${list.length ? list.map(({ s, score }) => `
    <article class="card service ${o?.serviceId === s.id ? 'selected' : ''}">
      ${s.featured ? '<span class="badge feat">Destacado</span>' : ''}
      <div class="service-top">
        <div class="avatar" style="background:${s.color}">${s.initials}</div>
        <div><h3>${s.title}</h3>
          <p class="muted">${s.student} · ${s.career} · ${s.semester}.º sem. <span class="badge ok sm">✔ Verificado</span></p></div>
        <div class="match" title="Coincidencia estimada"><strong>${score}%</strong><small>match</small></div>
      </div>
      <p class="scope">${s.scope}</p>
      <ul class="meta">
        <li>${stars(s.rating)} ${s.rating} (${s.reviews})</li>
        <li>${s.mode === 'virtual' ? '💻 Virtual' : '📍 ' + s.distance + ' km'}</li>
        <li>🗓 ${s.availability}</li>
        <li>🎓 Supervisa: ${s.supervisor}</li>
      </ul>
      <div class="service-foot"><span class="price">${fmt(s.price)}</span>
        <button class="btn primary" type="button" data-pick="${s.id}" ${isClient ? '' : 'disabled title="Entra como cliente para contactar"'}>Contactar</button></div>
    </article>`).join('') : '<p class="empty card">Sin resultados con esos filtros. Prueba ampliar el precio o la categoría.</p>'}
  </section>` + navFooter('Ir al chat', !!o, 'Contacta un servicio para continuar');
}

function bindBusqueda() {
  const upd = () => { saveUi(); render(); };
  $('#f-cat').addEventListener('change', e => { ui.filters.category = e.target.value; upd(); });
  $('#f-mode').addEventListener('change', e => { ui.filters.mode = e.target.value; upd(); });
  $('#f-price').addEventListener('input', e => { $('#f-price-v').textContent = fmt(e.target.value); });
  $('#f-price').addEventListener('change', e => { ui.filters.maxPrice = +e.target.value; upd(); });
  $$('[data-pick]').forEach(b => b.addEventListener('click', async () => {
    try {
      const o = await api('/orders', 'POST', { serviceId: b.dataset.pick, clientId: ui.userId });
      ui.orderId = o.id; ui.serviceId = o.serviceId; saveUi();
      await refresh(true);
      go(2);
    } catch (e) { toast(e.message); }
  }));
}

/* ---------- 3. Chat ---------- */

function viewChat() {
  const head = pageHead('Cliente y estudiante', 'Chat para aclarar condiciones',
    'Cliente y estudiante conversan dentro de la plataforma para precisar alcance, precio y supervisión antes de agendar.');
  const o = order();
  if (!o) return noOrderView(head);
  const s = serviceById(o.serviceId);
  const user = currentUser();
  const me = user.role === 'cliente' ? 'client' : 'student';
  const canWrite = user.role !== 'docente';
  const msgs = o.messages.map(m => m.sender === 'system'
    ? `<div class="sys"><strong>✔ Condiciones acordadas</strong><br>${esc(m.text)}</div>`
    : `<div class="msg ${m.sender === me ? 'client' : 'student'}"><span>${esc(m.text)}</span></div>`).join('');
  const clientMsgs = o.messages.filter(m => m.sender === 'client').length;
  return head + `
  <section class="grid chat-grid">
    <article class="card chat">
      <div class="chat-head"><div class="avatar" style="background:${s.color}">${s.initials}</div>
        <div><strong>${s.student}</strong><small>${s.title} · ${fmt(s.price)}</small></div></div>
      <div class="chat-body" id="chat-body">${msgs}</div>
      ${user.role === 'cliente' ? `<div class="quick">${QUICK_REPLIES.map((q, i) => `<button class="chip" type="button" data-q="${i}">${q}</button>`).join('')}</div>` : ''}
      <form class="chat-form" id="chat-form">
        <input id="chat-input" type="text" placeholder="${canWrite ? 'Escribe un mensaje…' : 'El docente no participa en el chat'}" autocomplete="off" maxlength="200" ${canWrite ? '' : 'disabled'}>
        <button class="btn primary" type="submit" ${canWrite ? '' : 'disabled'}>Enviar</button>
      </form>
    </article>
    <aside class="card side">
      <h2>Ficha del servicio</h2>
      <dl class="facts">
        <div><dt>Alcance</dt><dd>${s.scope}</dd></div>
        <div><dt>Precio</dt><dd>${fmt(s.price)}</dd></div>
        <div><dt>Supervisión</dt><dd>${s.supervisor}</dd></div>
        <div><dt>Disponibilidad</dt><dd>${s.availability}</dd></div>
      </dl>
      <button class="btn secondary block" id="btn-agree" type="button" ${o.agreed || clientMsgs < 1 ? 'disabled' : ''}>
        ${o.agreed ? 'Condiciones acordadas ✔' : 'Aceptar condiciones'}</button>
      ${clientMsgs < 1 && !o.agreed ? '<p class="note">El cliente debe escribir al menos un mensaje para poder acordar.</p>' : ''}
      <label class="toggle"><input type="checkbox" id="chk-auto" ${o.autoreply ? 'checked' : ''}> Respuesta automática del estudiante (demo en solitario)</label>
    </aside>
  </section>` + navFooter('Agendar cita', o.agreed, 'Acepta las condiciones para continuar');
}

function bindChat() {
  const o = order();
  if (!o) return;
  const body = $('#chat-body');
  body.scrollTop = body.scrollHeight;
  const send = text => {
    text = text.trim();
    if (!text) return;
    act(() => api(`/orders/${o.id}/messages`, 'POST', { userId: ui.userId, text }));
  };
  $('#chat-form').addEventListener('submit', e => { e.preventDefault(); send($('#chat-input').value); $('#chat-input').value = ''; });
  $$('[data-q]').forEach(b => b.addEventListener('click', () => send(QUICK_REPLIES[+b.dataset.q])));
  $('#btn-agree').addEventListener('click', () => act(() => api(`/orders/${o.id}/agree`, 'POST')));
  $('#chk-auto').addEventListener('change', e => act(() => api(`/orders/${o.id}/autoreply`, 'POST', { on: e.target.checked })));
  // El chat se actualiza con el sondeo; durante la respuesta guionada refrescamos una vez más.
  setTimeout(() => ui.step === 2 && refresh(), 1100);
}

/* ---------- 4. Agendamiento + pago retenido ---------- */

function slotsForDays() {
  const days = [];
  const d = new Date();
  while (days.length < 4) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0) {
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      days.push({ key, label: d.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' }), times: ['09:00', '11:00', '14:00', '16:30'] });
    }
  }
  return days;
}

let pendingSlot = null; // horario elegido, aún sin confirmar

function viewAgenda() {
  const head = pageHead('Cliente', 'Agenda tu cita',
    'Elige un horario disponible del estudiante. Al confirmar, el pago queda retenido por la plataforma hasta que el servicio se cierre.');
  const o = order();
  if (!o) return noOrderView(head);
  const s = serviceById(o.serviceId);
  const slot = o.slot || pendingSlot;
  const fee = o.paid ? o.fee : Math.round(s.price * DATA.feeRate);
  const total = o.paid ? o.amount : s.price + fee;
  return head + `
  <section class="grid two">
    <article class="card">
      <h2>Horarios disponibles</h2>
      ${slotsForDays().map(d => `<div class="day"><strong>${d.label}</strong><div class="slots">
        ${d.times.map(t => { const k = d.key + ' ' + t; return `<button type="button" class="slot ${slot === k ? 'on' : ''}" data-slot="${k}" ${o.paid ? 'disabled' : ''}>${t}</button>`; }).join('')}
      </div></div>`).join('')}
    </article>
    <article class="card">
      <h2>Resumen y pago</h2>
      <dl class="facts">
        <div><dt>Servicio</dt><dd>${s.title}</dd></div>
        <div><dt>Estudiante</dt><dd>${s.student} <span class="badge ok sm">✔</span></dd></div>
        <div><dt>Cita</dt><dd>${slot ? slot.replace(' ', ' · ') : 'Sin seleccionar'}</dd></div>
        <div><dt>Servicio</dt><dd>${fmt(s.price)}</dd></div>
        <div><dt>Tarifa de plataforma (${Math.round(DATA.feeRate * 100)} %)</dt><dd>${fmt(fee)}</dd></div>
        <div class="total"><dt>Total</dt><dd>${fmt(total)}</dd></div>
      </dl>
      <div class="escrow-note">🔒 Pago retenido: el estudiante no recibe el dinero hasta que cierres el servicio.</div>
      <button class="btn primary block" id="btn-pay" type="button" ${!slot || o.paid ? 'disabled' : ''}>
        ${o.paid ? 'Cita confirmada y pago retenido ✔' : 'Confirmar y pagar (simulado)'}</button>
      ${o.paid ? '<p class="note ok">Recordatorio programado: te avisaremos 24 h antes de la cita.</p>' : '<p class="note">No se ingresa ninguna tarjeta: el pago es una simulación.</p>'}
    </article>
  </section>` + navFooter('Ir a la cita', o.paid, 'Elige horario y confirma para continuar');
}

function bindAgenda() {
  const o = order();
  if (!o) return;
  $$('[data-slot]').forEach(b => b.addEventListener('click', () => { pendingSlot = b.dataset.slot; render(); }));
  $('#btn-pay').addEventListener('click', async () => {
    await act(() => api(`/orders/${o.id}/book`, 'POST', { slot: pendingSlot }));
    toast('Cita agendada · pago retenido 🔒');
  });
}

/* ---------- 5. Supervisión y reputación ---------- */

function rateWidget(who, value, enabled) {
  return `<span class="rate" data-who="${who}">${[1, 2, 3, 4, 5].map(n =>
    `<button type="button" class="star ${n <= value ? 'on' : ''}" data-val="${n}" ${enabled ? '' : 'disabled'} aria-label="${n} estrellas">★</button>`).join('')}</span>`;
}

function viewSupervision() {
  const head = pageHead('Estudiante, docente y cliente', 'Supervisión y reputación',
    'El docente supervisor valida que el servicio se cumpla dentro del alcance. Al cerrar, ambas partes se califican y la reputación se actualiza.');
  const o = order();
  if (!o) return noOrderView(head);
  if (!o.paid) return head + `<section class="card empty-state"><p>Primero hay que agendar la cita y retener el pago.</p>
    <button class="btn primary" type="button" data-nav-to="3">Ir a agendamiento</button></section>` + navFooter('Ver pago', false);
  const s = serviceById(o.serviceId);
  const allSup = o.serviceDone;
  const canRate = allSup && !o.rated;
  const r = o.rated ? o.ratings : ui.draft;
  return head + `
  <section class="grid two">
    <article class="card">
      <h2>Supervisión docente</h2>
      <p class="muted">${s.supervisor}</p>
      <ul class="checklist">
        ${SUPERVISION_STEPS.map((t, i) => `<li class="${o.supervision[i] ? 'ok' : ''}"><span class="tick">${o.supervision[i] ? '✓' : ''}</span>
          <div><strong>${t}</strong></div></li>`).join('')}
      </ul>
      <button class="btn secondary block" id="btn-sup" type="button" ${allSup ? 'disabled' : ''}>
        ${allSup ? 'Servicio cerrado con aval docente ✔' : 'Simular siguiente paso de supervisión'}</button>
    </article>
    <article class="card ${allSup ? '' : 'locked'}">
      <h2>Calificación bidireccional</h2>
      ${allSup ? '' : '<p class="note">Se habilita cuando el docente cierra el servicio.</p>'}
      <div class="rate-row"><span>Cliente califica al estudiante</span>${rateWidget('client', r.client, canRate)}</div>
      <div class="rate-row"><span>Estudiante califica al cliente</span>${rateWidget('student', r.student, canRate)}</div>
      <textarea id="rate-comment" rows="2" maxlength="160" placeholder="Comentario (opcional)" ${canRate ? '' : 'disabled'}>${esc(r.comment || '')}</textarea>
      <button class="btn primary block" id="btn-rate" type="button" ${canRate && r.client && r.student ? '' : 'disabled'}>
        ${o.rated ? 'Calificaciones enviadas ✔' : 'Enviar calificaciones'}</button>
      <div class="rep">
        <div class="avatar" style="background:${s.color}">${s.initials}</div>
        <div><strong>Reputación de ${s.student.split(' ')[0]}</strong><br>${stars(s.rating)} <b>${s.rating}</b>
          <small>(${s.reviews} reseñas${o.rated ? ', actualizada' : ''})</small></div>
      </div>
    </article>
  </section>` + navFooter('Ver pago', o.rated, 'Califica para cerrar el servicio');
}

function bindSupervision() {
  const o = order();
  if (!o || !o.paid) return;
  $('#btn-sup').addEventListener('click', () => act(() => api(`/orders/${o.id}/supervision/advance`, 'POST')));
  $$('.rate').forEach(w => $$('.star', w).forEach(b => b.addEventListener('click', () => {
    ui.draft.comment = $('#rate-comment').value;
    ui.draft[w.dataset.who] = +b.dataset.val; saveUi(); render();
  })));
  $('#btn-rate').addEventListener('click', async () => {
    const d = { client: ui.draft.client, student: ui.draft.student, comment: $('#rate-comment').value };
    await act(() => api(`/orders/${o.id}/rate`, 'POST', d));
    ui.draft = { client: 0, student: 0, comment: '' }; saveUi();
    toast('Reputación actualizada ⭐');
  });
}

/* ---------- 6. Pago retenido / liberación ---------- */

function viewPago() {
  const head = pageHead('Cliente y plataforma', 'Pago retenido y liberación',
    'El dinero queda en custodia hasta que el servicio se cierre. Simulación: en este MVP no se mueve dinero real ni hay un sistema completo de disputas.');
  const o = order();
  if (!o) return noOrderView(head);
  const s = serviceById(o.serviceId);
  const e = o.escrow;
  const stages = [
    { t: 'Pago depositado', d: o.paid ? `${fmt(o.amount)} recibidos` : 'Aún sin pago', ok: o.paid },
    { t: 'Retenido en custodia', d: 'El dinero no está disponible para el estudiante', ok: e === 'held' || e === 'released' || e === 'dispute' },
    { t: 'Servicio cerrado con aval docente', d: o.serviceDone ? 'Supervisión completada' : 'Pendiente de cierre', ok: o.serviceDone },
    { t: 'Pago liberado', d: e === 'released' ? `${fmt(o.amount - o.fee)} al estudiante · ${fmt(o.fee)} tarifa de plataforma` : 'Se libera al confirmar el cierre', ok: e === 'released' }
  ];
  const stateLabel = { none: 'Sin pago', held: 'Retenido 🔒', released: 'Liberado ✔', dispute: 'En revisión ⚠' }[e];
  return head + `
  <section class="grid two">
    <article class="card">
      <h2>Estado del pago <span class="badge ${e === 'released' ? 'ok' : e === 'dispute' ? 'warn' : 'info'}">${stateLabel}</span></h2>
      <ol class="timeline">
        ${stages.map(x => `<li class="${x.ok ? 'ok' : ''}"><span class="dot">${x.ok ? '✓' : ''}</span><div><strong>${x.t}</strong><small>${x.d}</small></div></li>`).join('')}
      </ol>
    </article>
    <article class="card">
      <h2>Acciones</h2>
      <dl class="facts">
        <div><dt>Servicio</dt><dd>${s.title}</dd></div>
        <div><dt>Monto retenido</dt><dd>${o.paid ? fmt(o.amount) : '—'}</dd></div>
      </dl>
      ${!o.paid ? '<p class="note">Aún no hay pago. Se retiene al confirmar la cita en el paso de agendamiento.</p>' : ''}
      <button class="btn primary block" id="btn-release" type="button" ${e === 'held' && o.serviceDone ? '' : 'disabled'}>Confirmar servicio y liberar pago</button>
      <button class="btn ghost block" id="btn-dispute" type="button" ${e === 'held' ? '' : 'disabled'}>Reportar un problema</button>
      ${e === 'held' && !o.serviceDone ? '<p class="note">Para liberar el pago, el docente debe cerrar el servicio (paso anterior).</p>' : ''}
      ${e === 'dispute' ? '<p class="note">El pago sigue retenido mientras el equipo revisa el caso (flujo simplificado).</p>' : ''}
      ${e === 'released' ? '<p class="note ok">¡Flujo completo! Perfil → matching → chat → cita → supervisión y reputación → pago liberado.</p>' : ''}
    </article>
  </section>` + navFooter('', true) + (e === 'released' ? '<div class="center"><button class="btn secondary" id="btn-again" type="button">Repetir demo</button></div>' : '');
}

function bindPago() {
  const o = order();
  if (!o) return;
  $('#btn-release').addEventListener('click', async () => { await act(() => api(`/orders/${o.id}/release`, 'POST')); toast('Pago liberado al estudiante ✔'); });
  $('#btn-dispute').addEventListener('click', () => act(() => api(`/orders/${o.id}/dispute`, 'POST')));
  $('#btn-again')?.addEventListener('click', resetDemo);
}

/* ---------- Render principal ---------- */

const VIEWS = [
  [viewPerfil, bindPerfil], [viewBusqueda, bindBusqueda], [viewChat, bindChat],
  [viewAgenda, bindAgenda], [viewSupervision, bindSupervision], [viewPago, bindPago]
];

function render() {
  // Conserva lo que el usuario está escribiendo cuando el sondeo redibuja.
  const active = document.activeElement;
  const keep = active && ['chat-input', 'rate-comment'].includes(active.id)
    ? { id: active.id, value: active.value, pos: active.selectionStart } : null;

  const [view, bind] = VIEWS[ui.step];
  renderUserSelect();
  renderStepper();
  $('#view').innerHTML = view();
  bind();
  bindNav();
  $$('[data-nav-to]').forEach(b => b.addEventListener('click', () => go(+b.dataset.navTo)));

  if (keep) {
    const el = document.getElementById(keep.id);
    if (el && !el.disabled) { el.value = keep.value; el.focus(); el.setSelectionRange(keep.pos, keep.pos); }
  }
}

async function resetDemo() {
  await act(() => api('/reset', 'POST'));
  Object.assign(ui, { step: 0, orderId: null, serviceId: null, draft: { client: 0, student: 0, comment: '' } });
  pendingSlot = null;
  saveUi();
  render();
  window.scrollTo({ top: 0 });
}

$('#btn-reset').addEventListener('click', resetDemo);
$('#user-select').addEventListener('change', e => {
  ui.userId = e.target.value; ui.orderId = null; saveUi();
  refresh(true);
  toast('Ahora estás como ' + currentUser().name);
});

refresh(true);
setInterval(refresh, POLL_MS);
