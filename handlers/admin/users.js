const { db } = require('../../config/firebase');
const { extraerInfoUsuario } = require('../../utils/extractor');
const { getDetallesUsuarioKeyboard } = require('../../utils/keyboards');
const { ESTADOS_USUARIO } = require('../../config/constantes');

function setupUsersHandler(bot) {

  bot.command('infouser', async (ctx) => {
    let args = ctx.message.text.split(' ');
    if (args.length < 2) return ctx.reply('Uso: /infouser <ID usuario> o reenvía un mensaje del usuario');

    let userId = args[1];
    if (ctx.message.reply_to_message) userId = ctx.message.reply_to_message.from.id;

    let doc = await db.collection('usuarios').doc(String(userId)).get();
    if (!doc.exists) return ctx.reply('❌ Usuario no encontrado');

    let userDB = doc.data();
    let info = await extraerInfoUsuario(ctx, userId, userDB);

    let texto = `**👤 INFORMACIÓN DE USUARIO**\n\n`+
      `🖼️ Foto perfil: ${info.fotoPerfil? 'Sí tiene' : 'No tiene'}\n`+
      `📝 Nombre: ${info.nombre}\n`+
      `🆔 ID: \`${info.id}\`\n`+
      `👤 @: ${info.username} ${info.username!== 'Sin @'? `(${info.id})` : ''}\n`+
      `📖 Bio: ${info.biografia.substring(0,400)}\n`+
      `📅 Ingreso: ${info.fechaIngreso}\n`+
      `⚙️ Estado: ${info.estado}\n`+
      `📦 Chats: ${info.numChats}\n`+
      `👮 Admin: ${info.esAdmin? 'Sí' : 'No'}`;

    await ctx.reply(texto, { parse_mode: 'Markdown',...getDetallesUsuarioKeyboard(userId) });
  });

  // Para que /info también funcione con usuarios si reenvías
  bot.on('message', async (ctx, next) => {
    if (ctx.session?.cambiandoEnlace) {
      let chatId = ctx.session.cambiandoEnlace;
      let nuevoEnlace = ctx.message.text;
      await db.collection('chats').doc(chatId).update({ enlace: nuevoEnlace });
      ctx.session.cambiandoEnlace = null;
      await ctx.reply(`✅ Enlace de \`${chatId}\` actualizado a ${nuevoEnlace}`, { parse_mode: 'Markdown' });
      return;
    }
    if (ctx.session?.cambiandoNombre) {
      let chatId = ctx.session.cambiandoNombre;
      let nuevoNombre = ctx.message.text;
      await db.collection('chats').doc(chatId).update({ nombre: nuevoNombre });
      ctx.session.cambiandoNombre = null;
      await ctx.reply(`✅ Nombre de \`${chatId}\` actualizado a ${nuevoNombre}`);
      return;
    }
    return next();
  });
}

module.exports = setupUsersHandler;
