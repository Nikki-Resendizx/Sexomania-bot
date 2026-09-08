const { Markup } = require('telegraf');
const { getCanales, setCanal, getCanal } = require('../../config/constantes');

function setupCanalesHandler(bot) {

  bot.action('adm_logorigen', async (ctx) => {
    let canales = await getCanales();
    let texto = `⚙️ **CONFIGURACIÓN DE CANALES**\n\n`+
      `📢 **Principal:** ${canales.principal || '❌ No configurado'}\n`+
      `📝 **Log:** ${canales.log || '❌ No configurado'}\n`+
      `📥 **Origen:** ${canales.origen || '❌ No configurado'}\n`+
      `🔒 **Registro Privado:** ${canales.registro_privado || '❌ No configurado'}\n\n`+
      `_Si cae un canal, solo dale a Set y reenvía un mensaje del canal nuevo._\n`+
      `_El privado NO se guarda en listas públicas._`;

    await ctx.editMessageText(texto, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [
          Markup.button.callback('📢 Set Principal', 'set_principal', { style: 'primary' }),
          Markup.button.callback('📝 Set Log', 'set_log', { style: 'primary' })
        ],
        [
          Markup.button.callback('📥 Set Origen', 'set_origen', { style: 'success' }),
          Markup.button.callback('🔒 Set Registro', 'set_registro', { style: 'danger' })
        ],
        [Markup.button.callback('👁️ Ver ID actual', 'ver_canales_estado', { style: 'secondary' })],
        [Markup.button.callback('⬅️ Volver', 'admin_back')]
      ])
    });
  });

  bot.action('ver_canales_estado', async (ctx) => {
    let canales = await getCanales();
    await ctx.answerCbQuery();
    await ctx.reply(`📋 **CANALES ACTUALES**\n\nPrincipal: \`${canales.principal}\`\nLog: \`${canales.log}\`\nOrigen: \`${canales.origen}\`\nRegistro Privado: \`${canales.registro_privado}\``, { parse_mode: 'Markdown' });
  });

  ['principal','log','origen','registro'].forEach(tipo => {
    bot.action(`set_${tipo}`, async (ctx) => {
      ctx.session = ctx.session || {};
      ctx.session.esperandoCanal = tipo;
      await ctx.reply(`👉 **MODO CONFIG ${tipo.toUpperCase()}**\n\nReenvíame un mensaje del canal que quieres poner como **${tipo}**\n\nO escribe el ID: \`-1001234567890\`\n\n/cancel para cancelar`, { parse_mode: 'Markdown' });
      await ctx.answerCbQuery();
    });
  });

  bot.command('setcanal', async (ctx) => {
    let args = ctx.message.text.split(' ');
    if (args.length < 3) return ctx.reply('Uso: /setcanal <principal|log|origen|registro_privado> <-100ID>');
    let tipo = args[1];
    let id = parseInt(args[2]);
    await setCanal(tipo, id);
    await ctx.reply(`✅ Canal ${tipo} actualizado a ${id}`);
  });

  bot.command('canales', async (ctx) => {
    let canales = await getCanales();
    await ctx.reply(`📋 CANALES:\nPrincipal: ${canales.principal}\nLog: ${canales.log}\nOrigen: ${canales.origen}\nRegistro: ${canales.registro_privado}`);
  });
}

// Middleware para detectar reenvío de canal
function canalesMiddleware() {
  return async (ctx, next) => {
    if (ctx.session?.esperandoCanal && ctx.message) {
      let tipo = ctx.session.esperandoCanal;
      let canalId = null;

      if (ctx.message.forward_from_chat) {
        canalId = ctx.message.forward_from_chat.id;
      } else if (ctx.message.text && ctx.message.text.trim().startsWith('-100')) {
        canalId = parseInt(ctx.message.text.trim());
      }

      if (canalId) {
        let tipoFinal = tipo === 'registro'? 'registro_privado' : tipo;
        const { setCanal } = require('../../config/constantes');
        await setCanal(tipoFinal, canalId);
        ctx.session.esperandoCanal = null;
        await ctx.reply(`✅ **Canal ${tipoFinal.toUpperCase()} guardado:** \`${canalId}\`\nYa está activo. El de registro no aparecerá en listas.`, { parse_mode: 'Markdown' });
        return;
      }
    }
    return next();
  };
}

module.exports = { setupCanalesHandler, canalesMiddleware };
