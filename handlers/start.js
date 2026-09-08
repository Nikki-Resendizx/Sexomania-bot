const { Markup } = require('telegraf');
const { db } = require('../config/firebase');

module.exports = (bot) => {
  bot.start(async (ctx) => {
    try {
      const userId = ctx.from.id;
      const nombre = ctx.from.first_name || 'bebé';
      const username = ctx.from.username ? `@${ctx.from.username}` : 'sin username';

      // Guardar usuario en Firebase si no existe
      if (db) {
        const userRef = db.collection('users').doc(String(userId));
        const doc = await userRef.get();
        if (!doc.exists) {
          await userRef.set({
            id: userId,
            name: nombre,
            username: username,
            joinedAt: new Date(),
          });
        }
      }

      await ctx.replyWithPhoto(
        { url: 'https://i.imgur.com/8Km9tLL.jpg' }, // pon aquí tu foto de portada
        {
          caption: `🔥 *Bienvenid@ ${nombre} a SEXOMANIA V9 ULTRA* 🔥\n\n` +
                   `😈 El bot más cochino de Telegram 😈\n\n` +
                   `👇 *¿Qué quieres hacer?*`,
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [Markup.button.callback('📂 Mis Chats', 'mis_chats'), Markup.button.callback('👤 Mi Perfil', 'mi_perfil')],
            [Markup.button.callback('📢 Canales', 'ver_canales'), Markup.button.callback('🆘 Ayuda', 'ayuda')],
          ])
        }
      );

    } catch (e) {
      console.error('Error en /start:', e.message);
      await ctx.reply(`Hola ${ctx.from.first_name} 🔥 Bienvenid@ a Sexomania V9`);
    }
  });

  // Botones
  bot.action('ayuda', (ctx) => ctx.reply('Escribe /panel si eres admin 😈'));
};
