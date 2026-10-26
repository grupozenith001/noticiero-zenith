# Gacetilla «Grupo Zenith | Actualidad & Perspectiva»

Generador del correo del noticiero matutino. No usa dependencias: solo Node.js.

```
node generar-gacetilla.js <edicion.json> <carpeta-salida>
```

## Salidas

| Archivo | Uso |
| --- | --- |
| `gacetilla.html` | Correo para enviar. Las imágenes se referencian como `cid:att0`, `cid:att1`… (formato del conector de Gmail, por posición) y viajan como adjuntos en línea en ese orden (ver `adjuntos.json`). |
| `envio-gmail.json` | Asunto, cuerpo HTML, texto plano y adjuntos en base64, listos para `send_message` del conector de Gmail; faltan los destinatarios: `to` = `grupozenith001@gmail.com` y la lista completa en `bcc` (copia oculta), nunca en `to` ni en `cc`. |
| `vista-previa.html` | Misma pieza con las imágenes incrustadas, para revisarla en el navegador. No se envía. |
| `mensaje.txt` | Mensaje publicable en texto plano (WhatsApp o correo de texto), sin URL. |
| `registro-interno.md` | «Registro interno de verificación — no compartir». Nunca se envía. |
| `adjuntos.json` | Relación `cid` → archivo de `img/`. |
| `gacetilla-sin-imagenes.html` | Versión sin imágenes (logotipo y banner como texto), compacta, para el envío de respaldo por el conector de Gmail. |
| `envio-conector.json` | Asunto, HTML sin imágenes y texto plano para `send_message` del conector, sin adjuntos. |

## Envío

```
node gacetilla/enviar-gmail.js <carpeta-edicion> [--prueba | --enviar]
```

Lee `envio-gmail.json` y `datos/destinatarios.csv`, arma el correo MIME (texto, HTML e imágenes en línea `cid:att0`…) y lo envía con la API de Gmail. Sin opción solo verifica; `--prueba` envía únicamente a `grupozenith001@gmail.com`; `--enviar` manda un único correo con `to` = `grupozenith001@gmail.com` y la lista activa en `bcc`. Usa los secretos del entorno `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET` y `GMAIL_REFRESH_TOKEN` (alcance `https://www.googleapis.com/auth/gmail.send`), que nunca se guardan en el repositorio.

## Edición en JSON

Ver `ejemplo/edicion-ejemplo.json` (contenido ficticio, solo para el diseño). Campos: `fecha`, `hora_cierre`, `horario_envio` (opcional, por defecto `07:00`), `numero` (opcional), `frase` (`texto`, `autor`, `obra`, `version_es`, `registro`), `panorama`, `indicadores` (opcional), `secciones.mundo|argentina|chaco` (listas de noticias; `[]` si no hay novedades), `agenda`, `conclusion` y `notas_verificacion` (opcional, solo para el registro).

Cada noticia lleva `tema` (`mercados`, `cambio`, `politica`, `normativa`, `empresas`, `comercio`, `energia`, `infraestructura`, `inmobiliario`, `produccion`, `empleo`, `tecnologia`), `titulo`, `cuerpo`, `impacto` (sin el rótulo, que agrega el generador), `fuentes` (nombres) y `registro` (lista con `fuente`, `url` y `fecha_publicacion`).

El generador rechaza la edición si falta un campo obligatorio, si una noticia no tiene registro con URL y fecha, o si el texto publicable contiene una URL.

## Diseño

### Modo oscuro

Muchos teléfonos muestran el correo en modo oscuro. Gmail (Android e iOS) no lee estilos de modo oscuro: invierte los colores por su cuenta, y un bloque de fondo azul oscuro con texto blanco puede terminar con texto oscuro sobre fondo oscuro. Por eso:

- El cuerpo usa solo fondos claros con texto oscuro (panorama, indicadores, «Impacto Zenith:» y conclusión), que Gmail invierte de forma pareja.
- Las piezas que deben conservar el color (cabecera con el logotipo negativo, chips de la agenda, botón y chip blanco del logotipo color) lo fijan con `background-image: linear-gradient(...)`, que Gmail no altera.
- El HTML declara `color-scheme: light dark` y trae reglas `@media (prefers-color-scheme: dark)` y `[data-ogsc]` con clases `z-*` para Apple Mail, iOS Mail y Outlook, que muestran una versión oscura diseñada.

- Cabecera azul oscuro `#122649` con el logotipo oficial negativizado a color (copia redimensionada a 560 px, mostrada a 210 px), franja azul Zenith `#0087FF` y rótulo de la publicación.
- Frase inicial con filete celeste `#9CD9F7`; panorama, tarjetas de indicadores y conclusión sobre fondo suave con filete azul Zenith.
- Párrafos justificados (panorama, noticias, «Impacto Zenith:», agenda, conclusión y aviso legal) con división en sílabas (`hyphens:auto`, idioma `es`) para evitar huecos en pantallas angostas. Títulos y encabezados quedan alineados a la izquierda.
- Encabezados de sección con un emoji y filete azul Zenith; cada noticia con ícono de tema, título en Epilogue, recuadro «Impacto Zenith:» con el símbolo oficial y línea de fuentes en `#95A4BA`.
- Cierre con el banner institucional «Disponibles para consultas», botón «Hablar con un asesor inmobiliario» (WhatsApp con mensaje precargado) y enlace de correo.
- Pie con corredor, matrícula, contactos, Instagram, aviso de contenido informativo y forma de baja.
- Epilogue se carga desde Google Fonts donde el cliente de correo lo permite (Apple Mail, iOS); Gmail y Outlook usan Arial.
- La bandera 🇦🇷 se ve como «AR» en Windows; en teléfonos se muestra la bandera.

Las imágenes de `img/` son copias redimensionadas de `brand/source/` (sin recortes ni deformaciones). Los datos de contacto están en la constante `CONTACTO` del generador: verificarlos antes de cada envío.
