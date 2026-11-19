const { db } = require('./firebase');

async function configureNotificationTopic(ctx) {
  const chat = ctx.chat;
  const threadId = Number(ctx.message?.message_thread_id);
  if (!chat || !['group', 'supergroup'].includes(chat.type)) {
    throw new Error('Ejecuta /setnotificaciones dentro del grupo que recibirá las alertas.');
  }
  if (!threadId) {
    throw new Error('Ejecuta el comando dentro del tema específico (no en el chat privado ni en el tema General).');
  }
  const target = await ctx.telegram.getChat(chat.id);
  if (!target.is_forum) {
    throw new Error('Este grupo no tiene Temas activados. Activa Temas en los ajustes del grupo y vuelve a intentarlo.');
  }
  const me = await ctx.telegram.getMe();
  const member = await ctx.telegram.getChatMember(chat.id, me.id);
  if (!['administrator', 'creator', 'member'].includes(member.status)) {
    throw new Error('El bot no tiene acceso a este grupo.');
  }
  if (!db) throw new Error('Firebase/Firestore no está configurado; no puedo guardar el destino.');
  const config = {
    groupId: chat.id,
    threadId,
    groupTitle: target.title || chat.title || 'Grupo de notificaciones',
    configuredBy: ctx.from.id,
    updatedAt: new Date()
  };
  await db.collection('config').doc('notificaciones').set(config, { merge: true });
  return config;
}

async function sendNotification(telegram, text, extra = {}) {
  if (!db) return null;
  const snap = await db.collection('config').doc('notificaciones').get();
  if (!snap.exists) return null;
  const config = snap.data() || {};
  if (!Number.isSafeInteger(Number(config.groupId)) || !Number.isSafeInteger(Number(config.threadId))) return null;
  return telegram.sendMessage(Number(config.groupId), text, {
    message_thread_id: Number(config.threadId),
    ...extra
  });
}

module.exports = { configureNotificationTopic, sendNotification };
