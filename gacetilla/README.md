# Gacetilla «Grupo Zenith | Actualidad & Perspectiva»

Generador del correo del noticiero matutino. No usa dependencias: solo Node.js.

```
node generar-gacetilla.js <edicion.json> <carpeta-salida>
```

## Salidas

| Archivo | Uso |
| --- | --- |
| `gacetilla.html` | Correo para enviar. Las imágenes se referencian como `cid:att0`, `cid:att1`… (formato del conector de Gmail, por posición) y viajan como adjuntos en línea en ese orden (ver `adjuntos.json`). |
| `envio-gmail.json` | Asunto, cuerpo HTML, texto plano y adjuntos en base64, listos para `send_message` del conector de Gmail; falta agregar el destinatario. Se envía un correo por persona, con una sola dirección en `to` y sin `cc` ni `bcc`. |
| `vista-previa.html` | Misma pieza con las imágenes incrustadas, para revisarla en el navegador. No se envía. |
| `mensaje.txt` | Mensaje publicable en texto plano (WhatsApp o correo de texto), sin URL. |
| `registro-interno.md` | «Registro interno de verificación — no compartir». Nunca se envía. |
| `adjuntos.json` | Relación `cid` → archivo de `img/`. |

## Edición en JSON

Ver `ejemplo/edicion-ejemplo.json` (contenido ficticio, solo para el diseño). Campos: `fecha`, `hora_cierre`, `horario_envio` (opcional, por defecto `07:00`), `numero` (opcional), `frase` (`texto`, `autor`, `obra`, `version_es`, `registro`), `panorama`, `indicadores` (opcional), `secciones.mundo|argentina|chaco` (listas de noticias; `[]` si no hay novedades), `agenda`, `conclusion` y `notas_verificacion` (opcional, solo para el registro).

Cada noticia lleva `tema` (`mercados`, `cambio`, `politica`, `normativa`, `empresas`, `comercio`, `energia`, `infraestructura`, `inmobiliario`, `produccion`, `empleo`, `tecnologia`), `titulo`, `cuerpo`, `impacto` (sin el rótulo, que agrega el generador), `fuentes` (nombres) y `registro` (lista con `fuente`, `url` y `fecha_publicacion`).

El generador rechaza la edición si falta un campo obligatorio, si una noticia no tiene registro con URL y fecha, o si el texto publicable contiene una URL.

## Diseño

- Cabecera azul oscuro `#122649` con el logotipo oficial negativizado a color (copia redimensionada a 560 px, mostrada a 210 px), franja azul Zenith `#0087FF` y rótulo de la publicación.
- Frase inicial con filete celeste `#9CD9F7`; panorama sobre fondo suave; tarjetas de indicadores en azul oscuro.
- Encabezados de sección con un emoji y filete azul Zenith; cada noticia con ícono de tema, título en Epilogue, recuadro «Impacto Zenith:» con el símbolo oficial y línea de fuentes en `#95A4BA`.
- Cierre con el banner institucional «Disponibles para consultas», botón «Hablar con un asesor inmobiliario» (WhatsApp con mensaje precargado) y enlace de correo.
- Pie con corredor, matrícula, contactos, Instagram, aviso de contenido informativo y forma de baja.
- Epilogue se carga desde Google Fonts donde el cliente de correo lo permite (Apple Mail, iOS); Gmail y Outlook usan Arial.
- La bandera 🇦🇷 se ve como «AR» en Windows; en teléfonos se muestra la bandera.

Las imágenes de `img/` son copias redimensionadas de `brand/source/` (sin recortes ni deformaciones). Los datos de contacto están en la constante `CONTACTO` del generador: verificarlos antes de cada envío.
