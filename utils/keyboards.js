const { Markup } = require('telegraf');

// PANEL ADMIN PRINCIPAL - SUPER BOT V9 ULTRA
function getPanelAdminPrincipal() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('👮 ADMINS', 'adm_gestion', { style: 'primary' }),
      Markup.button.callback('📊 STATS', 'adm_stats', { style: 'primary' }),
      Markup.button.callback('📦 BACKUP', 'adm_backup', { style: 'secondary' })
    ],
    [
      Markup.button.callback('📋 G/C', 'admin_gestionar', { style: 'primary' }),
      Markup.button.callback('⏳ PENDIENTES', 'admin_pendientes', { style: 'secondary' }),
      Markup.button.callback('🚫 BANEADOS', 'admin_baneados', { style: 'danger' })
    ],
    [
      Markup.button.callback('👥 USUARIOS', 'adm_lista_users', { style: 'success' }),
      Markup.button.callback('🔍 BUSCAR', 'gestion_buscar', { style: 'secondary' }),
      Markup.button.callback('📣 BROADCAST', 'adm_broadcast', { style: 'danger' })
    ],
    [
      Markup.button.callback('📁 CATEGORIAS', 'admin_cats', { style: 'primary' }),
      Markup.button.callback('💬 BIENVENIDA', 'admin_edit_welcome', { style: 'success' }),
      Markup.button.callback('📝 PLANTILLA', 'admin_edit_template', { style: 'success' })
    ],
    [
      Markup.button.callback('🔘 BOTONERA', 'admin_difusor', { style: 'success' }),
      Markup.button.callback('📝 LISTA', 'dif_crear_lista', { style: 'success' }),
      Markup.button.callback('👁️ BORRADOR', 'dif_ver_borrador', { style: 'secondary' })
    ],
    [Markup.button.callback('📢 PUBLICAR LISTAS', 'publicar_listas_now', { style: 'success' })],
    [
      Markup.button.callback('🔗 ACTUALIZAR', 'actualizar_links_now', { style: 'primary' }),
      Markup.button.callback('💀 CAIDOS', 'revisar_caidos_now', { style: 'danger' }),
      Markup.button.callback('🔍 ROTOS', 'verificar_rotos_now', { style: 'secondary' })
    ],
    [
      Markup.button.callback('⚙️ LOG/ORIGEN/PRIVADO', 'adm_logorigen', { style: 'secondary' }),
      Markup.button.callback('🛡️ AUTOBAN', 'adm_autoban_config', { style: 'danger' })
    ]
  ]);
}

// FOTO 1 - GESTIONAR G/C - 3 BOTONES
function getGestionarKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('📺 1- CANALES', 'gestion_canales', { style: 'primary' })],
    [Markup.button.callback('👥 2- GRUPOS', 'gestion_grupos', { style: 'success' })],
    [Markup.button.callback('🔍 3- BUSCAR C/G', 'gestion_buscar', { style: 'secondary' })],
    [Markup.button.callback('⬅️ VOLVER', 'admin_back')]
  ]);
}

// FOTO 1 - DETALLES CHAT - 5 BOTONES
function getDetallesChatKeyboard(chatId) {
  return Markup.inlineKeyboard([
    [Markup.button.callback('🔗 1- Cambiar enlace', `chat_cambiar_enlace_${chatId}`, { style: 'primary' })],
    [Markup.button.callback('🤖 2- AutoBan Bot', `chat_autoban_${chatId}`, { style: 'danger' })],
    [Markup.button.callback('✏️ 3- Cambiar nombre', `chat_cambiar_nombre_${chatId}`, { style: 'secondary' })],
    [Markup.button.callback('📁 4- Cambiar categoría', `chat_cambiar_cat_${chatId}`, { style: 'primary' })],
    [Markup.button.callback('✅ 5- Aprobar pendiente', `chat_aprobar_${chatId}`, { style: 'success' })],
    [Markup.button.callback('⬅️ Volver', 'admin_gestionar')]
  ]);
}

// FOTO 1 - USUARIOS
function getDetallesUsuarioKeyboard(userId) {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('🚫 Banear/Desbanear', `user_ban_${userId}`, { style: 'danger' }),
      Markup.button.callback('✅ Canales/Grupos', `user_chats_${userId}`, { style: 'success' })
    ],
    [Markup.button.callback('💬 Hablar con usuario', `user_hablar_${userId}`, { style: 'primary' })],
    [Markup.button.callback('⬅️ Volver a usuarios', 'adm_lista_users')]
  ]);
}

function getBusquedaUsuariosKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('1- Buscar admins', 'buscar_admins', { style: 'primary' })],
    [Markup.button.callback('2- Buscar usuario', 'buscar_usuario', { style: 'success' })],
    [Markup.button.callback('3- Usuarios Baneados', 'buscar_baneados', { style: 'danger' })],
    [Markup.button.callback('⬅️ Volver', 'adm_lista_users')]
  ]);
}

// FOTO 2 y 3 - BOTONERA
function getBotoneraDetallesKeyboard(botoneraId) {
  return Markup.inlineKeyboard([
    [Markup.button.callback('🔍 Vista previa', `botonera_preview_${botoneraId}`, { style: 'secondary' }), Markup.button.callback('📋 Suscripciones', `botonera_subs_${botoneraId}`, { style: 'secondary' })],
    [Markup.button.callback('⚙️ Reconfigurar horario', `botonera_horario_${botoneraId}`, { style: 'primary' }), Markup.button.callback('⏪ Retirar botonera', `botonera_retirar_${botoneraId}`, { style: 'danger' })],
    [Markup.button.callback('✏️ Editar botonera', `botonera_editar_${botoneraId}`, { style: 'primary' })],
    [Markup.button.callback('📊 Distribuir', `botonera_distribuir_${botoneraId}`, { style: 'success' })],
    [Markup.button.callback('➕ Agregar canal', `botonera_agregar_canal_${botoneraId}`, { style: 'success' })],
    [Markup.button.callback('🗑️ Eliminar botonera', `botonera_eliminar_${botoneraId}`, { style: 'danger' })],
    [Markup.button.callback('⬅️ Regresar', 'admin_difusor')]
  ]);
}

function getEditarBotoneraKeyboard(botoneraId) {
  return Markup.inlineKeyboard([
    [Markup.button.callback('🔽 Mínimo', `edit_min_${botoneraId}`, { style: 'primary' }), Markup.button.callback('🔼 Máximo', `edit_max_${botoneraId}`, { style: 'primary' })],
    [Markup.button.callback('🏷️ Título', `edit_titulo_${botoneraId}`, { style: 'secondary' }), Markup.button.callback('💬 Descripción', `edit_desc_${botoneraId}`, { style: 'secondary' })],
    [Markup.button.callback('🖼️ Medios', `edit_medios_${botoneraId}`, { style: 'success' }), Markup.button.callback('⌨️ Botones extras', `edit_botones_extra_${botoneraId}`, { style: 'success' })],
    [Markup.button.callback('🎨 Patrón colores', `edit_patron_colores_${botoneraId}`, { style: 'primary' }), Markup.button.callback('🎨 Colores extra', `edit_colores_extra_${botoneraId}`, { style: 'primary' })],
    [Markup.button.callback('🔢 Columnas', `edit_columnas_${botoneraId}`, { style: 'secondary' }), Markup.button.callback('🔗 Tipo enlace', `edit_tipo_enlace_${botoneraId}`, { style: 'secondary' })],
    [Markup.button.callback('⬅️ Regresar', `botonera_detalles_${botoneraId}`)]
  ]);
}

// MENU USUARIO
function getMenuInline() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('🔴 CATEGORIAS', 'ver_categorias_user', { style: 'danger' })],
    [Markup.button.callback('🟢 MIS GRUPOS', 'mis_chats', { style: 'success' })],
    [Markup.button.callback('🔵 + CANAL O GRUPO', 'agregar_chat', { style: 'primary' })],
    [Markup.button.url('🔴 CANAL OFICIAL', 'https://t.me/Sexomania_Links')]
  ]);
}

module.exports = {
  getPanelAdminPrincipal,
  getGestionarKeyboard,
  getDetallesChatKeyboard,
  getDetallesUsuarioKeyboard,
  getBusquedaUsuariosKeyboard,
  getBotoneraDetallesKeyboard,
  getEditarBotoneraKeyboard,
  getMenuInline
};
