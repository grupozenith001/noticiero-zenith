# Noticiero Grupo Zenith en la nube

Repositorio privado del noticiero matutino «Grupo Zenith | Actualidad & Perspectiva». Lo usa una rutina de Claude Code que corre en la nube de Anthropic cada día hábil a las 07:00 h (America/Argentina/Buenos_Aires) y envía la gacetilla desde `grupozenith001@gmail.com`.

Contiene solo material del noticiero: no incluye tasaciones, clientes, operaciones ni bases de datos de Zenith Real Estate.

| Ruta | Contenido |
| --- | --- |
| `CLAUDE.md` | Procedimiento diario de la rutina |
| `referencias/noticiero-matutino.md` | Definición editorial aprobada |
| `referencias/humanizer.md` | Guía de redacción natural (skill «humanizer» de blader, licencia MIT) |
| `gacetilla/` | Generador de la gacetilla, imágenes de marca y formato de la edición |
| `datos/destinatarios.csv` | Lista de envío (estado `activo` o `baja`) |
| `datos/frases-usadas.csv` | Historial de frases iniciales |
| `ediciones/<AAAA-MM-DD>/` | Edición emitida: JSON, gacetilla, mensaje en texto y registro interno de verificación |

La copia maestra de la definición editorial y del generador está en el proyecto local de Zenith Real Estate (`.claude/skills/newsletter-z/`). Si se modifica allí, hay que actualizar también este repositorio.

Para sumar o dar de baja un destinatario, editar `datos/destinatarios.csv`. Cada destinatario debe haber aceptado recibir el noticiero.
