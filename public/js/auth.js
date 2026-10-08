// Portada y acceso: iniciar sesión, registrarse y acceso rápido de la demo.
let authTab = 'login';

function viewAuth() {
  const demoBlock = info.demo ? `
    <div class="demo-box">
      <h3>${icon('play', 16)} Probar la demo</h3>
      <p class="note" style="margin-top:.3rem">Entra directo a una cuenta de ejemplo, sin contraseña. Para iniciar sesión normal usa el correo de la cuenta y <code>${esc(info.demoPassword)}</code>.</p>
      ${['cliente', 'estudiante', 'docente'].map(r => `
        <div class="demo-group"><span>${ROLE_LABEL[r]}s</span><div class="demo-chips">
          ${info.demoAccounts.filter(a => a.role === r).map(a => `<button type="button" class="demo-chip" data-act="demo-login" data-id="${esc(a.id)}">${avatar(a, 'sm')}${esc(a.name)}</button>`).join('')}
        </div></div>`).join('')}
    </div>` : '';

  const login = `
    <form class="auth-form" data-form="login">
      <label>Correo<input name="email" type="email" required autocomplete="username" placeholder="tu@correo.com"></label>
      <label>Contraseña<input name="password" type="password" required autocomplete="current-password"></label>
      <button class="btn primary block" type="submit">Iniciar sesión ${icon('arrow-right', 16)}</button>
    </form>`;

  const register = `
    <form class="auth-form" data-form="register">
      <label>Nombre completo<input name="name" required minlength="2" maxlength="60" autocomplete="name"></label>
      <label>Correo<input name="email" type="email" required autocomplete="username"></label>
      <label>Contraseña (mín. 8 caracteres)<input name="password" type="password" required minlength="8" autocomplete="new-password"></label>
      <label>Quiero…
        <select name="role" id="reg-role">
          <option value="cliente">Contratar servicios (cliente)</option>
          <option value="estudiante">Ofrecer servicios (estudiante)</option>
        </select></label>
      <div id="reg-student" class="auth-form" hidden>
        <label>Universidad<input name="uni" maxlength="60" placeholder="Universidad Demo"></label>
        <label>Carrera<input name="career" maxlength="60" placeholder="Odontología, Derecho…"></label>
        <label>Semestre<input name="semester" type="number" min="1" max="14" value="8"></label>
        <label>Docente supervisor
          <select name="supervisorId">${info.docentes.map(d => `<option value="${esc(d.id)}">${esc(d.name)} · ${esc(d.career)}</option>`).join('')}</select></label>
      </div>
      <button class="btn primary block" type="submit">Crear cuenta ${icon('arrow-right', 16)}</button>
    </form>`;

  return `<div class="landing">
    <section class="hero">
      <div class="brand">
        <span class="logo" aria-hidden="true">${icon('shield-check', 22)}</span>
        <div><strong>PractiConecta</strong><small>Servicios universitarios supervisados</small></div>
      </div>
      <div>
        <h1>Práctica universitaria, <em>supervisada</em> y a tu alcance.</h1>
        <p class="lead">Contrata a estudiantes verificados de Odontología, Derecho, Psicología e Ingeniería. Un docente supervisa cada servicio y tu pago queda retenido hasta el cierre.</p>
      </div>
      <ul class="hero-points">
        <li><span class="tile">${icon('shield-check', 20)}</span><div><strong>Estudiantes verificados</strong><span>Identidad, matrícula y aval de un docente supervisor.</span></div></li>
        <li><span class="tile">${icon('clipboard', 20)}</span><div><strong>Supervisión docente</strong><span>El docente valida cada práctica y firma el cierre.</span></div></li>
        <li><span class="tile">${icon('lock', 20)}</span><div><strong>Pago retenido</strong><span>El dinero se libera solo cuando el servicio se cumple.</span></div></li>
      </ul>
      <div class="flow" aria-label="Cómo funciona">
        ${STEPS.map((s, i) => `<span>${i ? '<b>→</b>' : ''}${esc(s.label)}</span>`).join('')}
      </div>
    </section>
    <section class="access">
      <div><h2>${authTab === 'login' ? 'Bienvenido de nuevo' : 'Crea tu cuenta'}</h2>
        <p class="muted" style="margin:.3rem 0 0">${authTab === 'login' ? 'Ingresa para continuar con tus servicios.' : 'Es gratis y toma menos de un minuto.'}</p></div>
      <div class="tabs" role="tablist">
        <button type="button" class="${authTab === 'login' ? 'on' : ''}" data-act="auth-tab" data-tab="login">Iniciar sesión</button>
        <button type="button" class="${authTab === 'register' ? 'on' : ''}" data-act="auth-tab" data-tab="register">Crear cuenta</button>
      </div>
      ${authTab === 'login' ? login : register}
      ${demoBlock}
    </section>
  </div>`;
}

Object.assign(ACTIONS, {
  'auth-tab': b => { authTab = b.dataset.tab; render(); },
  'demo-login': async b => {
    try { await api('/auth/switch', 'POST', { userId: b.dataset.id }); await enter(); } catch (e) { toast(e.message); }
  },
  logout: async () => { await api('/auth/logout', 'POST').catch(() => {}); leave(); },
  switch: async b => { await act(() => api('/auth/switch', 'POST', { userId: b.value })); ui.orderId = null; ui.menu = null; saveUi(); render(); toast('Ahora estás como ' + D.me.name); }
});

Object.assign(FORMS, {
  login: async f => {
    try { await api('/auth/login', 'POST', { email: f.email.value, password: f.password.value }); await enter(); } catch (e) { toast(e.message); }
  },
  register: async f => {
    const body = { name: f.name.value, email: f.email.value, password: f.password.value, role: f.role.value };
    if (f.role.value === 'estudiante') Object.assign(body, { uni: f.uni.value, career: f.career.value, semester: +f.semester.value, supervisorId: f.supervisorId.value });
    try { await api('/auth/register', 'POST', body); ui.step = 0; await enter(); toast('¡Cuenta creada!'); } catch (e) { toast(e.message); }
  }
});

// Entra a la app: carga datos y abre el canal en tiempo real.
async function enter() {
  Object.assign(ui, { step: 0, orderId: null, menu: null, editSvc: null });
  await refresh(true);
  if (D) connectEvents();
}

function leave() {
  D = null; orders = []; slots = {};
  disconnectEvents();
  render();
}
