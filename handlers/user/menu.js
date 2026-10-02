const { Markup } = require('telegraf');
const { db } = require('../../config/firebase');
const { getCategorias } = require('../../config/categorias');
const { isAdmin, ESTADOS_CHAT } = require('../../config/constantes');
const { getMenuInline } = require('../../utils/keyboards');

function guardUser(ctx) {
  return Boolean(ctx.from?.id);
}

async function renderUserCategories(ctx, edit = false) {
  const categorias = await getCategorias({ force: true });
  const rows = categorias.map((cat, i) => [
    Markup.button.callback(String(cat), 'user_cat_' + i)
  ]);
  rows.push([Markup.button.callback('⬅️ INICIO', 'user_home')]);
  const text = '📁 CATEGORÍAS\n\nSelecciona una categoría:';
  if (edit) await ctx.editMessageText(text, Markup.inlineKeyboard(rows));
  else await ctx.reply(text, Markup.inlineKeyboard(rows));
}

function setupUserHandler(bot) {
  bot.action('ver_categorias_user', async ctx => {
    if (!guardUser(ctx)) return ctx.answerCbQuery('Sesión no disponible', { show_alert: true });
    await renderUserCategories(ctx, true);
    await ctx.answerCbQuery();
  });

  bot.action(/^user_cat_(\d+)$/, async ctx => {
    if (!guardUser(ctx)) return ctx.answerCbQuery('Sesión no disponible', { show_alert: true });
    if (!db) return ctx.answerCbQuery('Firebase no disponible', { show_alert: true });
    const categorias = await getCategorias();
    const categoria = categorias[Number(ctx.match[1])];
    if (!categoria) return ctx.answerCbQuery('Categoría no encontrada', { show_alert: true });

    const snap = await db.collection('chats')
      .where('categoria', '==', categoria)
      .where('aprobado', '==', true)
      .limit(50)
      .get();

    const rows = [];
    const lines = ['📁 ' + categoria, ''];
    if (snap.empty) {
      lines.push('No hay canales o grupos publicados en esta categoría.');
    } else {
      snap.docs.forEach((doc, i) => {
        const c = doc.data() || {};
        lines.push((i + 1) + '. ' + (c.nombre || 'Sin nombre'));
        if (c.enlace && c.enlace !== 'Sin enlace') {
          rows.push([Markup.button.url('🔗 ' + String(c.nombre || 'Abrir').slice(0, 35), c.enlace)]);
        }
      });
    }
    rows.push([Markup.button.callback('⬅️ CATEGORÍAS', 'ver_categorias_user')]);
    rows.push([Markup.button.callback('🏠 INICIO', 'user_home')]);
    await ctx.editMessageText(lines.join('\n'), Markup.inlineKeyboard(rows));
    await ctx.answerCbQuery();
  });

  bot.action('mis_chats', async ctx => {
    if (!guardUser(ctx)) return ctx.answerCbQuery('Sesión no disponible', { show_alert: true });
    if (!db) return ctx.answerCbQuery('Firebase no disponible', { show_alert: true });

    const snap = await db.collection('chats')
      .where('solicitante', '==', ctx.from.id)
      .limit(50)
      .get();

    const lines = ['🟢 MIS GRUPOS Y CANALES', ''];
    if (snap.empty) {
      lines.push('Todavía no has registrado ningún canal o grupo.');
    } else {
      snap.docs.forEach((doc, i) => {
        const c = doc.data() || {};
        lines.push((i + 1) + '. ' + (c.nombre || doc.id) + ' — ' + (c.estado || 'pendiente'));
      });
    }

    await ctx.editMessageText(lines.join('\n'), Markup.inlineKeyboard([
      [Markup.button.callback('🔵 + AGREGAR', 'agregar_chat')],
      [Markup.button.callback('🏠 INICIO', 'user_home')]
    ]));
    await ctx.answerCbQuery();
  });

  bot.action('agregar_chat', async ctx => {
    if (!guardUser(ctx)) return ctx.answerCbQuery('Sesión no disponible', { show_alert: true });
    ctx.session = ctx.session || {};
    ctx.session.userAddChat = true;
    await ctx.reply('🔵 <b>AGREGAR CANAL O GRUPO</b>\n\nReenvía aquí un mensaje del canal/grupo o escribe su ID (-100...).\n\n/cancel para cancelar.', { parse_mode: 'HTML' });
    await ctx.answerCbQuery();
  });

  bot.action('user_home', async ctx => {
    if (!guardUser(ctx)) return ctx.answerCbQuery('Sesión no disponible', { show_alert: true });
    await ctx.editMessageText('🔥 <b>SEXOMANIA</b> 🔥\n\nSelecciona una opción:', { parse_mode: 'HTML', ...getMenuInline() });
    await ctx.answerCbQuery();
  });

  bot.action(/^user_add_cat_(-?\d+)_(\d+)$/, async ctx => {
    if (!guardUser(ctx)) return ctx.answerCbQuery('Sesión no disponible', { show_alert: true });
    if (!db) return ctx.answerCbQuery('Firebase no disponible', { show_alert: true });

    const chatId = ctx.match[1];
    const categorias = await getCategorias();
    const categoria = categorias[Number(ctx.match[2])];
    if (!categoria) return ctx.answerCbQuery('Categoría no encontrada', { show_alert: true });

    const ref = db.collection('chats').doc(chatId);
    const doc = await ref.get();
    if (!doc.exists || doc.data()?.solicitante !== ctx.from.id) {
      return ctx.answerCbQuery('Registro no encontrado', { show_alert: true });
    }

    await ref.set({
      categoria,
      actualizado: new Date(),
      aprobado: false,
      pendiente: true,
      estado: ESTADOS_CHAT.PENDIENTE
    }, { merge: true });

    if (ctx.session) ctx.session.userAddChat = null;
    await ctx.editMessageText('✅ <b>Solicitud registrada</b>\n\n📁 Categoría: ' + String(categoria).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') + '\n\nUn administrador revisará el canal o grupo.', {
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard([[Markup.button.callback('🏠 INICIO', 'user_home')]])
    });
    await ctx.answerCbQuery('✅ Guardado');
  });

  bot.on('message', async (ctx, next) => {
    if (isAdmin(ctx.from?.id) || !ctx.session?.userAddChat || !ctx.message) return next();

    let chatId = ctx.message.forward_from_chat?.id || ctx.message.forward_origin?.chat?.id;
    if (!chatId && typeof ctx.message.text === 'string' && /^-100\d+$/.test(ctx.message.text.trim())) {
      chatId = Number(ctx.message.text.trim());
    }
    if (!chatId) return ctx.reply('❌ No pude identificar el canal/grupo. Reenvía un mensaje suyo o envía un ID -100...');

    if (!db) return ctx.reply('❌ Base de datos no disponible.');
    try {
      const chat = await ctx.telegram.getChat(chatId);
      const title = chat.title || chat.first_name || 'Sin nombre';
      const username = chat.username || null;
      const enlace = chat.invite_link || (username ? 'https://t.me/' + username : 'Sin enlace');
      const ref = db.collection('chats').doc(String(chatId));
      const existing = await ref.get();

      if (existing.exists && existing.data()?.solicitante && existing.data().solicitante !== ctx.from.id) {
        ctx.session.userAddChat = null;
        return ctx.reply('❌ Ese canal/grupo ya fue registrado por otro usuario.');
      }

      await ref.set({
        id: chatId,
        nombre: title,
        username,
        enlace,
        tipo: chat.type === 'channel' ? 'canal' : 'grupo',
        solicitante: ctx.from.id,
        fechaRegistro: existing.exists ? (existing.data()?.fechaRegistro || new Date()) : new Date(),
        aprobado: false,
        pendiente: true,
        estado: ESTADOS_CHAT.PENDIENTE,
        baneadoAdmin: false,
        autoBaneado: false,
        isPrivate: !username
      }, { merge: true });

      ctx.session.userAddChat = null;
      const categorias = await getCategorias();
      const rows = categorias.map((cat, i) => [
        Markup.button.callback(String(cat), 'user_add_cat_' + chatId + '_' + i)
      ]);
      rows.push([Markup.button.callback('❌ CANCELAR', 'user_home')]);
      return ctx.reply('📺 <b>' + String(title).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</b>\n\nSelecciona la categoría para enviar la solicitud:', {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard(rows)
      });
    } catch (error) {
      console.error('❌ Registro de chat:', error.message);
      return ctx.reply('❌ No pude acceder a ese canal/grupo. Comprueba que el bot pueda verlo.');
    }
  });
}

module.exports = setupUserHandler;
