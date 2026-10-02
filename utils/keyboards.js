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
    [{ text: '📁 𝘾𝘼𝙏𝙀𝙂𝙊𝙍𝙄𝘼𝙎', callback_data: 'ver_categorias_user', style: 'primary' }],
    [{ text: '👥 ✚ 𝙂𝙍𝙐𝙋𝙊 / 𝘾𝘼𝙉𝘼𝙇', callback_data: 'agregar_chat', style: 'success' }],
    [{ text: '🗂️ 𝙈𝙄𝙎 𝘾𝙃𝘼𝙏𝙎', callback_data: 'mis_chats', style: 'danger' }],
    ...(process.env.WEBAPP_URL ? [[{ text: '🖥️ 𝙎𝙀𝙓𝙊𝙈𝘼𝙉𝙄𝘼 𝙋𝘼𝙉𝙀𝙇', web_app: { url: process.env.WEBAPP_URL }, style: 'primary' }]] : []),
    [{ text: '📢 𝘾𝘼𝙉𝘼𝙇 𝙊𝙁𝙄𝘾𝙄𝘼𝙇', url: process.env.OFFICIAL_CHANNEL_URL || 'https://t.me/Sexomania_Links', style: 'success' }],
    [
      { text: '💟 𝘽𝙊𝙏𝙊𝙉𝙀𝙍𝘼', url: 'http://t.me/SexomaniaLinksBot', style: 'danger' },
      { text: '📝 𝙇𝙄𝙎𝙏𝘼𝙎', url: 'https://t.me/SexomaniaListas_Bot', style: 'danger' }
    ]
  ]);
}

module.exports = { getDetallesChatKeyboard, getDetallesUsuarioKeyboard, getMenuInline };
