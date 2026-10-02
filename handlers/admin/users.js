const { db } = require('../../config/firebase');
const { extraerInfoUsuario } = require('../../utils/extractor');
const { getDetallesUsuarioKeyboard } = require('../../utils/keyboards');
const { ESTADOS_USUARIO, isAdmin } = require('../../config/constantes');
const { Markup } = require('telegraf');

function setupUsersHandler(bot) {
  const guard = ctx => isAdmin(ctx.from?.id);

  bot.command('infouser', async ctx => {
    if (!guard(ctx)) return ctx.reply('⛔ Solo administradores.');
    if (!db) return ctx.reply('❌ Base de datos no configurada.');

    const args = (ctx.message.text || '').trim().split(/\s+/);
    let userId = args[1];
    if (ctx.message.reply_to_message?.from?.id) userId = ctx.message.reply_to_message.from.id;
    if (!userId) return ctx.reply('Uso: /infouser <ID usuario> o responde a un mensaje del usuario.');

    const doc = await db.collection('usuarios').doc(String(userId)).get();
    if (!doc.exists) return ctx.reply('❌ Usuario no encontrado.');

    const userDB = doc.data() || {};
    const info = await extraerInfoUsuario(ctx, userId, userDB);
    if (!info) return ctx.reply('❌ No pude obtener la información del usuario.');

    const texto =
      '**👤 INFORMACIÓN DE USUARIO**\n\n' +
      '📝 Nombre: ' + info.nombre + '\n' +
      '🆔 ID: \`' + info.id + '\`\n' +
      '👤 Usuario: ' + info.username + '\n' +
      '📖 Bio: ' + String(info.biografia || 'Sin biografía').substring(0, 400) + '\n' +
      '📅 Ingreso: ' + info.fechaIngreso + '\n' +
      '⚙️ Estado: ' + info.estado + '\n' +
      '📦 Chats registrados: ' + info.numChats + '\n' +
      '👮 Admin: ' + (info.esAdmin ? 'Sí' : 'No');

    await ctx.reply(texto, { parse_mode: 'Markdown', ...getDetallesUsuarioKeyboard(userId, !!userDB.baneado) });
  });

  bot.action(/^user_ban_(\d+)$/, async ctx => {
    if (!guard(ctx)) return ctx.answerCbQuery('⛔ Sin permiso', { show_alert: true });
    if (!db) return ctx.answerCbQuery('Firebase no disponible', { show_alert: true });
    const userId = ctx.match[1];
    const ref = db.collection('usuarios').doc(userId);
    const doc = await ref.get();
    if (!doc.exists) return ctx.answerCbQuery('Usuario no encontrado', { show_alert: true });

    const banned = !Boolean(doc.data()?.baneado);
    await ref.set({
      baneado: banned,
      estado: banned ? ESTADOS_USUARIO.BANEADO : ESTADOS_USUARIO.ACTIVO,
      actualizado: new Date()
    }, { merge: true });

    await ctx.answerCbQuery(banned ? '🚫 Usuario baneado' : '✅ Usuario desbaneado');
    await ctx.editMessageReplyMarkup(getDetallesUsuarioKeyboard(userId, banned).reply_markup);
  });

  bot.action(/^user_chats_(\d+)$/, async ctx => {
    if (!guard(ctx)) return ctx.answerCbQuery('⛔ Sin permiso', { show_alert: true });
    if (!db) return ctx.answerCbQuery('Firebase no disponible', { show_alert: true });
    const userId = ctx.match[1];
    const snap = await db.collection('chats').where('solicitante', '==', Number(userId)).limit(50).get();
    const lines = ['📺 CHATS DEL USUARIO', '', '🆔 Usuario: ' + userId, ''];
    if (snap.empty) lines.push('No hay canales o grupos registrados.');
    else snap.docs.forEach((d, i) => {
      const c = d.data() || {};
      lines.push((i + 1) + '. ' + (c.nombre || d.id) + ' — ' + (c.estado || 'sin estado'));
    });

    await ctx.editMessageText(lines.join('\n'), Markup.inlineKeyboard([
      [Markup.button.callback('⬅️ VOLVER', 'admin_user_' + userId)]
    ]));
    await ctx.answerCbQuery();
  });

  bot.on('message', async (ctx, next) => {
    if (!guard(ctx) || !ctx.session || !ctx.message) return next();

    if (ctx.session.cambiandoEnlace) {
      if (typeof ctx.message.text !== 'string' || !ctx.message.text.trim()) {
        return ctx.reply('❌ Envíame un enlace válido o usa /cancel.');
      }
      if (!db) return ctx.reply('❌ Base de datos no disponible.');
      const chatId = ctx.session.cambiandoEnlace;
      await db.collection('chats').doc(chatId).set({
        enlace: ctx.message.text.trim(),
        actualizado: new Date()
      }, { merge: true });
      ctx.session.cambiandoEnlace = null;
      return ctx.reply('✅ Enlace de \`' + chatId + '\` actualizado.', { parse_mode: 'Markdown' });
    }

    if (ctx.session.cambiandoNombre) {
      if (typeof ctx.message.text !== 'string' || !ctx.message.text.trim()) {
        return ctx.reply('❌ Envíame un nombre válido o usa /cancel.');
      }
      if (!db) return ctx.reply('❌ Base de datos no disponible.');
      const chatId = ctx.session.cambiandoNombre;
      await db.collection('chats').doc(chatId).set({
        nombre: ctx.message.text.trim(),
        actualizado: new Date()
      }, { merge: true });
      ctx.session.cambiandoNombre = null;
      return ctx.reply('✅ Nombre de \`' + chatId + '\` actualizado.', { parse_mode: 'Markdown' });
    }

    return next();
  });
}

module.exports = setupUsersHandler;
