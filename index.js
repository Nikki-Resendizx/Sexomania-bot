const { Telegraf, Markup } = require('telegraf');
const { initializeApp } = require('firebase/app');
const { getDatabase, ref, get } = require('firebase/database');
const express = require('express');

const bot = new Telegraf(process.env.BOT_TOKEN);

// MISMA BASE DE DATOS DE TU PAGINA sexomania-links.netlify.app
const firebaseConfig = {
  apiKey: "AIzaSyC6eyDXaTCPgcb_se9vVP4rfwVkdc0ayn0",
  authDomain: "sexomania-links.firebaseapp.com",
  databaseURL: "https://sexomania-links-default-rtdb.firebaseio.com",
  projectId: "sexomania-links",
  storageBucket: "sexomania-links.firebasestorage.app",
  messagingSenderId: "1061811152332",
  appId: "1:1061811152332:web:8d75649506182236862969"
};

initializeApp(firebaseConfig);
const db = getDatabase();

async function copiar(categoria, ctx){
  try {
    await ctx.reply(`🔍 Buscando en ${categoria}...`);
    const snap = await get(ref(db, 'chats'));
    if(!snap.exists()) return ctx.reply('Firebase vacío');
    const lista = Object.values(snap.val()).filter(l => l.categoria?.toLowerCase() === categoria.toLowerCase());
    if(lista.length === 0) return ctx.reply(`No hay nada en ${categoria} aún, agrégalo en tu página`);
    for(const d of lista){
      const caption = `📁 CATEGORIA: ${d.categoria}\n\n✍️ NOMBRE DEL CHAT ✍️\n${d.nombre}\n\n📝 DESCRIPCION 📝\n${d.descripcion}\n\n⬇️ LINK DE ACCESO ⬇️\n${d.link}`;
      await ctx.replyWithPhoto(d.imagen, {
        caption: caption,
        reply_markup: { inline_keyboard: [[{text:'⚡ UNETE AQUI ⚡', url: d.link}], [{text:'🔘 + Botonera', callback_data: 'botonera'}, {text:'📝 + Listas', callback_data: 'listas'}]] }
      });
    }
  } catch(e){ ctx.reply('Error: '+e.message); console.log(e); }
}

bot.start((ctx) => {
  ctx.reply('🔥 SEXOMANIA LINKS 🔥\nToca una categoría de las opciones que aparecen en los botones de abajo:', Markup.keyboard([
    ['🔞 CANALES', '👥 GRUPOS'],
    ['💸 VENTAS', '📣 PUBLICITARIOS'],
    ['🍿 ENTRETENIMIENTO', '🎨 ARTE'],
    ['🤖 BOTS']
  ]).resize());
});

bot.hears('🔞 CANALES', (ctx) => copiar('Canales', ctx));
bot.hears('👥 GRUPOS', (ctx) => copiar('Grupos', ctx));
bot.hears('💸 VENTAS', (ctx) => copiar('Ventas', ctx));
bot.hears('📣 PUBLICITARIOS', (ctx) => copiar('Publicitarios', ctx));
bot.hears('🍿 ENTRETENIMIENTO', (ctx) => copiar('Entretenimiento', ctx));
bot.hears('🎨 ARTE', (ctx) => copiar('Arte', ctx));
bot.hears('🤖 BOTS', (ctx) => copiar('Bots', ctx));

bot.launch().then(()=> console.log('BOT ON'));
console.log('Bot con 7 categorias listo');

// TRUCO PARA QUE RENDER NO FALLE - NO BORRAR
const app2 = express();
app2.get('/', (req, res) => res.send('Bot SEXOMANIA activo - 7 categorias'));
app2.listen(process.env.PORT || 3000, () => console.log('Puerto falso para Render OK'));
