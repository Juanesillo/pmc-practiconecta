const path = require('node:path');
const { createApp } = require('./app');

const PORT = process.env.PORT || 3000;
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data', 'pmc.db');
// DEMO=0 desactiva el acceso rápido sin contraseña y el botón "Reiniciar demo".
const demo = process.env.DEMO !== '0';

createApp({ dbFile: DB_PATH, demo }).listen(PORT, () => {
  console.log(`PractiConecta en http://localhost:${PORT} (demo ${demo ? 'activada' : 'desactivada'})`);
});
