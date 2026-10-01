const { Markup } = require('telegraf');
const { getCanales, setCanal, TIPOS_CANALES, isAdmin } = require('../../config/constantes');

const adminOnly = ctx => isAdmin(ctx.from?.id);

function setupCanalesHandler(bot) {
  bot.action('adm_logorigen', async ctx => {
    if (!adminOnly(ctx)) return ctx.answerCbQuery('⛔ Sin permiso', { show_alert: true });
    const c = await getCanales();
    await ctx.editMessageText(
      `⚙️ *CONFIGURACIÓN DE CANALES*\n\n📢 Principal: ${c.principal || '❌ No configurado'}\n📝 Log: ${c.log || '❌ No configurado'}\n📥 Origen: ${c.origen || '❌ No configurado'}\n🔒 Registro privado: ${c.registro_privado || '❌ No configurado'}\n\nReenvía un mensaje del canal o escribe su ID.\n/cancel para cancelar`,
      { parse_mode: 'Markdown', ...Markup.inlineKeyboard([
        [Markup.button.callback('📢 Set Principal','set_principal'), Markup.button.callback('📝 Set Log','set_log')],
        [Markup.button.callback('📥 Set Origen','set_origen'), Markup.button.callback('🔒 Set Registro','set_registro')],
        [Markup.button.callback('👁️ Ver ID actual','ver_canales_estado')],
        [Markup.button.callback('⬅️ Volver','admin_back')]
      ])}
    );
    await ctx.answerCbQuery();
  });

  bot.action('ver_canales_estado', async ctx => {
    if (!adminOnly(ctx)) return ctx.answerCbQuery('⛔ Sin permiso', { show_alert: true });
    const c = await getCanales();
    await ctx.answerCbQuery();
    await ctx.reply(`📋 CANALES\n\nPrincipal: ${c.principal || 'No configurado'}\nLog: ${c.log || 'No configurado'}\nOrigen: ${c.origen || 'No configurado'}\nRegistro privado: ${c.registro_privado || 'No configurado'}`);
  });

  for (const tipo of ['principal','log','origen','registro_privado']) {
    bot.action(`set_${tipo === 'registro_privado' ? 'registro' : tipo}`, async ctx => {
      if (!adminOnly(ctx)) return ctx.answerCbQuery('⛔ Sin permiso', { show_alert: true });
      ctx.session = ctx.session || {};
      ctx.session.esperandoCanal = tipo;
      await ctx.reply(`👉 *CONFIGURAR ${tipo.toUpperCase()}*\n\nReenvía un mensaje del canal o escribe su ID (-100...).\n\n/cancel para cancelar`, { parse_mode:'Markdown' });
      await ctx.answerCbQuery();
    });
  }

  bot.command('setcanal', async ctx => {
    if (!adminOnly(ctx)) return ctx.reply('⛔ Solo administradores.');
    const [, tipo, raw] = (ctx.message.text || '').trim().split(/\s+/);
    if (!TIPOS_CANALES.has(tipo) || !raw) return ctx.reply('Uso: /setcanal <principal|log|origen|registro_privado> <-100ID>');
    const id = Number(raw);
    if (!Number.isSafeInteger(id) || !String(id).startsWith('-100')) {
      return ctx.reply('❌ ID inválido. Debe ser un ID de canal/supergrupo (-100...).');
    }
    try {
      await setCanal(tipo, id);
      await ctx.reply(`✅ Canal ${tipo} actualizado a ${id}`);
    } catch (e) {
      console.error('❌ /setcanal:', e.message);
      await ctx.reply('❌ No pude guardar el canal.');
    }
  });

  bot.command('canales', async ctx => {
    if (!adminOnly(ctx)) return ctx.reply('⛔ Solo administradores.');
    const c = await getCanales();
    await ctx.reply(`📋 CANALES:\nPrincipal: ${c.principal || 'No configurado'}\nLog: ${c.log || 'No configurado'}\nOrigen: ${c.origen || 'No configurado'}\nRegistro: ${c.registro_privado || 'No configurado'}`);
  });
}

function canalesMiddleware() {
  return async (ctx, next) => {
    if (!adminOnly(ctx) || !ctx.session?.esperandoCanal || !ctx.message) return next();
    const tipo = ctx.session.esperandoCanal;
    let id = null;
    if (ctx.message.forward_from_chat?.id) {
      id = ctx.message.forward_from_chat.id;
    } else if (ctx.message.forward_origin?.chat?.id) {
      id = ctx.message.forward_origin.chat.id;
    } else if (typeof ctx.message.text === 'string' && /^-100\d+$/.test(ctx.message.text.trim())) {
      id = Number(ctx.message.text.trim());
    }
    if (!id || !String(id).startsWith('-100')) return next();

    try {
      await setCanal(tipo, id);
      ctx.session.esperandoCanal = null;
      await ctx.reply(`✅ Canal *${tipo.toUpperCase()}* guardado: \`${id}\``, { parse_mode:'Markdown' });
    } catch (e) {
      console.error('❌ Guardando canal:', e.message);
      await ctx.reply('❌ No pude guardar el canal.');
    }
  };
}

module.exports = { setupCanalesHandler, canalesMiddleware };
