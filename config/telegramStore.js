const { db } = require('./firebase');

const STORE_GROUP_ID = Number(process.env.STORE_GROUP_ID || '-1004390457209');

const STORE_TOPICS = [
  { key: 'bienvenida', name: '👋 BIENVENIDA', icon_color: 7322096 },
  { key: 'categorias', name: '📁 CATEGORÍAS', icon_color: 9367192 },
  { key: 'plantillas', name: '📝 PLANTILLAS', icon_color: 16766590 },
  { key: 'botones', name: '🔘 BOTONES', icon_color: 13338331 },
  { key: 'usuarios', name: '👥 USUARIOS', icon_color: 9367192 },
  { key: 'admins', name: '👑 ADMINS', icon_color: 16749490 },
  { key: 'canales', name: '📢 CANALES', icon_color: 7322096 },
  { key: 'configuracion', name: '⚙️ CONFIGURACIÓN', icon_color: 9367192 },
  { key: 'cache', name: '🧹 CACHÉ', icon_color: 16766590 }
];

let cache = null;

async function loadMapping() {
  if (cache) return cache;
  if (!db) return {};

  try {
    const snap = await db.collection('config').doc('telegramStore').get();
    cache = snap.exists && snap.data().topics ? { ...snap.data().topics } : {};
  } catch (error) {
    console.error('❌ Error leyendo configuración del Telegram Store:', error.message);
    cache = {};
  }

  return cache;
}

async function saveMapping(topics) {
  cache = { ...topics };

  if (!db) return;

  await db.collection('config').doc('telegramStore').set({
    groupId: STORE_GROUP_ID,
    topics: cache,
    updatedAt: new Date()
  }, { merge: true });
}

async function ensureStoreTopics(bot) {
  if (!Number.isSafeInteger(STORE_GROUP_ID)) {
    throw new Error('STORE_GROUP_ID inválido.');
  }

  const chat = await bot.telegram.getChat(STORE_GROUP_ID);

  if (!chat.is_forum) {
    throw new Error('El Telegram Store debe ser un supergrupo con Temas (Topics) activados.');
  }

  const me = await bot.telegram.getMe();
  const member = await bot.telegram.getChatMember(STORE_GROUP_ID, me.id);

  if (!['administrator', 'creator'].includes(member.status)) {
    throw new Error('El bot debe ser administrador del Telegram Store.');
  }

  const mapping = await loadMapping();
  let changed = false;

  for (const topic of STORE_TOPICS) {
    const existingId = Number(mapping[topic.key]);

    if (Number.isSafeInteger(existingId)) continue;

    const created = await bot.telegram.createForumTopic(
      STORE_GROUP_ID,
      topic.name,
      topic.icon_color
    );

    mapping[topic.key] = created.message_thread_id;
    changed = true;

    console.log(`🧵 Topic creado: ${topic.name} (${created.message_thread_id})`);
  }

  if (changed) await saveMapping(mapping);

  console.log('✅ Telegram Store conectado: ' + STORE_GROUP_ID);
  return { groupId: STORE_GROUP_ID, topics: mapping };
}

async function getStoreTopic(key) {
  const mapping = await loadMapping();
  const threadId = Number(mapping[key]);
  return Number.isSafeInteger(threadId) ? threadId : null;
}

async function sendToStore(bot, key, text, extra = {}) {
  const threadId = await getStoreTopic(key);
  if (!threadId) throw new Error(`Topic del Store no configurado: ${key}`);

  return bot.telegram.sendMessage(STORE_GROUP_ID, text, {
    message_thread_id: threadId,
    ...extra
  });
}

module.exports = {
  STORE_GROUP_ID,
  STORE_TOPICS,
  ensureStoreTopics,
  getStoreTopic,
  sendToStore
};
