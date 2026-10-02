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
    [Markup.button.callback('🔵 📁 𝘾𝘼𝙏𝙀𝙂𝙊𝙍𝙄𝘼𝙎', 'ver_categorias_user')],
    [Markup.button.callback('🟢 👥 ✚ 𝙂𝙍𝙐𝙋𝙊 / 𝘾𝘼𝙉𝘼𝙇', 'agregar_chat')],
    [Markup.button.callback('🔴 🗂️ 𝙈𝙄𝙎 𝘾𝙃𝘼𝙏𝙎', 'mis_chats')],
    ...(process.env.WEBAPP_URL ? [[Markup.button.webApp('🔵 🖥️ 𝙎𝙀𝙓𝙊𝙈𝘼𝙉𝙄𝘼 𝙋𝘼𝙉𝙀𝙇', process.env.WEBAPP_URL)]] : []),
    [Markup.button.url('🟢 📢 𝘾𝘼𝙉𝘼𝙇 𝙊𝙁𝙄𝘾𝙄𝘼𝙇', process.env.OFFICIAL_CHANNEL_URL || 'https://t.me/Sexomania_Links')],
    [Markup.button.url('🔴 💟 𝘽𝙊𝙏𝙊𝙉𝙀𝙍𝘼', 'http://t.me/SexomaniaLinksBot'), Markup.button.url('🔴 📝 𝙇𝙄𝙎𝙏𝘼𝙎', 'https://t.me/SexomaniaListas_Bot')]
  ]);
}

module.exports = { getDetallesChatKeyboard, getDetallesUsuarioKeyboard, getMenuInline };
