require('dotenv').config();
const { Telegraf, session, Markup } = require('telegraf');
const { db } = require('./config/firebase');
const { getChannels } = require('./config/constantes');

const bot = new Telegraf(process.env.BOT_TOKEN || process.env.TOKEN_BOT);
bot.use(session());

const ADMIN_ID = 8695673050;

function detectarFormato(texto) {
  if (/<(b|i|u|code|pre|a href)[^>]*>/i.test(texto)) return 'HTML';
  return 'Markdown';
}
function aplicarVariables(texto, ctx) {
  const nombre = ctx.from.first_name || 'bebé';
  const username = ctx.from.username? '@' + ctx.from.username : nombre;
  const id = ctx.from.id;
  return texto.replace(/{nombre}/gi, nombre).replace(/{username}/gi, username).replace(/{id}/gi, id).replace(/{mencion}/gi, `[${nombre}](tg://user?id=${id})`);
}

// ANTI-FLOOD
const userLastMessage = new Map();
bot.use(async (ctx, next) => {
  if (!ctx.from) return next();
  const now = Date.now();
  const last = userLastMessage.get(ctx.from.id) || 0;
  if (now - last < 1500 && String(ctx.from.id)!== String(ADMIN_ID)) return;
  userLastMessage.set(ctx.from.id, now);
  return next();
});

async function getConfig() {
  try {
    const doc = await db.collection('config').doc('bot').get();
    return doc.exists? doc.data() : {};
  } catch { return {}; }
}

function construirBotones(config) {
  // Formato guardado: [{text: "Mis Chats", callback: "mis_chats"},...]
  if (!config.botones ||!config.botones.length) {
    return Markup.inlineKeyboard([[Markup.button.callback('📂 Mis Chats', 'mis_chats'), Markup.button.callback('📢 Canales', 'canales')]]);
  }
  // Agrupa de 2 en 2
  const rows = [];
  for (let i = 0; i < config.botones.length; i += 2) {
    const row = config.botones.slice(i, i+2).map(b => {
      if (b.url) return Markup.button.url(b.text, b.url);
      return Markup.button.callback(b.text, b.callback || 'nada');
    });
    rows.push(row);
  }
  return Markup.inlineKeyboard(rows);
}

bot.start(async (ctx) => {
  const config = await getConfig();
  const foto = config.welcomePhoto || 'https://i.imgur.com/8Km9tLL.jpg';
  let plantilla = config.welcomeText || `🔥 *Bienvenid@ {nombre} a SEXOMANIA V9 ULTRA* 🔥`;
  let textoFinal = aplicarVariables(plantilla, ctx);
  let formato = config.welcomeMode || detectarFormato(textoFinal);
  await ctx.replyWithPhoto(foto, {
    caption: textoFinal,
    parse_mode: formato,
 ...construirBotones(config)
  });
});

// COMANDOS JEFA
bot.command('setfoto', async (ctx) => {
  if (String(ctx.from.id)!== String(ADMIN_ID)) return;
  let nuevaFoto = ctx.message.reply_to_message?.photo?.pop()?.file_id || ctx.message.text.split(' ')[1];
  if (!nuevaFoto) return ctx.reply('Responde a una foto con /setfoto');
  await db.collection('config').doc('bot').set({ welcomePhoto: nuevaFoto }, { merge: true });
  ctx.reply('✅ Foto cambiada 🔥');
});

bot.command('setbienvenida', async (ctx) => {
  if (String(ctx.from.id)!== String(ADMIN_ID)) return;
  const texto = ctx.message.text.replace('/setbienvenida', '').trim();
  if (!texto) return ctx.reply('Usa: /setbienvenida Hola {nombre} 😈\nVariables: {nombre} {username} {id} {mencion}');
  const modo = detectarFormato(texto);
  await db.collection('config').doc('bot').set({ welcomeText: texto, welcomeMode: modo }, { merge: true });
  ctx.reply(`✅ Bienvenida en ${modo} guardada 🔥`);
});

bot.command('setplantilla', async (ctx) => {
  if (String(ctx.from.id)!== String(ADMIN_ID)) return;
  const texto = ctx.message.text.replace('/setplantilla', '').trim();
  if (!texto) return ctx.reply('Usa: /setplantilla Texto con {nombre}');
  const modo = detectarFormato(texto);
  await db.collection('config').doc('bot').set({ postTemplate: texto, postMode: modo }, { merge: true });
  ctx.reply(`✅ Plantilla guardada en ${modo} 🔥`);
});

// NUEVO: /setboton
bot.command('setboton', async (ctx) => {
  if (String(ctx.from.id)!== String(ADMIN_ID)) return;
  const ejemplo = `Usa así jefa:\n\n/setboton Mis Chats:mis_chats | Canales:canales\n/setboton VIP:https://t.me/tucanal | Ayuda:ayuda\n\nFormato: Texto:callback o Texto:url\nSepara botones con | y filas con ;\nEj: Boton1:cb1 | Boton2:cb2 ; Boton3:cb3`;
  const texto = ctx.message.text.replace('/setboton', '').trim();
  if (!texto) return ctx.reply(ejemplo);

  try {
    const botones = [];
    const filas = texto.split(';');
    for (const fila of filas) {
      const cols = fila.split('|');
      for (const col of cols) {
        const [txt, dest] = col.split(':').map(s=>s.trim());
        if (!txt ||!dest) continue;
        if (dest.startsWith('http')) botones.push({ text: txt, url: dest });
        else botones.push({ text: txt, callback: dest });
      }
    }
    await db.collection('config').doc('bot').set({ botones }, { merge: true });
    ctx.reply('✅ Botones guardados 🔥 Preview:');
    const config = await getConfig();
    await ctx.reply('Botones nuevos 👇', construirBotones({ botones }));
  } catch (e) { ctx.reply('Error: ' + e.message); }
});

bot.command('plantillas', async (ctx) => {
  if (String(ctx.from.id)!== String(ADMIN_ID)) return;
  const c = await getConfig();
  let btnTxt = c.botones? c.botones.map(b=> `${b.text}:${b.url||b.callback}`).join(' | ') : 'Por defecto';
  ctx.reply(`📋 *CONFIG ACTUAL:*\n\n*Bienvenida (${c.welcomeMode||'MD'}):*\n${c.welcomeText||'default'}\n\n*Plantilla Publi (${c.postMode||'MD'}):*\n${c.postTemplate||'no'}\n\n*Botones:* ${btnTxt}`, { parse_mode: 'Markdown' });
});

const canalesHandler = require('./handlers/admin/canales');
if (canalesHandler.configurarControladorDeCanales) {
  bot.use(canalesHandler.configurarControladorDeCanales);
  canalesHandler.configurarControladorDeCanales(bot);
}
require('./handlers/admin/chats')(bot);
require('./handlers/admin/users')(bot);

bot.launch().then(() => console.log('Bot V9 ULTRA DIOS encendido 🔥'));
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
