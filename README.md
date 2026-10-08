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

Guion sugerido para presentar (un solo navegador, cambiando de cuenta):

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

## Desplegar en una VPS

**Opción A: Docker**

```bash
git clone <URL-del-repo> && cd pmc-practiconecta
docker compose up -d --build        # expone 127.0.0.1:3000, datos en un volumen
```

**Opción B: systemd (Node ≥ 22.13)**

```bash
sudo git clone <URL-del-repo> /var/www/pmc
cd /var/www/pmc && sudo npm install --omit=dev
sudo mkdir -p server/data && sudo chown -R www-data:www-data server/data
sudo cp deploy/pmc.service /etc/systemd/system/
sudo systemctl daemon-reload && sudo systemctl enable --now pmc
```

**nginx como proxy (en ambos casos)**

```bash
sudo cp deploy/nginx.conf /etc/nginx/sites-available/pmc
sudo ln -s /etc/nginx/sites-available/pmc /etc/nginx/sites-enabled/pmc
# editar server_name, luego:
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d tu-dominio    # HTTPS (la cookie de sesión se marca Secure automáticamente)
```

Actualizar: `git pull` y reiniciar (`docker compose up -d --build` o `sudo npm install --omit=dev && sudo systemctl restart pmc`). Si el repo es privado, usa una *deploy key* de solo lectura.

Para una demo pública sin acceso rápido, pon `DEMO=0`: entonces solo se entra con correo y contraseña.

## Estructura

```
public/             frontend estático (HTML, CSS, JS sin build)
  js/core.js        estado, API, tiempo real
  js/auth.js        inicio de sesión y registro
  js/views.js       los seis pasos, por rol
  js/main.js        render, cabecera, notificaciones
server/app.js       API Express (auth, permisos, reglas del flujo)
server/db.js        esquema SQLite (node:sqlite) y semilla
server/seed.js      datos ficticios
test/api.test.js    pruebas de la API (node:test)
deploy/             nginx.conf y pmc.service
Dockerfile, docker-compose.yml
```

## Seguridad (alcance del prototipo)

Contraseñas con scrypt, sesión en cookie `HttpOnly` + `SameSite=Lax`, comprobación de origen en peticiones que modifican datos, límite de intentos de login, cabeceras de seguridad y permisos por rol aplicados en el servidor. **No hay** verificación real de correo ni de identidad, recuperación de contraseña, ni cumplimiento de normativa de datos de salud: es un prototipo académico.

## Pendiente para después del prototipo

Verificación real de correo institucional, pasarela de pagos con custodia real, chat con adjuntos, panel de administración, recordatorios por correo/WhatsApp y los puntos “Could/Not now” del Miro (portafolio con evidencias, recomendaciones automáticas, multiuniversidad).
