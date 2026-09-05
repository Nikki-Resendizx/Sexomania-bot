const { Telegraf, Markup } = require('telegraf');
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, where } = require('firebase/firestore');
const express = require('express');

const bot = new Telegraf(process.env.BOT_TOKEN);

const firebaseConfig = {
  apiKey: "AIzaSyC6eyDXaTCPgcb_se9vVP4rfwVkdc0ayn0",
  authDomain: "sexomania-links.firebaseapp.com",
  projectId: "sexomania-links",
  storageBucket: "sexomania-links.firebasestorage.app",
  messagingSenderId: "1061811152332",
  appId: "1:1061811152332:web:8d75649506182236862969"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const BIENVENIDA = `💦 Bienvenido a la perversión total...

Esto es SEXOMANIA LINKS
El infierno donde todos quieren estar 😈

🔞 Canales XXX que Telegram te oculta
👥 Grupos donde todo se vale
💸 Las chicas más ricas vendiendo contenido
📣 Hazte famoso en el mundo adulto

¿Te atreves a entrar? Elige abajo y no hay vuelta atrás 👇

🌐 Entra a la App: https://sexomania-links.netlify.app`;

function getMenuInline(){
  return Markup.inlineKeyboard([
    [Markup.button.callback('🔞 CANALES XXX', 'sec_CANALES ADULTOS')],
    [Markup.button.callback('👥 GRUPOS XXX', 'sec_GRUPOS ADULTOS')],
    [Markup.button.callback('💸 GRUPOS VENTAS', 'sec_VENTAS')],
    [Markup.button.callback('📣 PUBLICITARIOS', 'sec_PUBLICITARIOS')],
    [Markup.button.callback('🍿 ENTRETENIMIENTO', 'sec_ENTRETENIMIENTO')],
    [Markup.button.callback('🎨 ARTE', 'sec_ARTE')],
    [Markup.button.callback('🤖 BOTS', 'sec_BOTS')],
  ]);
}

async function mandarSeccion(seccion, ctx){
  try{
    await ctx.answerCbQuery();
    await ctx.reply(`🔍 Buscando en *${seccion}*...`, {parse_mode:'Markdown'});
    const q = query(collection(db, "chats"), where("seccion", "==", seccion));
    const snap = await getDocs(q);
    
    if(snap.empty){
      return ctx.reply(`😈 Aún no hay nada en ${seccion}, agrégalo en la App`);
    }
    
    let lista = [];
    snap.forEach(d => lista.push(d.data()));
    lista.sort((a,b) => (b.clicks||0) - (a.clicks||0));

    for(const c of lista){
      const caption = `📁 CATEGORIA: ${c.seccion}\n\n✍️ NOMBRE DEL CHAT ✍️\n${c.nombre}\n\n📝 DESCRIPCION 📝\n${c.desc}\n\n👁️ ${c.clicks||0} VISTAS\n\n⬇️ LINK DE ACCESO ⬇️\n${c.link}`;
      await ctx.replyWithPhoto(c.foto, {
        caption: caption,
        ...Markup.inlineKeyboard([
          [Markup.button.url('⚡ UNETE AQUI ⚡', c.link)],
          [Markup.button.url('🔘 + Botonera', 'https://t.me/Sexomanialinksbot'), Markup.button.url('📝 + Listas', 'https://t.me/SexomaniaListas_Bot')]
        ])
      });
    }
  } catch(e){ console.log(e); ctx.reply('Error: '+e.message); }
}

bot.start((ctx) => {
  ctx.reply(BIENVENIDA, getMenuInline());
});

bot.command('menu', (ctx) => ctx.reply('Elige una categoría jefa 👇', getMenuInline()));

bot.on('callback_query', async (ctx) => {
  const data = ctx.callbackQuery.data;
  if(data.startsWith('sec_')){
    const seccion = data.replace('sec_', '');
    await mandarSeccion(seccion, ctx);
  }
});

bot.launch().then(()=> console.log('BOT ON FIRESTORE'));
console.log('Bot listo');

// TRUCO PARA RENDER
const app2 = express();
app2.get('/', (req,res) => res.send('Bot SEXOMANIA Firestore ON'));
app2.listen(process.env.PORT || 3000, () => console.log('Puerto OK'));
