// Vistas de la aplicación. Cada una devuelve HTML según el rol de quien mira.

const defaultRoute = () => (role() === 'cliente' ? 'explorar' : 'perfil');
const initialsOf = name => name.replace(/^(Dra?\.|Psic\.|Ing\.)\s*/, '').split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
const isOpen = o => !['released', 'refunded'].includes(o.escrow);

function viewRoute() {
  const r = route();
  switch (r.name) {
    case 'explorar': return viewExplorar();
    case 'servicio': return viewServicio(r.a);
    case 'casos': return viewCasos(r);
    case 'perfil': return viewPerfil();
    default: navigate(defaultRoute()); return '';
  }
}

/* ---------- Piezas comunes ---------- */

const pageTitle = (title, lead) => `<div class="page-title"><h1>${title}</h1>${lead ? `<p>${lead}</p>` : ''}</div>`;
const statusBadge = o => { const s = orderStatus(o); return `<span class="badge ${s.tone}">${s.label}</span>`; };
const otherParty = o => (role() === 'cliente' ? o.student.name : role() === 'estudiante' ? o.client.name : `${o.student.name} · ${o.client.name}`);

function emptyState(iconName, text, button = '') {
  return `<div class="card empty-state">${icon(iconName, 36)}<p>${text}</p>${button}</div>`;
}

function fmtSlot(slot) {
  const [d, t] = slot.split(' ');
  return `${new Date(d + 'T12:00:00').toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })} · ${t}`;
}

/* ---------- Explorar ---------- */

// Coincidencia simulada: categoría, precio, modalidad, texto, cercanía y reputación.
function matchScore(s) {
  const f = ui.filters;
  let score = 40;
  if (f.category === 'all' || f.category === s.category) score += 30; else score -= 25;
  if (s.price <= f.maxPrice) score += 15; else score -= 15;
  if (f.mode === 'any' || f.mode === s.mode) score += 8; else score -= 8;
  if (f.q && `${s.title} ${s.scope} ${s.career}`.toLowerCase().includes(f.q.toLowerCase())) score += 10;
  score += Math.max(0, 7 - s.distance);
  score += ((s.rating ?? 4) - 4) * 5;
  return Math.max(5, Math.min(99, Math.round(score)));
}

function serviceRow(s, score, isClient) {
  const mine = orders.find(o => o.serviceId === s.id && isOpen(o));
  return `<article class="row-card">
    <a class="thumb" href="#/servicio/${s.id}" aria-label="Ver ${esc(s.title)}">${icon(catIcon(s.category), 34)}</a>
    <div class="row-main">
      <h3><a href="#/servicio/${s.id}">${esc(s.title)}</a> ${s.featured ? '<span class="badge neutral">Destacado</span>' : ''}</h3>
      <div class="by">${avatar(s, 'sm')}<span><b>${esc(s.student)}</b> · ${esc(s.career)} · ${s.semester}.º semestre</span></div>
      <p class="scope">${esc(s.scope)}</p>
      <ul class="inline">
        <li>${icon('star', 14).replace('class="ic"', 'class="ic star-ic"')} <b style="color:var(--ink)">${s.rating ?? '—'}</b> ${s.reviews ? `(${s.reviews})` : ''}</li>
        <li>${icon(s.mode === 'virtual' ? 'video' : 'pin', 14)} ${s.mode === 'virtual' ? 'Virtual' : esc(s.zone)}</li>
        <li>${icon('calendar', 14)} ${esc(s.availability)}</li>
      </ul>
      <p class="verified">${icon('shield-check', 14)} Verificado · supervisa ${esc(s.supervisor)}</p>
    </div>
    <div class="row-side">
      <div class="price">${fmt(s.price)}<small>por sesión</small></div>
      <div style="width:100%">
        ${isClient ? `<button class="btn primary" type="button" data-act="pick" data-id="${s.id}">${mine ? 'Ir a la conversación' : 'Contactar'}</button>` : `<a class="btn ghost" href="#/servicio/${s.id}">Ver detalle</a>`}
        <div class="match" style="margin-top:.4rem">Coincidencia ${score} %</div>
      </div>
    </div>
  </article>`;
}

function viewExplorar() {
  const f = ui.filters;
  const isClient = role() === 'cliente';
  const q = f.q.trim().toLowerCase();
  const countBy = id => D.services.filter(s => id === 'all' || s.category === id).length;
  let list = D.services
    .filter(s => (f.category === 'all' || s.category === f.category) && s.price <= f.maxPrice && (f.mode === 'any' || s.mode === f.mode)
      && (!q || `${s.title} ${s.scope} ${s.career} ${s.student}`.toLowerCase().includes(q)))
    .map(s => ({ s, score: matchScore(s) }));
  list.sort(f.sort === 'price' ? (a, b) => a.s.price - b.s.price
    : f.sort === 'rating' ? (a, b) => (b.s.rating ?? 0) - (a.s.rating ?? 0)
      : (a, b) => (b.s.featured ? 1 : 0) - (a.s.featured ? 1 : 0) || b.score - a.score);
  const radio = (key, val, label, extra = '') => `<label class="opt"><input type="radio" name="f-${key}" value="${val}" data-change="filter" data-key="${key}" ${f[key] === val ? 'checked' : ''}><span>${label}</span>${extra}</label>`;

  return `<div class="page">${pageTitle('Explorar servicios', 'Estudiantes verificados y supervisados por docentes, con pago retenido hasta el cierre.')}
  <div class="explore">
    <aside class="filters card">
      <div class="search-box">${icon('search', 16)}<input type="search" data-change="filter" data-key="q" value="${esc(f.q)}" placeholder="Buscar servicio" aria-label="Buscar servicio"></div>
      <div><h3>Categoría</h3>${CATEGORIES.map(c => radio('category', c.id, c.label, `<span class="cnt">${countBy(c.id)}</span>`)).join('')}</div>
      <div><h3>Modalidad</h3>${[['any', 'Cualquiera'], ['presencial', 'Presencial'], ['virtual', 'Virtual']].map(([v, l]) => radio('mode', v, l)).join('')}</div>
      <div><h3>Precio máximo</h3><div class="price-line"><span>Hasta</span><span id="f-price-v">${fmt(f.maxPrice)}</span></div>
        <input type="range" min="15000" max="80000" step="5000" value="${f.maxPrice}" data-change="filter" data-key="maxPrice" data-live="f-price-v" aria-label="Precio máximo"></div>
      <button class="btn ghost sm" type="button" data-act="fclear">Limpiar filtros</button>
    </aside>
    <section>
      <div class="results-head"><span><b style="color:var(--ink)">${list.length}</b> servicio${list.length === 1 ? '' : 's'}</span>
        <select data-change="filter" data-key="sort" aria-label="Ordenar">${SORTS.map(o => `<option value="${o.id}" ${f.sort === o.id ? 'selected' : ''}>${o.label}</option>`).join('')}</select></div>
      <div class="rows">${list.length ? list.map(({ s, score }) => serviceRow(s, score, isClient)).join('')
      : `<div class="empty">${icon('search', 32)}<p>No hay servicios con esos filtros.</p><button class="btn ghost sm" type="button" data-act="fclear">Limpiar filtros</button></div>`}</div>
    </section>
  </div></div>`;
}

/* ---------- Detalle de servicio ---------- */

function viewServicio(id) {
  const s = serviceById(id);
  if (!s) return `<div class="page"><a class="back" href="#/explorar">${icon('arrow-left', 15)} Volver a resultados</a>${emptyState('search', 'Este servicio ya no está disponible.')}</div>`;
  const isClient = role() === 'cliente';
  const mine = orders.find(o => o.serviceId === s.id && isOpen(o));
  return `<div class="page"><a class="back" href="#/explorar">${icon('arrow-left', 15)} Volver a resultados</a>
  <div class="detail"><div>
    <div class="detail-head"><div class="thumb" style="width:64px;height:64px">${icon(catIcon(s.category), 28)}</div>
      <div><div class="tag">${icon(catIcon(s.category), 14)} ${esc(catLabel(s.category))}</div><h1>${esc(s.title)}</h1>
        <div class="by" style="margin-top:.4rem">${avatar(s, 'sm')}<span><b>${esc(s.student)}</b> · ${esc(s.career)} · ${s.semester}.º semestre · ${esc(s.uni)}</span></div></div></div>
    <section class="card"><h2>Sobre el servicio</h2><p>${esc(s.scope)}</p>
      <ul class="inline" style="margin-top:.6rem"><li>${icon(s.mode === 'virtual' ? 'video' : 'pin', 15)} ${s.mode === 'virtual' ? 'Por videollamada' : esc(s.zone)}</li><li>${icon('calendar', 15)} ${esc(s.availability)}</li></ul></section>
    <section class="card"><h2>Verificación y supervisión</h2>
      <ul class="checklist">${VERIFICATION_STEPS.map(v => `<li class="ok"><span class="tick">${icon('check', 13)}</span><div><strong>${v.title}</strong><small>${v.detail}</small></div></li>`).join('')}</ul>
      <div class="sup-card"><div class="avatar" style="background:#475569">${esc(initialsOf(s.supervisor))}</div><div><strong style="color:var(--ink)">${esc(s.supervisor)}</strong><br><small>Docente supervisor · valida y firma el cierre de cada servicio</small></div></div></section>
    <section class="card"><h2>Reputación</h2>
      <div class="by" style="gap:.6rem">${stars(s.rating)} <span>${s.reviews ? `${s.reviews} reseñas` : 'Aún sin reseñas'} · ${s.hours} h de práctica</span></div></section>
  </div>
  <aside class="card detail-side"><div class="price">${fmt(s.price)}<small>por sesión · más tarifa de plataforma ${Math.round(D.feeRate * 100)} %</small></div>
    ${isClient ? `<button class="btn primary block" type="button" data-act="pick" data-id="${s.id}">${mine ? 'Ir a la conversación' : 'Contactar'}</button>`
      : '<p class="note">Solo los clientes pueden contactar servicios.</p>'}
    <ul class="assure">
      <li>${icon('lock', 16)}<span>El pago queda retenido hasta que confirmes el servicio.</span></li>
      <li>${icon('undo', 16)}<span>Cancelación con reembolso antes de iniciar la supervisión.</span></li>
      <li>${icon('shield-check', 16)}<span>Supervisión docente incluida en el precio.</span></li>
    </ul></aside></div></div>`;
}

/* ---------- Casos ---------- */

function viewCasos(r) {
  const cur = r.a ? orders.find(o => o.id === +r.a) : null;
  if (!cur && orders.length && window.innerWidth > 1000) { navigate(`casos/${orders[0].id}/${nextTab(orders[0])}`); return ''; }
  if (cur && !r.b) { navigate(`casos/${cur.id}/${nextTab(cur)}`); return ''; }
  const title = role() === 'estudiante' ? 'Solicitudes' : role() === 'docente' ? 'Casos a supervisar' : 'Mis casos';
  if (!orders.length) {
    const msg = role() === 'cliente' ? 'Aún no has contactado a ningún estudiante.' : role() === 'estudiante' ? 'Todavía nadie ha contactado tus servicios. Cuando un cliente lo haga, aparecerá aquí.' : 'Aún no hay casos de tus estudiantes para supervisar.';
    return `<div class="page">${pageTitle(title)}${emptyState('inbox', msg, role() === 'cliente' ? '<a class="btn primary" href="#/explorar">Explorar servicios</a>' : '')}</div>`;
  }
  const list = orders.map(o => `<a class="case-item ${cur?.id === o.id ? 'active' : ''}" href="#/casos/${o.id}/${nextTab(o)}">
      <strong>${esc(o.service.title)}</strong><small>${esc(otherParty(o))}</small>
      <div class="meta">${statusBadge(o)}${o.paid ? `<small>${fmt(o.amount)}</small>` : ''}</div></a>`).join('');
  return `<div class="page">${pageTitle(title)}
    <div class="cases ${cur ? 'has-detail' : ''}"><div class="case-list">${list}</div>
    <div class="case-detail">${cur ? caseDetail(cur, r.b) : ''}</div></div></div>`;
}

const TABS = [['chat', 'Conversación', 'message'], ['agenda', 'Agenda', 'calendar'], ['supervision', 'Supervisión', 'clipboard'], ['pago', 'Pago', 'lock']];

function caseDetail(o, tab) {
  const stages = trackerStages(o);
  const body = { chat: tabChat, agenda: tabAgenda, supervision: tabSupervision, pago: tabPago }[tab] || tabChat;
  return `<a class="back" href="#/casos" style="display:none" id="back-cases">${icon('arrow-left', 15)} Todos los casos</a>
    <div class="case-head"><div><h1>${esc(o.service.title)}</h1><p>${esc(otherParty(o))} · ${statusBadge(o)}</p></div>
      ${o.paid ? `<div class="amount">${fmt(o.amount)}<small>total</small></div>` : ''}</div>
    <ol class="tracker">${stages.map((s, i) => `<li class="${s.state}"><span class="n">${s.state === 'done' ? icon('check', 11) : i + 1}</span><span>${s.label}</span></li>`).join('')}</ol>
    <p class="nextline">${icon('arrow-right', 16)}<span><b>Siguiente:</b> ${esc(nextAction(o).replace(/^Siguiente: /, '').replace(/^✔ /, ''))}</span></p>
    <nav class="tabs-bar">${TABS.map(([id, label, ic]) => `<a class="tab ${tab === id ? 'on' : ''}" href="#/casos/${o.id}/${id}">${icon(ic, 16)} ${label}</a>`).join('')}</nav>
    ${body(o)}`;
}

/* --- Conversación --- */
function tabChat(o) {
  const s = o.service, r = role();
  const me = r === 'cliente' ? 'client' : r === 'estudiante' ? 'student' : null;
  const canWrite = !!me;
  const msgs = o.messages.map(m => {
    if (m.sender === 'system') return `<div class="sys">${icon('check', 13)} ${esc(m.text)}</div>`;
    const mine = m.sender === me;
    const who = me ? '' : `<small class="who">${m.sender === 'client' ? esc(o.client.name) : esc(o.student.name)}</small>`;
    return `<div class="msg ${mine ? 'client' : 'student'}">${who}<span>${esc(m.text)}</span></div>`;
  }).join('');
  const mineAccepted = r === 'cliente' ? o.acceptClient : o.acceptStudent;
  return `<div class="chat-grid">
    <div class="card chat">
      <div class="chat-head">${avatar(o.student)}<div><strong style="color:var(--ink)">${esc(s.student)}</strong><small>${icon('shield-check', 13)} Estudiante verificado</small></div></div>
      <div class="chat-body" id="chat-body">${msgs}</div>
      ${r === 'cliente' ? `<div class="quick">${QUICK_REPLIES.map((q, i) => `<button class="chip" type="button" data-act="quick" data-i="${i}">${q}</button>`).join('')}</div>` : ''}
      <form class="chat-form" data-form="chat">
        <input name="text" id="chat-input" type="text" placeholder="${canWrite ? 'Escribe un mensaje…' : 'Vista de solo lectura para el docente supervisor'}" autocomplete="off" maxlength="200" ${canWrite ? '' : 'disabled'}>
        <button class="btn primary" type="submit" aria-label="Enviar" ${canWrite ? '' : 'disabled'}>${icon('send', 16)}</button>
      </form>
    </div>
    <div class="card">
      <h2>Condiciones</h2>
      <dl class="facts" style="margin-top:0">
        <div><dt>Servicio</dt><dd>${esc(s.title)}</dd></div>
        <div><dt>Alcance</dt><dd style="font-weight:400">${esc(s.scope)}</dd></div>
        <div><dt>Precio</dt><dd>${fmt(s.price)}</dd></div>
        <div><dt>Supervisión</dt><dd>${esc(s.supervisor)}</dd></div>
      </dl>
      <div class="accepts">
        <span class="${o.acceptClient ? 'ok' : ''}">${icon(o.acceptClient ? 'check' : 'clock', 14)} Cliente</span>
        <span class="${o.acceptStudent ? 'ok' : ''}">${icon(o.acceptStudent ? 'check' : 'clock', 14)} Estudiante</span>
      </div>
      ${canWrite ? `<button class="btn ${o.agreed ? 'secondary' : 'primary'} block" type="button" data-act="accept" ${mineAccepted || o.paid ? 'disabled' : ''}>
        ${o.agreed ? 'Condiciones acordadas' : mineAccepted ? 'Esperando a la otra parte' : 'Aceptar condiciones'}</button>` : ''}
      ${r === 'cliente' && !o.agreed ? `<label class="toggle"><input type="checkbox" data-change="auto" ${o.autoreply ? 'checked' : ''}> Respuesta automática del estudiante (demo en solitario: también acepta por él)</label>` : ''}
    </div></div>`;
}

/* --- Agenda --- */
function tabAgenda(o) {
  const s = o.service, r = role();
  const fee = o.paid ? o.fee : Math.round(s.price * D.feeRate);
  const total = o.paid ? o.amount : s.price + fee;
  const pending = ui.pendingSlot;
  const canPick = r === 'cliente' && o.agreed && !o.paid;
  const days = slots[o.serviceId] || [];
  const left = o.paid
    ? `<div class="card"><h2>${icon('calendar', 17)} Cita confirmada</h2>
        <p class="big-slot">${esc(fmtSlot(o.slot))}</p>
        <p class="muted">${s.mode === 'virtual' ? 'Por videollamada' : esc(s.zone)} · Supervisa ${esc(s.supervisor)}</p>
        ${r === 'cliente' && o.escrow === 'held' && !o.supervision.some(Boolean) ? `<button class="btn ghost block" type="button" data-act="cancel">${icon('undo', 15)} Cancelar y pedir reembolso</button>` : ''}
        <p class="note ok">${icon('bell', 14)} Se avisará a las partes antes de la cita.</p></div>`
    : `<div class="card"><h2>${icon('calendar', 17)} Horarios disponibles</h2>
        ${!o.agreed ? `<div class="callout">${icon('info', 16)}<span>Primero ambas partes deben aceptar las condiciones en la conversación.</span></div>` : ''}
        ${days.length ? `<div class="days-grid" style="margin-top:.8rem">${days.map(d => {
          const dt = new Date(d.date + 'T12:00:00');
          return `<div class="day-card"><div class="dow">${dt.toLocaleDateString('es-CO', { weekday: 'short' })}</div><div class="dnum">${dt.getDate()}</div><div class="dmon">${dt.toLocaleDateString('es-CO', { month: 'long' })}</div>
            <div class="slots">${d.times.map(t => { const k = `${d.date} ${t.time}`; return `<button type="button" class="slot ${pending === k ? 'on' : ''}" data-act="slot" data-slot="${k}" ${canPick && t.free ? '' : 'disabled'} title="${t.free ? '' : 'Ya reservado'}">${t.time}</button>`; }).join('')}</div></div>`;
        }).join('')}</div>` : '<p class="note">No hay horarios libres en los próximos días.</p>'}</div>`;
  const slot = o.slot || (canPick ? pending : null);
  return `<div class="grid" style="grid-template-columns: minmax(0,1.4fr) minmax(0,1fr); align-items:start">${left}
    <div class="card"><h2>${icon('receipt', 17)} Resumen</h2>
      <dl class="facts" style="margin-top:0">
        <div><dt>Servicio</dt><dd>${esc(s.title)}</dd></div>
        <div><dt>Cita</dt><dd>${slot ? esc(fmtSlot(slot)) : 'Sin seleccionar'}</dd></div>
        <div><dt>Servicio</dt><dd>${fmt(s.price)}</dd></div>
        <div><dt>Tarifa de plataforma (${Math.round(D.feeRate * 100)} %)</dt><dd>${fmt(fee)}</dd></div>
        <div class="total"><dt>Total</dt><dd>${fmt(total)}</dd></div>
      </dl>
      <div class="callout">${icon('lock', 16)}<span>Pago retenido: el estudiante no recibe el dinero hasta que el cliente cierre el servicio.</span></div>
      ${r === 'cliente' ? `<button class="btn primary block" type="button" data-act="book" ${canPick && pending ? '' : 'disabled'}>${o.paid ? 'Cita confirmada y pago retenido' : 'Confirmar y pagar (simulado)'}</button>
        ${o.paid ? '' : '<p class="note">No se ingresa ninguna tarjeta: el pago es una simulación.</p>'}` : ''}
    </div></div>`;
}

/* --- Supervisión y reputación --- */
const rateStars = (value, enabled) => `<span class="rate">${[1, 2, 3, 4, 5].map(n => `<button type="button" class="star ${n <= value ? 'on' : ''}" data-act="star" data-val="${n}" ${enabled ? '' : 'disabled'} aria-label="${n} estrellas">★</button>`).join('')}</span>`;

function tabSupervision(o) {
  if (!o.paid) return emptyState('clipboard', 'La supervisión empieza cuando la cita está confirmada con el pago retenido.', `<a class="btn primary" href="#/casos/${o.id}/agenda">Ir a la agenda</a>`);
  const r = role(), s = o.service;
  const mine = r === 'cliente' ? o.ratingByClient : r === 'estudiante' ? o.ratingByStudent : null;
  const canRate = o.serviceDone && r !== 'docente' && !mine;
  const target = r === 'cliente' ? o.student : o.client;
  const advance = r === 'docente' && !o.serviceDone && o.escrow === 'held';
  const line = (label, rt) => `<div class="rate-row"><span>${label}</span>${rt ? `${rateStars(rt.value, false)}${rt.comment ? `<small>“${esc(rt.comment)}”</small>` : ''}` : '<small style="flex:none">Pendiente</small>'}</div>`;
  return `<div class="grid two">
    <div class="card"><h2>${icon('clipboard', 17)} Supervisión docente</h2>
      <p class="muted" style="margin:0">${esc(s.supervisor)}</p>
      <ul class="checklist">${SUPERVISION_STEPS.map((t, i) => `<li class="${o.supervision[i] ? 'ok' : ''}"><span class="tick">${o.supervision[i] ? icon('check', 13) : ''}</span><div><strong>${t}</strong></div></li>`).join('')}</ul>
      ${r === 'docente' ? `<button class="btn primary block" type="button" data-act="advance" ${advance ? '' : 'disabled'}>${o.serviceDone ? 'Servicio cerrado con aval docente' : 'Registrar siguiente paso'}</button>`
    : `<p class="note ${o.serviceDone ? 'ok' : ''}">${o.serviceDone ? 'Servicio cerrado con aval docente.' : 'El docente registra cada paso de la supervisión.'}</p>`}</div>
    <div class="card ${o.serviceDone ? '' : 'locked'}"><h2>${icon('star', 17)} Calificaciones</h2>
      ${o.serviceDone ? '' : '<p class="note" style="margin-top:0">Se habilitan cuando el docente cierra el servicio.</p>'}
      ${canRate ? `<form data-form="rate" data-hold>
          <div class="rate-row"><span>Califica a <b>${esc(target.name)}</b></span>${rateStars(ui.draft.value, true)}</div>
          <textarea name="comment" rows="2" maxlength="160" placeholder="Comentario (opcional)">${esc(ui.draft.comment)}</textarea>
          <button class="btn primary block" type="submit" ${ui.draft.value ? '' : 'disabled'}>Enviar calificación</button></form>` : ''}
      ${line('Cliente → estudiante', o.ratingByClient)}${line('Estudiante → cliente', o.ratingByStudent)}
      <div class="rep">${avatar(o.student)}<div><strong style="color:var(--ink)">Reputación de ${esc(o.student.name.split(' ')[0])}</strong><br>${stars(o.student.rating)} <small>(${o.student.reviews} reseñas)</small></div></div></div></div>`;
}

/* --- Pago --- */
function tabPago(o) {
  const r = role(), e = o.escrow, s = o.service;
  const stages = [
    { t: 'Pago depositado', d: o.paid ? `${fmt(o.amount)} recibidos` : 'Aún sin pago', ok: o.paid },
    { t: 'Retenido en custodia', d: 'El dinero no está disponible para el estudiante', ok: ['held', 'released', 'dispute'].includes(e) },
    { t: 'Servicio cerrado con aval docente', d: o.serviceDone ? 'Supervisión completada' : 'Pendiente de cierre', ok: o.serviceDone },
    e === 'refunded' ? { t: 'Pago reembolsado', d: `${fmt(o.amount)} devueltos al cliente`, ok: true }
      : { t: 'Pago liberado', d: e === 'released' ? `${fmt(o.amount - o.fee)} al estudiante · ${fmt(o.fee)} tarifa de plataforma` : 'Se libera cuando el cliente confirma el cierre', ok: e === 'released' }
  ];
  const b = {
    none: ['wallet', 'Aún no hay pago', 'Se retiene al confirmar la cita.', ''],
    held: ['lock', 'Pago retenido en custodia', 'Se liberará al cerrar el servicio.', ''],
    released: ['check', 'Pago liberado', 'El estudiante recibió su pago.', 'ok'],
    dispute: ['alert', 'Disputa en revisión', 'El pago sigue retenido hasta que el docente resuelva.', 'warn'],
    refunded: ['undo', 'Pago reembolsado', 'El dinero volvió al cliente.', 'warn']
  }[e];
  let actions = '';
  if (r === 'cliente') actions += `<button class="btn primary block" type="button" data-act="release" ${e === 'held' && o.serviceDone ? '' : 'disabled'}>Confirmar servicio y liberar pago</button>`;
  if (r === 'docente' && e === 'dispute') actions += `<div class="dispute-box"><strong>Disputa abierta</strong><p style="margin:.3rem 0 0">“${esc(o.disputeReason)}”</p>
      <button class="btn primary block" type="button" data-act="resolve" data-outcome="release">Resolver: liberar al estudiante</button>
      <button class="btn ghost block" type="button" data-act="resolve" data-outcome="refund">Resolver: reembolsar al cliente</button></div>`;
  if (r !== 'docente' && e === 'held') actions += `<form class="dispute-form" data-form="dispute" data-hold>
      <label>¿Hubo un problema?<textarea name="reason" rows="2" maxlength="200" required minlength="5" placeholder="Cuéntanos brevemente qué pasó"></textarea></label>
      <button class="btn ghost block" type="submit">${icon('alert', 15)} Reportar un problema</button></form>`;
  return `<div class="status ${b[3]}"><span class="big-ic">${icon(b[0], 22)}</span><div><h2>${b[1]}</h2><p>${b[2]}</p></div>
      ${o.paid ? `<div class="amount">${fmt(o.amount)}<small>total pagado</small></div>` : ''}</div>
    <div class="grid two">
      <div class="card"><h2>Línea de tiempo</h2><ol class="timeline">${stages.map(x => `<li class="${x.ok ? 'ok' : ''}"><span class="dot">${x.ok ? icon('check', 13) : ''}</span><div><strong>${x.t}</strong><small>${x.d}</small></div></li>`).join('')}</ol></div>
      <div class="card"><h2>Acciones</h2>
        <dl class="facts" style="margin-top:0"><div><dt>Servicio</dt><dd>${esc(s.title)}</dd></div><div><dt>Monto retenido</dt><dd>${o.paid ? fmt(o.amount) : '—'}</dd></div></dl>
        ${actions || '<p class="note">No hay acciones disponibles para tu rol en este momento.</p>'}
        ${r === 'cliente' && e === 'held' && !o.serviceDone ? '<p class="note">Para liberar el pago, el docente debe cerrar el servicio.</p>' : ''}
      </div></div>`;
}

/* ---------- Perfil ---------- */

function viewPerfil() {
  const r = role();
  return `<div class="page">${r === 'estudiante' ? perfilEstudiante() : r === 'docente' ? perfilDocente() : perfilCliente()}</div>`;
}

function verifList(v, canAct) {
  return `<ul class="checklist">${VERIFICATION_STEPS.map((s, i) => `<li class="${v[i] ? 'ok' : ''}">
    <span class="tick">${v[i] ? icon('check', 13) : ''}</span>
    <div><strong>${s.title}</strong><small>${v[i] ? s.detail : (i === 3 ? 'Pendiente del docente supervisor' : 'Pendiente de validación')}</small></div>
    ${canAct && !v[i] && s.action ? `<button class="btn secondary sm" type="button" data-act="verify" data-step="${i}">${s.action}</button>` : ''}</li>`).join('')}</ul>`;
}

function perfilEstudiante() {
  const me = D.me, v = me.verification, ok = v.every(Boolean), done = v.filter(Boolean).length;
  const editing = ui.editSvc;
  const svc = editing && editing !== 'new' ? D.myServices.find(s => s.id === editing) : null;
  return `${pageTitle('Mi perfil', 'Tu identidad y vínculo académico verificados son lo que genera confianza en la plataforma.')}
  <div class="grid two">
    <div class="card"><div class="profile-top">${avatar(me, 'xl')}<div><h2>${esc(me.name)}</h2>
        <p class="muted" style="margin:0 0 .4rem">${esc(me.career)} · ${me.semester}.º semestre · ${esc(me.uni)}</p>
        ${ok ? `<span class="badge ok">${icon('shield-check', 13)} Perfil verificado</span>` : '<span class="badge warn">Verificación pendiente</span>'}</div></div>
      <dl class="facts"><div><dt>Horas de práctica</dt><dd>${me.hours} h</dd></div>
        <div><dt>Reputación</dt><dd>${stars(me.rating)} ${me.reviews ? `<small>(${me.reviews})</small>` : ''}</dd></div>
        <div><dt>Docente supervisor</dt><dd>${esc(me.supervisor || '—')}</dd></div></dl></div>
    <div class="card"><h2>Verificación <span class="badge ${ok ? 'ok' : 'info'}">${done}/${VERIFICATION_STEPS.length}</span></h2>
      <div class="progress"><span style="width:${done / VERIFICATION_STEPS.length * 100}%"></span></div>
      ${verifList(v, true)}
      <p class="note">La verificación es simulada en el MVP; la integración con sistemas universitarios queda para una fase posterior.</p></div>
  </div>
  <div class="card"><div class="section-head"><h2 style="margin:0">Mis servicios</h2>
      <button class="btn primary sm" type="button" data-act="svc-new" ${ok ? '' : 'disabled title="Disponible cuando tu perfil esté avalado"'}>${icon('plus', 15)} Publicar servicio</button></div>
    ${!ok ? `<p class="note">${icon('lock', 14)} Podrás publicar servicios cuando completes la verificación y tu docente te dé el aval.</p>` : ''}
    ${D.myServices.length ? D.myServices.map(s => `<div class="svc-row"><div><strong style="color:var(--ink)">${esc(s.title)}</strong> ${s.active ? '<span class="badge ok">Publicado</span>' : '<span class="badge warn">Pausado</span>'}
        <small>${fmt(s.price)} · ${s.mode} · ${esc(s.availability)}</small></div>
        <div class="row-actions"><button class="btn ghost sm" type="button" data-act="svc-edit" data-id="${s.id}">${icon('pencil', 14)} Editar</button>
          <button class="btn ghost sm" type="button" data-act="svc-toggle" data-id="${s.id}">${icon(s.active ? 'pause' : 'play', 14)} ${s.active ? 'Pausar' : 'Reanudar'}</button></div></div>`).join('') : (ok ? '<p class="note">Aún no has publicado servicios.</p>' : '')}
    ${editing ? serviceForm(svc) : ''}</div>`;
}

function serviceForm(s) {
  const days = s ? s.days : [1, 2, 3, 4, 5];
  return `<form class="svc-form" data-form="svc" data-hold data-id="${s ? s.id : ''}">
    <h3>${s ? 'Editar servicio' : 'Nuevo servicio'}</h3>
    <div class="form-grid">
      <label>Título<input name="title" required minlength="3" maxlength="80" value="${esc(s?.title)}" placeholder="Ej. Limpieza dental"></label>
      <label>Categoría<select name="category">${CATEGORIES.filter(c => c.id !== 'all').map(c => `<option value="${c.id}" ${s?.category === c.id ? 'selected' : ''}>${c.label}</option>`).join('')}</select></label>
      <label>Precio (COP)<input name="price" type="number" min="5000" max="500000" step="1000" required value="${s ? s.price : 30000}"></label>
      <label>Modalidad<select name="mode"><option value="presencial" ${s?.mode === 'presencial' ? 'selected' : ''}>Presencial</option><option value="virtual" ${s?.mode === 'virtual' ? 'selected' : ''}>Virtual</option></select></label>
      <label class="wide">Zona o sede<input name="zone" maxlength="80" value="${esc(s?.zone)}" placeholder="Videollamada, Sede Norte…"></label>
      <label class="wide">Alcance (qué incluye y qué no)<textarea name="scope" rows="2" required minlength="10" maxlength="300">${esc(s?.scope)}</textarea></label>
    </div>
    <fieldset><legend>Días disponibles</legend><div class="days">${DAY_ORDER.map(d => `<label class="day-check"><input type="checkbox" name="day" value="${d}" ${days.includes(d) ? 'checked' : ''}>${DAY_NAMES[d]}</label>`).join('')}</div></fieldset>
    <label>Horarios de inicio (separados por coma)<input name="times" required value="${esc((s ? s.times : ['09:00', '11:00', '14:00']).join(', '))}" placeholder="09:00, 11:00, 14:00"></label>
    <div class="form-actions"><button class="btn primary" type="submit">${s ? 'Guardar cambios' : 'Publicar'}</button><button class="btn ghost" type="button" data-act="svc-cancel">Cancelar</button></div>
  </form>`;
}

function perfilDocente() {
  const list = D.myStudents;
  return `${pageTitle('Estudiantes a tu cargo', 'Avalas el perfil y el alcance de cada estudiante: sin tu aval no pueden publicar. Después validas cada práctica hasta su cierre.')}
  <div class="people">${list.length ? list.map(s => {
    const v = s.verification, ready = v.slice(0, 3).every(Boolean), done = v.every(Boolean);
    return `<div class="card"><div class="profile-top" style="gap:.8rem">${avatar(s)}<div style="flex:1"><h3>${esc(s.name)}</h3><small>${esc(s.career)} · ${s.semester}.º sem. · ${s.services} servicio(s)</small></div>
        ${done ? `<span class="badge ok">${icon('shield-check', 13)} Avalado</span>` : '<span class="badge warn">Pendiente</span>'}</div>
      ${verifList(v, false)}
      ${done ? '' : `<button class="btn primary block" type="button" data-act="endorse" data-id="${s.id}" ${ready ? '' : 'disabled'}>Dar aval como supervisor</button>
        ${ready ? '' : '<p class="note">El estudiante aún no completa los pasos de verificación.</p>'}`}</div>`;
  }).join('') : emptyState('users', 'Todavía no tienes estudiantes a cargo.')}</div>`;
}

function perfilCliente() {
  const me = D.me;
  return `${pageTitle('Mi cuenta')}
  <div class="card" style="max-width:560px"><div class="profile-top">${avatar(me, 'xl')}<div><h2>${esc(me.name)}</h2><p class="muted" style="margin:0">${esc(me.email)}</p></div></div>
    <dl class="facts"><div><dt>Rol</dt><dd>Cliente</dd></div><div><dt>Reputación</dt><dd>${stars(me.rating)} ${me.reviews ? `<small>(${me.reviews})</small>` : ''}</dd></div>
      <div><dt>Casos</dt><dd>${orders.length}</dd></div></dl></div>`;
}

/* ---------- Guía de la demo ---------- */

function guideHtml() {
  return `<div class="dlg-head"><h2 style="margin:0">Guía de la demo</h2><button class="icon-btn" type="button" data-act="guide-close" aria-label="Cerrar">${icon('x', 18)}</button></div>
    <div class="dlg-body"><p class="muted" style="margin:.8rem 0 .2rem">Flujo completo con un solo navegador, cambiando de cuenta en cada paso.</p>
    <ol class="guide">${GUIDE.map((g, i) => `<li><div><strong>${g.t}</strong><small>${g.d}</small><small style="color:var(--faint)">${g.whoName}</small></div>
      <button class="btn ghost sm" type="button" data-act="guide-go" data-i="${i}">Ir</button></li>`).join('')}</ol></div>`;
}

/* ---------- Acciones ---------- */

Object.assign(ACTIONS, {
  filter: el => {
    ui.filters[el.dataset.key] = el.dataset.key === 'maxPrice' ? +el.value : el.value;
    saveUi(); render();
  },
  fclear: () => { ui.filters = { category: 'all', maxPrice: 80000, mode: 'any', q: '', sort: 'match' }; saveUi(); render(); },
  verify: b => act(() => api(`/verification/${b.dataset.step}`, 'POST'), 'Paso validado'),
  endorse: b => act(() => api(`/students/${b.dataset.id}/endorse`, 'POST'), 'Aval registrado'),
  'svc-new': () => { ui.editSvc = 'new'; saveUi(); render(); },
  'svc-edit': b => { ui.editSvc = b.dataset.id; saveUi(); render(); },
  'svc-cancel': () => { ui.editSvc = null; saveUi(); render(); },
  'svc-toggle': b => {
    const s = D.myServices.find(x => x.id === b.dataset.id);
    act(() => api(`/services/${s.id}`, 'PATCH', { active: !s.active }), s.active ? 'Servicio pausado' : 'Servicio publicado');
  },
  pick: async b => {
    try {
      const o = await api('/orders', 'POST', { serviceId: b.dataset.id });
      await refresh(true);
      navigate(`casos/${o.id}/${nextTab(o)}`);
    } catch (e) { toast(e.message); }
  },
  accept: () => act(() => api(`/orders/${order().id}/accept`, 'POST')),
  quick: b => act(() => api(`/orders/${order().id}/messages`, 'POST', { text: QUICK_REPLIES[+b.dataset.i] })),
  auto: el => act(() => api(`/orders/${order().id}/autoreply`, 'POST', { on: el.checked })),
  slot: b => { ui.pendingSlot = b.dataset.slot; saveUi(); render(); },
  book: async () => { await act(() => api(`/orders/${order().id}/book`, 'POST', { slot: ui.pendingSlot }), 'Cita agendada · pago retenido'); ui.pendingSlot = null; },
  cancel: () => act(() => api(`/orders/${order().id}/cancel`, 'POST'), 'Cita cancelada · pago reembolsado'),
  advance: () => act(() => api(`/orders/${order().id}/supervision/advance`, 'POST')),
  star: b => { ui.draft.value = +b.dataset.val; const t = $('textarea[name=comment]'); if (t) ui.draft.comment = t.value; saveUi(); render(); },
  release: () => act(() => api(`/orders/${order().id}/release`, 'POST'), 'Pago liberado al estudiante'),
  resolve: b => act(() => api(`/orders/${order().id}/resolve`, 'POST', { outcome: b.dataset.outcome }), 'Disputa resuelta'),
  reset: async () => { ui.menu = null; await act(() => api('/reset', 'POST'), 'Demo reiniciada'); navigate(defaultRoute()); },
  'guide-open': () => { const d = $('#guide'); d.innerHTML = guideHtml(); ui.menu = null; render(); d.showModal(); },
  'guide-close': () => $('#guide').close(),
  'guide-go': async b => {
    const g = GUIDE[+b.dataset.i];
    try {
      if (D.me.id !== g.who) { await api('/auth/switch', 'POST', { userId: g.who }); await refresh(true); }
      $('#guide').close();
      navigate(g.route);
      toast(`Ahora estás como ${D.me.name}`);
    } catch (e) { toast(e.message); }
  }
});

Object.assign(FORMS, {
  chat: async f => {
    const text = f.text.value.trim();
    if (!text) return;
    f.text.value = '';
    await act(() => api(`/orders/${order().id}/messages`, 'POST', { text }));
  },
  rate: async f => {
    await act(() => api(`/orders/${order().id}/rate`, 'POST', { value: ui.draft.value, comment: f.comment.value }), 'Calificación enviada');
    ui.draft = { value: 0, comment: '' }; saveUi();
  },
  dispute: f => act(() => api(`/orders/${order().id}/dispute`, 'POST', { reason: f.reason.value }), 'Problema reportado · el pago sigue retenido'),
  svc: async f => {
    const body = {
      title: f.title.value, category: f.category.value, price: +f.price.value, mode: f.mode.value, zone: f.zone.value, scope: f.scope.value,
      days: $$('input[name=day]:checked', f).map(c => +c.value), times: f.times.value.split(/[,\s]+/).filter(Boolean)
    };
    const id = f.dataset.id;
    try {
      await (id ? api(`/services/${id}`, 'PATCH', body) : api('/services', 'POST', body));
      ui.editSvc = null; saveUi(); toast(id ? 'Servicio actualizado' : 'Servicio publicado'); await refresh(true);
    } catch (e) { toast(e.message); }
  }
});
