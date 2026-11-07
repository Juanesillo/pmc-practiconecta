// Portada (landing) y acceso: iniciar sesión, registrarse y acceso rápido de la demo.
let authTab = 'login';
let regRole = 'cliente';

// Formulario de acceso (se dibuja dentro del diálogo #access).
function accessHtml() {
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
          <option value="cliente" ${regRole === 'cliente' ? 'selected' : ''}>Contratar servicios (cliente)</option>
          <option value="estudiante" ${regRole === 'estudiante' ? 'selected' : ''}>Ofrecer servicios (estudiante)</option>
          ${info.docenteSignup ? `<option value="docente" ${regRole === 'docente' ? 'selected' : ''}>Supervisar estudiantes (docente)</option>` : ''}
        </select></label>
      <div id="reg-extra" class="auth-form" ${regRole === 'cliente' ? 'hidden' : ''}>
        <label>Universidad<input name="uni" maxlength="60" autocomplete="organization" ${info.demo ? 'placeholder="Universidad Demo"' : ''}></label>
        <label><span data-role-label>${regRole === 'docente' ? 'Programa o facultad' : 'Carrera'}</span><input name="career" maxlength="60" placeholder="Odontología, Derecho…"></label>
        <div id="reg-student" class="auth-form" ${regRole === 'estudiante' ? '' : 'hidden'}>
          <label>Semestre<input name="semester" type="number" min="1" max="14" value="8"></label>
          <label>Docente supervisor
            ${info.docentes.length ? `<select name="supervisorId">${info.docentes.map(d => `<option value="${esc(d.id)}">${esc(d.name)} · ${esc(d.career)}${d.uni ? ' · ' + esc(d.uni) : ''}</option>`).join('')}</select>`
              : `<select name="supervisorId" disabled><option value="">Aún no hay docentes registrados</option></select>`}</label>
        </div>
        <label id="reg-code" ${regRole === 'docente' ? '' : 'hidden'}>Código de invitación<input name="inviteCode" type="password" autocomplete="off"></label>
      </div>
      <button class="btn primary block" type="submit">Crear cuenta ${icon('arrow-right', 16)}</button>
    </form>`;

  return `
    <div class="dlg-head"><div><h2 style="margin:0;font-size:1.25rem">${authTab === 'login' ? 'Inicia sesión' : 'Crea tu cuenta'}</h2>
      <p class="muted" style="margin:.2rem 0 0;font-size:.88rem">${authTab === 'login' ? 'Accede para continuar con tus servicios.' : 'Es gratis y toma menos de un minuto.'}</p></div>
      <button class="icon-btn" type="button" data-act="access-close" aria-label="Cerrar">${icon('x', 18)}</button></div>
    <div class="dlg-body access-body">
      <div class="tabs" role="tablist">
        <button type="button" class="${authTab === 'login' ? 'on' : ''}" data-act="auth-tab" data-tab="login">Iniciar sesión</button>
        <button type="button" class="${authTab === 'register' ? 'on' : ''}" data-act="auth-tab" data-tab="register">Crear cuenta</button>
      </div>
      ${authTab === 'login' ? login : register}
      ${demoBlock}
    </div>`;
}

function affiliateHtml() {
  return `
    <div class="dlg-head"><div><h2 style="margin:0;font-size:1.25rem">Afiliar mi universidad</h2>
      <p class="muted" style="margin:.2rem 0 0;font-size:.88rem">Cuéntanos de tu facultad y el equipo de UniServ te contactará.</p></div>
      <button class="icon-btn" type="button" data-act="access-close" aria-label="Cerrar">${icon('x', 18)}</button></div>
    <div class="dlg-body access-body">
      <form class="auth-form" data-form="affiliate">
        <label>Universidad<input name="uni" required maxlength="80" autocomplete="organization"></label>
        <label>Facultad o programa
          <select name="faculty">
            <option>Derecho</option><option>Psicología</option><option>Odontología</option><option>Ingeniería</option><option>Diseño</option><option>Otra</option>
          </select></label>
        <label>Nombre de contacto<input name="name" required minlength="2" maxlength="60" autocomplete="name"></label>
        <label>Correo institucional<input name="email" type="email" required autocomplete="email"></label>
        <button class="btn primary block" type="submit">Enviar solicitud ${icon('arrow-right', 16)}</button>
      </form>
    </div>`;
}

// El diálogo modal tapa el aviso (toast), así que los errores se muestran dentro del formulario.
function formError(f, msg) {
  const host = f.closest?.('dialog') ? f : $('#access form');
  if (!host) return toast(msg);
  let el = $('.form-error', host);
  if (!el) { el = document.createElement('p'); el.className = 'form-error'; el.setAttribute('role', 'alert'); host.prepend(el); }
  el.textContent = msg;
}

// Trae la lista de docentes al abrir el diálogo: puede haber cambiado desde que se cargó la página.
async function refreshInfo() {
  try { info = await fetch('/api/public/info').then(r => r.json()); } catch (e) { /* se usa lo ya cargado */ }
}

async function openAccess(tab, role) {
  if (tab) authTab = tab;
  if (role) regRole = role;
  const d = $('#access');
  d.innerHTML = accessHtml();
  if (!d.open) d.showModal();
  const before = info.docentes.length;
  await refreshInfo();
  if (d.open && info.docentes.length !== before) d.innerHTML = accessHtml();
}

function viewAuth() {
  const steps = [
    ['shield-check', 'Verificamos cada perfil', 'Identidad, matrícula vigente y aval de un docente supervisor antes de publicar el primer servicio.'],
    ['lock', 'El pago queda retenido', 'Pagas con Wompi y el dinero permanece protegido. Los criterios de liberación se ven antes de pagar.'],
    ['clipboard', 'Se libera al cumplirse', 'El docente supervisa y cierra el servicio; tú confirmas y recién ahí se libera el pago.'],
    ['message', 'Soporte y disputas', 'Si algo sale mal, reporta el problema: el caso se revisa y se resuelve con liberación o reembolso.']
  ];
  const benefits = [
    ['users', 'Autoservicio con soporte', 'Busca, compara, agenda y paga tú mismo, sin intermediarios. Si te trabas, el soporte te acompaña.'],
    ['star', 'Reputación bidireccional', 'Clientes y estudiantes se califican al cierre. La confianza se construye en ambos sentidos.'],
    ['building', 'Acompañamiento institucional', 'Las facultades ven el desempeño de sus estudiantes y mantienen la supervisión académica.']
  ];
  const audiences = [
    { cls: 'aud-client', ic: 'search', tag: 'Para clientes', title: 'Encuentra el servicio que necesitas',
      text: 'Odontología, orientación legal, psicología, ingeniería y más, con precios claros desde el inicio.',
      list: ['Precio y criterios de liberación visibles', 'Estudiantes verificados y supervisados', 'Tu pago protegido hasta que quedes conforme'],
      cta: 'REVISAR OFERTAS', act: 'cta-client' },
    { cls: 'aud-student', ic: 'cap', tag: 'Para estudiantes', title: 'Gana experiencia real y paga tu semestre',
      text: 'Si estás en últimos semestres de odontología, ingeniería, diseño o tutorías, publica lo que sabes hacer.',
      list: ['Perfil verificado que genera confianza', 'Práctica supervisada por tu docente', 'Pagos seguros y reputación que te acompaña'],
      cta: 'CREAR PERFIL Y PRIMER OFERTA', act: 'cta-student' },
    { cls: 'aud-uni', ic: 'building', tag: 'Para universidades', title: 'Lleva la práctica de tu facultad al mercado',
      text: 'Derecho y Psicología ya administran sus consultorios con UniServ. Súmate y supervisa a tus estudiantes.',
      list: ['Seguimiento de casos y estudiantes', 'Supervisión docente integrada', 'Impacto social medible'],
      cta: 'AFILIARSE CON NOSOTROS', act: 'cta-uni' }
  ];

  return `<div class="site">
    <header class="site-nav"><div class="wrap site-nav-in">
      <a class="brand" href="#/"><img class="logo" src="logo.png" alt="" width="27" height="31">UniServ</a>
      <nav class="site-links" aria-label="Secciones">
        <button type="button" class="navbtn" data-act="scroll" data-to="audiencias">¿Quién eres?</button>
        <button type="button" class="navbtn" data-act="scroll" data-to="como-funciona">Cómo funciona</button>
        <button type="button" class="navbtn" data-act="scroll" data-to="beneficios">Beneficios</button>
      </nav>
      <div class="site-actions">
        <button class="btn ghost sm" type="button" data-act="open-login">Iniciar sesión</button>
        <button class="btn primary sm hide-sm" type="button" data-act="cta-client">Crear cuenta</button>
      </div>
    </div></header>

    <section class="hero"><div class="wrap hero-in">
      <div class="hero-copy">
        <span class="eyebrow">${icon('shield-check', 15)} Talento universitario verificado</span>
        <h1>Servicios hechos por estudiantes, <em>supervisados por docentes</em>.</h1>
        <p class="lead">Contrata a futuros profesionales a un precio justo. Tu dinero queda en pago retenido y solo se libera cuando el servicio se cumple.</p>
        <div class="hero-cta">
          <button type="button" class="btn primary lg" data-act="scroll" data-to="audiencias">Elegir mi camino ${icon('arrow-right', 16)}</button>
          <button type="button" class="btn ghost lg" data-act="scroll" data-to="como-funciona">Ver cómo funciona</button>
        </div>
        <ul class="trust">
          <li>${icon('shield-check', 17)} Identidad verificada</li>
          <li>${icon('lock', 17)} Pago retenido con Wompi</li>
          <li>${icon('clipboard', 17)} Supervisión docente</li>
        </ul>
      </div>
      <aside class="hero-card" aria-label="Ejemplo de pago retenido">
        <div class="hc-head"><span>Ejemplo de servicio</span><span class="badge ok">${icon('lock', 12)} Pago retenido</span></div>
        <h3>Valoración y limpieza dental</h3>
        <p class="muted" style="margin:.1rem 0 .9rem">Estudiante de Odontología · supervisada por docente</p>
        <div class="hc-price"><strong>$45.000</strong><small>precio visible antes de pagar</small></div>
        <ol class="hc-steps">
          <li class="done"><span>${icon('check', 13)}</span>Perfil y aval docente verificados</li>
          <li class="done"><span>${icon('check', 13)}</span>Pago retenido de forma segura</li>
          <li class="now"><span>3</span>Servicio supervisado por el docente</li>
          <li><span>4</span>Confirmas y se libera el pago</li>
        </ol>
        <small class="hc-note">Ejemplo ilustrativo del flujo.</small>
      </aside>
    </div></section>

    <section class="section" id="audiencias"><div class="wrap">
      <div class="sec-head"><span class="eyebrow">Empieza aquí</span><h2>¿Cómo quieres usar UniServ?</h2>
        <p>Elige tu perfil y entra directo al flujo pensado para ti.</p></div>
      <div class="aud-grid">
        ${audiences.map(a => `
        <article class="aud ${a.cls}">
          <div class="aud-ic">${icon(a.ic, 24)}</div>
          <span class="aud-tag">${a.tag}</span>
          <h3>${a.title}</h3>
          <p>${a.text}</p>
          <ul>${a.list.map(l => `<li>${icon('check', 15)}${l}</li>`).join('')}</ul>
          <button class="btn cta" type="button" data-act="${a.act}">${a.cta} ${icon('arrow-right', 16)}</button>
        </article>`).join('')}
      </div>
    </div></section>

    <section class="section alt" id="como-funciona"><div class="wrap">
      <div class="sec-head"><span class="eyebrow">Cómo funciona</span><h2>Confianza en cada paso</h2>
        <p>Cuatro actividades clave protegen a quien contrata y a quien presta el servicio.</p></div>
      <ol class="steps">
        ${steps.map(([ic, t, d], i) => `<li><span class="step-n">${i + 1}</span><div class="step-ic">${icon(ic, 22)}</div><h3>${t}</h3><p>${d}</p></li>`).join('')}
      </ol>
    </div></section>

    <section class="section" id="beneficios"><div class="wrap">
      <div class="sec-head"><span class="eyebrow">Beneficios</span><h2>Pensado para que todos ganen</h2></div>
      <div class="benefits">
        ${benefits.map(([ic, t, d]) => `<div class="benefit"><div class="step-ic">${icon(ic, 22)}</div><h3>${t}</h3><p>${d}</p></div>`).join('')}
      </div>
    </div></section>

    <section class="final"><div class="wrap final-in">
      <div><h2>Listo para empezar con confianza</h2><p>${info.demo ? 'Crea tu cuenta gratis o explora la demo con perfiles de ejemplo.' : 'Crea tu cuenta gratis y empieza hoy.'}</p></div>
      <div class="final-btns">
        <button class="btn light" type="button" data-act="cta-client">Crear cuenta</button>
        <button class="btn outline-light" type="button" data-act="open-login">Iniciar sesión</button>
      </div>
    </div></section>

    <footer class="site-foot"><div class="wrap">
      <span class="brand"><img class="logo" src="logo.png" alt="" width="27" height="31">UniServ</span>
      <small>${info.demo ? 'Prototipo académico (PMC) · los datos, personas, pagos y verificaciones son ficticios; no se mueve dinero real.' : '© UniServ · El pago retenido funciona en modo simulado mientras se integra Wompi.'}</small>
    </div></footer>
  </div>`;
}

Object.assign(ACTIONS, {
  'auth-tab': b => openAccess(b.dataset.tab, regRole),
  'open-login': () => openAccess('login'),
  'cta-client': () => { track('cta_click', { audience: 'cliente' }); openAccess('register', 'cliente'); },
  'cta-student': () => { track('cta_click', { audience: 'estudiante' }); openAccess('register', 'estudiante'); },
  'cta-uni': () => { track('cta_click', { audience: 'universidad' }); const d = $('#access'); d.innerHTML = affiliateHtml(); if (!d.open) d.showModal(); },
  'access-close': () => $('#access').close(),
  scroll: b => { $('#' + b.dataset.to)?.scrollIntoView({ behavior: 'smooth' }); },
  'demo-login': async b => {
    try { await api('/auth/switch', 'POST', { userId: b.dataset.id }); await enter(); } catch (e) { formError($('#access form') || b, e.message); }
  },
  logout: async () => { await api('/auth/logout', 'POST').catch(() => {}); leave(); },
  switch: async b => { await api('/auth/switch', 'POST', { userId: b.value }); ui.menu = null; await refresh(true); navigate(defaultRoute()); toast('Ahora estás como ' + D.me.name); }
});

Object.assign(FORMS, {
  affiliate: f => { track('generate_lead', { audience: 'universidad', faculty: f.faculty.value }); $('#access').close(); toast('Solicitud enviada (prototipo). ¡Gracias, ' + f.name.value.split(' ')[0] + '!'); },
  login: async f => {
    try { await api('/auth/login', 'POST', { email: f.email.value, password: f.password.value }); track('login', { method: 'email' }); await enter(); } catch (e) { formError(f, e.message); }
  },
  register: async f => {
    const body = { name: f.name.value, email: f.email.value, password: f.password.value, role: f.role.value };
    if (f.role.value === 'estudiante') Object.assign(body, { uni: f.uni.value, career: f.career.value, semester: +f.semester.value, supervisorId: f.supervisorId.value });
    if (f.role.value === 'docente') Object.assign(body, { uni: f.uni.value, career: f.career.value, inviteCode: f.inviteCode.value });
    try { await api('/auth/register', 'POST', body); track('sign_up', { method: 'email', role: body.role }); await enter(); toast('¡Cuenta creada!'); } catch (e) { formError(f, e.message); }
  }
});

// Entra a la app: carga datos y abre el canal en tiempo real.
async function enter() {
  Object.assign(ui, { menu: null, editSvc: null, pendingSlot: null });
  await refresh(true);
  if (D) { $('#access').close(); navigate(defaultRoute()); connectEvents(); }
}

function leave() {
  D = null; orders = []; slots = {};
  disconnectEvents();
  render();
}
