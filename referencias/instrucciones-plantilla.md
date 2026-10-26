# Instrucciones para generar "Actualidad & Perspectiva" · Grupo Zenith

Estas instrucciones son para Claude, que arma el reporte diario. Agregalas a la tarea programada junto con el archivo `plantilla-base.html`.

## Qué hacer en cada edición

1. Investigá las noticias del día como hasta ahora: Mundo, Argentina y Chaco, con foco en lo que afecta al negocio inmobiliario de Grupo Zenith en Resistencia.
2. Abrí `plantilla-base.html` y completá cada `{{MARCADOR}}` con el contenido del día.
3. Repetí los bloques marcados (notas e ítems de agenda) tantas veces como haga falta.
4. Entregá el HTML final completo, listo para enviar, sin ningún marcador `{{...}}` sin completar.

## Lo que NO se modifica

- Estilos, colores, tipografías, tamaños, espaciados ni estructura de tablas.
- El header (imagen), el footer (datos de contacto y texto legal) y el bloque final con el botón de contacto.
- El orden de las secciones: Mundo, Argentina, Chaco. Cada sección ya tiene su color de fondo; no lo cambies.
- Los nombres de los seis indicadores.
- No agregues secciones, imágenes, emojis fuera de las subcategorías ni texto en azul.

Si un día una sección no tiene noticias relevantes, dejala con una sola nota breve en lugar de borrarla.

## Marcadores generales

| Marcador | Qué va | Ejemplo |
|---|---|---|
| `{{PREHEADER}}` | Resumen de una línea que se ve en la bandeja de entrada (máx. 110 caracteres) | Lula gana en Brasil, el Brent roza US$ 117 y el riesgo país toca 707 pb. |
| `{{FECHA}}` | Fecha completa | Lunes 26 de octubre de 2026 |
| `{{HORA}}` | Hora de actualización | 07:25 h |
| `{{EDICION}}` | Número de edición, sumando 1 a la anterior | 2 |
| `{{CITA}}` | Frase de apertura, sin comillas | Yo soy yo y mi circunstancia… |
| `{{CITA_AUTOR}}` | Autor | José Ortega y Gasset |
| `{{CITA_OBRA}}` | Obra y año | Meditaciones del Quijote (1914) |
| `{{PANORAMA}}` | Resumen de 4 a 6 oraciones de todo el día | |
| `{{FECHA_CIERRE}}` | Día del último cierre de mercado | vie 23/10 |
| `{{CONCLUSION}}` | Cierre de 3 a 4 oraciones con la lectura para el negocio | |

## Indicadores al cierre

Para cada indicador hay tres marcadores: `_VALOR`, `_VARIACION` y `_FLECHA`.
Prefijos: `DOLAR_BNA`, `DOLAR_MAYORISTA`, `DOLAR_MEP`, `RIESGO_PAIS`, `MERVAL`, `BRENT`.

- `_VALOR`: con su unidad. Ej.: `$ 1.529,50`, `707 pb`, `102.278 pts`, `US$ 116,72`.
- `_VARIACION`: con signo y unidad. Ej.: `+0,1 %`, `-1,2 %`, `+3 pb`, `Sin cambios`.
- `_FLECHA`: `&#9650;` si sube, `&#9660;` si baja, `&#9679;` si no cambia.

## Secciones y notas

- `{{MUNDO_CANTIDAD_NOTAS}}`, `{{ARGENTINA_CANTIDAD_NOTAS}}`, `{{CHACO_CANTIDAD_NOTAS}}`: por ejemplo `2 notas` o `1 nota`.
- Cada nota está entre `<!-- ===== NOTA: INICIO ... ===== -->` y `<!-- ===== NOTA: FIN ===== -->`. Copiá el bloque completo una vez por nota, dentro de la sección que corresponde.
- Dentro de cada nota hay un bloque `SEPARADOR`. **Borralo en la primera nota de cada sección** y dejalo en las siguientes.
- Podés borrar los comentarios `<!-- ... -->` de marcadores en el HTML final.

Marcadores de cada nota:

| Marcador | Qué va |
|---|---|
| `{{EMOJI}}` | El emoji de la subcategoría, según la tabla de abajo |
| `{{SUBCATEGORIA}}` | Nombre de la subcategoría, en minúscula inicial normal (el diseño lo pasa a mayúsculas) |
| `{{TITULAR}}` | Titular informativo, de 6 a 14 palabras |
| `{{CUERPO}}` | El hecho con datos y fechas, 3 a 6 oraciones |
| `{{IMPACTO}}` | Qué significa para la economía, los clientes o el mercado inmobiliario, 2 a 3 oraciones |
| `{{FUENTES}}` | Medios separados por coma |

### Emojis por subcategoría

| Subcategoría | Emoji |
|---|---|
| Política y gobierno | 🏛️ |
| Energía | ⚡ |
| Mercados y finanzas | 📈 |
| Tipo de cambio y monedas | 💱 |
| Normativa e impuestos | ⚖️ |
| Infraestructura y obra pública | 🏗️ |
| Comercio exterior | 🚢 |
| Empleo y consumo | 👥 |
| Mercado inmobiliario | 🏠 |
| Construcción | 🧱 |
| Clima y ambiente | 🌦️ |

Si aparece una subcategoría que no está en la lista, usá un emoji simple y sobrio relacionado con el tema, y mantenelo igual en las ediciones siguientes.

## Destacados en SemiBold

Se pueden destacar los datos más importantes con este código exacto:

- En **Mundo** y en la **Conclusión** (fondo azul oscuro):
  `<strong style="font-weight:600;color:#FFFFFF;">texto destacado</strong>`
- En **Panorama**, **Argentina** y **Chaco**:
  `<strong style="font-weight:600;color:#122649;">texto destacado</strong>`

Reglas:
- Uno o dos destacados por texto, como máximo. No abuses.
- Destacá cifras clave o el dato que más importa (ej.: `707 puntos básicos`, `vence el 30 de octubre`), nunca oraciones enteras.
- En los recuadros "Impacto Zenith", destacá solo cuando el texto hable directamente del mercado inmobiliario; en el resto, sin destacados.
- No uses negrita, cursiva ni colores de ninguna otra forma.

## Agenda y señales a seguir

Cada ítem está entre `<!-- ===== AGENDA ITEM: INICIO ... ===== -->` y `<!-- ===== AGENDA ITEM: FIN ===== -->`. Repetilo por cada ítem (entre 3 y 6).

| Marcador | Qué va |
|---|---|
| `{{AGENDA_CUANDO}}` | Etiqueta corta: `Hoy`, una hora (`10:00`), `Semana` o `Chaco` |
| `{{AGENDA_COLOR}}` | `#122649` si la etiqueta es `Hoy`; `#7D889E` en todos los demás casos |
| `{{AGENDA_TEXTO}}` | Qué pasa, en una o dos oraciones |

## Estilo de escritura

- Español rioplatense, tono profesional y claro, sin opinión política.
- Cifras en formato argentino: punto de miles y coma decimal (`US$ 1.253 millones`, `27,1 %`).
- Siempre citar fuentes. Si las cifras difieren entre medios, decirlo en el texto.
- Caracteres especiales escritos normalmente (á, é, ñ, «»). Los signos `&`, `<` y `>` dentro del texto van como `&amp;`, `&lt;` y `&gt;`.

## Control antes de entregar

- No queda ningún `{{...}}` sin completar.
- La primera nota de cada sección no tiene separador.
- Cada texto tiene como máximo dos destacados.
- La cantidad de notas de cada sección coincide con las notas incluidas.
