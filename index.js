require('dotenv').config();
const { Telegraf, session, Markup } = require('telegraf');
const { db } = require('./config/firebase');

const bot = new Telegraf(process.env.BOT_TOKEN || process.env.TOKEN_BOT);
bot.use(session());

const ADMIN_ID = 8695673050; // TU ID DE JEFA

// ===== DETECTOR DE FORMATO AUTOMÁTICO =====
function detectarFormato(texto) {
  if (/<(b|i|u|code|pre|a href)[^>]*>/i.test(texto)) return 'HTML';
  return 'Markdown';
}
function aplicarVariables(texto, ctx) {
  const nombre = ctx.from.first_name || 'bebé';
  const username = ctx.from.username? '@' + ctx.from.username : nombre;
  const id = ctx.from.id;
  return texto
   .replace(/{nombre}/gi, nombre)
   .replace(/{username}/gi, username)
   .replace(/{id}/gi, id)
   .replace(/{mencion}/gi, `[${nombre}](tg://user?id=${id})`);
}

// ===== ANTI-FLOOD ANTI-SPAM PARA QUE NO TE LO BAJE TELEGRAM =====
const userLastMessage = new Map();
bot.use(async (ctx, next) => {
  if (!ctx.from) return next();
  const now = Date.now();
  const last = userLastMessage.get(ctx.from.id) || 0;
  if (now - last < 1500 && String(ctx.from.id)!== String(ADMIN_ID)) return;
  userLastMessage.set(ctx.from.id, now);
  return next();
});

// ===== FIREBASE CONFIG =====
async function getConfig() {
  try {
    const doc = await db.collection('config').doc('bot').get();
    return doc.exists? doc.data() : {};
  } catch { return {}; }
}

function construirBotones(config) {
  if (!config.botones ||!config.botones.length) {
    return Markup.inlineKeyboard([
      [Markup.button.callback('📂 Mis Chats', 'mis_chats'), Markup.button.callback('📢 Canales', 'canales')]
    ]);
  }
  const rows = [];
  for (let i = 0; i < config.botones.length; i += 2) {
    const row = config.botones.slice(i, i + 2).map(b => {
      if (b.url) return Markup.button.url(b.text, b.url);
      return Markup.button.callback(b.text, b.callback || 'nada');
    });
    rows.push(row);
  }
  return Markup.inlineKeyboard(rows);
}

// ===== /START =====
bot.start(async (ctx) => {
  const config = await getConfig();
  const foto = config.welcomePhoto || 'https://i.imgur.com/8Km9tLL.jpg';
  let plantilla = config.welcomeText || `🔥 *Bienvenid@ {nombre} a SEXOMANIA V9 ULTRA* 🔥\n\n😈 El bot más cochino de Telegram 😈`;
  let textoFinal = aplicarVariables(plantilla, ctx);
  let formato = config.welcomeMode || detectarFormato(textoFinal);

  await ctx.replyWithPhoto(foto, {
    caption: textoFinal,
    parse_mode: formato,
   ...construirBotones(config)
  });
});

// ===== COMANDOS DE JEFA =====
bot.command('setfoto', async (ctx) => {
  if (String(ctx.from.id)!== String(ADMIN_ID)) return;
  let nuevaFoto = ctx.message.reply_to_message?.photo?.pop()?.file_id || ctx.message.text.split(' ')[1];
  if (!nuevaFoto) return ctx.reply('Manda una foto y respóndele con /setfoto jefa');
  await db.collection('config').doc('bot').set({ welcomePhoto: nuevaFoto }, { merge: true });
  ctx.reply('✅ Foto cambiada 🔥');
});

bot.command('setbienvenida', async (ctx) => {
  if (String(ctx.from.id)!== String(ADMIN_ID)) return;
  const texto = ctx.message.text.replace('/setbienvenida', '').trim();
  if (!texto) return ctx.reply('Usa: /setbienvenida Hola {nombre} 😈 Variables: {nombre} {username} {id} {mencion}');
  const modo = detectarFormato(texto);
  await db.collection('config').doc('bot').set({ welcomeText: texto, welcomeMode: modo }, { merge: true });
  ctx.reply(`✅ Bienvenida guardada en ${modo} 🔥`);
});

bot.command('setplantilla', async (ctx) => {
  if (String(ctx.from.id)!== String(ADMIN_ID)) return;
  const texto = ctx.message.text.replace('/setplantilla', '').trim();
  if (!texto) return ctx.reply('Usa: /setplantilla Texto con {nombre}');
  const modo = detectarFormato(texto);
  await db.collection('config').doc('bot').set({ postTemplate: texto, postMode: modo }, { merge: true });
  ctx.reply(`✅ Plantilla guardada en ${modo} 🔥`);
});

bot.command('setboton', async (ctx) => {
  if (String(ctx.from.id)!== String(ADMIN_ID)) return;
  const texto = ctx.message.text.replace('/setboton', '').trim();
  if (!texto) return ctx.reply('Ejemplo: /setboton Mis Chats:mis_chats | Canales:canales ; VIP:https://t.me/tucanal');
  const botones = [];
  const filas = texto.split(';');
  for (const fila of filas) {
    const cols = fila.split('|');
    for (const col of cols) {
      const [txt, dest] = col.split(':').map(s => s.trim());
      if (!txt ||!dest) continue;
      if (dest.startsWith('http')) botones.push({ text: txt, url: dest });
      else botones.push({ text: txt, callback: dest });
    }
  }
  await db.collection('config').doc('bot').set({ botones }, { merge: true });
  ctx.reply('✅ Botones guardados 🔥', construirBotones({ botones }));
});

bot.command('plantillas', async (ctx) => {
  if (String(ctx.from.id)!== String(ADMIN_ID)) return;
  const c = await getConfig();
  ctx.reply(`📋 Config:\nBienvenida: ${c.welcomeText||'default'}\nBotones: ${c.botones?.length||0}`, { parse_mode: 'Markdown' });
});

// HANDLERS
try {
  const canalesHandler = require('./handlers/admin/canales');
  if (canalesHandler.configurarControladorDeCanales) {
    canalesHandler.configurarControladorDeCanales(bot);
  }
} catch {}
try { require('./handlers/admin/chats')(bot); } catch {}
try { require('./handlers/admin/users')(bot); } catch {}

// ===== FIX PARA EL ERROR 409 QUE TE SALIO EN LA CAPTURA =====
bot.launch({
  dropPendingUpdates: true, // Borra mensajes pendientes que causan conflicto
  allowedUpdates: ['message', 'callback_query']
}).then(() => console.log('Bot V9 ULTRA DIOS encendido sin conflicto 409 🔥'));

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
