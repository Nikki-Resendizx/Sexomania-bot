const { db } = require('../config/firebase');

/**
 * Lee datos de la WebApp en modo SOLO LECTURA.
 * Nunca crea, actualiza ni elimina documentos en Firebase.
 */
async function obtenerChatWebApp(chatId) {
  if (!db) return null;
  const snap = await db.collection('chats').doc(String(chatId)).get();
  if (!snap.exists) return null;
  return { id: snap.id, ...(snap.data() || {}) };
}

/**
 * Convierte la foto de la WebApp a una entrada que Telegram pueda enviar
 * sin crear archivos temporales ni escribir nada en Firebase.
 *
 * Soporta:
 * - file_id de Telegram
 * - URL HTTPS
 * - data:image/...;base64,...
 */
function prepararFotoTelegram(foto) {
  if (!foto || typeof foto !== 'string') return null;
  const value = foto.trim();
  if (!value) return null;

  if (/^https?:\\/\\//i.test(value) || /^AgAC/i.test(value)) return value;

  const match = value.match(/^data:([^;]+);base64,(.+)$/i);
  if (match) {
    return {
      source: Buffer.from(match[2], 'base64'),
      filename: 'webapp-photo'
    };
  }

  // También permitimos base64 puro.
  if (/^[A-Za-z0-9+/=\\s]+$/.test(value) && value.length > 100) {
    try {
      return { source: Buffer.from(value.replace(/\\s/g, ''), 'base64'), filename: 'webapp-photo' };
    } catch {}
  }

  return null;
}

function escaparHTML(value) {
  return String(value ?? '').replace(/[&<>"]/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'
  }[ch]));
}

function crearCaptionWebApp(chat) {
  const nombre = escaparHTML(chat.nombre || 'Sin nombre');
  const seccion = escaparHTML(chat.seccion || 'Sin categoría');
  const desc = escaparHTML(chat.desc || 'Sin descripción');
  const link = String(chat.link || '').trim();

  return [
    '📋 <b>' + nombre + '</b>',
    '',
    '📁 <b>Categoría:</b> ' + seccion,
    '👁️ <b>Visitas:</b> ' + Number(chat.clicks || 0),
    '',
    '📝 ' + desc
  ].join('\\n');
}

module.exports = {
  obtenerChatWebApp,
  prepararFotoTelegram,
  crearCaptionWebApp
};
