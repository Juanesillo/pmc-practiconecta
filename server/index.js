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

const app = createApp({ dbFile: DB_PATH, demo, inviteCode });
const server = app.listen(PORT, () => {
  console.log(`UniServ en http://localhost:${PORT} (demo ${demo ? 'activada' : 'desactivada'})`);
});

// Docker manda SIGTERM al recrear el contenedor. Sin cerrar la base, SQLite deja todo en el
// archivo -wal y pmc.db se queda vacío; cerrarla hace el checkpoint y deja los datos en pmc.db.
let closing = false;
for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => {
    if (closing) return;
    closing = true;
    server.close(() => {
      try {
        app.locals.db.exec('PRAGMA wal_checkpoint(TRUNCATE)');
        app.locals.db.close();
        console.log('Base de datos cerrada correctamente.');
      } catch (e) {
        console.error('No se pudo cerrar la base de datos:', e.message);
      }
      process.exit(0);
    });
    // Si alguna conexión se queda colgada, no bloquear el apagado indefinidamente.
    setTimeout(() => process.exit(0), 5000).unref();
  });
}
