require('dotenv').config();
const { Telegraf, session, Markup } = require('telegraf');
const { db } = require('./config/firebase');
const { getChannels } = require('./config/constantes');

const bot = new Telegraf(process.env.BOT_TOKEN || process.env.TOKEN_BOT);
bot.use(session());

const ADMIN_ID = 8695673050;

// 👇 ANTI-FLOOD Y ANTI-SPAM 👇
const userLastMessage = new Map();
bot.use(async (ctx, next) => {
  if (!ctx.from) return next();
  const userId = ctx.from.id;
  const now = Date.now();
  const lastTime = userLastMessage.get(userId) || 0;
  const diff = now - lastTime;

  // Si manda mensajes cada menos de 1.5 segundos, lo ignoramos
  if (diff < 1500 && String(userId)!== String(ADMIN_ID)) {
    return; // No hace nada, evita flood
  }
  userLastMessage.set(userId, now);
  return next();
});

// Filtro anti-spam para texto
const palabrasProhibidas = ['http://', 'https://', '.com', '@']; // Evita que usuarios spameen links
bot.use(async (ctx, next) => {
  if (ctx.message && ctx.message.text && String(ctx.from.id)!== String(ADMIN_ID)) {
    const texto = ctx.message.text.toLowerCase();
    // Si no es comando y trae link, lo borra
    if (!texto.startsWith('/') && palabrasProhibidas.some(p => texto.includes(p))) {
      try { await ctx.deleteMessage(); } catch {}
      return ctx.reply('❌ No se permiten links, bebé 😈');
    }
  }
  return next();
});

async function getFotoBienvenida() {
  try {
    if (!db) return 'https://i.imgur.com/8Km9tLL.jpg';
    const doc = await db.collection('config').doc('bot').get();
    if (doc.exists && doc.data().welcomePhoto) return doc.data().welcomePhoto;
    return 'https://i.imgur.com/8Km9tLL.jpg';
  } catch { return 'https://i.imgur.com/8Km9tLL.jpg'; }
}

bot.start(async (ctx) => {
  const nombre = ctx.from.first_name || 'bebé';
  const foto = await getFotoBienvenida();
  await ctx.replyWithPhoto(foto, {
    caption: `🔥 *Bienvenid@ ${nombre} a SEXOMANIA V9 ULTRA* 🔥\n\n😈 El bot más cochino de Telegram 😈`,
    parse_mode: 'Markdown',
   ...Markup.inlineKeyboard([[Markup.button.callback('📂 Mis Chats', 'mis_chats')]])
  });
});

bot.command('setfoto', async (ctx) => {
  if (String(ctx.from.id)!== String(ADMIN_ID)) return ctx.reply('❌ Solo la jefa 😈');
  let nuevaFoto = null;
  if (ctx.message.reply_to_message?.photo) {
    nuevaFoto = ctx.message.reply_to_message.photo.pop().file_id;
  } else {
    const args = ctx.message.text.split(' ');
    if (args[1]) nuevaFoto = args[1];
  }
  if (!nuevaFoto) return ctx.reply('Responde a una foto con /setfoto jefa');
  await db.collection('config').doc('bot').set({ welcomePhoto: nuevaFoto }, { merge: true });
  await ctx.reply('✅ Foto cambiada 🔥');
});

const canalesHandler = require('./handlers/admin/canales');
if (canalesHandler.configurarControladorDeCanales) {
  bot.use(canalesHandler.configurarControladorDeCanales);
  canalesHandler.configurarControladorDeCanales(bot);
}
require('./handlers/admin/chats')(bot);
require('./handlers/admin/users')(bot);

console.log('Canales cargados con Antiflood activo 🛡️');
bot.launch().then(() => console.log('Bot V9 ULTRA encendido 🔥 SIN RIESGO DE SPAM'));

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
