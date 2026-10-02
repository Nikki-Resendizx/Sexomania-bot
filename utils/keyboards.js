const { Markup } = require('telegraf');

function getDetallesChatKeyboard(chatId) {
  return Markup.inlineKeyboard([
    [Markup.button.callback('🔗 Cambiar enlace', `chat_cambiar_enlace_${chatId}`)],
    [Markup.button.callback('🤖 AutoBan', `chat_autoban_${chatId}`)],
    [Markup.button.callback('✏️ Cambiar nombre', `chat_cambiar_nombre_${chatId}`)],
    [Markup.button.callback('📁 Cambiar categoría', `chat_cambiar_cat_${chatId}`)],
    [Markup.button.callback('✅ Aprobar pendiente', `chat_aprobar_${chatId}`)],
    [Markup.button.callback('⬅️ Volver', 'admin_back')]
  ]);
}

function getDetallesUsuarioKeyboard(userId, banned = false) {
  return Markup.inlineKeyboard([
    [Markup.button.callback(banned ? '✅ Desbanear' : '🚫 Banear', `user_ban_${userId}`, { style: banned ? 'success' : 'danger' }),
     Markup.button.callback('📺 Chats', `user_chats_${userId}`)],
    [Markup.button.url('💬 Hablar con usuario', `tg://user?id=${userId}`)],
    [Markup.button.callback('⬅️ Volver a usuarios', 'adm_lista_users')]
  ]);
}

function getMenuInline() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('🔵 CATEGORÍAS', 'ver_categorias_user')],
    [Markup.button.callback('🟢 + GRUPO / CANAL', 'agregar_chat')],
    [Markup.button.callback('🔴 MIS CHATS AGG', 'mis_chats')],
    ...(process.env.WEBAPP_URL ? [[Markup.button.webApp('🔵 WEBAPP', process.env.WEBAPP_URL)]] : []),
    [Markup.button.url('🟢 CANAL OFICIAL', process.env.OFFICIAL_CHANNEL_URL || 'https://t.me/Sexomania_Links')],
    [Markup.button.url('🔴 BOTONERA', 'http://t.me/SexomaniaLinksBot'), Markup.button.url('🔴 LISTAS', 'https://t.me/SexomaniaListas_Bot')]
  ]);
}

module.exports = { getDetallesChatKeyboard, getDetallesUsuarioKeyboard, getMenuInline };
