#!/usr/bin/env node
// Genera la gacetilla «Grupo Zenith | Actualidad & Perspectiva» a partir de una edición en JSON.
// Uso: node generar-gacetilla.js <edicion.json> <carpeta-salida>
// Salidas: gacetilla.html (imágenes por cid:, para enviar), vista-previa.html (imágenes locales),
// mensaje.txt (texto plano publicable), registro-interno.md (no compartir) y adjuntos.json.
'use strict';

const fs = require('node:fs');
const path = require('node:path');

// Datos institucionales vigentes (CLAUDE.md). Verificar antes de cada envío.
const CONTACTO = {
  corredor: 'Santiago Roch Pértile',
  funcion: 'Corredor Inmobiliario',
  matricula: 'M.P. N.º 289',
  telefono: '3625142899',
  // WhatsApp: formato internacional de celular argentino (54 9 + característica sin 0 + número sin 15).
  whatsapp: '5493625142899',
  correo: 'grupozenith001@gmail.com',
  instagram: 'grupozenith.inmobiliaria',
};

const COLORES = {
  azulOscuro: '#122649',
  azulZenith: '#0087FF',
  gris: '#E5E5E8',
  grisAzulado: '#95A4BA',
  celeste: '#9CD9F7',
  fondoSuave: '#F2F8FF',
  texto: '#2B3445',
};

const TEMAS = {
  mercados: ['📈', 'Mercados y finanzas'],
  cambio: ['💱', 'Tipo de cambio y monedas'],
  politica: ['🏛️', 'Política y gobierno'],
  normativa: ['⚖️', 'Normativa e impuestos'],
  empresas: ['💼', 'Empresas e inversiones'],
  comercio: ['🚢', 'Comercio exterior'],
  energia: ['⚡', 'Energía'],
  infraestructura: ['🏗️', 'Infraestructura y obra pública'],
  inmobiliario: ['🏢', 'Inmobiliario y construcción'],
  produccion: ['🌾', 'Producción y agro'],
  empleo: ['👥', 'Empleo y consumo'],
  tecnologia: ['💻', 'Tecnología'],
};

const SECCIONES = [
  ['mundo', '🌍', 'MUNDO'],
  ['argentina', '🇦🇷', 'ARGENTINA'],
  ['chaco', '📍', 'CHACO'],
];

const SIN_NOVEDADES = 'Sin novedades materiales verificadas al cierre';

const IMAGENES = {
  'logo-negativo': 'img/logo-negativo.png',
  'logo-color': 'img/logo-color.png',
  'simbolo-azul': 'img/simbolo-azul.png',
  'banner-contacto': 'img/banner-contacto.jpg',
};

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    // Evita cortes de línea entre cifra y unidad («1,2 %», «US$ 42»).
    .replace(/ %/g, '&nbsp;%')
    .replace(/(US\$|\$) (?=\d)/g, '$1&nbsp;');
}

function validar(e) {
  const errores = [];
  const url = /(https?:\/\/|www\.)/i;
  const revisarTexto = (t, donde) => { if (url.test(t || '')) errores.push(`${donde}: el texto publicable no puede contener URL`); };

  for (const k of ['fecha', 'hora_cierre', 'panorama', 'conclusion']) if (!e[k]) errores.push(`Falta "${k}"`);
  if (!e.frase || !e.frase.texto || !e.frase.autor) errores.push('Falta la frase inicial con texto y autor');
  else if (!e.frase.registro || !e.frase.registro.url) errores.push('La frase inicial no tiene registro de verificación (url)');
  revisarTexto(e.panorama, 'panorama'); revisarTexto(e.conclusion, 'conclusión');

  for (const [clave] of SECCIONES) {
    const lista = (e.secciones || {})[clave];
    if (!Array.isArray(lista)) { errores.push(`Sección "${clave}": falta (usar [] si no hay novedades)`); continue; }
    lista.forEach((n, i) => {
      const d = `${clave}[${i}]`;
      if (!TEMAS[n.tema]) errores.push(`${d}: tema "${n.tema}" inválido (${Object.keys(TEMAS).join(', ')})`);
      for (const k of ['titulo', 'cuerpo', 'impacto']) if (!n[k]) errores.push(`${d}: falta "${k}"`);
      if (!Array.isArray(n.fuentes) || !n.fuentes.length) errores.push(`${d}: faltan las fuentes consultadas`);
      if (!Array.isArray(n.registro) || !n.registro.length || n.registro.some((r) => !r.url || !r.fecha_publicacion)) {
        errores.push(`${d}: cada noticia necesita registro con url y fecha_publicacion`);
      }
      if (/^\s*impacto zenith:/i.test(n.impacto || '')) errores.push(`${d}: "impacto" no debe repetir el rótulo; el generador lo agrega`);
      revisarTexto(`${n.titulo} ${n.cuerpo} ${n.impacto} ${(n.fuentes || []).join(' ')}`, d);
    });
  }
  (e.indicadores || []).forEach((x, i) => {
    if (!x.nombre || !x.valor) errores.push(`indicadores[${i}]: falta nombre o valor`);
    if (!x.registro || !x.registro.url) errores.push(`indicadores[${i}]: falta registro con url`);
  });
  (e.agenda || []).forEach((a, i) => {
    if (!a.texto) errores.push(`agenda[${i}]: falta texto`);
    revisarTexto(a.texto, `agenda[${i}]`);
  });
  return errores;
}

function enlacesContacto() {
  const msg = 'Hola, leí el informe Actualidad & Perspectiva de Grupo Zenith y quisiera asesoramiento inmobiliario.';
  return {
    whatsapp: `https://wa.me/${CONTACTO.whatsapp}?text=${encodeURIComponent(msg)}`,
    correo: `mailto:${CONTACTO.correo}?subject=${encodeURIComponent('Consulta inmobiliaria — Actualidad & Perspectiva')}`,
    instagram: `https://www.instagram.com/${CONTACTO.instagram}/`,
  };
}

// Modo oscuro de los teléfonos. Gmail (Android e iOS) no lee estas reglas: invierte los colores por su cuenta,
// y con bloques de fondo oscuro y texto claro deja texto oscuro sobre fondo oscuro. Por eso el cuerpo usa solo
// fondos claros con texto oscuro, que Gmail invierte de forma pareja, y las piezas que deben conservar su color
// (cabecera con el logotipo negativo, chip blanco del logotipo color) lo fijan con background-image, que Gmail no altera.
// Apple Mail, iOS Mail y Outlook sí leen las reglas de abajo y muestran una versión oscura diseñada.
const OSCURO = {
  fondo: '#0B1220',
  hoja: '#111A2C',
  caja: '#1A2740',
  texto: '#E3E8F0',
  titulo: '#FFFFFF',
  acento: '#4DB3FF',
  sutil: '#A9B8CC',
  borde: '#2A3A57',
};

const ESTILO_OSCURO = `
  @media (prefers-color-scheme: dark) {
    .z-fondo{background:${OSCURO.fondo} !important;}
    .z-hoja{background:${OSCURO.hoja} !important;}
    .z-caja{background:${OSCURO.caja} !important;}
    .z-texto{color:${OSCURO.texto} !important;}
    .z-titulo{color:${OSCURO.titulo} !important;}
    .z-acento{color:${OSCURO.acento} !important;}
    .z-sutil, .z-sutil a{color:${OSCURO.sutil} !important;}
    .z-borde{border-color:${OSCURO.borde} !important;}
  }
  [data-ogsc] .z-fondo{background:${OSCURO.fondo} !important;}
  [data-ogsc] .z-hoja{background:${OSCURO.hoja} !important;}
  [data-ogsc] .z-caja{background:${OSCURO.caja} !important;}
  [data-ogsc] .z-texto{color:${OSCURO.texto} !important;}
  [data-ogsc] .z-titulo{color:${OSCURO.titulo} !important;}
  [data-ogsc] .z-acento{color:${OSCURO.acento} !important;}
  [data-ogsc] .z-sutil{color:${OSCURO.sutil} !important;}`;

// Fondo que Gmail no invierte en modo oscuro.
const fondoFijo = (color) => `background-color:${color};background-image:linear-gradient(${color},${color});`;

function encabezadoSeccion(emoji, titulo) {
  return `
  <tr><td style="padding:28px 32px 6px 32px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
      <td class="z-titulo" style="font-family:Epilogue,Arial,Helvetica,sans-serif;font-size:13px;font-weight:700;letter-spacing:2px;color:${COLORES.azulOscuro};padding-bottom:8px;border-bottom:2px solid ${COLORES.azulZenith};">
        <span style="font-size:16px;">${emoji}</span>&nbsp;&nbsp;${esc(titulo)}
      </td>
    </tr></table>
  </td></tr>`;
}

function noticiaHtml(n, img) {
  const [icono, tema] = TEMAS[n.tema];
  return `
  <tr><td style="padding:16px 32px 4px 32px;">
    <div class="z-sutil" style="font-family:Epilogue,Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:${COLORES.grisAzulado};margin-bottom:4px;">${icono}&nbsp; ${esc(tema)}</div>
    <div class="z-titulo" style="font-family:Epilogue,Arial,Helvetica,sans-serif;font-size:18px;line-height:24px;font-weight:700;color:${COLORES.azulOscuro};margin-bottom:8px;">${esc(n.titulo)}</div>
    <div class="z-texto" style="text-align:justify;hyphens:auto;-webkit-hyphens:auto;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:23px;color:${COLORES.texto};margin-bottom:12px;">${esc(n.cuerpo)}</div>
    <table role="presentation" class="z-caja" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${COLORES.fondoSuave}" style="background:${COLORES.fondoSuave};border-left:3px solid ${COLORES.azulZenith};">
      <tr>
        ${img('simbolo-azul') ? `<td width="34" valign="top" style="padding:12px 0 12px 12px;"><img src="${img('simbolo-azul')}" width="22" height="22" alt="Z" style="display:block;border:0;"></td>` : ''}
        <td class="z-texto" style="text-align:justify;hyphens:auto;-webkit-hyphens:auto;padding:12px 14px 12px ${img('simbolo-azul') ? 8 : 14}px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:21px;color:${COLORES.texto};">
          <strong class="z-acento" style="color:${COLORES.azulZenith};">Impacto Zenith:</strong> ${esc(n.impacto)}
        </td>
      </tr>
    </table>
    <div class="z-sutil" style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:${COLORES.grisAzulado};margin-top:8px;">Fuentes: ${esc(n.fuentes.join(', '))}</div>
  </td></tr>`;
}

function indicadoresHtml(lista) {
  if (!lista || !lista.length) return '';
  // Dos columnas para 2 o 4 indicadores; tres en los demás casos.
  const columnas = lista.length === 2 || lista.length === 4 ? 2 : 3;
  const ancho = columnas === 2 ? '50%' : '33%';
  const celdas = lista.map((x) => `
      <td width="${ancho}" valign="top" style="padding:6px;">
        <table role="presentation" class="z-caja" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${COLORES.fondoSuave}" style="background:${COLORES.fondoSuave};border-top:3px solid ${COLORES.azulZenith};border-radius:6px;">
          <tr><td class="z-sutil" style="padding:12px 12px 4px 12px;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:.5px;color:${COLORES.texto};">${esc(x.nombre)}</td></tr>
          <tr><td class="z-titulo" style="padding:0 12px 2px 12px;font-family:Epilogue,Arial,Helvetica,sans-serif;font-size:20px;font-weight:700;color:${COLORES.azulOscuro};">${esc(x.valor)}</td></tr>
          <tr><td class="z-texto" style="padding:0 12px 12px 12px;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:${COLORES.texto};">${esc(x.variacion || '')}${x.variacion && x.dato ? ' · ' : ''}${esc(x.dato || '')}</td></tr>
        </table>
      </td>`);
  const filas = [];
  for (let i = 0; i < celdas.length; i += columnas) {
    const fila = celdas.slice(i, i + columnas);
    while (fila.length < columnas) fila.push(`<td width="${ancho}" style="padding:6px;"></td>`);
    filas.push(`<tr>${fila.join('')}</tr>`);
  }
  return `${encabezadoSeccion('📊', 'INDICADORES AL CIERRE')}
  <tr><td style="padding:8px 26px 0 26px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${filas.join('')}</table>
  </td></tr>`;
}

function html(e, modo) {
  // En envío, las imágenes viajan como adjuntos en línea (cid:); la vista previa las incrusta para abrirse sola.
  // El conector de Gmail referencia los adjuntos en línea por su posición (cid:att0, cid:att1…), en el orden de IMAGENES.
  // En «sin-imagenes» (envío de respaldo por el conector) no hay imágenes: el logotipo y el banner pasan a texto.
  const img = (id) => {
    if (modo === 'sin-imagenes') return '';
    if (modo === 'envio') return `cid:att${Object.keys(IMAGENES).indexOf(id)}`;
    const archivo = path.join(__dirname, IMAGENES[id]);
    const tipo = archivo.endsWith('.jpg') ? 'image/jpeg' : 'image/png';
    return `data:${tipo};base64,${fs.readFileSync(archivo).toString('base64')}`;
  };
  const c = enlacesContacto();
  const preheader = e.panorama.split(/(?<=\.)\s/)[0];
  const secciones = SECCIONES.map(([clave, emoji, titulo]) => {
    const lista = e.secciones[clave];
    const cuerpo = lista.length
      ? lista.map((n) => noticiaHtml(n, img)).join('')
      : `<tr><td class="z-sutil" style="padding:14px 32px 0 32px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-style:italic;color:${COLORES.grisAzulado};">${SIN_NOVEDADES}.</td></tr>`;
    return encabezadoSeccion(emoji, titulo) + cuerpo;
  }).join('');
  const agenda = (e.agenda && e.agenda.length)
    ? e.agenda.map((a) => `
      <tr>
        <td width="70" valign="top" style="padding:8px 0;"><span style="display:inline-block;${fondoFijo(COLORES.azulZenith)}color:#FFFFFF;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;padding:3px 8px;border-radius:10px;">${esc(a.hora || 'Hoy')}</span></td>
        <td class="z-texto" style="text-align:justify;hyphens:auto;-webkit-hyphens:auto;padding:8px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:21px;color:${COLORES.texto};">${esc(a.texto)}</td>
      </tr>`).join('')
    : `<tr><td class="z-sutil" style="font-family:Arial,Helvetica,sans-serif;font-size:14px;font-style:italic;color:${COLORES.grisAzulado};">Sin eventos relevantes confirmados para hoy.</td></tr>`;
  const frase = `${esc(e.frase.texto)}`;
  const autor = [e.frase.autor, e.frase.obra].filter(Boolean).map(esc).join(', ') + (e.frase.version_es ? ' · versión en español' : '');
  const logoCabecera = img('logo-negativo')
    ? `<img src="${img('logo-negativo')}" width="210" alt="Zenith Real Estate" style="display:block;border:0;width:210px;height:auto;">`
    : '<span style="font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:700;letter-spacing:3px;color:#FFFFFF;">ZENITH</span>';
  const banner = img('banner-contacto')
    ? `<img src="${img('banner-contacto')}" width="536" alt="Transformamos tu capital en buenas decisiones. Disponibles para consultas." style="display:block;border:0;width:100%;max-width:536px;height:auto;">`
    : `<div style="${fondoFijo(COLORES.azulOscuro)}color:#FFFFFF;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:700;padding:18px;text-align:center;">Transformamos tu capital en buenas decisiones. Disponibles para consultas.</div>`;
  const logoPie = img('logo-color')
    ? `<img src="${img('logo-color')}" width="130" alt="Zenith Real Estate" style="display:block;border:0;width:130px;height:auto;">`
    : `<span class="z-titulo" style="font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:700;letter-spacing:2px;color:${COLORES.azulOscuro};">ZENITH</span>`;

  return `<!DOCTYPE html>
<html lang="es"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark">
<title>Grupo Zenith | Actualidad &amp; Perspectiva — ${esc(e.fecha)}</title>
<link href="https://fonts.googleapis.com/css2?family=Epilogue:wght@300;500;700&amp;display=swap" rel="stylesheet">
<style>
  :root{color-scheme:light dark;supported-color-schemes:light dark;}
  body{margin:0;padding:0;background:${COLORES.gris};}
  a{color:${COLORES.azulZenith};}
  @media (max-width:620px){ .contenedor{width:100% !important;} .ind td{display:block;width:100% !important;} }
  ${ESTILO_OSCURO}
</style>
</head>
<body class="z-fondo" style="margin:0;padding:0;background:${COLORES.gris};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader)}</div>
<table role="presentation" class="z-fondo" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${COLORES.gris}" style="background:${COLORES.gris};">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" class="contenedor z-hoja" width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="#FFFFFF" style="width:600px;max-width:600px;background:#FFFFFF;">

  <!-- Cabecera: fondo fijo para que el logotipo negativo se vea también en modo oscuro -->
  <tr><td bgcolor="${COLORES.azulOscuro}" style="${fondoFijo(COLORES.azulOscuro)}padding:26px 32px 22px 32px;">${logoCabecera}</td></tr>
  <tr><td bgcolor="${COLORES.azulZenith}" style="${fondoFijo(COLORES.azulZenith)}height:5px;line-height:5px;font-size:0;">&nbsp;</td></tr>
  <tr><td style="padding:22px 32px 4px 32px;">
    <div class="z-acento" style="font-family:Epilogue,Arial,Helvetica,sans-serif;font-size:13px;font-weight:700;letter-spacing:3px;color:${COLORES.azulZenith};">GRUPO ZENITH | ACTUALIDAD &amp; PERSPECTIVA</div>
    <div class="z-sutil" style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:${COLORES.grisAzulado};margin-top:4px;">${esc(e.fecha)} | Actualizado a las ${esc(e.hora_cierre)} h (Argentina)</div>
    <div class="z-sutil" style="font-family:Epilogue,Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:2px;color:${COLORES.grisAzulado};margin-top:4px;">${e.numero ? `EDICIÓN N.º ${esc(e.numero)} · ` : ''}DÍAS HÁBILES · ${esc(e.horario_envio || '07:00')} H</div>
  </td></tr>

  <!-- Frase -->
  <tr><td style="padding:18px 32px 4px 32px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
      <td style="border-left:3px solid ${COLORES.celeste};padding:4px 0 4px 16px;">
        <div class="z-titulo" style="font-family:Epilogue,Georgia,serif;font-size:17px;line-height:25px;font-weight:300;font-style:italic;color:${COLORES.azulOscuro};">✍️ «${frase}»</div>
        <div class="z-sutil" style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:${COLORES.grisAzulado};margin-top:6px;">— ${autor}</div>
      </td>
    </tr></table>
  </td></tr>

  <!-- Panorama -->
  ${encabezadoSeccion('🧭', 'PANORAMA EN 30 SEGUNDOS')}
  <tr><td style="padding:10px 32px 0 32px;">
    <div class="z-caja z-texto" style="text-align:justify;hyphens:auto;-webkit-hyphens:auto;background:${COLORES.fondoSuave};padding:16px 18px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:23px;color:${COLORES.texto};">${esc(e.panorama)}</div>
  </td></tr>

  ${indicadoresHtml(e.indicadores)}
  ${secciones}

  <!-- Agenda -->
  ${encabezadoSeccion('🗓️', 'AGENDA Y SEÑALES A SEGUIR')}
  <tr><td style="padding:6px 32px 0 32px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${agenda}</table></td></tr>

  <!-- Conclusión: fondo claro con filete, legible con y sin modo oscuro -->
  ${encabezadoSeccion('🎯', 'CONCLUSIÓN')}
  <tr><td style="padding:10px 32px 8px 32px;">
    <div class="z-caja z-texto" style="text-align:justify;hyphens:auto;-webkit-hyphens:auto;background:${COLORES.fondoSuave};border-left:4px solid ${COLORES.azulZenith};padding:18px 20px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:23px;font-weight:700;color:${COLORES.azulOscuro};">${esc(e.conclusion)}</div>
  </td></tr>

  <!-- Contacto -->
  <tr><td style="padding:26px 32px 0 32px;">
    <a href="${c.whatsapp}" style="text-decoration:none;">${banner}</a>
  </td></tr>
  <tr><td align="center" style="padding:18px 32px 6px 32px;">
    <div class="z-titulo" style="font-family:Epilogue,Arial,Helvetica,sans-serif;font-size:16px;font-weight:500;color:${COLORES.azulOscuro};margin-bottom:12px;">¿Estás evaluando comprar, vender, alquilar o invertir?</div>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
      <td align="center" bgcolor="${COLORES.azulZenith}" style="${fondoFijo(COLORES.azulZenith)}border-radius:6px;">
        <a href="${c.whatsapp}" style="display:inline-block;padding:14px 26px;font-family:Epilogue,Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;color:#FFFFFF;text-decoration:none;border-radius:6px;">Hablar con un asesor inmobiliario</a>
      </td>
    </tr></table>
    <div class="z-sutil" style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:${COLORES.grisAzulado};margin-top:10px;">o escribinos a <a class="z-acento" href="${c.correo}" style="color:${COLORES.azulZenith};">${CONTACTO.correo}</a></div>
  </td></tr>

  <!-- Pie institucional -->
  <tr><td style="padding:26px 32px 0 32px;"><div class="z-borde" style="border-top:1px solid ${COLORES.gris};font-size:0;line-height:0;">&nbsp;</div></td></tr>
  <tr><td style="padding:14px 32px 26px 32px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
      <td valign="top" width="150"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td${img('logo-color') ? ` bgcolor="#FFFFFF" style="${fondoFijo('#FFFFFF')}padding:6px;border-radius:4px;"` : ''}>${logoPie}</td></tr></table></td>
      <td class="z-sutil" valign="top" style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:${COLORES.grisAzulado};">
        <strong class="z-titulo" style="color:${COLORES.azulOscuro};">${CONTACTO.corredor}</strong> · ${CONTACTO.funcion} · ${CONTACTO.matricula}<br>
        Tel. ${CONTACTO.telefono} · <a href="${c.correo}" style="color:${COLORES.grisAzulado};">${CONTACTO.correo}</a> · <a href="${c.instagram}" style="color:${COLORES.grisAzulado};">@${CONTACTO.instagram}</a><br>
        Resistencia, Chaco · Excelencia como estándar.
      </td>
    </tr></table>
    <div class="z-sutil" style="text-align:justify;hyphens:auto;-webkit-hyphens:auto;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:16px;color:${COLORES.grisAzulado};margin-top:14px;">
      Contenido informativo elaborado con fuentes públicas verificadas al cierre indicado. No constituye asesoramiento de inversión ni recomendación personalizada. Recibís este resumen porque aceptaste recibir novedades de Grupo Zenith; si no querés recibirlo más, respondé a este correo con la palabra BAJA.
    </div>
  </td></tr>

</table>
</td></tr></table>
</body></html>`;
}

function texto(e) {
  const l = [];
  const autor = [e.frase.autor, e.frase.obra].filter(Boolean).join(', ') + (e.frase.version_es ? ' · versión en español' : '');
  l.push(`✍️ «${e.frase.texto}»`, `— ${autor}`, '', 'GRUPO ZENITH | ACTUALIDAD & PERSPECTIVA', `${e.fecha} | Actualizado a las ${e.hora_cierre} h (Argentina)`, '');
  l.push('🧭 PANORAMA EN 30 SEGUNDOS', e.panorama, '');
  if (e.indicadores && e.indicadores.length) {
    l.push('📊 INDICADORES AL CIERRE');
    for (const x of e.indicadores) l.push(`• ${x.nombre}: ${x.valor}${x.variacion ? ` (${x.variacion})` : ''}${x.dato ? ` · ${x.dato}` : ''}`);
    l.push('');
  }
  for (const [clave, emoji, titulo] of SECCIONES) {
    l.push(`${emoji} ${titulo}`);
    const lista = e.secciones[clave];
    if (!lista.length) l.push(`${SIN_NOVEDADES}.`, '');
    for (const n of lista) {
      l.push(`${TEMAS[n.tema][0]} ${n.titulo}`, n.cuerpo, `Impacto Zenith: ${n.impacto}`, `Fuentes: ${n.fuentes.join(', ')}`, '');
    }
  }
  l.push('🗓️ AGENDA Y SEÑALES A SEGUIR');
  if (e.agenda && e.agenda.length) for (const a of e.agenda) l.push(`• ${a.hora ? `${a.hora} h — ` : ''}${a.texto}`);
  else l.push('Sin eventos relevantes confirmados para hoy.');
  l.push('', '🎯 CONCLUSIÓN', e.conclusion, '');
  l.push(`Asesoramiento inmobiliario: ${CONTACTO.corredor}, ${CONTACTO.funcion}, ${CONTACTO.matricula} · Tel./WhatsApp ${CONTACTO.telefono} · ${CONTACTO.correo}`);
  return l.join('\n');
}

function registro(e) {
  const filas = [];
  const fila = (item, r) => filas.push(`| ${item.replace(/\|/g, '/')} | ${(r.fuente || '').replace(/\|/g, '/')} | ${r.fecha_publicacion || ''} | ${r.url} |`);
  fila('Frase inicial', e.frase.registro);
  (e.indicadores || []).forEach((x) => fila(`Indicador: ${x.nombre}`, x.registro));
  for (const [clave, , titulo] of SECCIONES) for (const n of e.secciones[clave]) for (const r of n.registro) fila(`${titulo}: ${n.titulo}`, r);
  (e.agenda || []).forEach((a) => (a.registro || []).forEach((r) => fila(`Agenda: ${a.texto.slice(0, 60)}`, r)));
  return `# Registro interno de verificación — no compartir\n\nEdición: ${e.fecha}, cierre ${e.hora_cierre} h (America/Argentina/Buenos_Aires).\n\n| Ítem | Fuente | Fecha de publicación | URL |\n| --- | --- | --- | --- |\n${filas.join('\n')}\n${e.notas_verificacion ? `\n## Notas\n\n${e.notas_verificacion}\n` : ''}`;
}

function main() {
  const [entrada, salida] = process.argv.slice(2);
  if (!entrada || !salida) {
    console.error('Uso: node generar-gacetilla.js <edicion.json> <carpeta-salida>');
    process.exit(2);
  }
  const edicion = JSON.parse(fs.readFileSync(entrada, 'utf8'));
  const errores = validar(edicion);
  if (errores.length) {
    console.error('La edición no pasa la validación:\n- ' + errores.join('\n- '));
    process.exit(1);
  }
  fs.mkdirSync(path.join(salida, 'img'), { recursive: true });
  for (const rel of Object.values(IMAGENES)) fs.copyFileSync(path.join(__dirname, rel), path.join(salida, rel));
  fs.writeFileSync(path.join(salida, 'gacetilla.html'), html(edicion, 'envio'));
  fs.writeFileSync(path.join(salida, 'vista-previa.html'), html(edicion, 'vista'));
  fs.writeFileSync(path.join(salida, 'mensaje.txt'), texto(edicion));
  fs.writeFileSync(path.join(salida, 'registro-interno.md'), registro(edicion));
  fs.writeFileSync(path.join(salida, 'adjuntos.json'), JSON.stringify(
    Object.entries(IMAGENES).map(([nombre, rel], i) => ({
      posicion: i, cid: `cid:att${i}`, nombre, archivo: rel,
      mimeType: rel.endsWith('.jpg') ? 'image/jpeg' : 'image/png', inline: true,
    })), null, 2));
  // Carga lista para el conector de Gmail (send_message): asunto, cuerpos y adjuntos en línea en orden.
  // Los destinatarios los agrega quien envía, desde la lista de destinatarios vigente.
  fs.writeFileSync(path.join(salida, 'envio-gmail.json'), JSON.stringify({
    subject: `Actualidad & Perspectiva | ${edicion.fecha} · Grupo Zenith`,
    htmlBody: html(edicion, 'envio'),
    body: texto(edicion),
    attachments: Object.entries(IMAGENES).map(([nombre, rel]) => ({
      content: fs.readFileSync(path.join(__dirname, rel)).toString('base64'),
      filename: path.basename(rel),
      mimeType: rel.endsWith('.jpg') ? 'image/jpeg' : 'image/png',
      inline: true,
    })),
  }, null, 2));
  // Respaldo sin imágenes para el conector de Gmail, cuando no se puede usar gacetilla/enviar-gmail.js:
  // sin adjuntos ni sangrías, para que el contenido a transcribir sea lo más corto posible.
  const sinImagenes = html(edicion, 'sin-imagenes').replace(/\n\s*/g, '\n').replace(/<!--[^>]*-->\n/g, '');
  fs.writeFileSync(path.join(salida, 'gacetilla-sin-imagenes.html'), sinImagenes);
  fs.writeFileSync(path.join(salida, 'envio-conector.json'), JSON.stringify({
    subject: `Actualidad & Perspectiva | ${edicion.fecha} · Grupo Zenith`,
    htmlBody: sinImagenes,
    body: texto(edicion),
  }, null, 2));
  const kb = Math.round(fs.statSync(path.join(salida, 'gacetilla.html')).size / 1024);
  console.log(`Gacetilla generada en ${salida} (${kb} KB de HTML${kb > 95 ? '; atención: Gmail recorta mensajes de más de ~102 KB' : ''}).`);
}

main();
