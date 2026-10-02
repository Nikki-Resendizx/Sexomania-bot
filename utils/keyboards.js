const { Markup } = require('telegraf');

function getDetallesChatKeyboard(chatId) {
  return Markup.inlineKeyboard([
    [Markup.button.callback('🔗 Cambiar enlace', `chat_cambiar_enlace_${chatId}`, { style: 'primary' })],
    [Markup.button.callback('🤖 AutoBan', `chat_autoban_${chatId}`, { style: 'danger' })],
    [Markup.button.callback('✏️ Cambiar nombre', `chat_cambiar_nombre_${chatId}`, { style: 'secondary' })],
    [Markup.button.callback('📁 Cambiar categoría', `chat_cambiar_cat_${chatId}`, { style: 'primary' })],
    [Markup.button.callback('✅ Aprobar pendiente', `chat_aprobar_${chatId}`, { style: 'success' })],
    [Markup.button.callback('⬅️ Volver', 'admin_back')]
  ]);
}

function getDetallesUsuarioKeyboard(userId, banned = false) {
  return Markup.inlineKeyboard([
    [Markup.button.callback(banned ? '✅ Desbanear' : '🚫 Banear', `user_ban_${userId}`, { style: banned ? 'success' : 'danger' }),
     Markup.button.callback('📺 Chats', `user_chats_${userId}`, { style: 'primary' })],
    [Markup.button.url('💬 Hablar con usuario', `tg://user?id=${userId}`)],
    [Markup.button.callback('⬅️ Volver a usuarios', 'adm_lista_users')]
  ]);
}

function getMenuInline() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('🔴 CATEGORÍAS', 'ver_categorias_user', { style: 'danger' })],
    [Markup.button.callback('🟢 MIS GRUPOS', 'mis_chats', { style: 'success' })],
    [Markup.button.callback('🔵 + CANAL O GRUPO', 'agregar_chat', { style: 'primary' })],
    [Markup.button.url('🔴 CANAL OFICIAL', process.env.OFFICIAL_CHANNEL_URL || 'https://t.me/Sexomania_Links')]
  ]);
}

module.exports = { getDetallesChatKeyboard, getDetallesUsuarioKeyboard, getMenuInline };
