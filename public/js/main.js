// Render principal, cabecera, notificaciones y delegación de eventos.

function navItems() {
  const r = role();
  const pending = orders.filter(o => isOpen(o)).length;
  if (r === 'cliente') return [['explorar', 'Explorar', 'compass', 0], ['casos', 'Mis casos', 'inbox', pending]];
  if (r === 'estudiante') return [['perfil', 'Mi perfil', 'user', 0], ['casos', 'Solicitudes', 'inbox', pending]];
  return [['perfil', 'Estudiantes', 'users', 0], ['casos', 'Casos', 'inbox', pending]];
}

function renderHeader() {
  const nav = $('#mainnav'), bar = $('#topbar-user');
  if (!D) { nav.innerHTML = ''; bar.innerHTML = ''; return; }
  const cur = route().name === 'servicio' ? 'explorar' : route().name;
  nav.innerHTML = navItems().map(([id, label, ic, n]) => `<a class="navlink ${cur === id ? 'active' : ''}" href="#/${id}">${icon(ic, 18)}<span>${label}</span>${n ? `<span class="nav-badge">${n}</span>` : ''}</a>`).join('');

  const unread = D.notifications.filter(n => !n.read).length;
  bar.innerHTML = `
    ${D.demo ? `<button class="btn ghost sm" type="button" data-act="guide-open">${icon('book', 15)}<span class="hide-sm">Guía de demo</span></button>` : ''}
    <div class="menu-wrap">
      <button class="icon-btn" type="button" data-act="bell" aria-label="Notificaciones" aria-expanded="${ui.menu === 'bell'}">${icon('bell', 19)}${unread ? `<span class="dot-badge">${unread}</span>` : ''}</button>
      ${ui.menu === 'bell' ? `<div class="dropdown notif">
        <div class="dd-head">Notificaciones</div>
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

let pendingRender = false;

function render() {
  const active = document.activeElement;
  // No se redibuja mientras alguien escribe en un formulario largo: se hace al salir del campo.
  if (D && active?.closest?.('form[data-hold]')) { pendingRender = true; return; }
  const keep = active?.id === 'chat-input' ? { value: active.value, pos: active.selectionStart } : null;
  const hadFocus = active?.matches?.('[data-change][data-key=q]') ? { pos: active.selectionStart } : null;

  document.body.classList.toggle('is-auth', !D);
  renderHeader();
  $('#view').innerHTML = D ? viewRoute() : viewAuth();

  const body = $('#chat-body');
  if (body) body.scrollTop = body.scrollHeight;
  if (keep) {
    const el = $('#chat-input');
    if (el && !el.disabled) { el.value = keep.value; el.focus(); el.setSelectionRange(keep.pos, keep.pos); }
  }
  const back = $('#back-cases');
  if (back) { back.removeAttribute('style'); back.classList.add('mobile-only'); }
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
  if (e.target.id === 'reg-role') {
    regRole = e.target.value;
    $('#reg-extra').hidden = regRole === 'cliente';
    $('#reg-student').hidden = regRole !== 'estudiante';
    $('#reg-code').hidden = regRole !== 'docente';
    $('[data-role-label]').textContent = regRole === 'docente' ? 'Programa o facultad' : 'Carrera';
  }
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

// Al cerrar el diálogo de acceso se vacía, para no dejar contraseñas escritas en el DOM.
document.addEventListener('close', e => { if (e.target.id === 'access') e.target.innerHTML = ''; }, true);

window.addEventListener('hashchange', () => {
  ui.menu = null;
  window.scrollTo({ top: 0 });
  refresh(true); // trae lo necesario (p. ej. horarios) y dibuja
});

Object.assign(ACTIONS, {
  bell: () => {
    ui.menu = ui.menu === 'bell' ? null : 'bell';
    render();
    if (ui.menu === 'bell' && D.notifications.some(n => !n.read)) api('/notifications/read', 'POST').catch(() => {});
  },
  'user-menu': () => { ui.menu = ui.menu === 'user' ? null : 'user'; render(); },
  notif: b => {
    const kind = b.dataset.kind, id = b.dataset.order ? +b.dataset.order : null;
    ui.menu = null;
    const o = id ? orders.find(x => x.id === id) : null;
    if (kind === 'verif' || !o) return navigate('perfil');
    const tab = { msg: 'chat', rating: 'supervision', payment: 'pago', dispute: 'pago' }[kind] || nextTab(o);
    navigate(`casos/${o.id}/${tab}`);
  }
});

/* ---------- Arranque ---------- */

(async function boot() {
  try { info = await fetch('/api/public/info').then(r => r.json()); } catch (e) { /* sin red */ }
  const ft = $('#footer-text');
  if (ft && info.demo) ft.textContent = 'Prototipo académico (PMC) · los datos, personas, pagos y verificaciones son ficticios; no se mueve dinero real.';
  else if (ft) ft.textContent = '© UniServ · El pago retenido funciona en modo simulado mientras se integra Wompi.';
  await refresh(true);
  if (D) connectEvents(); else render();
})();
