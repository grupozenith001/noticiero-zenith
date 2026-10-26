#!/usr/bin/env node
// Genera la gacetilla «Grupo Zenith | Actualidad & Perspectiva» a partir de una edición en JSON.
// Uso: node generar-gacetilla.js <edicion.json> <carpeta-salida>
// El diseño es plantilla-base.html (provista por el usuario el 26/10/2026): este script solo completa sus
// marcadores {{...}} y repite los bloques de nota y de agenda según instrucciones-plantilla.md. No cambia estilos.
// Salidas: gacetilla.html (para enviar; imágenes alojadas en grupozenith.org/assets/mailing/), vista-previa.html
// (copia para revisar en el navegador), mensaje.txt (texto plano), registro-interno.md (no compartir),
// envio-gmail.json (para gacetilla/enviar-gmail.js) y envio-conector.json (respaldo por el conector de Gmail).
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const PLANTILLA = path.join(__dirname, 'plantilla-base.html');

// Datos institucionales vigentes (CLAUDE.md). El pie de la plantilla los trae fijos; acá se usan en mensaje.txt.
const CONTACTO = {
  corredor: 'Santiago Roch Pértile',
  funcion: 'Corredor Inmobiliario',
  matricula: 'M.P. N.º 289',
  telefono: '3625142899',
  correo: 'grupozenith001@gmail.com',
};

// Subcategorías: emoji y nombre según instrucciones-plantilla.md. Las últimas tres no figuran en esa tabla;
// se mantienen fijas entre ediciones, como piden las instrucciones.
const TEMAS = {
  politica: ['🏛️', 'Política y gobierno'],
  energia: ['⚡', 'Energía'],
  mercados: ['📈', 'Mercados y finanzas'],
  cambio: ['💱', 'Tipo de cambio y monedas'],
  normativa: ['⚖️', 'Normativa e impuestos'],
  infraestructura: ['🏗️', 'Infraestructura y obra pública'],
  comercio: ['🚢', 'Comercio exterior'],
  empleo: ['👥', 'Empleo y consumo'],
  inmobiliario: ['🏠', 'Mercado inmobiliario'],
  construccion: ['🧱', 'Construcción'],
  clima: ['🌦️', 'Clima y ambiente'],
  empresas: ['💼', 'Empresas e inversiones'],
  produccion: ['🌾', 'Producción y agro'],
  tecnologia: ['💻', 'Tecnología'],
};

// Secciones en el orden fijo de la plantilla; «oscuro» indica fondo azul oscuro (destacados en blanco).
const SECCIONES = [
  ['mundo', 'Mundo', 'MUNDO', true],
  ['argentina', 'Argentina', 'ARGENTINA', false],
  ['chaco', 'Chaco', 'CHACO', false],
];

// Los seis indicadores de la plantilla, con sus nombres fijos.
const INDICADORES = [
  ['dolar_bna', 'DOLAR_BNA', 'Dólar BNA venta'],
  ['dolar_mayorista', 'DOLAR_MAYORISTA', 'Dólar mayorista'],
  ['dolar_mep', 'DOLAR_MEP', 'Dólar MEP'],
  ['riesgo_pais', 'RIESGO_PAIS', 'Riesgo país'],
  ['merval', 'MERVAL', 'S&P Merval'],
  ['brent', 'BRENT', 'Brent (dic.)'],
];
// «sin_dato» deja la flecha vacía: un valor que no se pudo verificar nunca se completa de memoria.
const FLECHAS = { sube: '&#9650;', baja: '&#9660;', igual: '&#9679;', sin_dato: '' };

const AGENDA_COLOR = { hoy: '#122649', otro: '#7D889E' };
const DESTACADO = {
  oscuro: '<strong style="font-weight:600;color:#FFFFFF;">',
  claro: '<strong style="font-weight:600;color:#122649;">',
};

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    // Evita cortes de línea entre cifra y unidad («1,2 %», «US$ 42»).
    .replace(/ %/g, '&nbsp;%')
    .replace(/(US\$|\$) (?=\d)/g, '$1&nbsp;');
}

// Texto con destacados: **así** pasa a <strong> con el color que corresponde al fondo.
function conDestacados(s, tono) {
  return esc(s).replace(/\*\*(.+?)\*\*/g, (_, t) => `${DESTACADO[tono]}${t}</strong>`);
}
const sinMarcas = (s) => String(s ?? '').replace(/\*\*(.+?)\*\*/g, '$1');
const destacados = (s) => (String(s ?? '').match(/\*\*(.+?)\*\*/g) || []).length;
const palabras = (s) => sinMarcas(s).trim().split(/\s+/).filter(Boolean).length;

function validar(e) {
  const errores = [];
  const avisos = [];
  const url = /(https?:\/\/|www\.)/i;
  const revisarTexto = (t, donde) => {
    if (url.test(t || '')) errores.push(`${donde}: el texto publicable no puede contener URL`);
    if (/\{\{|\}\}/.test(t || '')) errores.push(`${donde}: no puede contener llaves dobles`);
  };
  const revisarDestacados = (t, donde) => {
    if (destacados(t) > 2) errores.push(`${donde}: tiene ${destacados(t)} destacados (máximo 2)`);
    if ((String(t || '').match(/\*\*/g) || []).length % 2) errores.push(`${donde}: hay un ** sin cerrar`);
  };

  for (const k of ['numero', 'fecha', 'hora_cierre', 'preheader', 'fecha_cierre', 'panorama', 'conclusion']) {
    if (!e[k]) errores.push(`Falta "${k}"`);
  }
  if ((e.preheader || '').length > 110) errores.push(`preheader: ${e.preheader.length} caracteres (máximo 110)`);
  if (destacados(e.preheader)) errores.push('preheader: no lleva destacados');
  if (!e.frase || !e.frase.texto || !e.frase.autor || !e.frase.obra) errores.push('Falta la frase inicial con texto, autor y obra');
  else if (!e.frase.registro || !e.frase.registro.url) errores.push('La frase inicial no tiene registro de verificación (url)');
  if (e.frase && /^[«"“]|[»"”]$/.test((e.frase.texto || '').trim())) errores.push('frase.texto va sin comillas');
  for (const [k, d] of [['panorama', 'panorama'], ['conclusion', 'conclusión'], ['preheader', 'preheader']]) {
    revisarTexto(e[k], d);
    revisarDestacados(e[k], d);
  }

  for (const [clave] of SECCIONES) {
    const lista = (e.secciones || {})[clave];
    if (!Array.isArray(lista) || !lista.length) {
      errores.push(`Sección "${clave}": necesita al menos una nota (si no hay novedades relevantes, una sola nota breve)`);
      continue;
    }
    lista.forEach((n, i) => {
      const d = `${clave}[${i}]`;
      if (!TEMAS[n.tema]) errores.push(`${d}: tema "${n.tema}" inválido (${Object.keys(TEMAS).join(', ')})`);
      for (const k of ['titulo', 'cuerpo', 'impacto']) if (!n[k]) errores.push(`${d}: falta "${k}"`);
      if (!Array.isArray(n.fuentes) || !n.fuentes.length) errores.push(`${d}: faltan las fuentes consultadas`);
      if (!Array.isArray(n.registro) || !n.registro.length || n.registro.some((r) => !r.url || !r.fecha_publicacion)) {
        errores.push(`${d}: cada noticia necesita registro con url y fecha_publicacion`);
      }
      if (/^\s*impacto zenith:/i.test(n.impacto || '')) errores.push(`${d}: "impacto" no debe repetir el rótulo; la plantilla lo trae`);
      if (destacados(n.titulo)) errores.push(`${d}: el título no lleva destacados`);
      revisarDestacados(n.cuerpo, `${d}.cuerpo`);
      revisarDestacados(n.impacto, `${d}.impacto`);
      const w = palabras(n.titulo);
      if (w < 6 || w > 14) avisos.push(`${d}: el título tiene ${w} palabras (se piden 6 a 14)`);
      revisarTexto(`${n.titulo} ${n.cuerpo} ${n.impacto} ${(n.fuentes || []).join(' ')}`, d);
    });
  }

  const porClave = Object.fromEntries((e.indicadores || []).map((x) => [x.clave, x]));
  for (const [clave] of INDICADORES) {
    const x = porClave[clave];
    if (!x) { errores.push(`indicadores: falta "${clave}" (van los seis de la plantilla)`); continue; }
    if (!(x.tendencia in FLECHAS)) errores.push(`indicadores.${clave}: tendencia "${x.tendencia}" inválida (${Object.keys(FLECHAS).join(', ')})`);
    if (!x.valor || !x.variacion) errores.push(`indicadores.${clave}: falta valor o variación`);
    if (x.tendencia !== 'sin_dato' && (!x.registro || !x.registro.url)) errores.push(`indicadores.${clave}: falta registro con url`);
  }

  const agenda = e.agenda || [];
  if (agenda.length < 3 || agenda.length > 6) avisos.push(`agenda: ${agenda.length} ítems (se piden 3 a 6)`);
  if (!agenda.length) errores.push('agenda: necesita al menos un ítem');
  agenda.forEach((a, i) => {
    if (!a.cuando || !a.texto) errores.push(`agenda[${i}]: falta "cuando" o "texto"`);
    revisarTexto(a.texto, `agenda[${i}]`);
    if (destacados(a.texto)) errores.push(`agenda[${i}]: no lleva destacados`);
  });
  return { errores, avisos };
}

// Reemplazo literal: los textos llevan «$» y no deben interpretarse como patrones de String.replace.
const poner = (s, marcador, valor) => s.split(`{{${marcador}}}`).join(valor);

// Repite un bloque marcado con comentarios INICIO/FIN, armado por «armar» para cada elemento.
function repetir(plantilla, inicio, fin, lista, armar) {
  const i = plantilla.indexOf(inicio);
  const j = plantilla.indexOf(fin, i);
  if (i < 0 || j < 0) throw new Error(`La plantilla no tiene el bloque «${inicio}»`);
  const finBloque = j + fin.length;
  const bloque = plantilla.slice(plantilla.indexOf('-->', i) + 3, j);
  return plantilla.slice(0, i) + lista.map((x, k) => armar(bloque, x, k)).join('') + plantilla.slice(finBloque);
}

function nota(bloque, n, k, oscuro) {
  // El separador va desde la segunda nota de cada sección; en la primera se borra.
  const sep = /<!-- SEPARADOR:[^>]*-->([\s\S]*?)<!-- SEPARADOR: FIN -->\n?/;
  let b = bloque.replace(sep, (_, contenido) => (k === 0 ? '' : contenido.replace(/^\n/, '')));
  const [emoji, subcategoria] = TEMAS[n.tema];
  const tono = oscuro ? 'oscuro' : 'claro';
  b = poner(b, 'EMOJI', emoji);
  b = poner(b, 'SUBCATEGORIA', esc(subcategoria));
  b = poner(b, 'TITULAR', esc(n.titulo));
  b = poner(b, 'CUERPO', conDestacados(n.cuerpo, tono));
  b = poner(b, 'IMPACTO', conDestacados(n.impacto, tono));
  b = poner(b, 'FUENTES', esc(n.fuentes.join(', ')));
  return b;
}

function html(e) {
  let h = fs.readFileSync(PLANTILLA, 'utf8').replace(/\r\n/g, '\n');
  // El comentario de instrucciones del encabezado no viaja en el correo.
  h = h.replace(/<!--\n\s*PLANTILLA BASE[\s\S]*?-->\n/, '');

  for (const [clave, nombre, , oscuro] of SECCIONES) {
    const lista = e.secciones[clave];
    h = repetir(h, `<!-- ===== NOTA: INICIO (repetir este bloque por cada nota de ${nombre})`, '<!-- ===== NOTA: FIN ===== -->',
      lista, (bloque, n, k) => nota(bloque, n, k, oscuro));
  }

  h = repetir(h, '<!-- ===== AGENDA ITEM: INICIO', '<!-- ===== AGENDA ITEM: FIN ===== -->', e.agenda, (bloque, a) => {
    const hoy = a.cuando.trim().toLowerCase() === 'hoy';
    let b = poner(bloque, 'AGENDA_COLOR', hoy ? AGENDA_COLOR.hoy : AGENDA_COLOR.otro);
    b = poner(b, 'AGENDA_CUANDO', esc(a.cuando));
    return poner(b, 'AGENDA_TEXTO', esc(a.texto));
  });

  const porClave = Object.fromEntries(e.indicadores.map((x) => [x.clave, x]));
  for (const [clave, prefijo] of INDICADORES) {
    const x = porClave[clave];
    h = poner(h, `${prefijo}_VALOR`, esc(x.valor));
    h = poner(h, `${prefijo}_VARIACION`, esc(x.variacion));
    h = poner(h, `${prefijo}_FLECHA`, FLECHAS[x.tendencia]);
  }

  const generales = {
    PREHEADER: esc(e.preheader),
    FECHA: esc(e.fecha),
    HORA: `${esc(e.hora_cierre)} h`,
    EDICION: esc(e.numero),
    CITA: esc(e.frase.texto),
    CITA_AUTOR: esc(e.frase.autor),
    CITA_OBRA: esc(e.frase.obra),
    PANORAMA: conDestacados(e.panorama, 'claro'),
    FECHA_CIERRE: esc(e.fecha_cierre),
    CONCLUSION: conDestacados(e.conclusion, 'oscuro'),
  };
  for (const [m, v] of Object.entries(generales)) h = poner(h, m, v);

  const pendientes = h.match(/\{\{[A-Z_]+\}\}/g);
  if (pendientes) throw new Error(`Quedaron marcadores sin completar: ${[...new Set(pendientes)].join(', ')}`);
  return h;
}

function texto(e) {
  const l = [];
  l.push(`«${e.frase.texto}»`, `— ${e.frase.autor} · ${e.frase.obra}`, '');
  l.push('GRUPO ZENITH | ACTUALIDAD Y PERSPECTIVA FINANCIERA', `${e.fecha} · Actualizado ${e.hora_cierre} h · Edición N.º ${e.numero}`, '');
  l.push('PANORAMA EN 30 SEGUNDOS', sinMarcas(e.panorama), '');
  l.push(`INDICADORES AL CIERRE (${e.fecha_cierre})`);
  const porClave = Object.fromEntries(e.indicadores.map((x) => [x.clave, x]));
  for (const [clave, , nombre] of INDICADORES) l.push(`• ${nombre}: ${porClave[clave].valor} (${porClave[clave].variacion})`);
  l.push('');
  for (const [clave, , mayus] of SECCIONES) {
    l.push(mayus);
    for (const n of e.secciones[clave]) {
      const [emoji, subcategoria] = TEMAS[n.tema];
      l.push(`${emoji} ${subcategoria}`, n.titulo, sinMarcas(n.cuerpo), `Impacto Zenith: ${sinMarcas(n.impacto)}`, `Fuentes: ${n.fuentes.join(', ')}`, '');
    }
  }
  l.push('AGENDA Y SEÑALES A SEGUIR');
  for (const a of e.agenda) l.push(`• ${a.cuando}: ${a.texto}`);
  l.push('', 'CONCLUSIÓN', sinMarcas(e.conclusion), '');
  l.push(`Asesoramiento inmobiliario: ${CONTACTO.corredor}, ${CONTACTO.funcion}, ${CONTACTO.matricula} · Tel./WhatsApp ${CONTACTO.telefono} · ${CONTACTO.correo}`);
  return l.join('\n');
}

function registro(e) {
  const filas = [];
  const fila = (item, r) => filas.push(`| ${item.replace(/\|/g, '/')} | ${(r.fuente || '').replace(/\|/g, '/')} | ${r.fecha_publicacion || ''} | ${r.url} |`);
  fila('Frase inicial', e.frase.registro);
  const nombres = Object.fromEntries(INDICADORES.map(([clave, , nombre]) => [clave, nombre]));
  e.indicadores.forEach((x) => { if (x.registro) fila(`Indicador: ${nombres[x.clave]}`, x.registro); });
  for (const [clave, , mayus] of SECCIONES) for (const n of e.secciones[clave]) for (const r of n.registro) fila(`${mayus}: ${n.titulo}`, r);
  e.agenda.forEach((a) => (a.registro || []).forEach((r) => fila(`Agenda: ${a.texto.slice(0, 60)}`, r)));
  return `# Registro interno de verificación — no compartir\n\nEdición N.º ${e.numero}: ${e.fecha}, cierre ${e.hora_cierre} h (America/Argentina/Buenos_Aires).\n\n| Ítem | Fuente | Fecha de publicación | URL |\n| --- | --- | --- | --- |\n${filas.join('\n')}\n${e.notas_verificacion ? `\n## Notas\n\n${e.notas_verificacion}\n` : ''}`;
}

function main() {
  const [entrada, salida] = process.argv.slice(2);
  if (!entrada || !salida) {
    console.error('Uso: node generar-gacetilla.js <edicion.json> <carpeta-salida>');
    process.exit(2);
  }
  const edicion = JSON.parse(fs.readFileSync(entrada, 'utf8'));
  const { errores, avisos } = validar(edicion);
  if (errores.length) {
    console.error('La edición no pasa la validación:\n- ' + errores.join('\n- '));
    process.exit(1);
  }
  for (const a of avisos) console.warn(`Aviso: ${a}`);
  fs.mkdirSync(salida, { recursive: true });
  const cuerpoHtml = html(edicion);
  const asunto = `Actualidad y perspectiva financiera | ${edicion.fecha} · Grupo Zenith`;
  fs.writeFileSync(path.join(salida, 'gacetilla.html'), cuerpoHtml);
  fs.writeFileSync(path.join(salida, 'vista-previa.html'), cuerpoHtml);
  fs.writeFileSync(path.join(salida, 'mensaje.txt'), texto(edicion));
  fs.writeFileSync(path.join(salida, 'registro-interno.md'), registro(edicion));
  // Las imágenes están alojadas en grupozenith.org, así que el correo no lleva adjuntos.
  // Los destinatarios los agrega quien envía, desde la lista de destinatarios vigente.
  const carga = { subject: asunto, htmlBody: cuerpoHtml, body: texto(edicion) };
  fs.writeFileSync(path.join(salida, 'envio-gmail.json'), JSON.stringify({ ...carga, attachments: [] }, null, 2));
  fs.writeFileSync(path.join(salida, 'envio-conector.json'), JSON.stringify(carga, null, 2));
  const kb = Math.round(Buffer.byteLength(cuerpoHtml) / 1024);
  console.log(`Gacetilla generada en ${salida} (${kb} KB de HTML${kb > 95 ? '; atención: Gmail recorta mensajes de más de ~102 KB' : ''}).`);
}

main();
