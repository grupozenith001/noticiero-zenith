# Gacetilla «Grupo Zenith | Actualidad & Perspectiva»

Generador del correo del noticiero matutino. No usa dependencias: solo Node.js.

```
node generar-gacetilla.js <edicion.json> <carpeta-salida>
```

## Plantilla

Desde el 26/10/2026 el diseño es `plantilla-base.html`, provista por el usuario junto con `../../references/instrucciones-plantilla.md` (reglas para completarla, que mandan sobre cualquier otro criterio de formato). El generador solo completa los marcadores `{{...}}` y repite los bloques de nota y de agenda; no cambia estilos, colores, tipografías, espaciados, cabecera, pie ni bloque de contacto. Si el usuario entrega una plantilla nueva, se reemplaza este archivo y se revisa que los nombres de los marcadores sigan coincidiendo.

Las imágenes (cabecera, símbolo y logotipo) están alojadas en `https://grupozenith.org/assets/mailing/`; las copias maestras están en `img/mailing/`. El correo ya no lleva adjuntos.

Ejemplo completo del usuario: `ejemplo/ejemplo-plantilla-26-10-2026.html`. Edición equivalente en JSON: `ejemplo/edicion-ejemplo.json`.

## Salidas

| Archivo | Uso |
| --- | --- |
| `gacetilla.html` | Correo para enviar: la plantilla completa, sin marcadores. |
| `vista-previa.html` | Copia de `gacetilla.html` para revisarla en el navegador. No se envía. |
| `envio-gmail.json` | Asunto, HTML y texto plano para `enviar-gmail.js` (sin adjuntos). |
| `envio-conector.json` | Lo mismo, para el envío de respaldo con `send_message` del conector de Gmail. Destinatarios: `to` = `grupozenith001@gmail.com` y la lista completa en `bcc`, nunca en `to` ni en `cc`. |
| `mensaje.txt` | Mensaje publicable en texto plano (WhatsApp o correo de texto), sin URL. |
| `registro-interno.md` | «Registro interno de verificación — no compartir». Nunca se envía. |

## Envío

```
node gacetilla/enviar-gmail.js <carpeta-edicion> [--prueba | --enviar]
```

Lee `envio-gmail.json` y `datos/destinatarios.csv`, arma el correo MIME (texto, HTML e imágenes en línea `cid:att0`…) y lo envía con la API de Gmail. Sin opción solo verifica; `--prueba` envía únicamente a `grupozenith001@gmail.com`; `--enviar` manda un único correo con `to` = `grupozenith001@gmail.com` y la lista activa en `bcc`. Usa los secretos del entorno `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET` y `GMAIL_REFRESH_TOKEN` (alcance `https://www.googleapis.com/auth/gmail.send`), que nunca se guardan en el repositorio.

## Edición en JSON

Campos: `numero`, `fecha` («Lunes 26 de octubre de 2026»), `hora_cierre` («07:25»; la plantilla agrega « h»), `horario_envio` (opcional), `preheader` (hasta 110 caracteres), `frase` (`texto` sin comillas, `autor`, `obra` con año, `version_es`, `registro`), `panorama`, `fecha_cierre` («vie 23/10»), `indicadores`, `secciones.mundo|argentina|chaco` (al menos una nota cada una), `agenda`, `conclusion` y `notas_verificacion` (opcional, solo para el registro).

- `indicadores`: los seis de la plantilla, cada uno con `clave` (`dolar_bna`, `dolar_mayorista`, `dolar_mep`, `riesgo_pais`, `merval`, `brent`), `valor` con unidad, `variacion` con signo y unidad, `tendencia` (`sube`, `baja`, `igual` o `sin_dato`) y `registro`.
- Cada noticia: `tema` (`politica`, `energia`, `mercados`, `cambio`, `normativa`, `infraestructura`, `comercio`, `empleo`, `inmobiliario`, `construccion`, `clima`, `empresas`, `produccion`, `tecnologia`), `titulo` (6 a 14 palabras), `cuerpo`, `impacto` (sin el rótulo), `fuentes` (nombres) y `registro` (lista con `fuente`, `url` y `fecha_publicacion`).
- `agenda`: 3 a 6 ítems con `cuando` (`Hoy`, una hora como `10:00`, `Semana` o `Chaco`), `texto` y `registro`. El color de la etiqueta lo pone el generador.
- Destacados: `**texto**` en `panorama`, `cuerpo`, `impacto` y `conclusion`, como máximo dos por texto; el generador aplica el estilo de la plantilla según el fondo.

El generador rechaza la edición si falta un campo, si una noticia no tiene registro con URL y fecha, si un texto publicable contiene una URL o llaves dobles, si hay más de dos destacados en un texto o si queda algún marcador sin completar. Avisa (sin rechazar) si un titular no tiene entre 6 y 14 palabras o la agenda no tiene entre 3 y 6 ítems.

## Diseño

Lo fija la plantilla. Puntos a tener en cuenta (26/10/2026):

- Declara `color-scheme: light`; las secciones Mundo y Conclusión son bloques azul oscuro con texto blanco. Verificar en el teléfono con modo oscuro, porque Gmail puede invertir colores por su cuenta.
- Tipografías: DM Sans y DM Serif Text (Google Fonts) además de Epilogue; azul `#0086FF`. El texto va alineado a la izquierda.
- La cabecera incluye el emoji de periódico de Apple dentro de la imagen; conviene reemplazarlo por un ícono propio.
