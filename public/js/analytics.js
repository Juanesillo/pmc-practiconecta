// Google Analytics (gtag.js). Es el mismo bloque inline del snippet de Google, en un archivo propio
// para que la política de seguridad (CSP) no necesite 'unsafe-inline'.
window.dataLayer = window.dataLayer || [];
function gtag() { dataLayer.push(arguments); }

// En desarrollo local no se envían datos, para no contaminar las métricas reales.
const ANALYTICS_ON = !['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);

if (ANALYTICS_ON) {
  gtag('js', new Date());
  // La app es de una sola página (rutas con #/...): las vistas se envían a mano en trackView().
  gtag('config', 'G-Z9FSTXTLJQ', { send_page_view: false });
}

// Eventos propios del embudo. Nunca llevan datos personales (sin correos ni nombres).
function track(name, params) {
  if (ANALYTICS_ON) gtag('event', name, params || {});
}

// Vista virtual por pantalla (la URL cambia solo en el #). Se llama desde render(); envía una por cambio de pantalla.
// Las rutas con identificadores se agrupan (/servicio, /casos/chat) y no llevan datos personales.
let _lastView = null;
function trackView() {
  if (!ANALYTICS_ON) return;
  let path = '/';
  if (typeof D !== 'undefined' && D) {
    const r = route();
    path = '/' + [r.name || 'inicio', r.name === 'casos' ? r.b : null].filter(Boolean).join('/');
    gtag('set', 'user_properties', { user_role: D.me.role });
  }
  if (path === _lastView) return;
  _lastView = path;
  gtag('event', 'page_view', { page_path: path, page_location: location.origin + path, page_title: 'UniServ ' + path });
}
