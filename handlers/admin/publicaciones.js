const { Markup } = require('telegraf');
const { db } = require('../../config/firebase');
const { isAdmin } = require('../../config/constantes');
const { getCategorias } = require('../../config/categorias');

const guard = ctx => isAdmin(ctx.from && ctx.from.id);
function pubRef(id) { return db.collection('publicaciones').doc(String(id)); }

async function renderCategorias(ctx) {
  const categorias = await getCategorias({ force: true });
  const rows = categorias.map((cat, i) => [Markup.button.callback(String(cat), 'pub_cat_' + i)]);
  rows.push([Markup.button.callback('➕ NUEVA PUBLICACIÓN', 'pub_nueva', { style: 'success' })]);
  rows.push([Markup.button.callback('⬅️ VOLVER', 'admin_back')]);
  return ctx.editMessageText('📢 PUBLICACIONES\n\nSelecciona una categoría para ver sus publicaciones:', Markup.inlineKeyboard(rows));
}

function setupPublicacionesHandler(bot) {
  bot.action('admin_publicaciones', async ctx => {
    if (!guard(ctx)) return ctx.answerCbQuery('⛔ Sin permiso', { show_alert: true });
    if (!db) return ctx.answerCbQuery('Base de datos no disponible', { show_alert: true });
    await renderCategorias(ctx); await ctx.answerCbQuery();
  });

  bot.action(/^pub_cat_(\d+)$/, async ctx => {
    if (!guard(ctx)) return ctx.answerCbQuery('⛔ Sin permiso', { show_alert: true });
    if (!db) return ctx.answerCbQuery('Base de datos no disponible', { show_alert: true });
    const categorias = await getCategorias();
    const categoria = categorias[Number(ctx.match[1])];
    if (!categoria) return ctx.answerCbQuery('Categoría no encontrada', { show_alert: true });
    const snap = await db.collection('publicaciones').where('categoria', '==', categoria).limit(50).get();
    const rows = [], lines = ['📁 ' + categoria, ''];
    if (snap.empty) lines.push('No hay publicaciones en esta categoría.');
    else for (const doc of snap.docs) {
      const p = doc.data() || {};
      const titulo = String(p.titulo || p.nombre || doc.id).slice(0, 55);
      lines.push('• ' + titulo);
      rows.push([Markup.button.callback('✏️ ' + titulo, 'pub_edit_' + doc.id)]);
    }
    rows.push([Markup.button.callback('➕ AGREGAR AQUÍ', 'pub_nueva_cat_' + Number(ctx.match[1]), { style: 'success' })]);
    rows.push([Markup.button.callback('⬅️ CATEGORÍAS', 'admin_publicaciones')]);
    await ctx.editMessageText(lines.join('\n'), Markup.inlineKeyboard(rows)); await ctx.answerCbQuery();
  });

  bot.action(/^pub_nueva_cat_(\d+)$/, async ctx => {
    if (!guard(ctx)) return ctx.answerCbQuery('⛔ Sin permiso', { show_alert: true });
    const categorias = await getCategorias(), cat = categorias[Number(ctx.match[1])];
    if (!cat) return ctx.answerCbQuery('Categoría no encontrada', { show_alert: true });
    ctx.session = ctx.session || {}; ctx.session.publicacion = { step: 'contenido', categoria: cat };
    await ctx.reply('📝 NUEVA PUBLICACIÓN\n\nEnvía el contenido.\n\n/cancel para cancelar.'); await ctx.answerCbQuery();
  });

  bot.action('pub_nueva', async ctx => {
    if (!guard(ctx)) return ctx.answerCbQuery('⛔ Sin permiso', { show_alert: true });
    const categorias = await getCategorias();
    const rows = categorias.map((cat, i) => [Markup.button.callback(String(cat), 'pub_new_setcat_' + i)]);
    rows.push([Markup.button.callback('❌ CANCELAR', 'pub_cancel')]);
    await ctx.editMessageText('📝 NUEVA PUBLICACIÓN\n\nSelecciona la categoría:', Markup.inlineKeyboard(rows)); await ctx.answerCbQuery();
  });

  bot.action(/^pub_new_setcat_(\d+)$/, async ctx => {
    if (!guard(ctx)) return ctx.answerCbQuery('⛔ Sin permiso', { show_alert: true });
    const categorias = await getCategorias(), cat = categorias[Number(ctx.match[1])];
    if (!cat) return ctx.answerCbQuery('Categoría no encontrada', { show_alert: true });
    ctx.session = ctx.session || {}; ctx.session.publicacion = { step: 'contenido', categoria: cat };
    await ctx.reply('📝 Envía ahora el contenido de la publicación.\n\n/cancel para cancelar.'); await ctx.answerCbQuery();
  });

  bot.action('pub_cancel', async ctx => {
    if (!guard(ctx)) return ctx.answerCbQuery('⛔ Sin permiso', { show_alert: true });
    if (ctx.session) ctx.session.publicacion = null;
    await ctx.editMessageText('✅ Operación cancelada.', Markup.inlineKeyboard([
      [Markup.button.callback('📢 PUBLICACIONES', 'admin_publicaciones')],
      [Markup.button.callback('⬅️ VOLVER', 'admin_back')]
    ])); await ctx.answerCbQuery();
  });

  bot.action(/^pub_edit_(.+)$/, async ctx => {
    if (!guard(ctx)) return ctx.answerCbQuery('⛔ Sin permiso', { show_alert: true });
    if (!db) return ctx.answerCbQuery('Base de datos no disponible', { show_alert: true });
    const snap = await pubRef(ctx.match[1]).get();
    if (!snap.exists) return ctx.answerCbQuery('Publicación no encontrada', { show_alert: true });
    const p = snap.data() || {};
    await ctx.editMessageText('📝 PUBLICACIÓN\n\n🆔 ' + ctx.match[1] + '\n📁 ' + (p.categoria || 'Sin categoría') + '\n\n' + String(p.contenido || p.texto || '').slice(0, 3500),
      Markup.inlineKeyboard([
        [Markup.button.callback('🗑️ ELIMINAR', 'pub_del_' + ctx.match[1], { style: 'danger' })],
        [Markup.button.callback('⬅️ VOLVER', 'admin_publicaciones')]
      ])); await ctx.answerCbQuery();
  });

  bot.action(/^pub_del_(.+)$/, async ctx => {
    if (!guard(ctx)) return ctx.answerCbQuery('⛔ Sin permiso', { show_alert: true });
    if (!db) return ctx.answerCbQuery('Base de datos no disponible', { show_alert: true });
    await pubRef(ctx.match[1]).delete(); await ctx.answerCbQuery('✅ Publicación eliminada'); await renderCategorias(ctx);
  });

  bot.on('message', async (ctx, next) => {
    if (!guard(ctx) || !ctx.session || !ctx.session.publicacion || !ctx.message) return next();
    const flow = ctx.session.publicacion;
    if (flow.step !== 'contenido') return next();
    const msg = ctx.message, contenido = msg.text || msg.caption || '';
    if (!contenido && !msg.photo && !msg.video && !msg.document) return ctx.reply('❌ Envía texto o un archivo multimedia.');
    const id = String(Date.now()) + '_' + String(ctx.from.id);
    const payload = {
      id, titulo: contenido.split('\n')[0].slice(0, 100) || 'Publicación', categoria: flow.categoria, contenido,
      tipo: msg.photo ? 'photo' : msg.video ? 'video' : msg.document ? 'document' : 'text',
      fileId: msg.photo && msg.photo.length ? msg.photo[msg.photo.length - 1].file_id : (msg.video ? msg.video.file_id : (msg.document ? msg.document.file_id : null)),
      autorId: ctx.from.id, creadoAt: new Date(), actualizadoAt: new Date(), activa: true
    };
    try {
      await pubRef(id).set(payload); ctx.session.publicacion = null;
      await ctx.reply('✅ Publicación guardada.\n\n📁 Categoría: ' + flow.categoria + '\n🆔 ID: ' + id,
        Markup.inlineKeyboard([[Markup.button.callback('📢 PUBLICACIONES', 'admin_publicaciones')], [Markup.button.callback('⬅️ PANEL', 'admin_back')]]));
    } catch (error) { console.error('❌ Error guardando publicación:', error); await ctx.reply('❌ No pude guardar la publicación.'); }
  });
}
module.exports = setupPublicacionesHandler;
