const { Markup } = require('telegraf');
const { db } = require('../../config/firebase');
const { isAdmin, ADMIN_IDS } = require('../../config/constantes');

const guard = ctx => isAdmin(ctx.from?.id);

const panelKeyboard = () => Markup.inlineKeyboard([
  [Markup.button.callback('👮 ADMINS', 'adm_gestion', { style: 'primary' }), Markup.button.callback('📊 ESTADÍSTICAS', 'adm_stats', { style: 'primary' })],
  [Markup.button.callback('👥 USUARIOS', 'adm_lista_users', { style: 'success' }), Markup.button.callback('📁 CATEGORÍAS', 'admin_cats', { style: 'primary' })],
  [Markup.button.callback('📢 CANALES / LOG / ORIGEN', 'adm_logorigen', { style: 'success' })],
  [Markup.button.callback('⚙️ CONFIGURACIÓN', 'adm_config', { style: 'secondary' }), Markup.button.callback('🧹 MANTENIMIENTO', 'adm_maintenance', { style: 'danger' })],
  [Markup.button.callback('❌ CERRAR', 'adm_close', { style: 'danger' })]
]);

async function countCollection(name) {
  if (!db) return 0;
  try {
    if (typeof db.collection(name).count === 'function') {
      const snap = await db.collection(name).count().get();
      return snap.data().count || 0;
    }
    const snap = await db.collection(name).get();
    return snap.size;
  } catch { return 0; }
}

function register(bot) {
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
    const ids = ADMIN_IDS.join(', ') || 'Ninguno';
    await ctx.editMessageText(
      '👮 ADMINISTRADORES\n\n' +
      'Administradores configurados mediante ADMIN_IDS:\n' +
      ids + '\n\n' +
      'Para cambios permanentes, actualiza ADMIN_IDS en el entorno del bot.',
      Markup.inlineKeyboard([
        [Markup.button.callback('🔄 ACTUALIZAR', 'adm_gestion')],
        [Markup.button.callback('⬅️ VOLVER', 'admin_back')]
      ])
    );
    await ctx.answerCbQuery();
  });

  bot.action('adm_stats', async ctx => {
    if (!guard(ctx)) return ctx.answerCbQuery('⛔ Sin permiso', { show_alert: true });
    if (!db) return ctx.answerCbQuery('Firebase no disponible', { show_alert: true });
    const [usuarios, chats, publicaciones] = await Promise.all([
      countCollection('usuarios'),
      countCollection('chats'),
      countCollection('publicaciones')
    ]);
    let cats = 0;
    try {
      const d = await db.collection('config').doc('categorias').get();
      cats = d.exists && Array.isArray(d.data().lista) ? d.data().lista.length : 0;
    } catch {}
    await ctx.editMessageText(
      '📊 ESTADÍSTICAS\n\n' +
      '👥 Usuarios: ' + usuarios + '\n' +
      '📺 Canales / grupos: ' + chats + '\n' +
      '📢 Publicaciones: ' + categorias + '\n' +
      '📁 Categorías: ' + cats,
      Markup.inlineKeyboard([
        [Markup.button.callback('🔄 ACTUALIZAR', 'adm_stats')],
        [Markup.button.callback('⬅️ VOLVER', 'admin_back')]
      ])
    );
    await ctx.answerCbQuery();
  });

  bot.action('adm_lista_users', async ctx => {
    if (!guard(ctx)) return ctx.answerCbQuery('⛔ Sin permiso', { show_alert: true });
    if (!db) return ctx.answerCbQuery('Firebase no disponible', { show_alert: true });
    const snap = await db.collection('usuarios').limit(20).get();
    if (snap.empty) {
      return ctx.editMessageText('👥 USUARIOS\n\nNo hay usuarios registrados.', Markup.inlineKeyboard([
        [Markup.button.callback('⬅️ VOLVER', 'admin_back')]
      ]));
    }
    const rows = [];
    for (const doc of snap.docs) {
      const u = doc.data() || {};
      const name = String(u.nombre || u.first_name || u.username || doc.id).slice(0, 28);
      rows.push([Markup.button.callback('👤 ' + name, 'admin_user_' + doc.id, { style: 'secondary' })]);
    }
    rows.push(
      [Markup.button.callback('⬅️ VOLVER', 'admin_back')]
    );
    await ctx.editMessageText('👥 USUARIOS\n\nMostrando hasta 20 usuarios:', Markup.inlineKeyboard(rows));
    await ctx.answerCbQuery();
  });

  bot.action(/^admin_user_(.+)$/, async ctx => {
    if (!guard(ctx)) return ctx.answerCbQuery('⛔ Sin permiso', { show_alert: true });
    if (!db) return ctx.answerCbQuery('Firebase no disponible', { show_alert: true });
    const id = ctx.match[1];
    const doc = await db.collection('usuarios').doc(id).get();
    if (!doc.exists) return ctx.answerCbQuery('Usuario no encontrado', { show_alert: true });
    const u = doc.data() || {};
    await ctx.editMessageText(
      '👤 USUARIO\n\n' +
      '🆔 ID: ' + id + '\n' +
      '📝 Nombre: ' + (u.nombre || u.first_name || 'Sin nombre') + '\n' +
      '👤 Username: ' + (u.username ? '@' + u.username : 'Sin username') + '\n' +
      '⚙️ Estado: ' + (u.estado || 'activo'),
      Markup.inlineKeyboard([
        [Markup.button.callback('⬅️ VOLVER', 'adm_lista_users')]
      ])
    );
    await ctx.answerCbQuery();
  });

  bot.action('admin_cats', async ctx => {
    if (!guard(ctx)) return ctx.answerCbQuery('⛔ Sin permiso', { show_alert: true });
    if (!db) return ctx.answerCbQuery('Firebase no disponible', { show_alert: true });
    let lista = [];
    try {
      const d = await db.collection('config').doc('categorias').get();
      lista = d.exists && Array.isArray(d.data().lista) ? d.data().lista : [];
    } catch {}
    const rows = lista.map((c, i) => [
      Markup.button.callback('✏️ ' + String(c).slice(0, 28), 'cat_edit_' + i),
      Markup.button.callback('🗑️', 'cat_del_' + i, { style: 'danger' })
    ]);
    rows.push([Markup.button.callback('➕ AGREGAR', 'cat_add', { style: 'success' })]);
    rows.push([Markup.button.callback('⬅️ VOLVER', 'admin_back')]);
    await ctx.editMessageText(
      '📁 CATEGORÍAS\n\n' + (lista.length ? lista.map((c,i) => (i+1) + '. ' + c).join('\n') : 'No hay categorías.'),
      Markup.inlineKeyboard(rows)
    );
    await ctx.answerCbQuery();
  });

  bot.action(/^cat_edit_(\\d+)$/, async ctx => {
    if (!guard(ctx)) return ctx.answerCbQuery('⛔ Sin permiso', { show_alert: true });
    if (!db) return ctx.answerCbQuery('Firebase no disponible', { show_alert: true });
    const i = Number(ctx.match[1]);
    const ref = db.collection('config').doc('categorias');
    const d = await ref.get();
    const lista = d.exists && Array.isArray(d.data().lista) ? [...d.data().lista] : [];
    if (!lista[i]) return ctx.answerCbQuery('Categoría no encontrada', { show_alert: true });
    ctx.session = ctx.session || {};
    ctx.session.adminCategoryAction = 'edit:' + i;
    await ctx.reply('✏️ Escribe el nuevo nombre para: ' + lista[i] + '\\n\\n/cancel para cancelar.');
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
    if (!db) return ctx.answerCbQuery('Firebase no disponible', { show_alert: true });
    const i = Number(ctx.match[1]);
    const ref = db.collection('config').doc('categorias');
    const d = await ref.get();
    const lista = d.exists && Array.isArray(d.data().lista) ? [...d.data().lista] : [];
    if (!lista[i]) return ctx.answerCbQuery('Categoría no encontrada', { show_alert: true });
    const eliminada = lista.splice(i, 1)[0];
    await ref.set({ lista, updatedAt: new Date() }, { merge: true });
    await ctx.answerCbQuery('Eliminada: ' + eliminada);
    await ctx.editMessageText('📁 Categorías actualizadas.', Markup.inlineKeyboard([
      [Markup.button.callback('📁 VER CATEGORÍAS', 'admin_cats')],
      [Markup.button.callback('⬅️ VOLVER', 'admin_back')]
    ]));
  });

  bot.action('adm_config', async ctx => {
    if (!guard(ctx)) return ctx.answerCbQuery('⛔ Sin permiso', { show_alert: true });
    await ctx.editMessageText('⚙️ CONFIGURACIÓN\n\nSelecciona una sección:', Markup.inlineKeyboard([
      [Markup.button.callback('📢 CANALES / LOG / ORIGEN', 'adm_logorigen', { style: 'primary' })],
      [Markup.button.callback('🩺 DIAGNÓSTICO', 'adm_diagnostic', { style: 'secondary' })],
      [Markup.button.callback('⬅️ VOLVER', 'admin_back')]
    ]));
    await ctx.answerCbQuery();
  });

  bot.action('adm_maintenance', async ctx => {
    if (!guard(ctx)) return ctx.answerCbQuery('⛔ Sin permiso', { show_alert: true });
    await ctx.editMessageText('🧹 MANTENIMIENTO\n\nHerramientas seguras del bot:', Markup.inlineKeyboard([
      [Markup.button.callback('🔄 RECARGAR CACHÉ', 'adm_cache_clear', { style: 'primary' })],
      [Markup.button.callback('🩺 DIAGNÓSTICO', 'adm_diagnostic', { style: 'secondary' })],
      [Markup.button.callback('⬅️ VOLVER', 'admin_back')]
    ]));
    await ctx.answerCbQuery();
  });

  bot.action('adm_cache_clear', async ctx => {
    if (!guard(ctx)) return ctx.answerCbQuery('⛔ Sin permiso', { show_alert: true });
    try {
      const constantes = require('../../config/constantes');
      constantes.CACHE_CANALES.principal = null;
      constantes.CACHE_CANALES.log = null;
      constantes.CACHE_CANALES.origen = null;
      constantes.CACHE_CANALES.registro_privado = null;
      await ctx.answerCbQuery('✅ Caché limpiada');
      await ctx.editMessageText('🧹 CACHÉ\n\n✅ Caché de configuración recargable limpiada.', Markup.inlineKeyboard([
        [Markup.button.callback('⬅️ VOLVER', 'adm_maintenance')]
      ]));
    } catch (e) {
      await ctx.answerCbQuery('Error al limpiar caché', { show_alert: true });
    }
  });

  bot.action('adm_diagnostic', async ctx => {
    if (!guard(ctx)) return ctx.answerCbQuery('⛔ Sin permiso', { show_alert: true });
    const firebase = require('../../config/firebase');
    await ctx.editMessageText(
      '🩺 DIAGNÓSTICO\n\n' +
      '🤖 Bot: ✅ Activo\n' +
      '🗄️ Firebase: ' + (firebase.isFirebaseReady() ? '✅ Conectado' : '❌ No conectado') + '\n' +
      '👮 Tu ID: ' + ctx.from.id + '\n' +
      '🔐 Admin: ✅',
      Markup.inlineKeyboard([[Markup.button.callback('⬅️ VOLVER', 'adm_maintenance')]])
    );
    await ctx.answerCbQuery();
  });

  bot.on('message', async (ctx, next) => {
    if (!guard(ctx) || !ctx.session?.adminCategoryAction || !ctx.message?.text) return next();
    const action = ctx.session.adminCategoryAction;
    const value = ctx.message.text.trim();
    if (!value || value.startsWith('/')) return next();
    ctx.session.adminCategoryAction = null;
    if (!db) return ctx.reply('❌ Firebase no disponible.');
    const ref = db.collection('config').doc('categorias');
    const d = await ref.get();
    const lista = d.exists && Array.isArray(d.data().lista) ? [...d.data().lista] : [];
    if (action === 'add') {
      if (lista.some(c => String(c).toLowerCase() === value.toLowerCase())) {
        return ctx.reply('⚠️ Esa categoría ya existe.');
      }
      lista.push(value);
      await ref.set({ lista, updatedAt: new Date() }, { merge: true });
      return ctx.reply('✅ Categoría agregada: ' + value, Markup.inlineKeyboard([
        [Markup.button.callback('📁 VER CATEGORÍAS', 'admin_cats')]
      ]));
    }
    return next();
  });
}

module.exports = { register, panelKeyboard };
