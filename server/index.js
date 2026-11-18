const path = require('node:path');
const { createApp } = require('./app');

const PORT = process.env.PORT || 3000;
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data', 'pmc.db');
// DEMO=0 desactiva el acceso rápido sin contraseña y el botón "Reiniciar demo".
const demo = process.env.DEMO !== '0';

// DOCENTE_CODE habilita el registro de docentes: quien lo conozca puede crear una cuenta de docente.
// PROVISIONAL (Semana de la Innovación 2026): hay un código por defecto para no depender del .env
// del servidor durante la muestra. El repositorio es público, así que cualquiera que lo lea puede
// crear una cuenta de docente. Al terminar la muestra, borra el valor por defecto y define
// DOCENTE_CODE en el servidor.
const DEFAULT_INVITE_CODE = 'uniserv-docente-2026';
const inviteCode = process.env.DOCENTE_CODE || DEFAULT_INVITE_CODE;
if (!demo && inviteCode === DEFAULT_INVITE_CODE) {
  console.warn('Aviso: se está usando el código de docente por defecto, que es público. Define DOCENTE_CODE cuando termine la muestra.');
}

createApp({ dbFile: DB_PATH, demo, inviteCode }).listen(PORT, () => {
  console.log(`UniServ en http://localhost:${PORT} (demo ${demo ? 'activada' : 'desactivada'})`);
});
