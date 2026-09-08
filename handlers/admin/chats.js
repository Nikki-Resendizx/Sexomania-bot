const { Markup } = require('telegraf');
const { db } = require('../../config/firebase');
const { extraerInfoChat } = require('../../utils/extractor');
const { getDetallesChatKeyboard } = require('../../utils/keyboards');
const { ESTADOS_CHAT } = require('../../config/constantes');

function setupChatsHandler(bot) {

  // /info chat
  bot.command('info', async (ctx) => {
    let args = ctx.message.text.split(' ');
    if (args.length < 2) return ctx.reply('Uso: /info <ID del chat>');
    let chatId = args[1];
    let doc = await db.collection('chats').doc(chatId).get();
    if (!doc.exists) return ctx.reply('❌ Chat no encontrado en DB');

    let data = doc.data();
    let infoExtra = await extraerInfoChat(ctx, chatId, data.solicitante);

    let texto = `**📋 INFORMACIÓN DEL CHAT**\n\n`+
      `🖼️ Foto: ${infoExtra?.foto? 'Sí' : 'No'}\n`+
      `📝 Nombre: ${infoExtra?.nombre || data.nombre}\n`+
      `📖 Biografía: ${(infoExtra?.biografia || data.descripcion || 'Sin bio').substring(0,300)}\n`+
      `🆔 ID: \`${chatId}\`\n`+
      `📁 Categoría: ${data.categoria || 'Sin categoría'}\n`+
      `🔗 Tipo: ${data.tipo || infoExtra?.tipo}\n`+
      `👥 Miembros: ${infoExtra?.miembros || data.miembros || 0}\n`+
      `👤 Solicitante: \`${data.solicitante}\`\n`+
      `📅 Registro: ${data.fechaRegistro?.toDate?.() || data.fechaRegistro}\n`+
      `✅ Estado: ${data.estado || (data.aprobado? 'aprobado' : 'pendiente')}\n\n`+
      `🔗 Enlace: ${data.enlace}\n\n`+
      `📊 Estados: baneado:${data.baneadoAdmin} auto:${data.autoBaneado} botExp:${data.botExpulsado} expulsadoSolic:${data.expulsadoSolicitante} privado:${data.isPrivate || false}`;

    await ctx.reply(texto, { parse_mode: 'Markdown',...getDetallesChatKeyboard(chatId) });
  });

  // Detalle con 5 botones - 1 Cambiar enlace, 2 AutoBan, 3 Cambiar nombre, 4 Cambiar cat, 5 Aprobar
  bot.action(/chat_cambiar_enlace_(.+)/, async (ctx) => {
    let chatId = ctx.match[1];
    ctx.session = ctx.session || {};
    ctx.session.cambiandoEnlace = chatId;
    await ctx.reply(`🔗 Envíame el nuevo enlace para \`${chatId}\``, { parse_mode: 'Markdown' });
    await ctx.answerCbQuery();
  });

  bot.action(/chat_cambiar_nombre_(.+)/, async (ctx) => {
    let chatId = ctx.match[1];
    ctx.session = ctx.session || {};
    ctx.session.cambiandoNombre = chatId;
    await ctx.reply(`✏️ Envíame el nuevo nombre para \`${chatId}\``);
    await ctx.answerCbQuery();
  });

  bot.action(/chat_cambiar_cat_(.+)/, async (ctx) => {
    let chatId = ctx.match[1];
    let snap = await db.collection('config').doc('categorias').get();
    let cats = snap.exists? snap.data().lista : [];
    if (!cats.length) return ctx.answerCbQuery('No hay categorías', true);

    let botones = cats.map(c => [Markup.button.callback(c, `set_cat_${chatId}_${c}`)]);
    botones.push([Markup.button.callback('⬅️ Volver', `detalles_chat_${chatId}`)]);
    await ctx.editMessageReplyMarkup({ inline_keyboard: botones });
    await ctx.answerCbQuery();
  });

  bot.action(/set_cat_(.+)_(.+)/, async (ctx) => {
    let chatId = ctx.match[1];
    let cat = ctx.match[2];
    await db.collection('chats').doc(chatId).update({ categoria: cat });
    await ctx.answerCbQuery(`Categoría cambiada a ${cat}`);
    let doc = await db.collection('chats').doc(chatId).get();
    await ctx.reply(`✅ Categoría actualizada: ${cat}`, getDetallesChatKeyboard(chatId));
  });

  bot.action(/chat_autoban_(.+)/, async (ctx) => {
    let chatId = ctx.match[1];
    await db.collection('chats').doc(chatId).update({ autoBaneado: true, baneadoAdmin: true, estado: ESTADOS_CHAT.BANEADO });
    await ctx.answerCbQuery('🚫 AutoBan activado');
    await ctx.reply(`🚫 Chat \`${chatId}\` baneado por AutoBan`, { parse_mode: 'Markdown' });
  });

  bot.action(/chat_aprobar_(.+)/, async (ctx) => {
    let chatId = ctx.match[1];
    let info = await extraerInfoChat(ctx, chatId);
    let update = {
      aprobado: true,
      pendiente: false,
      estado: ESTADOS_CHAT.APROBADO,
      baneadoAdmin: false,
      autoBaneado: false,
      isPrivate: info?.isPrivate? false : false
    };

    // Si era privado y se aprueba, ya deja de ser privado
    if (info) {
      update.nombre = info.nombre;
      update.miembros = info.miembros;
      update.enlace = info.enlace;
    }

    await db.collection('chats').doc(chatId).update(update);
    await ctx.answerCbQuery('✅ Aprobado');
    await ctx.reply(`✅ Chat \`${chatId}\` aprobado y publicado`, { parse_mode: 'Markdown',...getDetallesChatKeyboard(chatId) });
  });

  bot.action(/detalles_chat_(.+)/, async (ctx) => {
    let chatId = ctx.match[1];
    let doc = await db.collection('chats').doc(chatId).get();
    if (!doc.exists) return ctx.answerCbQuery('No existe');
    let data = doc.data();
    await ctx.editMessageText(`Chat: ${data.nombre}\nID: ${chatId}\nEstado: ${data.estado}`, getDetallesChatKeyboard(chatId));
  });
}

module.exports = setupChatsHandler;
