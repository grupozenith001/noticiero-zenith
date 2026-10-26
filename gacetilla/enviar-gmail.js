#!/usr/bin/env node
// Envía la gacetilla generada con la API de Gmail, sin que el modelo transcriba el contenido.
// Uso: node gacetilla/enviar-gmail.js <carpeta-edicion> [--enviar | --prueba]
//   sin opción: solo verifica y muestra el resumen (no envía nada);
//   --prueba:   envía solo a grupozenith001@gmail.com;
//   --enviar:   envía un único correo, to grupozenith001@gmail.com y la lista activa en bcc.
// Credenciales (secretos del entorno, nunca en el repositorio):
//   GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN (alcance gmail.send).
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const REMITENTE = 'grupozenith001@gmail.com';
const NOMBRE_REMITENTE = 'Grupo Zenith';
const CSV = path.join(__dirname, '..', 'datos', 'destinatarios.csv');
const EMAIL_VALIDO = /^[^\s@,;<>"]+@[^\s@,;<>"]+\.[^\s@,;<>"]+$/;

function destinatariosActivos() {
  const [cabecera, ...filas] = fs.readFileSync(CSV, 'utf8').split(/\r?\n/).filter((l) => l.trim());
  const cols = cabecera.split(',').map((c) => c.trim());
  const iEmail = cols.indexOf('email');
  const iEstado = cols.indexOf('estado');
  if (iEmail < 0 || iEstado < 0) throw new Error('destinatarios.csv sin columnas email/estado');
  const activos = filas
    .map((l) => l.split(',').map((c) => c.trim().replace(/^"|"$/g, '')))
    .filter((c) => c[iEstado] === 'activo')
    .map((c) => c[iEmail].toLowerCase());
  for (const e of activos) if (!EMAIL_VALIDO.test(e)) throw new Error(`Dirección inválida en la lista: ${e}`);
  return [...new Set(activos)].filter((e) => e !== REMITENTE);
}

// Encabezado con caracteres no ASCII (RFC 2047).
const encabezado = (texto) => (/^[\x20-\x7e]*$/.test(texto)
  ? texto
  : `=?UTF-8?B?${Buffer.from(texto, 'utf8').toString('base64')}?=`);

const base64Lineas = (buf) => buf.toString('base64').replace(/.{76}/g, '$&\r\n');

function construirMime({ subject, htmlBody, body, attachments }, bcc) {
  const relacionado = `rel_${crypto.randomBytes(12).toString('hex')}`;
  const alternativo = `alt_${crypto.randomBytes(12).toString('hex')}`;
  // Sin imágenes en línea (la plantilla actual las toma de grupozenith.org), el correo es solo texto y HTML.
  const enLinea = attachments.length > 0;
  const partes = [
    `From: ${encabezado(NOMBRE_REMITENTE)} <${REMITENTE}>`,
    `To: ${REMITENTE}`,
    ...(bcc.length ? [`Bcc: ${bcc.join(', ')}`] : []),
    `Subject: ${encabezado(subject)}`,
    'MIME-Version: 1.0',
    ...(enLinea ? [`Content-Type: multipart/related; boundary="${relacionado}"`, '', `--${relacionado}`] : []),
    `Content-Type: multipart/alternative; boundary="${alternativo}"`,
    '',
    `--${alternativo}`,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    base64Lineas(Buffer.from(body, 'utf8')),
    `--${alternativo}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    base64Lineas(Buffer.from(htmlBody, 'utf8')),
    `--${alternativo}--`,
  ];
  // El HTML referencia las imágenes como cid:att0, cid:att1… según su posición.
  attachments.forEach((a, i) => {
    partes.push(
      `--${relacionado}`,
      `Content-Type: ${a.mimeType}; name="${a.filename}"`,
      'Content-Transfer-Encoding: base64',
      `Content-ID: <att${i}>`,
      `Content-Disposition: inline; filename="${a.filename}"`,
      '',
      base64Lineas(Buffer.from(a.content, 'base64')),
    );
  });
  if (enLinea) partes.push(`--${relacionado}--`);
  partes.push('');
  return partes.join('\r\n');
}

async function tokenDeAcceso() {
  const faltan = ['GMAIL_CLIENT_ID', 'GMAIL_CLIENT_SECRET', 'GMAIL_REFRESH_TOKEN'].filter((v) => !process.env[v]);
  if (faltan.length) throw new Error(`Faltan secretos del entorno: ${faltan.join(', ')}`);
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GMAIL_CLIENT_ID,
      client_secret: process.env.GMAIL_CLIENT_SECRET,
      refresh_token: process.env.GMAIL_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  });
  const datos = await r.json().catch(() => ({}));
  if (!r.ok || !datos.access_token) {
    throw new Error(`No se pudo obtener el token de Gmail (${r.status}): ${datos.error || ''} ${datos.error_description || ''}`.trim());
  }
  return datos.access_token;
}

async function main() {
  const [carpeta, modo] = process.argv.slice(2);
  if (!carpeta || (modo && !['--enviar', '--prueba'].includes(modo))) {
    console.error('Uso: node gacetilla/enviar-gmail.js <carpeta-edicion> [--enviar | --prueba]');
    process.exit(2);
  }
  const carga = JSON.parse(fs.readFileSync(path.join(carpeta, 'envio-gmail.json'), 'utf8'));
  for (const campo of ['subject', 'htmlBody', 'body', 'attachments']) {
    if (!carga[campo]) throw new Error(`envio-gmail.json sin «${campo}»`);
  }
  const cids = [...carga.htmlBody.matchAll(/cid:att(\d+)/g)].map((m) => Number(m[1]));
  if (cids.some((i) => i >= carga.attachments.length)) throw new Error('El HTML referencia una imagen que no está en los adjuntos');

  const bcc = modo === '--prueba' ? [] : destinatariosActivos();
  const mime = construirMime(carga, bcc);
  console.log(`Asunto: ${carga.subject}`);
  const remotas = new Set(carga.htmlBody.match(/https:\/\/grupozenith\.org\/assets\/mailing\/[\w.-]+/g) || []).size;
  console.log(`To: ${REMITENTE} · Bcc: ${bcc.length} dirección(es) · Imágenes en línea: ${carga.attachments.length} · alojadas: ${remotas} · ${Math.round(mime.length / 1024)} KB`);
  if (!modo) {
    console.log('Verificación sin envío. Usá --prueba o --enviar para enviar.');
    return;
  }

  const token = await tokenDeAcceso();
  const r = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ raw: Buffer.from(mime, 'utf8').toString('base64url') }),
  });
  const datos = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`Gmail rechazó el envío (${r.status}): ${datos.error?.message || ''}`);
  const resultado = { enviado: new Date().toISOString(), modo, id: datos.id, threadId: datos.threadId, bcc: bcc.length };
  fs.writeFileSync(path.join(carpeta, 'envio-resultado.json'), JSON.stringify(resultado, null, 2));
  console.log(`Enviado. Id de mensaje: ${datos.id}`);
}

main().catch((e) => {
  console.error(`Error: ${e.message}`);
  process.exit(1);
});
