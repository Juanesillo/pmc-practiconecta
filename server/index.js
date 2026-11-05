const path = require('node:path');
const { createApp } = require('./app');

const PORT = process.env.PORT || 3000;
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data', 'pmc.db');
// DEMO=0 desactiva el acceso rápido sin contraseña y el botón "Reiniciar demo".
const demo = process.env.DEMO !== '0';

// DOCENTE_CODE habilita el registro de docentes: quien lo conozca puede crear una cuenta de docente.
const inviteCode = process.env.DOCENTE_CODE || '';
if (!demo && !inviteCode) console.warn('Aviso: sin DOCENTE_CODE no podrá registrarse ningún docente supervisor.');

createApp({ dbFile: DB_PATH, demo, inviteCode }).listen(PORT, () => {
  console.log(`UniServ en http://localhost:${PORT} (demo ${demo ? 'activada' : 'desactivada'})`);
});
