# Póster UniServ — Semana de la Innovación

`poster.html` es la fuente. El PDF se genera a tamaño real con texto vectorial.

```bash
./render.sh                                                      # -> poster.pdf (90 x 120 cm, 1 página)
./qr.sh "https://uniserv.dvergaram.dev/" "https://URL-DEL-VIDEO" # regenera los QR
```

## Antes de imprimir

1. **Equipo**: reemplaza `NOMBRE APELLIDO — rol` en el pie por los integrantes reales.
2. **QR del video**: corre `./qr.sh` con la URL del video y cambia en `poster.html`
   `<div class="box empty">QR del video</div>` por
   `<div class="box"><img src="assets/qr-video.svg" alt=""></div>`.
3. **Logo de Uniandes**: hoy el encabezado lleva el nombre en texto. Si la facultad exige
   el escudo oficial, pon el archivo en `assets/uniandes.svg` y súmalo al bloque `.crest`.
4. **Tamaño**: cambia `--W`, `--H` y `@page size` en el CSS. A0 = `841mm 1189mm`.
   Todo está en milímetros, así que escala sin rehacer nada.

## Capturas de pantalla

`shots.js` inicia sesión con las cuentas demo y recorta la zona útil de cada pantalla.
Requiere el servidor con `DEMO=1`:

```bash
DEMO=1 PORT=3177 DB_PATH=/tmp/poster.db node server/index.js &
node poster/shots.js http://localhost:3177
```

La captura del docente necesita un caso en curso; se crea llamando a la API como cliente
(`/api/orders` → `/accept` → `/book`) y luego como docente (`/supervision/advance`).

## Datos

Todas las cifras salen del tablero de Miro (PMC) y del modelo `UniServ_Rentabilidad.xlsx`.
Las fuentes están citadas en el pie del póster. Si cambias un número, cambia también el pie.
