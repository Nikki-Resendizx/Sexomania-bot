require('dotenv').config();

const http = require('http');
const fs = require('fs');
const path = require('path');

const WEB_PORT = Number(process.env.PORT || 3000);
const WEB_ROOT = path.join(__dirname, 'web');
const WEBAPP_URL = process.env.WEBAPP_URL || 'https://sexomania-links.vercel.app/';
const OFFICIAL_CHANNEL_URL = process.env.OFFICIAL_CHANNEL_URL || 'https://t.me/Sexomania_Links';
const BOTONERA_URL = 'http://t.me/sexomanialinksbot';
const LISTAS_URL = 'https://t.me/SexomaniaListas_Bot';
const ADD_GROUP_URL = 'https://t.me/Sexomanialinkbot?startgroup&admin=post_messages+edit_messages+delete_messages+invite_users+pin_messages+manage_chat';
const ADD_CHANNEL_URL = 'https://t.me/Sexomanialinkbot?startchannel&admin=post_messages+edit_messages+delete_messages+invite_users+pin_messages+manage_chat';
const DEFAULT_WELCOME_TEXT = '🔥 <b>Bienvenid@ {nombre} a SEXOMANIA</b> 🔥\n\n😈 El bot más cochino de Telegram 😈';

function sendHttp(res, status, contentType, body) {
  res.writeHead(status, {
    'Content-Type': contentType,
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*'
  });
  res.end(body);
}

const webServer = http.createServer((req, res) => {
  const url = new URL(req.url || '/', 'http://localhost');
  const route = url.pathname;

  if (route === '/health' || route === '/api/health') {
    return sendHttp(res, 200, 'application/json; charset=utf-8', JSON.stringify({
      ok: true, service: 'SEXOMANIA V11', bot: 'running', timestamp: new Date().toISOString()
    }));
  }

  if (route === '/api/status') {
    return sendHttp(res, 200, 'application/json; charset=utf-8', JSON.stringify({
      ok: true, name: 'SEXOMANIA V11', webapp: true, port: WEB_PORT, timestamp: new Date().toISOString()
    }));
  }

  // La WebApp real se sirve desde el proyecto original SEXOMANIA Links.
  // Render actúa como entrada HTTPS para que Telegram pueda abrirla desde el bot.
  if (route === '/' || route === '/index.html' || route === '/admin.html' || route.startsWith('/Logo.webp')) {
    const target = 'https://sexomania-links.vercel.app' + (route === '/' ? '/' : route);
    res.writeHead(302, { Location: target, 'Cache-Control': 'no-store' });
    return res.end();
  }

  const requested = route;
  const filePath = path.normalize(path.join(WEB_ROOT, requested));
  if (!filePath.startsWith(WEB_ROOT)) return sendHttp(res, 403, 'text/plain; charset=utf-8', 'Forbidden');

  fs.readFile(filePath, (error, data) => {
    if (error) return sendHttp(res, 404, 'text/plain; charset=utf-8', 'Not found');
    const ext = path.extname(filePath);
    const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8' };
    sendHttp(res, 200, types[ext] || 'application/octet-stream', data);
  });
});

webServer.listen(WEB_PORT, '0.0.0.0', () => {
  console.log('🌐 WebApp SEXOMANIA activa en puerto ' + WEB_PORT);
});

const { Telegraf, session, Markup } = require('telegraf');
const { isAdmin } = require('./config/constantes');
const { ensureStoreTopics, sendToStore } = require('./config/telegramStore');

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
    const esNuevo = !snap.exists;
    if (esNuevo) {
      payload.fechaIngreso = new Date();
      payload.creado = new Date();
      payload.chatsRegistrados = 0;
    }
    await ref.set(payload, { merge: true });

    if (esNuevo) {
      const nombre = [user.first_name, user.last_name].filter(Boolean).join(' ') || 'Sin nombre';
      const username = user.username ? '@' + user.username : 'Sin username';
      const mensaje = [
        '👤 <b>NUEVO USUARIO</b>',
        '',
        '🆔 ID: <code>' + user.id + '</code>',
        '👤 Nombre: ' + escapeHtml(nombre),
        '🔗 Username: ' + escapeHtml(username),
        '🌐 Idioma: ' + escapeHtml(user.language_code || 'No indicado'),
        '👑 Admin: ' + (isAdmin(user.id) ? 'Sí' : 'No'),
        '',
        '📅 Ingreso: ' + new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })
      ].join('\\n');

      try {
        await sendToStore(ctx.telegram, 'usuarios', mensaje, { parse_mode: 'HTML' });
      } catch (storeError) {
        console.error('❌ Error enviando usuario al Telegram Store:', storeError.message);
      }
    }
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

function ctxUserMentionSafe(nombre, userId) { return userId ? '<a href="tg://user?id=' + Number(userId) + '">' + escapeHtml(nombre) + '</a>' : escapeHtml(nombre); }

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch]));
}

async function getWelcomeText(nombre, userId) {
  const { db } = require('./config/firebase');
  let template = DEFAULT_WELCOME_TEXT;
  if (db) {
    try {
      const doc = await db.collection('config').doc('bot').get();
      if (doc.exists && doc.data().welcomeText) template = doc.data().welcomeText;
    } catch (error) { console.error('❌ Error leyendo texto de bienvenida:', error.message); }
  }
  const mention = ctxUserMentionSafe(nombre, userId);
  return template.replace(/\{nombre\}/g, escapeHtml(nombre)).replace(/\{mention\}/g, mention);
}

function getWelcomeKeyboard() {
  return Markup.inlineKeyboard([
    [
      { text: '👥 ✚ 𝙂𝙍𝙐𝙋𝙊', url: ADD_GROUP_URL, style: 'danger' },
      { text: '📣 ✚ 𝘾𝘼𝙉𝘼𝙇', url: ADD_CHANNEL_URL, style: 'danger' }
    ],
    [
      { text: '📁 𝘾𝘼𝙏𝙀𝙂𝙊𝙍𝙄𝘼𝙎', callback_data: 'ver_categorias_user', style: 'success' },
      { text: '🗂️ 𝙈𝙄𝙎 𝘾𝙃𝘼𝙏𝙎', callback_data: 'mis_chats', style: 'success' }
    ],
    [
      { text: '🖥️ 𝙋𝘼𝙉𝙀𝙇', web_app: { url: WEBAPP_URL }, style: 'primary' },
      { text: '📢 𝘾𝘼𝙉𝘼𝙇 𝙊𝙁𝙄𝘾𝙄𝘼𝙇', url: OFFICIAL_CHANNEL_URL, style: 'primary' }
    ],
    [
      { text: '💟 𝘽𝙊𝙏𝙊𝙉𝙀𝙍𝘼', url: BOTONERA_URL, style: 'danger' },
      { text: '📝 𝙇𝙄𝙎𝙏𝘼𝙎', url: LISTAS_URL, style: 'danger' }
    ]
  ]);
}

bot.start(async ctx => {
  try {
    await registrarUsuario(ctx);
    const nombre = ctx.from.first_name || 'bebé';
    const foto = await getFotoBienvenida();
    const keyboard = getWelcomeKeyboard();
    const caption = await getWelcomeText(nombre, ctx.from.id);
    if (foto) await ctx.replyWithPhoto(foto, { caption, parse_mode: 'HTML', ...keyboard });
    else await ctx.reply(caption, { parse_mode: 'HTML', reply_markup: keyboard.reply_markup });
  } catch (e) {
    console.error('❌ Error en /start:', e);
    await ctx.reply('🔥 Bienvenid@ a SEXOMANIA.');
  }
});

bot.action('add_group_channel', async ctx => {
  await ctx.editMessageText('👥 ✚ GRUPO / CANAL\n\nSelecciona dónde quieres agregar SEXOMANIA:', Markup.inlineKeyboard([
    [{ text: '👥 AGREGAR A GRUPO', url: ADD_GROUP_URL, style: 'primary' }],
    [{ text: '📣 AGREGAR A CANAL', url: ADD_CHANNEL_URL, style: 'success' }],
    [{ text: '⬅️ VOLVER', callback_data: 'start_menu', style: 'danger' }]
  ]));
  await ctx.answerCbQuery();
});

bot.action('start_menu', async ctx => {
  const nombre = ctx.from?.first_name || 'bebé';
  const foto = await getFotoBienvenida();
  const keyboard = getWelcomeKeyboard();
  const caption = await getWelcomeText(nombre, ctx.from?.id);
  try {
    if (foto) await ctx.editMessageMedia({ type: 'photo', media: foto, caption, parse_mode: 'HTML' }, keyboard);
    else await ctx.editMessageText(caption, { parse_mode: 'HTML', reply_markup: keyboard.reply_markup });
  } catch {
    try { await ctx.reply(caption, { parse_mode: 'HTML', reply_markup: keyboard.reply_markup }); } catch {}
  }
  await ctx.answerCbQuery();
});

bot.command('cancel', async ctx => {
  if (ctx.session) ['esperandoCanal','cambiandoEnlace','cambiandoNombre','adminCategoryAction','publicacion','userAddChat','adminWelcomeText','adminWelcomePhoto'].forEach(k => delete ctx.session[k]);
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
require('./handlers/admin/super')(bot);
require('./handlers/user/menu')(bot);

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

ensureStoreTopics(bot)
  .then(() => bot.launch())
  .then(() => console.log('🔥 SEXOMANIA V11 encendido.'))
  .catch(error => {
    console.error('❌ No se pudo iniciar el bot:', error);
    process.exitCode = 1;
  });

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
