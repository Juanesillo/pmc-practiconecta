# PractiConecta · Prototipo (PMC)

Prototipo web de un marketplace universitario de servicios supervisados: estudiantes de Odontología, Derecho, Psicología e Ingeniería ofrecen servicios con supervisión docente, y los clientes los encuentran, contratan y pagan con el dinero retenido hasta el cierre.

> El **escrow es simulado**: es un estado en base de datos, no se mueve dinero real. Personas, universidades y verificaciones son ficticias, y no hay autenticación (la demo permite "entrar como" cualquier usuario).

## Flujo principal

1. **Perfil verificado**: verificación del estudiante (correo institucional, matrícula, identidad, aval docente).
2. **Búsqueda y matching**: filtros por categoría, precio y modalidad, con porcentaje de coincidencia.
3. **Chat**: conversación entre cliente y estudiante, con aceptación de condiciones.
4. **Agendamiento**: elección de horario y confirmación con **pago retenido**.
5. **Supervisión y reputación**: cierre con aval del docente y calificación bidireccional.
6. **Pago retenido**: línea de tiempo del escrow, liberación al cerrar o reporte de problema.

Alcance según la matriz MoSCoW del Miro. Fuera por "Not now": escrow real, integración con sistemas universitarios o notas, disputas completas, ads y recomendación avanzada.

## Demo con varios usuarios

El selector **Entrar como** (arriba a la derecha) cambia entre Juan Pérez (cliente), Camila Rojas (estudiante) y la Dra. Martha Gil (docente). Los datos se guardan en el servidor y la interfaz se sincroniza cada pocos segundos, así que puedes abrir dos navegadores (cliente y estudiante) y chatear entre ellos. Por defecto hay una **respuesta automática** del estudiante para demos en solitario; se desactiva en el chat.

## Ejecutar en local

Requiere **Node.js ≥ 22.13** (usa `node:sqlite`, sin compilar nada).

```bash
npm install
npm start          # http://localhost:3000
```

Variables opcionales: `PORT` (3000) y `DB_PATH` (`server/data/pmc.db`). **Reiniciar demo** borra órdenes y verificación para todos los usuarios.

## API (resumen)

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/bootstrap` | usuarios, servicios, verificación |
| POST | `/api/students/:id/verify/:step` | marca un paso de verificación |
| GET | `/api/orders?userId=` | órdenes visibles para ese usuario |
| POST | `/api/orders` | contacta un servicio (cliente) |
| POST | `/api/orders/:id/messages` · `agree` · `book` | chat, acuerdo, cita + pago retenido |
| POST | `/api/orders/:id/supervision/advance` · `rate` | supervisión y calificación |
| POST | `/api/orders/:id/release` · `dispute` | liberar o reportar |
| POST | `/api/reset` | reinicia la demo |

## Desplegar en una VPS

```bash
# Node >= 22.13, nginx y git instalados
sudo git clone <URL-del-repo> /var/www/pmc
cd /var/www/pmc && sudo npm install --omit=dev
sudo mkdir -p server/data && sudo chown -R www-data:www-data server/data

sudo cp deploy/pmc.service /etc/systemd/system/
sudo systemctl daemon-reload && sudo systemctl enable --now pmc

sudo cp deploy/nginx.conf /etc/nginx/sites-available/pmc
sudo ln -s /etc/nginx/sites-available/pmc /etc/nginx/sites-enabled/pmc
# editar server_name, luego:
sudo nginx -t && sudo systemctl reload nginx
```

Actualizar: `cd /var/www/pmc && sudo git pull && sudo npm install --omit=dev && sudo systemctl restart pmc`. Si el repo es privado, usa una *deploy key* de solo lectura. HTTPS: `sudo certbot --nginx -d tu-dominio`.

## Estructura

```
public/           frontend estático (index.html, css/, js/)
server/index.js   API Express
server/db.js      esquema SQLite (node:sqlite)
server/seed.js    datos ficticios
deploy/           nginx.conf y pmc.service
```

## Pendiente para después del prototipo

Autenticación real y verificación por correo institucional, chat en tiempo real (WebSockets), pasarela de pagos real, permisos por rol en la API y panel del docente.
