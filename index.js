require('dotenv').config();

const { Telegraf, session, Markup } = require('telegraf');
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
  if (userLastMessage.size > 10000) userLastMessage.delete(userLastMessage.keys().next().value);
  return next();
});

bot.use(async (ctx, next) => {
  if (!ctx.message || !ctx.message.text || isAdmin(ctx.from && ctx.from.id)) return next();
  const text = ctx.message.text;
  const hasUrl = /(?:https?:\/\/|www\.|(?:[a-z0-9-]+\.)+(?:com|net|org|xyz|top)(?:\/|\b))/i.test(text);
  if (!text.startsWith('/') && hasUrl) {
    try { await ctx.deleteMessage(); } catch {}
    return ctx.reply('❌ No se permiten enlaces.');
  }
  return next();
});

async function registrarUsuario(ctx) {
  const { db } = require('./config/firebase');
  if (!db || !ctx.from || !ctx.from.id) return;
  const user = ctx.from;
  const ref = db.collection('usuarios').doc(String(user.id));
  const payload = {
    id: user.id,
    first_name: user.first_name || '',
    last_name: user.last_name || '',
    username: user.username || null,
    language_code: user.language_code || null,
    esAdmin: isAdmin(user.id),
    estado: 'activo',
    baneado: false,
    ultimaActividad: new Date()
  };
  try {
    const snap = await ref.get();
    if (!snap.exists) {
      payload.fechaIngreso = new Date();
      payload.creado = new Date();
      payload.chatsRegistrados = 0;
    }
    await ref.set(payload, { merge: true });
  } catch (error) {
    console.error('❌ Error registrando usuario:', error.message);
  }
}

async function getFotoBienvenida() {
  const { db } = require('./config/firebase');
  if (!db) return null;
  try {
    const doc = await db.collection('config').doc('bot').get();
    return doc.exists ? (doc.data().welcomePhoto || null) : null;
  } catch (error) {
    console.error('❌ Error leyendo bienvenida:', error.message);
    return null;
  }
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch]));
}

bot.start(async ctx => {
  try {
    await registrarUsuario(ctx);
    const nombre = ctx.from.first_name || 'bebé';
    const foto = await getFotoBienvenida();
    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('📁 CATEGORÍAS', 'ver_categorias_user')],
      [Markup.button.callback('🟢 MIS GRUPOS', 'mis_chats')],
      [Markup.button.callback('🔵 + CANAL O GRUPO', 'agregar_chat')],
      [Markup.button.url('🔴 CANAL OFICIAL', process.env.OFFICIAL_CHANNEL_URL || 'https://t.me/Sexomania_Links')]
    ]);
    const caption = '🔥 <b>Bienvenid@ ' + escapeHtml(nombre) + ' a SEXOMANIA</b> 🔥\n\n😈 El bot más cochino de Telegram 😈';
    if (foto) await ctx.replyWithPhoto(foto, { caption, parse_mode: 'HTML', ...keyboard });
    else await ctx.reply(caption, { parse_mode: 'HTML', reply_markup: keyboard.reply_markup });
  } catch (e) {
    console.error('❌ Error en /start:', e);
    await ctx.reply('🔥 Bienvenid@ a SEXOMANIA.');
  }
});

bot.command('cancel', async ctx => {
  if (ctx.session) ['esperandoCanal','cambiandoEnlace','cambiandoNombre','adminCategoryAction','publicacion'].forEach(k => delete ctx.session[k]);
  await ctx.reply('✅ Operación cancelada.');
});

bot.command('setfoto', async ctx => {
  if (!isAdmin(ctx.from && ctx.from.id)) return ctx.reply('❌ Solo administradores.');
  const { db } = require('./config/firebase');
  if (!db) return ctx.reply('❌ Firebase no está configurado.');
  let nuevaFoto = null;
  if (ctx.message.reply_to_message && ctx.message.reply_to_message.photo && ctx.message.reply_to_message.photo.length) {
    nuevaFoto = ctx.message.reply_to_message.photo[ctx.message.reply_to_message.photo.length - 1].file_id;
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

require('./handlers/admin/panel').register(bot);
const canalesHandler = require('./handlers/admin/canales');
canalesHandler.setupCanalesHandler(bot);
bot.use(canalesHandler.canalesMiddleware());
require('./handlers/admin/chats')(bot);
require('./handlers/admin/users')(bot);
require('./handlers/admin/publicaciones')(bot);

bot.action('ayuda', ctx => ctx.reply('Usa /start para volver al menú.'));

bot.catch((error, ctx) => {
  console.error('❌ Error no controlado:', {
    updateId: ctx && ctx.update && ctx.update.update_id,
    userId: ctx && ctx.from && ctx.from.id,
    message: error && error.message,
    stack: error && error.stack
  });
});

console.log('✅ Handlers cargados. Seguridad y panel activos.');

bot.launch()
  .then(() => console.log('🔥 SEXOMANIA V11 encendido.'))
  .catch(error => {
    console.error('❌ No se pudo iniciar el bot:', error);
    process.exitCode = 1;
  });

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
