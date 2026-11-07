// Google Analytics (gtag.js). Es el mismo bloque inline del snippet de Google, en un archivo propio
// para que la política de seguridad (CSP) no necesite 'unsafe-inline'.
window.dataLayer = window.dataLayer || [];
function gtag() { dataLayer.push(arguments); }

// En desarrollo local no se envían datos, para no contaminar las métricas reales.
const ANALYTICS_ON = !['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);

if (ANALYTICS_ON) {
  gtag('js', new Date());
  gtag('config', 'G-Z9FSTXTLJQ');
}

// Eventos propios del embudo. Nunca llevan datos personales (sin correos ni nombres).
function track(name, params) {
  if (ANALYTICS_ON) gtag('event', name, params || {});
}
