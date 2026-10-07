# PractiConecta · Prototipo (PMC)

Prototipo web de un marketplace universitario de servicios supervisados: estudiantes de Odontología, Derecho, Psicología e Ingeniería ofrecen servicios con supervisión docente, y los clientes los encuentran, contratan y pagan con el dinero retenido hasta el cierre.

> Todo es **simulado**: personas, universidades, verificaciones y pagos son ficticios. No hay backend ni se mueve dinero real.

## Flujo principal que muestra la demo

1. **Perfil verificado**: verificación del estudiante (correo institucional, matrícula, identidad, aval docente).
2. **Búsqueda y matching**: filtros por categoría, precio y modalidad, con porcentaje de coincidencia.
3. **Chat**: conversación para aclarar condiciones y aceptar el acuerdo.
4. **Agendamiento**: elección de horario y confirmación con **pago retenido** (escrow simulado).
5. **Supervisión y reputación**: cierre con aval del docente y calificación bidireccional.
6. **Pago retenido**: línea de tiempo del escrow, liberación al cerrar el servicio o reporte de problema.

El alcance sigue la matriz MoSCoW del tablero de Miro (MUST/SHOULD del MVP). Quedan fuera, según "Not now": escrow real, integración con sistemas universitarios o notas, sistema completo de disputas, ads y recomendación avanzada.

## Ejecutar en local

Es HTML/CSS/JS estático, sin build ni dependencias:

```bash
python3 -m http.server 8080
# abrir http://localhost:8080
```

El botón **Reiniciar demo** vuelve al estado inicial. Puedes saltar entre pasos desde la barra superior.

## Desplegar en una VPS (nginx)

```bash
sudo apt install -y nginx git
sudo git clone <URL-del-repo> /var/www/pmc
sudo cp /var/www/pmc/deploy/nginx.conf /etc/nginx/sites-available/pmc
sudo ln -s /etc/nginx/sites-available/pmc /etc/nginx/sites-enabled/pmc
# editar server_name en el archivo, luego:
sudo nginx -t && sudo systemctl reload nginx
```

Para actualizar: `cd /var/www/pmc && sudo git pull`. Si el repo es privado, configura una *deploy key* de solo lectura en la VPS. HTTPS: `sudo certbot --nginx -d tu-dominio`.

## Estructura

```
index.html        página única
css/styles.css    estilos
js/data.js        datos ficticios (servicios, textos del chat)
js/app.js         lógica del flujo y vistas
deploy/nginx.conf configuración de ejemplo
```
