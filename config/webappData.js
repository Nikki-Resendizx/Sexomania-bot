const { db } = require('./firebase');

async function getWebAppChats({ onlyActive = false, section = null, requesterId = null, limit = 50 } = {}) {
  if (!db) throw new Error('Fuente de datos de la WebApp no disponible.');
  let query = db.collection('chats');

  if (section && section !== '__FAVORITOS__') query = query.where('seccion', '==', section);
  if (requesterId !== null && requesterId !== undefined) query = query.where('solicitante', '==', Number(requesterId));

  const snap = await query.limit(Number(limit) || 50).get();
  let items = snap.docs.map(doc => ({ id: doc.id, ...(doc.data() || {}) }));

  if (onlyActive) items = items.filter(item => item.activo !== false);

  return items;
}

async function getWebAppChat(id) {
  if (!db) throw new Error('Fuente de datos de la WebApp no disponible.');
  const snap = await db.collection('chats').doc(String(id)).get();
  if (!snap.exists) return null;
  return { id: snap.id, ...(snap.data() || {}) };
}

async function getWebAppSections() {
  const chats = await getWebAppChats({ onlyActive: true, limit: 500 });
  return [...new Set(chats.map(c => String(c.seccion || '').trim()).filter(Boolean))];
}

module.exports = { getWebAppChats, getWebAppChat, getWebAppSections };
