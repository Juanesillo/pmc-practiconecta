// Vistas de los seis pasos del flujo, adaptadas al rol de quien mira.

/* ---------- Piezas comunes ---------- */

function pageHead(roleLabel, title, lead) {
  return `<div class="page-head"><span class="role-chip">${roleLabel}</span><h1>${title}</h1><p class="lead">${lead}</p></div>`;
}

function navFooter() {
  return `<div class="nav-footer">
    <button class="btn ghost" type="button" data-act="prev" ${ui.step === 0 ? 'disabled' : ''}>← Anterior</button>
    ${ui.step < STEPS.length - 1 ? '<button class="btn primary" type="button" data-act="next">Siguiente →</button>' : ''}
  </div>`;
}

function otherParty(o) {
  return role() === 'cliente' ? o.student.name : role() === 'estudiante' ? o.client.name : `${o.student.name} ↔ ${o.client.name}`;
}

function caseBar() {
  const cur = order();
  if (!cur) return '';
  return `<div class="casebar card"><label>Caso
    <select data-change="case">${orders.map(o => `<option value="${o.id}" ${o.id === cur.id ? 'selected' : ''}>#${o.id} · ${esc(o.service.title)} · ${esc(otherParty(o))} · ${orderStatus(o).label}</option>`).join('')}</select></label></div>
    <div class="next-action">➜ ${esc(nextAction(cur))}</div>`;
}

function noOrderView(head) {
  const r = role();
  const msg = r === 'cliente' ? 'Aún no has contactado a ningún estudiante.'
    : r === 'estudiante' ? 'Todavía nadie ha contactado tus servicios. Cuando un cliente lo haga, la conversación aparecerá aquí.'
      : 'Aún no hay casos de tus estudiantes para supervisar.';
  return head + `<section class="card empty-state"><p>${msg}</p>
    ${r === 'cliente' ? '<button class="btn primary" type="button" data-act="goto" data-step="1">Buscar servicios</button>' : ''}
    ${D.demo ? '<p class="note">Demo: cambia de cuenta desde el menú de usuario (arriba a la derecha) para ver la otra cara del flujo.</p>' : ''}</section>` + navFooter();
}

const profileFacts = u => `<dl class="facts">
  <div><dt>Horas de práctica</dt><dd>${u.hours} h</dd></div>
  <div><dt>Reputación</dt><dd>${stars(u.rating)} ${u.reviews ? `(${u.reviews})` : ''}</dd></div>
  ${u.supervisor ? `<div><dt>Docente supervisor</dt><dd>${esc(u.supervisor)}</dd></div>` : ''}
</dl>`;

function verifList(v, canAct) {
  return `<ul class="checklist">${VERIFICATION_STEPS.map((s, i) => `<li class="${v[i] ? 'ok' : ''}">
    <span class="tick">${v[i] ? '✓' : ''}</span>
    <div><strong>${s.title}</strong><small>${v[i] ? s.detail : (i === 3 ? 'Pendiente del docente supervisor' : 'Pendiente de validación')}</small></div>
    ${canAct && !v[i] && s.action ? `<button class="btn secondary sm" type="button" data-act="verify" data-step="${i}">${s.action}</button>` : ''}
  </li>`).join('')}</ul>`;
}

/* ---------- 1. Perfil verificado ---------- */

function viewPerfil() {
  const r = role();
  if (r === 'estudiante') return viewPerfilEstudiante();
  if (r === 'docente') return viewPerfilDocente();
  return viewPerfilCliente();
}

function viewPerfilEstudiante() {
  const me = D.me, v = me.verification, ok = v.every(Boolean), done = v.filter(Boolean).length;
  const editing = ui.editSvc;
  const svc = editing && editing !== 'new' ? D.myServices.find(s => s.id === editing) : null;
  return pageHead('Estudiante', 'Perfil universitario verificado',
    'Antes de publicar servicios, validas tu identidad y vínculo académico, y tu docente supervisor avala el alcance. El perfil verificado es la base de confianza de la plataforma.') + `
  <section class="grid two">
    <article class="card profile">
      ${avatar(me, 'xl')}
      <h2>${esc(me.name)} ${ok ? '<span class="badge ok">✔ Verificado</span>' : '<span class="badge warn">Pendiente</span>'}</h2>
      <p class="muted">${esc(me.career)} · ${me.semester}.º semestre<br>${esc(me.uni)}</p>
      ${profileFacts(me)}
    </article>
    <article class="card">
      <h2>Verificación (${done}/${VERIFICATION_STEPS.length})</h2>
      <div class="progress"><span style="width:${done / VERIFICATION_STEPS.length * 100}%"></span></div>
      ${verifList(v, true)}
      <p class="note">En el MVP la verificación es simulada; la integración automática con sistemas universitarios queda para una fase posterior.</p>
    </article>
  </section>
  <section class="card section">
    <div class="section-head"><h2>Mis servicios</h2>
      <button class="btn primary sm" type="button" data-act="svc-new" ${ok ? '' : 'disabled title="Disponible cuando tu perfil esté avalado"'}>+ Publicar servicio</button></div>
    ${!ok ? '<p class="note">Podrás publicar servicios cuando completes la verificación y tu docente te dé el aval.</p>' : ''}
    ${D.myServices.length ? D.myServices.map(s => `<div class="svc-row">
        <div><strong>${esc(s.title)}</strong> ${s.active ? '<span class="badge ok sm">Publicado</span>' : '<span class="badge warn sm">Pausado</span>'}
          <small>${fmt(s.price)} · ${s.mode} · ${esc(s.availability)}</small></div>
        <div class="row-actions">
          <button class="btn ghost sm" type="button" data-act="svc-edit" data-id="${s.id}">Editar</button>
          <button class="btn ghost sm" type="button" data-act="svc-toggle" data-id="${s.id}">${s.active ? 'Pausar' : 'Reanudar'}</button>
        </div></div>`).join('') : (ok ? '<p class="note">Aún no has publicado servicios.</p>' : '')}
    ${editing ? serviceForm(svc) : ''}
  </section>` + navFooter();
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
    <fieldset><legend>Días disponibles</legend><div class="days">
      ${DAY_ORDER.map(d => `<label class="day-check"><input type="checkbox" name="day" value="${d}" ${days.includes(d) ? 'checked' : ''}>${DAY_NAMES[d]}</label>`).join('')}
    </div></fieldset>
    <label>Horarios de inicio (separados por coma)<input name="times" required value="${esc((s ? s.times : ['09:00', '11:00', '14:00']).join(', '))}" placeholder="09:00, 11:00, 14:00"></label>
    <div class="form-actions"><button class="btn primary" type="submit">${s ? 'Guardar cambios' : 'Publicar'}</button>
      <button class="btn ghost" type="button" data-act="svc-cancel">Cancelar</button></div>
  </form>`;
}

function viewPerfilDocente() {
  const list = D.myStudents;
  return pageHead('Docente', 'Estudiantes a tu cargo',
    'Como supervisor, avalas el perfil y el alcance de cada estudiante. Solo con tu aval pueden publicar servicios, y tú validas cada práctica hasta su cierre.') + `
  <section class="results">
    ${list.length ? list.map(s => {
      const v = s.verification, ready = v.slice(0, 3).every(Boolean), done = v.every(Boolean);
      return `<article class="card"><div class="service-top">${avatar(s)}
          <div><h3>${esc(s.name)} ${done ? '<span class="badge ok sm">✔ Avalado</span>' : '<span class="badge warn sm">Pendiente</span>'}</h3>
            <p class="muted">${esc(s.career)} · ${s.semester}.º sem. · ${s.services} servicio(s)</p></div></div>
        ${verifList(v, false)}
        ${done ? '' : `<button class="btn primary block" type="button" data-act="endorse" data-id="${s.id}" ${ready ? '' : 'disabled'}>Dar aval como supervisor</button>
          ${ready ? '' : '<p class="note">El estudiante aún no completa los pasos de verificación.</p>'}`}
      </article>`;
    }).join('') : '<p class="empty card">Todavía no tienes estudiantes a cargo.</p>'}
  </section>` + navFooter();
}

function viewPerfilCliente() {
  const students = [...new Map(D.services.map(s => [s.studentId, s])).values()];
  return pageHead('Cliente', 'Estudiantes verificados',
    'Todos los estudiantes que ves en la plataforma validaron su identidad y matrícula, y cuentan con el aval de un docente supervisor. Así sabes que el servicio es real y supervisado.') + `
  <section class="results">
    ${students.map(s => `<article class="card"><div class="service-top">${avatar(s)}
        <div><h3>${esc(s.student)} <span class="badge ok sm">✔ Verificado</span></h3>
          <p class="muted">${esc(s.career)} · ${s.semester}.º sem. · ${esc(s.uni)}</p></div></div>
        <dl class="facts"><div><dt>Horas de práctica</dt><dd>${s.hours} h</dd></div>
          <div><dt>Reputación</dt><dd>${stars(s.rating)} ${s.reviews ? `(${s.reviews})` : ''}</dd></div>
          <div><dt>Docente supervisor</dt><dd>${esc(s.supervisor)}</dd></div></dl></article>`).join('')}
  </section>` + navFooter();
}

/* ---------- 2. Búsqueda y matching ---------- */

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

function viewBusqueda() {
  const f = ui.filters;
  const isClient = role() === 'cliente';
  const q = f.q.trim().toLowerCase();
  const list = D.services
    .filter(s => (f.category === 'all' || s.category === f.category) && s.price <= f.maxPrice && (f.mode === 'any' || s.mode === f.mode)
      && (!q || `${s.title} ${s.scope} ${s.career} ${s.student}`.toLowerCase().includes(q)))
    .map(s => ({ s, score: matchScore(s) }))
    .sort((a, b) => (b.s.featured ? 1 : 0) - (a.s.featured ? 1 : 0) || b.score - a.score);
  const cur = order();
  return pageHead('Cliente', 'Busca un servicio y recibe coincidencias',
    'Filtra por categoría, precio y modalidad; la plataforma ordena por coincidencia, cercanía y reputación. Un servicio “Destacado” es una oferta promocionada.') + `
  <section class="filters card">
    <label>Buscar<input type="search" data-change="filter" data-key="q" value="${esc(f.q)}" placeholder="Limpieza, contrato, ansiedad…"></label>
    <label>Categoría<select data-change="filter" data-key="category">${CATEGORIES.map(c => `<option value="${c.id}" ${f.category === c.id ? 'selected' : ''}>${c.label}</option>`).join('')}</select></label>
    <label>Precio máximo: <strong id="f-price-v">${fmt(f.maxPrice)}</strong>
      <input type="range" min="15000" max="80000" step="5000" value="${f.maxPrice}" data-change="filter" data-key="maxPrice" data-live="f-price-v"></label>
    <label>Modalidad<select data-change="filter" data-key="mode">
      ${[['any', 'Cualquiera'], ['presencial', 'Presencial'], ['virtual', 'Virtual']].map(([v, l]) => `<option value="${v}" ${f.mode === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
  </section>
  <section class="results">
    ${list.length ? list.map(({ s, score }) => `
    <article class="card service ${cur?.serviceId === s.id ? 'selected' : ''}">
      ${s.featured ? '<span class="badge feat">Destacado</span>' : ''}
      <div class="service-top">${avatar(s)}
        <div><h3>${esc(s.title)}</h3>
          <p class="muted">${esc(s.student)} · ${esc(s.career)} · ${s.semester}.º sem. <span class="badge ok sm">✔ Verificado</span></p></div>
        <div class="match" title="Coincidencia estimada"><strong>${score}%</strong><small>match</small></div>
      </div>
      <p class="scope">${esc(s.scope)}</p>
      <ul class="meta">
        <li>${stars(s.rating)} ${s.reviews ? `(${s.reviews})` : ''}</li>
        <li>${s.mode === 'virtual' ? '💻 Virtual' : '📍 ' + esc(s.zone)}</li>
        <li>🗓 ${esc(s.availability)}</li>
        <li>🎓 Supervisa: ${esc(s.supervisor)}</li>
      </ul>
      <div class="service-foot"><span class="price">${fmt(s.price)}</span>
        <button class="btn primary" type="button" data-act="pick" data-id="${s.id}" ${isClient ? '' : 'disabled title="Solo los clientes contactan servicios"'}>Contactar</button></div>
    </article>`).join('') : '<p class="empty card">Sin resultados con esos filtros. Prueba ampliar el precio o la categoría.</p>'}
  </section>` + navFooter();
}

/* ---------- 3. Chat ---------- */

function viewChat() {
  const head = pageHead('Cliente y estudiante', 'Chat para aclarar condiciones',
    'Cliente y estudiante conversan dentro de la plataforma para precisar alcance, precio y supervisión. Ambos deben aceptar las condiciones antes de agendar.');
  const o = order();
  if (!o) return noOrderView(head);
  const s = o.service, r = role();
  const me = r === 'cliente' ? 'client' : r === 'estudiante' ? 'student' : null;
  const canWrite = !!me;
  const msgs = o.messages.map(m => {
    if (m.sender === 'system') return `<div class="sys">${esc(m.text)}</div>`;
    const mine = m.sender === me;
    const who = me ? '' : `<small class="who">${m.sender === 'client' ? esc(o.client.name) : esc(o.student.name)}</small>`;
    return `<div class="msg ${mine ? 'client' : 'student'}">${who}<span>${esc(m.text)}</span></div>`;
  }).join('');
  const mineAccepted = r === 'cliente' ? o.acceptClient : o.acceptStudent;
  const closed = o.paid;
  return head + caseBar() + `
  <section class="grid chat-grid">
    <article class="card chat">
      <div class="chat-head">${avatar(o.student)}
        <div><strong>${esc(s.student)}</strong><small>${esc(s.title)} · ${fmt(s.price)}</small></div></div>
      <div class="chat-body" id="chat-body">${msgs}</div>
      ${r === 'cliente' ? `<div class="quick">${QUICK_REPLIES.map((q, i) => `<button class="chip" type="button" data-act="quick" data-i="${i}">${q}</button>`).join('')}</div>` : ''}
      <form class="chat-form" data-form="chat">
        <input name="text" id="chat-input" type="text" placeholder="${canWrite ? 'Escribe un mensaje…' : 'Vista de solo lectura para el docente supervisor'}" autocomplete="off" maxlength="200" ${canWrite ? '' : 'disabled'}>
        <button class="btn primary" type="submit" ${canWrite ? '' : 'disabled'}>Enviar</button>
      </form>
    </article>
    <aside class="card side">
      <h2>Ficha del servicio</h2>
      <dl class="facts">
        <div><dt>Alcance</dt><dd>${esc(s.scope)}</dd></div>
        <div><dt>Precio</dt><dd>${fmt(s.price)}</dd></div>
        <div><dt>Supervisión</dt><dd>${esc(s.supervisor)}</dd></div>
        <div><dt>Disponibilidad</dt><dd>${esc(s.availability)}</dd></div>
      </dl>
      <div class="accepts">
        <span class="${o.acceptClient ? 'ok' : ''}">${o.acceptClient ? '✔' : '⏳'} Cliente</span>
        <span class="${o.acceptStudent ? 'ok' : ''}">${o.acceptStudent ? '✔' : '⏳'} Estudiante</span>
      </div>
      ${canWrite ? `<button class="btn secondary block" type="button" data-act="accept" ${mineAccepted || closed ? 'disabled' : ''}>
        ${o.agreed ? 'Condiciones acordadas ✔' : mineAccepted ? 'Aceptaste · esperando a la otra parte' : 'Aceptar condiciones'}</button>` : ''}
      ${r === 'cliente' && !o.agreed ? `<label class="toggle"><input type="checkbox" data-change="auto" ${o.autoreply ? 'checked' : ''}> Respuesta automática del estudiante (demo en solitario: también acepta por él)</label>` : ''}
    </aside>
  </section>` + navFooter();
}

/* ---------- 4. Agendamiento ---------- */

function slotLabel(date) {
  return new Date(date + 'T12:00:00').toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' });
}

function viewAgenda() {
  const head = pageHead('Cliente', 'Agenda tu cita',
    'Elige un horario libre del estudiante. Al confirmar, el pago queda retenido por la plataforma hasta que el servicio se cierre.');
  const o = order();
  if (!o) return noOrderView(head);
  const s = o.service, r = role();
  const fee = o.paid ? o.fee : Math.round(s.price * D.feeRate);
  const total = o.paid ? o.amount : s.price + fee;
  const pending = ui.pendingSlot;
  const canPick = r === 'cliente' && o.agreed && !o.paid;
  const days = slots[o.serviceId] || [];

  const left = o.paid
    ? `<article class="card"><h2>Cita confirmada</h2>
        <p class="big-slot">🗓 ${esc(o.slot.replace(' ', ' · '))}</p>
        <p class="muted">${s.mode === 'virtual' ? 'Por videollamada' : esc(s.zone)} · Supervisa ${esc(s.supervisor)}</p>
        ${r === 'cliente' && o.escrow === 'held' && !o.supervision.some(Boolean) ? '<button class="btn ghost block" type="button" data-act="cancel">Cancelar y pedir reembolso</button>' : ''}
        <p class="note ok">Recordatorio programado: se avisará a las partes antes de la cita.</p></article>`
    : `<article class="card"><h2>Horarios disponibles</h2>
        ${!o.agreed ? '<p class="note">Primero ambas partes deben aceptar las condiciones en el chat.</p>' : ''}
        ${days.length ? days.map(d => `<div class="day"><strong>${slotLabel(d.date)}</strong><div class="slots">
          ${d.times.map(t => { const k = `${d.date} ${t.time}`; return `<button type="button" class="slot ${pending === k ? 'on' : ''}" data-act="slot" data-slot="${k}" ${canPick && t.free ? '' : 'disabled'} title="${t.free ? '' : 'Ya reservado'}">${t.time}${t.free ? '' : ' ✕'}</button>`; }).join('')}
        </div></div>`).join('') : '<p class="note">No hay horarios libres en los próximos días.</p>'}
      </article>`;

  const slot = o.slot || (canPick ? pending : null);
  return head + caseBar() + `
  <section class="grid two">${left}
    <article class="card">
      <h2>Resumen y pago</h2>
      <dl class="facts">
        <div><dt>Servicio</dt><dd>${esc(s.title)}</dd></div>
        <div><dt>Estudiante</dt><dd>${esc(s.student)} <span class="badge ok sm">✔</span></dd></div>
        <div><dt>Cita</dt><dd>${slot ? esc(slot.replace(' ', ' · ')) : 'Sin seleccionar'}</dd></div>
        <div><dt>Servicio</dt><dd>${fmt(s.price)}</dd></div>
        <div><dt>Tarifa de plataforma (${Math.round(D.feeRate * 100)} %)</dt><dd>${fmt(fee)}</dd></div>
        <div class="total"><dt>Total</dt><dd>${fmt(total)}</dd></div>
      </dl>
      <div class="escrow-note">🔒 Pago retenido: el estudiante no recibe el dinero hasta que el cliente cierre el servicio.</div>
      ${r === 'cliente' ? `<button class="btn primary block" type="button" data-act="book" ${canPick && pending ? '' : 'disabled'}>
        ${o.paid ? 'Cita confirmada y pago retenido ✔' : 'Confirmar y pagar (simulado)'}</button>
        ${o.paid ? '' : '<p class="note">No se ingresa ninguna tarjeta: el pago es una simulación.</p>'}` : ''}
    </article>
  </section>` + navFooter();
}

/* ---------- 5. Supervisión y reputación ---------- */

function rateStars(value, enabled) {
  return `<span class="rate">${[1, 2, 3, 4, 5].map(n => `<button type="button" class="star ${n <= value ? 'on' : ''}" data-act="star" data-val="${n}" ${enabled ? '' : 'disabled'} aria-label="${n} estrellas">★</button>`).join('')}</span>`;
}

function viewSupervision() {
  const head = pageHead('Docente, estudiante y cliente', 'Supervisión y reputación',
    'El docente supervisor valida que el servicio se cumpla dentro del alcance. Al cerrar, ambas partes se califican y la reputación se actualiza.');
  const o = order();
  if (!o) return noOrderView(head);
  if (!o.paid) return head + caseBar() + `<section class="card empty-state"><p>La supervisión empieza cuando la cita está confirmada con el pago retenido.</p>
    <button class="btn primary" type="button" data-act="goto" data-step="3">Ir a agendamiento</button></section>` + navFooter();
  const r = role(), s = o.service;
  const mine = r === 'cliente' ? o.ratingByClient : r === 'estudiante' ? o.ratingByStudent : null;
  const canRate = o.serviceDone && r !== 'docente' && !mine;
  const shown = mine || { value: ui.draft.value, comment: ui.draft.comment };
  const target = r === 'cliente' ? o.student : o.client;
  const advance = r === 'docente' && !o.serviceDone && o.escrow === 'held';

  const ratingLine = (label, rt) => `<div class="rate-row"><span>${label}</span>${rt ? `${rateStars(rt.value, false)}<small>${esc(rt.comment)}</small>` : '<small>Pendiente</small>'}</div>`;
  return head + caseBar() + `
  <section class="grid two">
    <article class="card">
      <h2>Supervisión docente</h2>
      <p class="muted">${esc(s.supervisor)}</p>
      <ul class="checklist">${SUPERVISION_STEPS.map((t, i) => `<li class="${o.supervision[i] ? 'ok' : ''}"><span class="tick">${o.supervision[i] ? '✓' : ''}</span><div><strong>${t}</strong></div></li>`).join('')}</ul>
      ${r === 'docente' ? `<button class="btn secondary block" type="button" data-act="advance" ${advance ? '' : 'disabled'}>
        ${o.serviceDone ? 'Servicio cerrado con aval docente ✔' : 'Registrar siguiente paso de supervisión'}</button>`
    : `<p class="note">${o.serviceDone ? '✔ Servicio cerrado con aval docente.' : 'El docente registra cada paso de la supervisión.'}</p>`}
    </article>
    <article class="card ${o.serviceDone ? '' : 'locked'}">
      <h2>Calificación bidireccional</h2>
      ${o.serviceDone ? '' : '<p class="note">Se habilita cuando el docente cierra el servicio.</p>'}
      ${canRate ? `<form data-form="rate" data-hold>
          <div class="rate-row"><span>Califica a ${esc(target.name)}</span>${rateStars(shown.value, true)}</div>
          <textarea name="comment" rows="2" maxlength="160" placeholder="Comentario (opcional)">${esc(ui.draft.comment)}</textarea>
          <button class="btn primary block" type="submit" ${ui.draft.value ? '' : 'disabled'}>Enviar calificación</button></form>`
    : r === 'docente' || mine ? '' : ''}
      ${ratingLine('Cliente → estudiante', o.ratingByClient)}
      ${ratingLine('Estudiante → cliente', o.ratingByStudent)}
      <div class="rep">${avatar(o.student)}<div><strong>Reputación de ${esc(o.student.name.split(' ')[0])}</strong><br>${stars(o.student.rating)} <small>(${o.student.reviews} reseñas)</small></div></div>
    </article>
  </section>` + navFooter();
}

/* ---------- 6. Pago retenido ---------- */

function viewPago() {
  const head = pageHead('Cliente y plataforma', 'Pago retenido y liberación',
    'El dinero queda en custodia hasta que el servicio se cierre. Simulación: no se mueve dinero real, y las disputas las resuelve el docente supervisor.');
  const o = order();
  if (!o) return noOrderView(head);
  const r = role(), e = o.escrow, s = o.service;
  const stages = [
    { t: 'Pago depositado', d: o.paid ? `${fmt(o.amount)} recibidos` : 'Aún sin pago', ok: o.paid },
    { t: 'Retenido en custodia', d: 'El dinero no está disponible para el estudiante', ok: ['held', 'released', 'dispute'].includes(e) },
    { t: 'Servicio cerrado con aval docente', d: o.serviceDone ? 'Supervisión completada' : 'Pendiente de cierre', ok: o.serviceDone },
    e === 'refunded'
      ? { t: 'Pago reembolsado', d: `${fmt(o.amount)} devueltos al cliente`, ok: true }
      : { t: 'Pago liberado', d: e === 'released' ? `${fmt(o.amount - o.fee)} al estudiante · ${fmt(o.fee)} tarifa de plataforma` : 'Se libera cuando el cliente confirma el cierre', ok: e === 'released' }
  ];
  const label = { none: 'Sin pago', held: 'Retenido 🔒', released: 'Liberado ✔', dispute: 'En disputa ⚠', refunded: 'Reembolsado ↩' }[e];
  const tone = e === 'released' ? 'ok' : e === 'dispute' || e === 'refunded' ? 'warn' : 'info';
  const parties = r !== 'docente';

  let actions = '';
  if (r === 'cliente') actions += `<button class="btn primary block" type="button" data-act="release" ${e === 'held' && o.serviceDone ? '' : 'disabled'}>Confirmar servicio y liberar pago</button>`;
  if (r === 'docente' && e === 'dispute') actions += `<div class="dispute-box"><strong>Disputa abierta</strong><p>“${esc(o.disputeReason)}”</p>
      <button class="btn primary block" type="button" data-act="resolve" data-outcome="release">Resolver: liberar al estudiante</button>
      <button class="btn secondary block" type="button" data-act="resolve" data-outcome="refund">Resolver: reembolsar al cliente</button></div>`;
  if (parties && e === 'held') actions += `<form class="dispute-form" data-form="dispute" data-hold>
      <label>¿Hubo un problema?<textarea name="reason" rows="2" maxlength="200" required minlength="5" placeholder="Cuéntanos brevemente qué pasó"></textarea></label>
      <button class="btn ghost block" type="submit">Reportar un problema</button></form>`;

  return head + caseBar() + `
  <section class="grid two">
    <article class="card">
      <h2>Estado del pago <span class="badge ${tone}">${label}</span></h2>
      <ol class="timeline">${stages.map(x => `<li class="${x.ok ? 'ok' : ''}"><span class="dot">${x.ok ? '✓' : ''}</span><div><strong>${x.t}</strong><small>${x.d}</small></div></li>`).join('')}</ol>
    </article>
    <article class="card">
      <h2>Acciones</h2>
      <dl class="facts">
        <div><dt>Servicio</dt><dd>${esc(s.title)}</dd></div>
        <div><dt>Monto retenido</dt><dd>${o.paid ? fmt(o.amount) : '—'}</dd></div>
      </dl>
      ${actions || '<p class="note">No hay acciones disponibles para tu rol en este momento.</p>'}
      ${r === 'cliente' && e === 'held' && !o.serviceDone ? '<p class="note">Para liberar el pago, el docente debe cerrar el servicio (paso anterior).</p>' : ''}
      ${e === 'released' && D.demo ? '<div class="center"><button class="btn secondary" type="button" data-act="reset">Reiniciar demo</button></div>' : ''}
    </article>
  </section>` + navFooter();
}

const VIEWS = [viewPerfil, viewBusqueda, viewChat, viewAgenda, viewSupervision, viewPago];

/* ---------- Acciones ---------- */

const go = step => {
  ui.step = Math.max(0, Math.min(STEPS.length - 1, step)); ui.menu = null; saveUi(); render();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  if (ui.step === 3) refresh(true);
};
const oid = () => order()?.id;

Object.assign(ACTIONS, {
  prev: () => go(ui.step - 1),
  next: () => go(ui.step + 1),
  goto: b => go(+b.dataset.step),
  case: sel => { ui.orderId = +sel.value; ui.pendingSlot = null; saveUi(); refresh(true); },
  filter: el => {
    ui.filters[el.dataset.key] = el.dataset.key === 'maxPrice' ? +el.value : el.value;
    saveUi(); render();
  },
  verify: b => act(() => api(`/verification/${b.dataset.step}`, 'POST'), 'Paso validado ✔'),
  endorse: b => act(() => api(`/students/${b.dataset.id}/endorse`, 'POST'), 'Aval registrado ✔'),
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
      ui.orderId = o.id; ui.pendingSlot = null; saveUi();
      await refresh(true); go(2);
    } catch (e) { toast(e.message); }
  },
  accept: () => act(() => api(`/orders/${oid()}/accept`, 'POST')),
  quick: b => act(() => api(`/orders/${oid()}/messages`, 'POST', { text: QUICK_REPLIES[+b.dataset.i] })),
  auto: el => act(() => api(`/orders/${oid()}/autoreply`, 'POST', { on: el.checked })),
  slot: b => { ui.pendingSlot = b.dataset.slot; saveUi(); render(); },
  book: async () => { await act(() => api(`/orders/${oid()}/book`, 'POST', { slot: ui.pendingSlot }), 'Cita agendada · pago retenido 🔒'); ui.pendingSlot = null; },
  cancel: () => act(() => api(`/orders/${oid()}/cancel`, 'POST'), 'Cita cancelada · pago reembolsado'),
  advance: () => act(() => api(`/orders/${oid()}/supervision/advance`, 'POST')),
  star: b => { ui.draft.value = +b.dataset.val; const t = $('textarea[name=comment]'); if (t) ui.draft.comment = t.value; saveUi(); render(); },
  release: () => act(() => api(`/orders/${oid()}/release`, 'POST'), 'Pago liberado al estudiante ✔'),
  resolve: b => act(() => api(`/orders/${oid()}/resolve`, 'POST', { outcome: b.dataset.outcome }), 'Disputa resuelta'),
  reset: async () => { await act(() => api('/reset', 'POST'), 'Demo reiniciada'); Object.assign(ui, { step: 0, orderId: null }); saveUi(); render(); }
});

Object.assign(FORMS, {
  chat: async f => {
    const text = f.text.value.trim();
    if (!text) return;
    f.text.value = '';
    await act(() => api(`/orders/${oid()}/messages`, 'POST', { text }));
    // La respuesta guionada llega ~1 s después; el canal en tiempo real la trae sola.
  },
  rate: async f => {
    await act(() => api(`/orders/${oid()}/rate`, 'POST', { value: ui.draft.value, comment: f.comment.value }), 'Calificación enviada ⭐');
    ui.draft = { value: 0, comment: '' }; saveUi();
  },
  dispute: f => act(() => api(`/orders/${oid()}/dispute`, 'POST', { reason: f.reason.value }), 'Problema reportado · el pago sigue retenido'),
  svc: async f => {
    const body = {
      title: f.title.value, category: f.category.value, price: +f.price.value, mode: f.mode.value, zone: f.zone.value, scope: f.scope.value,
      days: $$('input[name=day]:checked', f).map(c => +c.value), times: f.times.value.split(/[,\s]+/).filter(Boolean)
    };
    const id = f.dataset.id;
    try {
      await (id ? api(`/services/${id}`, 'PATCH', body) : api('/services', 'POST', body));
      ui.editSvc = null; saveUi(); toast(id ? 'Servicio actualizado' : 'Servicio publicado ✔'); await refresh(true);
    } catch (e) { toast(e.message); }
  }
});
