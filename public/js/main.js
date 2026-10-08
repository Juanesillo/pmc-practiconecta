// Render principal, cabecera, notificaciones y delegación de eventos.

function renderHeader() {
  const bar = $('#topbar-user');
  if (!D) { bar.innerHTML = ''; return; }
  const unread = D.notifications.filter(n => !n.read).length;
  bar.innerHTML = `
    <div class="menu-wrap">
      <button class="icon-btn" type="button" data-act="bell" aria-label="Notificaciones" aria-expanded="${ui.menu === 'bell'}">${icon('bell', 19)}${unread ? `<span class="dot-badge">${unread}</span>` : ''}</button>
      ${ui.menu === 'bell' ? `<div class="dropdown notif">
        <div class="dd-head"><strong>Notificaciones</strong></div>
        ${D.notifications.length ? D.notifications.map(n => `<button type="button" class="notif-item ${n.read ? '' : 'unread'}" data-act="notif" data-order="${n.orderId ?? ''}" data-kind="${n.kind}">
          <span>${esc(n.text)}</span><small>${esc(n.at)}</small></button>`).join('') : '<p class="note pad">Sin notificaciones todavía.</p>'}
      </div>` : ''}
    </div>
    <div class="menu-wrap">
      <button class="user-chip" type="button" data-act="user-menu" aria-expanded="${ui.menu === 'user'}">${avatar(D.me)}<span><strong>${esc(D.me.name)}</strong><small>${ROLE_LABEL[D.me.role]}</small></span>${icon('chevron', 16)}</button>
      ${ui.menu === 'user' ? `<div class="dropdown">
        ${D.demo ? `<label class="dd-item">Cambiar de cuenta (demo)
          <select data-change="switch">${['cliente', 'estudiante', 'docente'].map(r => `<optgroup label="${ROLE_LABEL[r]}s">${info.demoAccounts.filter(a => a.role === r).map(a => `<option value="${esc(a.id)}" ${a.id === D.me.id ? 'selected' : ''}>${esc(a.name)}</option>`).join('')}</optgroup>`).join('')}</select></label>
          <button type="button" class="dd-item" data-act="reset">${icon('refresh', 15)} Reiniciar demo (todos los usuarios)</button>` : ''}
        <button type="button" class="dd-item" data-act="logout">${icon('logout', 15)} Cerrar sesión</button>
      </div>` : ''}
    </div>`;
}

function renderSidebar() {
  const sb = $('#sidebar');
  sb.hidden = !D;
  if (!D) return;
  $('#stepper').innerHTML = STEPS.map((s, i) => {
    const cls = i === ui.step ? 'active' : i < ui.step ? 'done' : '';
    return `<button type="button" class="step ${cls}" data-act="goto" data-step="${i}" ${i === ui.step ? 'aria-current="step"' : ''}>
      <span class="step-n">${i < ui.step ? icon('check', 15) : i + 1}</span>
      <span class="step-t"><span class="step-l">${s.label}</span><span class="step-s">${s.sub}</span></span></button>`;
  }).join('');
  const o = order();
  $('#side-case').innerHTML = o ? `<div class="side-case"><small>Caso #${o.id}</small>
      <strong>${esc(o.service.title)}</strong>
      <div class="row"><span>${esc(otherParty(o))}</span></div>
      <div class="row" style="margin-top:.5rem"><span class="badge ${orderStatus(o).tone}">${orderStatus(o).label}</span>${o.paid ? `<b>${fmt(o.amount)}</b>` : ''}</div></div>` : '';
  $('#side-note').innerHTML = `${icon('info', 14)}<span>Prototipo académico: datos y pagos simulados.</span>`;
}

let pendingRender = false;

function render() {
  const active = document.activeElement;
  // No se redibuja mientras alguien escribe en un formulario largo: se hace al salir del campo.
  if (D && active?.closest?.('form[data-hold]')) { pendingRender = true; return; }
  const keep = active?.id === 'chat-input' ? { value: active.value, pos: active.selectionStart } : null;

  document.body.classList.toggle('is-auth', !D);
  renderHeader();
  renderSidebar();
  if (!D) { $('#view').innerHTML = viewAuth(); return; }
  $('#view').innerHTML = VIEWS[ui.step]();
  const body = $('#chat-body');
  if (body) body.scrollTop = body.scrollHeight;
  if (keep) {
    const el = $('#chat-input');
    if (el && !el.disabled) { el.value = keep.value; el.focus(); el.setSelectionRange(keep.pos, keep.pos); }
  }
}

/* ---------- Eventos delegados ---------- */

document.addEventListener('click', e => {
  const b = e.target.closest('[data-act]');
  if (b && ACTIONS[b.dataset.act] && !b.disabled) {
    if (!['bell', 'user-menu', 'notif'].includes(b.dataset.act) && ui.menu && !b.closest('.dropdown')) ui.menu = null;
    ACTIONS[b.dataset.act](b);
    return;
  }
  if (ui.menu && !e.target.closest('.menu-wrap')) { ui.menu = null; render(); }
});

document.addEventListener('change', e => {
  const el = e.target.closest('[data-change]');
  if (el && ACTIONS[el.dataset.change]) { ACTIONS[el.dataset.change](el); return; }
  if (e.target.id === 'reg-role') $('#reg-student').hidden = e.target.value !== 'estudiante';
});

document.addEventListener('input', e => {
  const el = e.target;
  if (el.dataset?.live) $('#' + el.dataset.live).textContent = fmt(el.value);
});

document.addEventListener('submit', e => {
  const f = e.target.closest('form[data-form]');
  if (!f) return;
  e.preventDefault();
  FORMS[f.dataset.form]?.(f);
});

document.addEventListener('focusout', () => {
  setTimeout(() => {
    if (pendingRender && !document.activeElement?.closest?.('form[data-hold]')) { pendingRender = false; render(); }
  }, 0);
});

Object.assign(ACTIONS, {
  bell: async () => {
    ui.menu = ui.menu === 'bell' ? null : 'bell';
    render();
    if (ui.menu === 'bell' && D.notifications.some(n => !n.read)) {
      // Marca como leídas al abrir; se refleja al cerrar para que se vea cuáles eran nuevas.
      api('/notifications/read', 'POST').catch(() => {});
    }
  },
  'user-menu': () => { ui.menu = ui.menu === 'user' ? null : 'user'; render(); },
  notif: b => {
    const kind = b.dataset.kind, id = b.dataset.order ? +b.dataset.order : null;
    if (id && orders.some(o => o.id === id)) ui.orderId = id;
    ui.menu = null;
    const stepFor = { verif: 0, order: 2, msg: 2, rating: 4, payment: 5, dispute: 5 }[kind] ?? ui.step;
    go(stepFor);
    refresh(true);
  }
});

/* ---------- Arranque ---------- */

(async function boot() {
  try { info = await fetch('/api/public/info').then(r => r.json()); } catch (e) { /* sin red */ }
  await refresh(true);
  if (D) connectEvents(); else render();
})();
