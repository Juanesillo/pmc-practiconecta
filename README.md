# PractiConecta · Prototipo (PMC)

Marketplace universitario de servicios supervisados: estudiantes de Odontología, Derecho, Psicología e Ingeniería ofrecen servicios con supervisión docente, y los clientes los encuentran, contratan y pagan con el dinero retenido hasta el cierre.

> El **escrow es simulado**: es un estado en base de datos, no se mueve dinero real. Personas, universidades y verificaciones son ficticias.

## Flujo principal

1. **Perfil verificado**: el estudiante valida correo, matrícula e identidad y su **docente supervisor da el aval**. Solo así puede publicar servicios.
2. **Búsqueda y matching**: filtros por categoría, precio, modalidad y texto, con porcentaje de coincidencia y ofertas destacadas.
3. **Chat** cliente ↔ estudiante (el docente lo ve en solo lectura). **Ambas partes aceptan** las condiciones.
4. **Agendamiento** sobre la disponibilidad real del estudiante (sin doble reserva) y **pago retenido**. El cliente puede cancelar antes de la supervisión con reembolso.
5. **Supervisión y reputación**: el docente registra los pasos y cierra el servicio; cliente y estudiante se califican y la reputación se acumula.
6. **Pago retenido**: el cliente libera el pago al cierre, o cualquiera de las partes reporta un problema y **el docente resuelve la disputa** (liberar o reembolsar).

Además: registro e inicio de sesión, notificaciones en la campana, actualización en tiempo real entre usuarios y panel del docente.

El alcance sigue la matriz MoSCoW del tablero de Miro. Sigue fuera ("Not now"): escrow real, integración con sistemas universitarios o notas, ads y recomendación avanzada.

## Demo con varias cuentas

En la pantalla de acceso hay **acceso rápido** a cuentas de ejemplo (clientes, estudiantes y docentes); también puedes iniciar sesión normal con el correo de la cuenta y la contraseña `demo1234`. Dentro de la app, el menú de usuario permite **cambiar de cuenta** y **reiniciar la demo**.

Guion sugerido para presentar (también disponible dentro de la app, en el botón **Guía de demo**):

1. **Laura Vega** (estudiante nueva): valida su perfil → **Psic. Elena Vargas** (docente) le da el aval → Laura publica un servicio.
2. **Juan Pérez** (cliente): busca, contacta “Valoración y limpieza dental”, chatea y acepta las condiciones.
3. **Camila Rojas** (estudiante): acepta las condiciones (o deja activa la *respuesta automática* para hacerlo en solitario).
4. **Juan**: agenda un horario → el pago queda retenido.
5. **Dra. Martha Gil** (docente de Camila): registra la supervisión hasta cerrar el servicio.
6. **Juan y Camila**: se califican; **Juan** libera el pago.

Con dos navegadores (o uno normal y otro incógnito) puedes chatear entre cliente y estudiante en tiempo real.

## Ejecutar en local

Requiere **Node.js ≥ 22.13** (usa `node:sqlite`, sin compilar nada).

```bash
npm install
npm start          # http://localhost:3000
npm test           # pruebas de la API
```

Variables: `PORT` (3000), `DB_PATH` (`server/data/pmc.db`), `DEMO` (`0` desactiva el acceso rápido sin contraseña y el reinicio de demo) y `TZ` (zona horaria de los horarios, p. ej. `America/Bogota`).

> Al cambiar la versión del esquema (SQLite) los datos de demo anteriores se descartan.

## Desplegar en una VPS (Docker + Caddy)

La app corre en un contenedor que publica `172.17.0.1:8082` (solo accesible desde el servidor y otros contenedores), y Caddy le hace proxy y pone el HTTPS.

```bash
git clone <URL-del-repo> && cd pmc-practiconecta
docker compose up -d --build
```

Después se añade a la configuración de Caddy el bloque de [`deploy/Caddyfile`](deploy/Caddyfile) (cambiando el dominio) y se recarga:

```
pmc.TU-DOMINIO.dev {
    encode zstd gzip
    reverse_proxy 172.17.0.1:8082 {
        flush_interval -1
    }
    header {
        X-Content-Type-Options nosniff
        Referrer-Policy same-origin
        X-Frame-Options DENY
    }
}
```

Los datos viven en el volumen `pmc-data`. Actualizar: `git pull && docker compose up -d --build`. Si el repo es privado, usa una *deploy key* de solo lectura.

**Para una demo pública:** pon `DEMO: "0"` en `docker-compose.yml`. Así se desactiva el acceso rápido sin contraseña y el reinicio de demo. Ojo: las cuentas de ejemplo siguen existiendo con la contraseña `demo1234`; si el sitio queda abierto a cualquiera, cámbiala en `server/seed.js` (`DEMO_PASSWORD`) antes de desplegar.

**Sin Docker:** se puede usar `deploy/pmc.service` (systemd, Node ≥ 22.13) y apuntar Caddy a `127.0.0.1:3000`.

## Estructura

```
public/             frontend estático (HTML, CSS, JS sin build)
  js/core.js        estado, API, tiempo real
  js/auth.js        inicio de sesión y registro
  js/views.js       vistas (Explorar, ficha, Casos, Perfil) por rol
  js/main.js        navegación, cabecera, notificaciones
  fonts/            Inter (SIL OFL), autoalojada
server/app.js       API Express (auth, permisos, reglas del flujo)
server/db.js        esquema SQLite (node:sqlite) y semilla
server/seed.js      datos ficticios
test/api.test.js    pruebas de la API (node:test)
deploy/             Caddyfile y pmc.service
Dockerfile, docker-compose.yml
```

## Diseño y navegación

Interfaz sobria y sin dependencias externas: tipografía Inter autoalojada, iconos SVG en línea (estilo [Lucide](https://lucide.dev), licencia ISC), un solo color de marca y diseño adaptable a móvil (con barra de pestañas inferior).

La navegación es la de una aplicación real, con rutas por hash (el botón «atrás» funciona y las vistas se pueden enlazar):

- **Cliente:** *Explorar* (filtros, listado y ficha de cada servicio) y *Mis casos*.
- **Estudiante:** *Mi perfil* (verificación y publicación de servicios) y *Solicitudes*.
- **Docente:** *Estudiantes* (aval) y *Casos* (supervisión y disputas).

Cada caso muestra un seguimiento (contacto → acuerdo → cita y pago → supervisión → cierre → pago) y cuatro pestañas: conversación, agenda, supervisión y pago. El botón **Guía de demo** (arriba) lista el recorrido completo y cambia de cuenta con un clic.

## Seguridad (alcance del prototipo)

Contraseñas con scrypt, sesión en cookie `HttpOnly` + `SameSite=Lax`, comprobación de origen en peticiones que modifican datos, límite de intentos de login, cabeceras de seguridad y permisos por rol aplicados en el servidor. **No hay** verificación real de correo ni de identidad, recuperación de contraseña, ni cumplimiento de normativa de datos de salud: es un prototipo académico.

## Pendiente para después del prototipo

Verificación real de correo institucional, pasarela de pagos con custodia real, chat con adjuntos, panel de administración, recordatorios por correo/WhatsApp y los puntos “Could/Not now” del Miro (portafolio con evidencias, recomendaciones automáticas, multiuniversidad).
