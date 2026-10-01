require('dotenv').config();

const { Telegraf, session, Markup } = require('telegraf');
const { db } = require('./config/firebase');
const { isAdmin } = require('./config/constantes');

const token = process.env.BOT_TOKEN || process.env.TOKEN_BOT;
if (!token) throw new Error('❌ Falta BOT_TOKEN/TOKEN_BOT en las variables de entorno.');

const bot = new Telegraf(token);
bot.use(session());

const userLastMessage = new Map();
const FLOOD_INTERVAL_MS = Number(process.env.FLOOD_INTERVAL_MS || 1500);

bot.use(async (ctx, next) => {
  if (!ctx.from || isAdmin(ctx.from.id)) return next();

  const now = Date.now();
  const last = userLastMessage.get(ctx.from.id) || 0;
  if (now - last < FLOOD_INTERVAL_MS) return;

  userLastMessage.set(ctx.from.id, now);
  // Evita crecimiento indefinido de la caché en procesos largos.
  if (userLastMessage.size > 10000) {
    const oldest = userLastMessage.keys().next().value;
    if (oldest !== undefined) userLastMessage.delete(oldest);
  }
  return next();
});

// Anti-spam: bloquea URLs evidentes, pero NO @username.
bot.use(async (ctx, next) => {
  if (!ctx.message?.text || isAdmin(ctx.from?.id)) return next();

  const text = ctx.message.text.toLowerCase();
  const hasUrl = /(?:https?:\/\/|www\.|(?:[a-z0-9-]+\.)+(?:com|net|org|xyz|top)(?:\/|\b))/i.test(text);

  if (!text.startsWith('/') && hasUrl) {
    try { await ctx.deleteMessage(); } catch {}
    return ctx.reply('❌ No se permiten enlaces.');
  }
  return next();
});

async function getFotoBienvenida() {
  if (!db) return 'https://i.imgur.com/8Km9tLL.jpg';
  try {
    const doc = await db.collection('config').doc('bot').get();
    return doc.exists && doc.data().welcomePhoto
      ? doc.data().welcomePhoto
      : 'https://i.imgur.com/8Km9tLL.jpg';
  } catch (error) {
    console.error('❌ Error leyendo bienvenida:', error.message);
    return 'https://i.imgur.com/8Km9tLL.jpg';
  }
}

bot.start(async ctx => {
  const nombre = ctx.from.first_name || 'bebé';
  const foto = await getFotoBienvenida();
  await ctx.replyWithPhoto(foto, {
    caption: `🔥 *Bienvenid@ ${nombre} a SEXOMANIA V9 ULTRA* 🔥\n\n😈 El bot más cochino de Telegram 😈`,
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard([[Markup.button.callback('📂 Mis Chats', 'mis_chats')]])
  });
});

bot.command('cancel', async ctx => {
  if (ctx.session) {
    for (const key of ['esperandoCanal', 'cambiandoEnlace', 'cambiandoNombre', 'adminCategoryAction']) delete ctx.session[key];
  }
  await ctx.reply('✅ Operación cancelada.');
});

bot.command('setfoto', async ctx => {
  if (!isAdmin(ctx.from?.id)) return ctx.reply('❌ Solo administradores.');
  if (!db) return ctx.reply('❌ Firebase no está configurado.');

  let nuevaFoto = null;
  if (ctx.message.reply_to_message?.photo?.length) {
    nuevaFoto = ctx.message.reply_to_message.photo.at(-1).file_id;
  } else {
    const args = ctx.message.text.trim().split(/\s+/);
    if (args[1]) nuevaFoto = args[1];
  }

  if (!nuevaFoto) return ctx.reply('Responde a una foto con /setfoto o proporciona una URL.');
  try {
    await db.collection('config').doc('bot').set({ welcomePhoto: nuevaFoto }, { merge: true });
    await ctx.reply('✅ Foto de bienvenida actualizada.');
  } catch (error) {
    console.error('❌ /setfoto:', error);
    await ctx.reply('❌ No pude guardar la foto.');
  }
});

const adminPanel = require('./handlers/admin/panel');
adminPanel.register(bot);

const canalesHandler = require('./handlers/admin/canales');
canalesHandler.setupCanalesHandler(bot);
bot.use(canalesHandler.canalesMiddleware());

require('./handlers/admin/chats')(bot);
require('./handlers/admin/users')(bot);

bot.catch((error, ctx) => {
  console.error('❌ Error no controlado:', {
    updateId: ctx?.update?.update_id,
    userId: ctx?.from?.id,
    message: error?.message,
    stack: error?.stack
  });
});

console.log('✅ Handlers cargados. Antiflood y seguridad activos.');

bot.launch()
  .then(() => console.log('🔥 SEXOMANIA V10 encendido.'))
  .catch(error => {
    console.error('❌ No se pudo iniciar el bot:', error);
    process.exitCode = 1;
  });

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
