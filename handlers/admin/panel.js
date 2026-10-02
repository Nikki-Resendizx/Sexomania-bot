const { Markup } = require('telegraf');
const { db, isFirebaseReady } = require('../../config/firebase');
const { isAdmin, ADMIN_IDS, CACHE_CANALES } = require('../../config/constantes');
const { getCategorias, agregarCategoria, editarCategoria, eliminarCategoria, moverCategoria, limpiarCacheCategorias } = require('../../config/categorias');
const { sendToStore } = require('../../config/telegramStore');

const guard = ctx => isAdmin(ctx.from && ctx.from.id);
const panelKeyboard = () => Markup.inlineKeyboard([
  [Markup.button.callback('👋 BIENVENIDA', 'adm_welcome'), Markup.button.callback('📁 CATEGORÍAS', 'admin_cats_menu')],
  [Markup.button.callback('💬 CHATS', 'adm_chats_menu'), Markup.button.callback('👥 USUARIOS', 'adm_users_menu')],
  [Markup.button.callback('📢 PUBLICACIONES', 'adm_publicaciones_menu'), Markup.button.callback('📝 LISTAS', 'adm_lists_menu')],
  [Markup.button.callback('🔘 BOTONERA', 'adm_button_menu'), Markup.button.callback('🤖 BOT', 'adm_bot_menu')],
  [Markup.button.callback('👑 ADMINISTRADORES', 'adm_admins_menu'), Markup.button.callback('📊 ESTADÍSTICAS', 'super_stats')],
  [Markup.button.callback('🗄️ ALMACENAMIENTO', 'adm_storage_menu'), Markup.button.callback('🧰 HERRAMIENTAS', 'adm_tools_menu')],
  [Markup.button.callback('❌ CERRAR', 'adm_close')]
]);

const sectionKeyboard = (rows) => Markup.inlineKeyboard([
  ...rows,
  [Markup.button.callback('⬅️ VOLVER', 'admin_back')]
]);

function setupCategories(bot) {
  bot.action('admin_cats', async ctx => {
    if (!guard(ctx)) return ctx.answerCbQuery('⛔ Sin permiso', { show_alert: true });
    const lista = await getCategorias({ force: true });
    const rows = lista.map((cat, i) => [
      Markup.button.callback('✏️ ' + String(cat).slice(0, 25), 'cat_edit_' + i),
      Markup.button.callback('🗑️', 'cat_del_' + i),
      Markup.button.callback('⬆️', 'cat_up_' + i),
      Markup.button.callback('⬇️', 'cat_down_' + i)
    ]);
    rows.push([Markup.button.callback('➕ AGREGAR', 'cat_add')]);
    rows.push([Markup.button.callback('⬅️ VOLVER', 'admin_back')]);
    await ctx.editMessageText('📁 CATEGORÍAS\n\n' + lista.map((c, i) => (i + 1) + '. ' + c).join('\n'), Markup.inlineKeyboard(rows));
    await ctx.answerCbQuery();
  });

  bot.action(/^cat_edit_(\d+)$/, async ctx => {
    if (!guard(ctx)) return ctx.answerCbQuery('⛔ Sin permiso', { show_alert: true });
    const i = Number(ctx.match[1]), lista = await getCategorias();
    if (!lista[i]) return ctx.answerCbQuery('Categoría no encontrada', { show_alert: true });
    ctx.session = ctx.session || {};
    ctx.session.adminCategoryAction = 'edit:' + i;
    await ctx.reply('✏️ Escribe el nuevo nombre para:\n' + lista[i] + '\n\n/cancel para cancelar.');
    await ctx.answerCbQuery();
  });

  bot.action('cat_add', async ctx => {
    if (!guard(ctx)) return ctx.answerCbQuery('⛔ Sin permiso', { show_alert: true });
    ctx.session = ctx.session || {};
    ctx.session.adminCategoryAction = 'add';
    await ctx.reply('➕ Escribe el nombre de la nueva categoría.\n\n/cancel para cancelar.');
    await ctx.answerCbQuery();
  });

  bot.action(/^cat_del_(\d+)$/, async ctx => {
    if (!guard(ctx)) return ctx.answerCbQuery('⛔ Sin permiso', { show_alert: true });
    try {
      await eliminarCategoria(Number(ctx.match[1]));
      await ctx.answerCbQuery('✅ Categoría eliminada');
      await ctx.editMessageText('✅ Categoría eliminada.', Markup.inlineKeyboard([
        [Markup.button.callback('📁 VER CATEGORÍAS', 'admin_cats')],
        [Markup.button.callback('⬅️ VOLVER', 'admin_back')]
      ]));
    } catch (e) { await ctx.answerCbQuery(e.message, { show_alert: true }); }
  });

  bot.action(/^cat_up_(\d+)$/, async ctx => {
    if (!guard(ctx)) return ctx.answerCbQuery('⛔ Sin permiso', { show_alert: true });
    await moverCategoria(Number(ctx.match[1]), -1);
    await ctx.answerCbQuery('✅ Orden actualizado');
    await ctx.editMessageText('🔄 Orden actualizado.', Markup.inlineKeyboard([
      [Markup.button.callback('📁 VER CATEGORÍAS', 'admin_cats')],
      [Markup.button.callback('⬅️ VOLVER', 'admin_back')]
    ]));
  });

  bot.action(/^cat_down_(\d+)$/, async ctx => {
    if (!guard(ctx)) return ctx.answerCbQuery('⛔ Sin permiso', { show_alert: true });
    await moverCategoria(Number(ctx.match[1]), 1);
    await ctx.answerCbQuery('✅ Orden actualizado');
    await ctx.editMessageText('🔄 Orden actualizado.', Markup.inlineKeyboard([
      [Markup.button.callback('📁 VER CATEGORÍAS', 'admin_cats')],
      [Markup.button.callback('⬅️ VOLVER', 'admin_back')]
    ]));
  });

  bot.on('message', async (ctx, next) => {
    if (!guard(ctx) || !ctx.session || !ctx.session.adminCategoryAction || !ctx.message || !ctx.message.text) return next();
    const action = ctx.session.adminCategoryAction, value = ctx.message.text.trim();
    if (!value || value.startsWith('/')) return next();
    try {
      if (action === 'add') await agregarCategoria(value);
      else if (action.startsWith('edit:')) await editarCategoria(Number(action.split(':')[1]), value);
      ctx.session.adminCategoryAction = null;
      await ctx.reply('✅ Categoría guardada: ' + value);
    } catch (e) { await ctx.reply('❌ ' + e.message); }
  });
}


function setupAdminNavigation(bot) {
  const menu = (id, title, rows) => {
    bot.action(id, async ctx => {
      if (!guard(ctx)) return ctx.answerCbQuery('⛔ Sin permiso', { show_alert: true });
      await ctx.editMessageText(title, sectionKeyboard(rows));
      await ctx.answerCbQuery();
    });
  };

  menu('admin_cats_menu', '📁 CATEGORÍAS\\n\\nGestiona las categorías y su orden.', [
    [Markup.button.callback('📋 VER / EDITAR', 'admin_cats')],
    [Markup.button.callback('➕ AGREGAR', 'cat_add')]
  ]);

  menu('adm_chats_menu', '💬 CHATS\\n\\nGestiona grupos y canales.', [
    [Markup.button.callback('📺 CANALES / LOG / ORIGEN', 'adm_logorigen')],
    [Markup.button.callback('📋 LISTA G/C', 'super_chats')],
    [Markup.button.callback('⏳ PENDIENTES', 'super_pending')],
    [Markup.button.callback('🚫 CAÍDOS / DESACTIVADOS', 'super_banned_chats')]
  ]);

  menu('adm_users_menu', '👥 USUARIOS\\n\\nUsuarios, búsqueda y comunicación.', [
    [Markup.button.callback('📋 LISTA DE USUARIOS', 'super_users')],
    [Markup.button.callback('🔍 BUSCAR', 'super_user_search')],
    [Markup.button.callback('🚫 BANEADOS', 'super_banned')],
    [Markup.button.callback('📢 BROADCAST', 'super_broadcast')]
  ]);

  menu('adm_publicaciones_menu', '📢 PUBLICACIONES\\n\\nContenido publicado y gestión.', [
    [Markup.button.callback('📢 GESTIONAR PUBLICACIONES', 'admin_publicaciones')],
    [Markup.button.callback('👁️ BORRADORES', 'dif_ver_borrador')]
  ]);

  menu('adm_lists_menu', '📝 LISTAS\\n\\nCreación, revisión y publicación.', [
    [Markup.button.callback('📝 CREAR / EDITAR LISTA', 'dif_crear_lista')],
    [Markup.button.callback('👁️ VISTA PREVIA', 'dif_ver_borrador')],
    [Markup.button.callback('📢 PUBLICAR LISTAS', 'publicar_listas_now')]
  ]);

  menu('adm_button_menu', '🔘 BOTONERA\\n\\nConfiguración de botones y estilos.', [
    [Markup.button.callback('⚙️ CONFIGURAR BOTONERA', 'admin_difusor')],
    [Markup.button.callback('👁️ VISTA PREVIA', 'dif_ver_borrador')]
  ]);

  menu('adm_bot_menu', '🤖 BOT\\n\\nConfiguración general del bot.', [
    [Markup.button.callback('👋 BIENVENIDA', 'adm_welcome')],
    [Markup.button.callback('⚙️ CONFIGURACIÓN', 'adm_config')],
    [Markup.button.callback('🩺 DIAGNÓSTICO', 'adm_diagnostic')]
  ]);

  menu('adm_admins_menu', '👑 ADMINISTRADORES\\n\\nControl de administradores y permisos.', [
    [Markup.button.callback('👮 GESTIÓN DE ADMINS', 'super_admins')],
    [Markup.button.callback('🔐 PERMISOS', 'super_admins')]
  ]);

  menu('adm_storage_menu', '🗄️ ALMACENAMIENTO\\n\\nCaché, respaldo y estado de datos.', [
    [Markup.button.callback('🧹 LIMPIAR CACHÉ', 'adm_cache_clear')],
    [Markup.button.callback('📦 BACKUP', 'super_backup')],
    [Markup.button.callback('🩺 ESTADO / DIAGNÓSTICO', 'adm_diagnostic')]
  ]);

  menu('adm_tools_menu', '🧰 HERRAMIENTAS\\n\\nOperaciones de mantenimiento y verificación.', [
    [Markup.button.callback('🔍 BUSCAR', 'super_user_search')],
    [Markup.button.callback('🔗 ACTUALIZAR ENLACES', 'actualizar_links_now')],
    [Markup.button.callback('💀 REVISAR CAÍDOS', 'revisar_caidos_now')],
    [Markup.button.callback('🔍 VERIFICAR ROTOS', 'super_verify_links')],
    [Markup.button.callback('🛡️ SEGURIDAD', 'super_security')],
    [Markup.button.callback('🧹 MANTENIMIENTO', 'adm_maintenance')]
  ]);
}

function register(bot) {
  setupAdminNavigation(bot);
  bot.command('admin', async ctx => {
    if (!guard(ctx)) return ctx.reply('⛔ Solo administradores.');
    await ctx.reply('⚙️ PANEL DE ADMINISTRACIÓN\n\nSelecciona un módulo:', panelKeyboard());
  });
  bot.action('admin_back', async ctx => {
    if (!guard(ctx)) return ctx.answerCbQuery('⛔ Sin permiso', { show_alert: true });
    await ctx.editMessageText('⚙️ PANEL DE ADMINISTRACIÓN\n\nSelecciona un módulo:', panelKeyboard());
    await ctx.answerCbQuery();
  });
  bot.action('adm_close', async ctx => {
    if (!guard(ctx)) return ctx.answerCbQuery('⛔ Sin permiso', { show_alert: true });
    try { await ctx.deleteMessage(); } catch { await ctx.editMessageText('✅ Panel cerrado.'); }
    await ctx.answerCbQuery();
  });
  bot.action('adm_gestion', async ctx => {
    if (!guard(ctx)) return ctx.answerCbQuery('⛔ Sin permiso', { show_alert: true });
    await ctx.editMessageText('👮 ADMINISTRADORES\n\nIDs configurados en ADMIN_IDS:\n' + (ADMIN_IDS.join(', ') || 'Ninguno'),
      Markup.inlineKeyboard([[Markup.button.callback('⬅️ VOLVER', 'admin_back')]]));
    await ctx.answerCbQuery();
  });
  bot.action('adm_stats', async ctx => {
    if (!guard(ctx)) return ctx.answerCbQuery('⛔ Sin permiso', { show_alert: true });
    if (!db) return ctx.answerCbQuery('Firebase no disponible', { show_alert: true });
    const count = async name => {
      try { return (await db.collection(name).count().get()).data().count || 0; }
      catch { return (await db.collection(name).get()).size; }
    };
    const r = await Promise.all([count('usuarios'), count('chats'), count('publicaciones')]);
    const categorias = (await getCategorias()).length;
    await ctx.editMessageText('📊 ESTADÍSTICAS\n\n👥 Usuarios: ' + r[0] + '\n📺 Canales / grupos: ' + r[1] + '\n📢 Publicaciones: ' + r[2] + '\n📁 Categorías: ' + categorias,
      Markup.inlineKeyboard([[Markup.button.callback('🔄 ACTUALIZAR', 'adm_stats')],[Markup.button.callback('⬅️ VOLVER', 'admin_back')]]));
    await ctx.answerCbQuery();
  });
  bot.action('adm_lista_users', async ctx => {
    if (!guard(ctx)) return ctx.answerCbQuery('⛔ Sin permiso', { show_alert: true });
    if (!db) return ctx.answerCbQuery('Firebase no disponible', { show_alert: true });
    const snap = await db.collection('usuarios').limit(50).get();
    const rows = snap.docs.map(doc => {
      const u = doc.data() || {};
      return [Markup.button.callback('👤 ' + String(u.first_name || u.username || doc.id).slice(0, 30), 'admin_user_' + doc.id)];
    });
    rows.push([Markup.button.callback('⬅️ VOLVER', 'admin_back')]);
    await ctx.editMessageText('👥 USUARIOS\n\n' + (snap.empty ? 'No hay usuarios registrados.' : 'Mostrando hasta 50 usuarios.'), Markup.inlineKeyboard(rows));
    await ctx.answerCbQuery();
  });
  bot.action(/^admin_user_(.+)$/, async ctx => {
    if (!guard(ctx)) return ctx.answerCbQuery('⛔ Sin permiso', { show_alert: true });
    if (!db) return ctx.answerCbQuery('Firebase no disponible', { show_alert: true });
    const doc = await db.collection('usuarios').doc(ctx.match[1]).get();
    if (!doc.exists) return ctx.answerCbQuery('Usuario no encontrado', { show_alert: true });
    const u = doc.data() || {};
    await ctx.editMessageText('👤 USUARIO\n\n🆔 ID: ' + doc.id + '\n📝 Nombre: ' + (u.first_name || 'Sin nombre') + '\n👤 Username: ' + (u.username ? '@' + u.username : 'Sin username') + '\n⚙️ Estado: ' + (u.estado || 'activo'),
      Markup.inlineKeyboard([[Markup.button.callback('⬅️ VOLVER', 'adm_lista_users')]]));
    await ctx.answerCbQuery();
  });
  bot.action('adm_config', async ctx => {
    if (!guard(ctx)) return ctx.answerCbQuery('⛔ Sin permiso', { show_alert: true });
    await ctx.editMessageText('⚙️ CONFIGURACIÓN\n\nSelecciona una sección:', Markup.inlineKeyboard([
      [Markup.button.callback('📺 CANALES / LOG / ORIGEN', 'adm_logorigen')],
      [Markup.button.callback('🩺 DIAGNÓSTICO', 'adm_diagnostic')],
      [Markup.button.callback('⬅️ VOLVER', 'admin_back')]
    ]));
    await ctx.answerCbQuery();
  });
  bot.action('adm_welcome', async ctx => {
    if (!guard(ctx)) return ctx.answerCbQuery('⛔ Sin permiso', { show_alert: true });
    const doc = db ? await db.collection('config').doc('bot').get() : null;
    const data = doc && doc.exists ? doc.data() : {};
    await ctx.editMessageText(
      '🖼️ BIENVENIDA\n\n' +
      'Foto: ' + (data.welcomePhoto ? '✅ Configurada' : '❌ No configurada') + '\n' +
      'Texto: ' + (data.welcomeText ? '✅ Personalizado' : '⚙️ Predeterminado') + '\n\n' +
      'Selecciona qué deseas modificar:',
      Markup.inlineKeyboard([
        [Markup.button.callback('📝 CAMBIAR TEXTO', 'adm_welcome_text')],
        [Markup.button.callback('🖼️ CAMBIAR FOTO', 'adm_welcome_photo')],
        [Markup.button.callback('⬅️ VOLVER', 'admin_back')]
      ])
    );
    await ctx.answerCbQuery();
  });

  bot.action('adm_welcome_text', async ctx => {
    if (!guard(ctx)) return ctx.answerCbQuery('⛔ Sin permiso', { show_alert: true });
    ctx.session = ctx.session || {};
    ctx.session.adminWelcomeText = true;
    await ctx.reply('📝 Envía el nuevo texto de bienvenida. Puedes usar HTML de Telegram y {nombre} para insertar el nombre del usuario.\n\n/cancel para cancelar.');
    await ctx.answerCbQuery();
  });

  bot.action('adm_welcome_photo', async ctx => {
    if (!guard(ctx)) return ctx.answerCbQuery('⛔ Sin permiso', { show_alert: true });
    ctx.session = ctx.session || {};
    ctx.session.adminWelcomePhoto = true;
    await ctx.reply('🖼️ Envía la nueva foto de bienvenida.\n\n/cancel para cancelar.');
    await ctx.answerCbQuery();
  });

  bot.on('message', async (ctx, next) => {
    if (!guard(ctx) || !ctx.session || !db || !ctx.message) return next();
    if (ctx.session.adminWelcomeText && typeof ctx.message.text === 'string') {
      const value = ctx.message.text.trim();
      if (!value || value.startsWith('/')) return next();
      await db.collection('config').doc('bot').set({ welcomeText: value }, { merge: true });
      try { await sendToStore(ctx.telegram, 'bienvenida', '📝 <b>TEXTO DE BIENVENIDA ACTUALIZADO</b>\\n\\n' + value, { parse_mode: 'HTML' }); } catch (e) { console.error('❌ Store bienvenida texto:', e.message); }
      ctx.session.adminWelcomeText = null;
      return ctx.reply('✅ Texto de bienvenida actualizado.');
    }
    if (ctx.session.adminWelcomePhoto && ctx.message.photo?.length) {
      const photo = ctx.message.photo[ctx.message.photo.length - 1].file_id;
      await db.collection('config').doc('bot').set({ welcomePhoto: photo }, { merge: true });
      try { await ctx.telegram.sendPhoto(require('../../config/telegramStore').STORE_GROUP_ID, photo, { message_thread_id: await require('../../config/telegramStore').getStoreTopic('bienvenida'), caption: '🖼️ <b>FOTO DE BIENVENIDA ACTUALIZADA</b>', parse_mode: 'HTML' }); } catch (e) { console.error('❌ Store bienvenida foto:', e.message); }
      ctx.session.adminWelcomePhoto = null;
      return ctx.reply('✅ Foto de bienvenida actualizada.');
    }
    return next();
  });

  bot.action('adm_maintenance', async ctx => {
    if (!guard(ctx)) return ctx.answerCbQuery('⛔ Sin permiso', { show_alert: true });
    await ctx.editMessageText('🧹 MANTENIMIENTO\n\nHerramientas:', Markup.inlineKeyboard([
      [Markup.button.callback('🧹 LIMPIAR CACHÉ', 'adm_cache_clear')],
      [Markup.button.callback('🩺 DIAGNÓSTICO', 'adm_diagnostic')],
      [Markup.button.callback('⬅️ VOLVER', 'admin_back')]
    ]));
    await ctx.answerCbQuery();
  });
  bot.action('adm_cache_clear', async ctx => {
    if (!guard(ctx)) return ctx.answerCbQuery('⛔ Sin permiso', { show_alert: true });
    Object.keys(CACHE_CANALES).forEach(k => CACHE_CANALES[k] = null);
    limpiarCacheCategorias();
    await ctx.answerCbQuery('✅ Cachés limpiadas');
    await ctx.editMessageText('🧹 CACHÉ\n\n✅ Caché de canales y categorías limpiada.',
      Markup.inlineKeyboard([[Markup.button.callback('⬅️ VOLVER', 'adm_maintenance')]]));
  });
  bot.action('adm_diagnostic', async ctx => {
    if (!guard(ctx)) return ctx.answerCbQuery('⛔ Sin permiso', { show_alert: true });
    await ctx.editMessageText('🩺 DIAGNÓSTICO\n\n🤖 Bot: ✅ Activo\n🗄️ Firebase: ' + (isFirebaseReady() ? '✅ Conectado' : '❌ No conectado') + '\n👮 Admin: ✅',
      Markup.inlineKeyboard([[Markup.button.callback('⬅️ VOLVER', 'adm_maintenance')]]));
    await ctx.answerCbQuery();
  });
  setupCategories(bot);
}
module.exports = { register };
