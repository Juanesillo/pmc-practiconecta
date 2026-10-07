// Prototipo PMC: flujo principal simulado, sin backend.
const STEPS = [
  { id: 'perfil', label: 'Perfil verificado' },
  { id: 'busqueda', label: 'Búsqueda y matching' },
  { id: 'chat', label: 'Chat' },
  { id: 'agenda', label: 'Agendamiento' },
  { id: 'supervision', label: 'Supervisión y reputación' },
  { id: 'pago', label: 'Pago retenido' }
];

const STORE_KEY = 'pmc-proto-v1';

const initialState = () => ({
  step: 0,
  verif: [false, false, false, false],
  filters: { category: 'all', maxPrice: 60000, mode: 'any' },
  selectedId: null,
  chat: [],
  agreed: false,
  slot: null,
  paid: false,
  supervision: [false, false, false],
  serviceDone: false,
  ratings: { client: 0, student: 0, comment: '' },
  rated: false,
  escrow: 'none' // none | held | released | dispute
});

let state = load();

function load() {
  try {
    const raw = sessionStorage.getItem(STORE_KEY);
    if (raw) return Object.assign(initialState(), JSON.parse(raw));
  } catch (e) { /* sin storage: la demo sigue en memoria */ }
  return initialState();
}

function save() {
  try { sessionStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* ignorar */ }
}

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const fmt = n => '$' + Number(n).toLocaleString('es-CO');
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const verified = () => state.verif.every(Boolean);
const selected = () => SERVICES.find(s => s.id === state.selectedId) || SERVICES[0];

function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => el.classList.remove('show'), 2600);
}

function go(step) {
  state.step = Math.max(0, Math.min(STEPS.length - 1, step));
  save();
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
  const f = state.filters;
  let score = 40;
  if (f.category === 'all' || f.category === s.category) score += 30; else score -= 25;
  if (s.price <= f.maxPrice) score += 15; else score -= 15;
  if (f.mode === 'any' || f.mode === s.mode) score += 8; else score -= 8;
  score += Math.max(0, 7 - s.distance);
  score += (s.rating - 4) * 5;
  return Math.max(5, Math.min(99, Math.round(score)));
}

/* ---------- Vistas ---------- */

function renderStepper() {
  $('#stepper').innerHTML = STEPS.map((s, i) => {
    const cls = i === state.step ? 'active' : i < state.step ? 'done' : '';
    return `<button type="button" class="step ${cls}" data-step="${i}" ${i === state.step ? 'aria-current="step"' : ''}>
      <span class="step-n">${i < state.step ? '✓' : i + 1}</span><span class="step-l">${s.label}</span></button>`;
  }).join('');
  $$('#stepper .step').forEach(b => b.addEventListener('click', () => go(+b.dataset.step)));
}

function pageHead(role, title, lead) {
  return `<div class="page-head"><span class="role-chip">${role}</span><h1>${title}</h1><p class="lead">${lead}</p></div>`;
}

function navFooter(nextLabel, enabled, hint) {
  return `<div class="nav-footer">
    <button class="btn ghost" type="button" data-nav="prev" ${state.step === 0 ? 'disabled' : ''}>← Anterior</button>
    <div class="nav-right">${hint && !enabled ? `<span class="hint">${hint}</span>` : ''}
    ${state.step < STEPS.length - 1 ? `<button class="btn primary" type="button" data-nav="next" ${enabled ? '' : 'disabled'}>${nextLabel} →</button>` : ''}</div>
  </div>`;
}

function bindNav() {
  $$('[data-nav]').forEach(b => b.addEventListener('click', () => go(state.step + (b.dataset.nav === 'next' ? 1 : -1))));
}

/* 1. Perfil verificado (rol: estudiante) */
function viewPerfil() {
  const s = SERVICES[0];
  const done = state.verif.filter(Boolean).length;
  return pageHead('Estudiante', 'Perfil universitario verificado',
    'Antes de publicar servicios, el estudiante valida su identidad y vínculo académico. El perfil verificado es la base de confianza de la plataforma.') + `
  <section class="grid two">
    <article class="card profile">
      <div class="avatar xl" style="background:${s.color}">${s.initials}</div>
      <h2>${s.student} ${verified() ? '<span class="badge ok">✔ Verificado</span>' : '<span class="badge warn">Pendiente</span>'}</h2>
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
        ${VERIFICATION_STEPS.map((v, i) => `<li class="${state.verif[i] ? 'ok' : ''}">
          <span class="tick">${state.verif[i] ? '✓' : ''}</span>
          <div><strong>${v.title}</strong><small>${state.verif[i] ? v.detail : 'Pendiente de validación'}</small></div></li>`).join('')}
      </ul>
      <button class="btn primary block" id="btn-verify" type="button" ${verified() ? 'disabled' : ''}>
        ${verified() ? 'Perfil verificado' : 'Simular verificación'}</button>
      <p class="note">En el MVP la verificación se valida con el correo institucional y un aval docente; la integración automática con sistemas universitarios queda para una fase posterior.</p>
    </article>
  </section>` + navFooter('Buscar servicios', verified(), 'Completa la verificación para continuar');
}

function bindPerfil() {
  $('#btn-verify')?.addEventListener('click', e => {
    e.target.disabled = true;
    let i = 0;
    const tick = () => {
      state.verif[i] = true; i++;
      save(); render();
      if (i < state.verif.length) setTimeout(tick, 650); else toast('Perfil verificado ✔');
    };
    tick();
  });
}

/* 2. Búsqueda / matching (rol: cliente) */
function viewBusqueda() {
  const f = state.filters;
  const list = SERVICES
    .filter(s => (f.category === 'all' || s.category === f.category) && s.price <= f.maxPrice && (f.mode === 'any' || s.mode === f.mode))
    .map(s => ({ s, score: matchScore(s) }))
    .sort((a, b) => (b.s.featured ? 1 : 0) - (a.s.featured ? 1 : 0) || b.score - a.score);
  return pageHead('Cliente', 'Busca un servicio y recibe coincidencias',
    `${CLIENT.name} necesita: “${CLIENT.need}”. Filtra por categoría, precio y modalidad; la plataforma ordena por coincidencia, cercanía y reputación.`) + `
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
    <article class="card service ${state.selectedId === s.id ? 'selected' : ''}">
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
        <button class="btn primary" type="button" data-pick="${s.id}">Contactar</button></div>
    </article>`).join('') : '<p class="empty card">Sin resultados con esos filtros. Prueba ampliar el precio o la categoría.</p>'}
  </section>` + navFooter('Ir al chat', !!state.selectedId, 'Elige un servicio para continuar');
}

function bindBusqueda() {
  const upd = () => { save(); render(); };
  $('#f-cat').addEventListener('change', e => { state.filters.category = e.target.value; upd(); });
  $('#f-mode').addEventListener('change', e => { state.filters.mode = e.target.value; upd(); });
  $('#f-price').addEventListener('input', e => { $('#f-price-v').textContent = fmt(e.target.value); });
  $('#f-price').addEventListener('change', e => { state.filters.maxPrice = +e.target.value; upd(); });
  $$('[data-pick]').forEach(b => b.addEventListener('click', () => {
    if (state.selectedId !== b.dataset.pick) { state.chat = []; state.agreed = false; state.slot = null; }
    state.selectedId = b.dataset.pick;
    go(2);
  }));
}

/* 3. Chat */
function viewChat() {
  const s = selected();
  if (!state.chat.length) {
    state.chat.push({ from: 'student', text: `Hola ${CLIENT.name.split(' ')[0]}, soy ${s.student.split(' ')[0]}. Vi que te interesa “${s.title}”. ¿En qué te puedo ayudar?` });
  }
  const msgs = state.chat.map(m => m.system
    ? `<div class="sys"><strong>✔ Condiciones acordadas</strong><br>${m.text}</div>`
    : `<div class="msg ${m.from}"><span>${esc(m.text)}</span></div>`).join('');
  const clientMsgs = state.chat.filter(m => m.from === 'client').length;
  return pageHead('Cliente y estudiante', 'Chat para aclarar condiciones',
    'Cliente y estudiante conversan dentro de la plataforma para precisar alcance, precio y supervisión antes de agendar.') + `
  <section class="grid chat-grid">
    <article class="card chat">
      <div class="chat-head"><div class="avatar" style="background:${s.color}">${s.initials}</div>
        <div><strong>${s.student}</strong><small>${s.title} · ${fmt(s.price)}</small></div></div>
      <div class="chat-body" id="chat-body">${msgs}</div>
      <div class="quick">${QUICK_REPLIES.map((q, i) => `<button class="chip" type="button" data-q="${i}">${q}</button>`).join('')}</div>
      <form class="chat-form" id="chat-form">
        <input id="chat-input" type="text" placeholder="Escribe un mensaje…" autocomplete="off" maxlength="200">
        <button class="btn primary" type="submit">Enviar</button>
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
      <button class="btn secondary block" id="btn-agree" type="button" ${state.agreed || clientMsgs < 1 ? 'disabled' : ''}>
        ${state.agreed ? 'Condiciones acordadas ✔' : 'Aceptar condiciones'}</button>
      ${clientMsgs < 1 && !state.agreed ? '<p class="note">Escribe al menos un mensaje para poder acordar.</p>' : ''}
    </aside>
  </section>` + navFooter('Agendar cita', state.agreed, 'Acepta las condiciones para continuar');
}

function bindChat() {
  const body = $('#chat-body');
  body.scrollTop = body.scrollHeight;
  const send = text => {
    text = text.trim();
    if (!text) return;
    const n = state.chat.filter(m => m.from === 'client').length;
    state.chat.push({ from: 'client', text });
    save(); render();
    setTimeout(() => {
      state.chat.push({ from: 'student', text: CHAT_SCRIPT[Math.min(n, CHAT_SCRIPT.length - 1)] });
      save(); if (state.step === 2) render();
    }, 800);
  };
  $('#chat-form').addEventListener('submit', e => { e.preventDefault(); send($('#chat-input').value); });
  $$('[data-q]').forEach(b => b.addEventListener('click', () => send(QUICK_REPLIES[+b.dataset.q])));
  $('#btn-agree').addEventListener('click', () => {
    const s = selected();
    state.agreed = true;
    state.chat.push({ system: true, from: 'system', text: `${esc(s.title)} · ${fmt(s.price)} · supervisa ${esc(s.supervisor)}.` });
    save(); render();
  });
}

/* 4. Agendamiento + pago retenido (depósito) */
function slotsForDays() {
  const days = [];
  const d = new Date();
  while (days.length < 4) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0) {
      days.push({
        key: d.toISOString().slice(0, 10),
        label: d.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' }),
        times: ['09:00', '11:00', '14:00', '16:30']
      });
    }
  }
  return days;
}

function viewAgenda() {
  const s = selected();
  const fee = Math.round(s.price * PAYMENT_FEE_RATE);
  const total = s.price + fee;
  return pageHead('Cliente', 'Agenda tu cita',
    'Elige un horario disponible del estudiante. Al confirmar, el pago queda retenido por la plataforma hasta que el servicio se cierre.') + `
  <section class="grid two">
    <article class="card">
      <h2>Horarios disponibles</h2>
      ${slotsForDays().map(d => `<div class="day"><strong>${d.label}</strong><div class="slots">
        ${d.times.map(t => { const k = d.key + ' ' + t; return `<button type="button" class="slot ${state.slot === k ? 'on' : ''}" data-slot="${k}" ${state.paid ? 'disabled' : ''}>${t}</button>`; }).join('')}
      </div></div>`).join('')}
    </article>
    <article class="card">
      <h2>Resumen y pago</h2>
      <dl class="facts">
        <div><dt>Servicio</dt><dd>${s.title}</dd></div>
        <div><dt>Estudiante</dt><dd>${s.student} <span class="badge ok sm">✔</span></dd></div>
        <div><dt>Cita</dt><dd>${state.slot ? state.slot.replace(' ', ' · ') : 'Sin seleccionar'}</dd></div>
        <div><dt>Servicio</dt><dd>${fmt(s.price)}</dd></div>
        <div><dt>Tarifa de plataforma (5 %)</dt><dd>${fmt(fee)}</dd></div>
        <div class="total"><dt>Total</dt><dd>${fmt(total)}</dd></div>
      </dl>
      <div class="escrow-note">🔒 Pago retenido: el estudiante no recibe el dinero hasta que cierres el servicio.</div>
      <button class="btn primary block" id="btn-pay" type="button" ${!state.slot || state.paid ? 'disabled' : ''}>
        ${state.paid ? 'Cita confirmada y pago retenido ✔' : 'Confirmar y pagar (simulado)'}</button>
      ${state.paid ? '<p class="note ok">Recordatorio programado: te avisaremos 24 h antes de la cita.</p>' : '<p class="note">No se ingresa ninguna tarjeta: el pago es una simulación.</p>'}
    </article>
  </section>` + navFooter('Ir a la cita', state.paid, 'Elige horario y confirma para continuar');
}

function bindAgenda() {
  $$('[data-slot]').forEach(b => b.addEventListener('click', () => { state.slot = b.dataset.slot; save(); render(); }));
  $('#btn-pay').addEventListener('click', () => {
    state.paid = true; state.escrow = 'held';
    save(); render(); toast('Cita agendada · pago retenido 🔒');
  });
}

/* 5. Supervisión y reputación */
const SUPERVISION_STEPS = [
  'El docente aprueba el plan de atención antes de la cita',
  'Supervisión en sitio o en línea durante el servicio',
  'El docente firma el cierre y valida la práctica'
];

function viewSupervision() {
  const s = selected();
  const allSup = state.supervision.every(Boolean);
  const r = state.ratings;
  const newAvg = state.rated ? ((s.rating * s.reviews + (r.client + r.student) / 2) / (s.reviews + 1)).toFixed(2) : s.rating;
  return pageHead('Estudiante, docente y cliente', 'Supervisión y reputación',
    'El docente supervisor valida que el servicio se cumpla dentro del alcance. Al cerrar, ambas partes se califican y la reputación se actualiza.') + `
  <section class="grid two">
    <article class="card">
      <h2>Supervisión docente</h2>
      <p class="muted">${s.supervisor}</p>
      <ul class="checklist">
        ${SUPERVISION_STEPS.map((t, i) => `<li class="${state.supervision[i] ? 'ok' : ''}"><span class="tick">${state.supervision[i] ? '✓' : ''}</span>
          <div><strong>${t}</strong></div></li>`).join('')}
      </ul>
      <button class="btn secondary block" id="btn-sup" type="button" ${allSup ? 'disabled' : ''}>
        ${allSup ? 'Servicio cerrado con aval docente ✔' : 'Simular siguiente paso de supervisión'}</button>
    </article>
    <article class="card ${allSup ? '' : 'locked'}">
      <h2>Calificación bidireccional</h2>
      ${allSup ? '' : '<p class="note">Se habilita cuando el docente cierra el servicio.</p>'}
      <div class="rate-row"><span>Cliente califica al estudiante</span>${rateWidget('client', r.client, allSup && !state.rated)}</div>
      <div class="rate-row"><span>Estudiante califica al cliente</span>${rateWidget('student', r.student, allSup && !state.rated)}</div>
      <textarea id="rate-comment" rows="2" maxlength="160" placeholder="Comentario (opcional)" ${allSup && !state.rated ? '' : 'disabled'}>${esc(r.comment)}</textarea>
      <button class="btn primary block" id="btn-rate" type="button" ${allSup && !state.rated && r.client && r.student ? '' : 'disabled'}>
        ${state.rated ? 'Calificaciones enviadas ✔' : 'Enviar calificaciones'}</button>
      <div class="rep">
        <div class="avatar" style="background:${s.color}">${s.initials}</div>
        <div><strong>Reputación de ${s.student.split(' ')[0]}</strong><br>${stars(Math.round(newAvg))} <b>${newAvg}</b>
          <small>${state.rated ? '(actualizada)' : `(${s.reviews} reseñas)`}</small></div>
      </div>
    </article>
  </section>` + navFooter('Ver pago', state.rated, 'Califica para cerrar el servicio');
}

function rateWidget(who, value, enabled) {
  return `<span class="rate" data-who="${who}">${[1, 2, 3, 4, 5].map(n =>
    `<button type="button" class="star ${n <= value ? 'on' : ''}" data-val="${n}" ${enabled ? '' : 'disabled'} aria-label="${n} estrellas">★</button>`).join('')}</span>`;
}

function bindSupervision() {
  $('#btn-sup').addEventListener('click', () => {
    const i = state.supervision.findIndex(v => !v);
    if (i >= 0) { state.supervision[i] = true; state.serviceDone = state.supervision.every(Boolean); save(); render(); }
  });
  $$('.rate').forEach(w => $$('.star', w).forEach(b => b.addEventListener('click', () => {
    state.ratings.comment = $('#rate-comment').value;
    state.ratings[w.dataset.who] = +b.dataset.val; save(); render();
  })));
  $('#btn-rate').addEventListener('click', () => {
    state.ratings.comment = $('#rate-comment').value;
    state.rated = true; save(); render(); toast('Reputación actualizada ⭐');
  });
}

/* 6. Pago retenido / liberación */
function viewPago() {
  const s = selected();
  const fee = Math.round(s.price * PAYMENT_FEE_RATE);
  const total = s.price + fee;
  const e = state.escrow;
  const stages = [
    { t: 'Pago depositado', d: `${fmt(total)} recibidos de ${CLIENT.name}`, ok: state.paid },
    { t: 'Retenido en custodia', d: 'El dinero no está disponible para el estudiante', ok: e === 'held' || e === 'released' || e === 'dispute' },
    { t: 'Servicio cerrado con aval docente', d: state.serviceDone ? 'Supervisión completada' : 'Pendiente de cierre', ok: state.serviceDone },
    { t: 'Pago liberado', d: e === 'released' ? `${fmt(s.price)} al estudiante · ${fmt(fee)} tarifa de plataforma` : 'Se libera al confirmar el cierre', ok: e === 'released' }
  ];
  const stateLabel = { none: 'Sin pago', held: 'Retenido 🔒', released: 'Liberado ✔', dispute: 'En revisión ⚠' }[e];
  return pageHead('Cliente y plataforma', 'Pago retenido y liberación',
    'El dinero queda en custodia hasta que el servicio se cierre. Simulación: en este MVP no se mueve dinero real ni hay un sistema completo de disputas.') + `
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
        <div><dt>Monto retenido</dt><dd>${state.paid ? fmt(total) : '—'}</dd></div>
      </dl>
      ${!state.paid ? '<button class="btn secondary block" id="btn-deposit" type="button">Simular depósito retenido</button>' : ''}
      <button class="btn primary block" id="btn-release" type="button" ${e === 'held' && state.serviceDone ? '' : 'disabled'}>Confirmar servicio y liberar pago</button>
      <button class="btn ghost block" id="btn-dispute" type="button" ${e === 'held' ? '' : 'disabled'}>Reportar un problema</button>
      ${e === 'held' && !state.serviceDone ? '<p class="note">Para liberar el pago, el docente debe cerrar el servicio (paso anterior).</p>' : ''}
      ${e === 'dispute' ? '<p class="note">El pago sigue retenido mientras el equipo revisa el caso (flujo simplificado).</p>' : ''}
      ${e === 'released' ? '<p class="note ok">¡Flujo completo! Perfil → matching → chat → cita → supervisión y reputación → pago liberado.</p>' : ''}
    </article>
  </section>` + navFooter('', true) + (e === 'released' ? '<div class="center"><button class="btn secondary" id="btn-again" type="button">Repetir demo</button></div>' : '');
}

function bindPago() {
  $('#btn-deposit')?.addEventListener('click', () => { state.paid = true; state.escrow = 'held'; save(); render(); });
  $('#btn-release').addEventListener('click', () => { state.escrow = 'released'; save(); render(); toast('Pago liberado al estudiante ✔'); });
  $('#btn-dispute').addEventListener('click', () => { state.escrow = 'dispute'; save(); render(); });
  $('#btn-again')?.addEventListener('click', resetDemo);
}

/* ---------- Render principal ---------- */
const VIEWS = [
  [viewPerfil, bindPerfil], [viewBusqueda, bindBusqueda], [viewChat, bindChat],
  [viewAgenda, bindAgenda], [viewSupervision, bindSupervision], [viewPago, bindPago]
];

function render() {
  const [view, bind] = VIEWS[state.step];
  renderStepper();
  $('#view').innerHTML = view();
  bind();
  bindNav();
}

function resetDemo() {
  state = initialState();
  save();
  render();
  window.scrollTo({ top: 0 });
}

$('#btn-reset').addEventListener('click', resetDemo);
render();
