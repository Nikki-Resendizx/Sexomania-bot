const { Telegraf, Markup } = require('telegraf');
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, where, doc, getDoc } = require('firebase/firestore');
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

const appFb = initializeApp(firebaseConfig);
const db = getFirestore(appFb);

let cacheChats = {};

const BIENVENIDA = `💦 𝐁𝐢𝐞𝐧𝐯𝐞𝐧𝐢𝐝𝐨 𝐚 𝐥𝐚 𝐩𝐞𝐫𝐯𝐞𝐫𝐬𝐢𝐨‌𝐧 𝐭𝐨𝐭𝐚𝐥...

𝐸𝑠𝑡𝑜 𝑒𝑠 🔥🅢🅔🅧🅞🅜🅐🅝🅘🅐🔥 ᴸⁱⁿᵏˢ
𝐸𝑙 𝑖𝑛𝑓𝑖𝑒𝑟𝑛𝑜 𝑑𝑜𝑛𝑑𝑒 𝑡𝑜𝑑𝑜𝑠 𝑞𝑢𝑖𝑒𝑟𝑒𝑛 𝑒𝑠𝑡𝑎𝑟 😈

📁 ❼ 𝐂𝐀𝐓𝐄𝐆𝐎𝐑𝐈𝐀𝐒 𝐃𝐈𝐒𝐓𝐈𝐍𝐓𝐀𝐒
   🔥 𝗘𝗻𝗰𝗼𝗻𝘁𝗿𝗮𝗿𝗮𝘀 𝗟𝗶𝗻𝗸𝘀 𝗱𝗲 🔥

━━━━━━━━━━━━━━━━━━━━━━━━━
🔞 𝗖𝗔𝗡𝗔𝗟𝗘𝗦 𝗗𝗘 𝗔𝗣𝗢𝗥𝗧𝗘𝗦 𝗫𝗫𝗫 🔞
━━━━━━━━━━━━━━━━━━━━━━━━━
🔞 𝗚𝗥𝗨𝗣𝗢𝗦 𝗗𝗘 𝗔𝗣𝗢𝗥𝗧𝗘𝗦 𝗫𝗫𝗫 🔞
━━━━━━━━━━━━━━━━━━━━━━━━━
💸 𝗚𝗥𝗨𝗣𝗢𝗦 𝗗𝗘 𝗩𝗘𝗡𝗧𝗔 💸
━━━━━━━━━━━━━━━━━━━━━━━━━
📣 𝗖𝗔𝗡𝗔𝗟𝗘𝗦 𝗣𝗨𝗕𝗟𝗜𝗖𝗜𝗧𝗔𝗥𝗜𝗢𝗦 📣
━━━━━━━━━━━━━━━━━━━━━━━━━
🍿 𝗖𝗔𝗡𝗔𝗟𝗘𝗦 𝗗𝗘 𝗘𝗡𝗧𝗥𝗘𝗧𝗘𝗡𝗜𝗠𝗜𝗘𝗡𝗧𝗢 🍿
━━━━━━━━━━━━━━━━━━━━━━━━━
🎨 𝗖𝗔𝗡𝗔𝗟𝗘𝗦 𝗗𝗘 𝗔𝗥𝗧𝗘 🎨
━━━━━━━━━━━━━━━━━━━━━━━━━
🤖 𝗟𝗢𝗦 𝗠𝗘𝗝𝗢𝗥𝗘𝗦 𝗕𝗢𝗧𝗦 🤖
━━━━━━━━━━━━━━━━━━━━━━━━━`;

// TECLADO AZUL COMO EN TU CAPTURA
function getMenuPrincipal(){
  return Markup.keyboard([
    ['🔞 CANALES XXX'],
    ['👥 GRUPOS XXX'],
    ['💸 GRUPOS VENTAS'],
    ['📣 PUBLICITARIOS'],
    ['🍿 ENTRETENIMIENTO'],
    ['🎨 ARTE'],
    ['🤖 BOTS']
  ]).resize();
}

function limpiarTexto(texto){
  if(!texto) return "Chat";
  return texto.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ ]/g, '').substring(0,22).trim() || "Chat";
}

async function mandarSeccion(seccion, ctx){
  try{
    const q = query(collection(db, "chats"), where("seccion", "==", seccion));
    const snap = await getDocs(q);

    if(snap.empty){
      return ctx.reply(`😈 Aún no hay nada en ${seccion}`, getMenuPrincipal());
    }

    cacheChats = {};
    let botones = [];

    snap.forEach(d => {
      const data = { id: d.id,...d.data() };
      cacheChats[d.id] = data;
      let nombreSeguro = limpiarTexto(data.nombre);
      botones.push([Markup.button.callback(`${nombreSeguro} | ${data.clicks||0} vistas`, `ver_${d.id}`)]);
    });

    botones.sort((a,b) => {
      const idA = a[0].callback_data.replace('ver_','');
      const idB = b[0].callback_data.replace('ver_','');
      return (cacheChats[idB]?.clicks||0) - (cacheChats[idA]?.clicks||0);
    });

    botones.push([Markup.button.callback('⬅️ VOLVER', 'volver_menu')]);

    await ctx.reply(`📁 ${seccion} - Toca un chat para verlo:`, Markup.inlineKeyboard(botones));

  } catch(e){ console.log(e); ctx.reply('Error: '+e.message); }
}

async function mandarUnChat(id, ctx){
  try{
    await ctx.answerCbQuery().catch(()=>{});
    let c = cacheChats[id];
    if(!c){
      const snap = await getDoc(doc(db, "chats", id));
      if(!snap.exists()) return ctx.reply('Ya no existe');
      c = { id: snap.id,...snap.data() };
    }

    // YA SIN LINK DE ACCESO
    const caption = `📁 CATEGORIA: ${c.seccion}\n\n✍️ NOMBRE DEL CHAT ✍️\n${c.nombre}\n\n📝 DESCRIPCION 📝\n${c.desc}\n\n👁️ ${c.clicks||0} VISTAS`;

    const botones = Markup.inlineKeyboard([
      [Markup.button.url('⚡ UNETE AQUI ⚡', c.link)],
      [Markup.button.url('🔘 + Botonera', 'https://t.me/Sexomanialinksbot'), Markup.button.url('📝 + Listas', 'https://t.me/SexomaniaListas_Bot')],
      [Markup.button.callback('⬅️ ATRAS', `sec_${c.seccion}`)]
    ]);

    // FIX FOTOS BASE64 Y HTTP
    try {
      if(c.foto && c.foto.startsWith('http')){
        await ctx.replyWithPhoto(c.foto, { caption,...botones });
      } else if(c.foto && c.foto.startsWith('data:image')){
        const base64Data = c.foto.split(',')[1];
        const buffer = Buffer.from(base64Data, 'base64');
        await ctx.replyWithPhoto({ source: buffer }, { caption,...botones });
      } else {
        await ctx.reply(caption, botones);
      }
    } catch(err){
      console.log('Error foto:', err.message);
      await ctx.reply(caption, botones);
    }
  } catch(e){ console.log(e); }
}

// COMANDOS
bot.start((ctx) => ctx.reply(BIENVENIDA, getMenuPrincipal()));
bot.hears('🔞 CANALES XXX', (ctx) => mandarSeccion('CANALES ADULTOS', ctx));
bot.hears('👥 GRUPOS XXX', (ctx) => mandarSeccion('GRUPOS ADULTOS', ctx));
bot.hears('💸 GRUPOS VENTAS', (ctx) => mandarSeccion('VENTAS', ctx));
bot.hears('📣 PUBLICITARIOS', (ctx) => mandarSeccion('PUBLICITARIOS', ctx));
bot.hears('🍿 ENTRETENIMIENTO', (ctx) => mandarSeccion('ENTRETENIMIENTO', ctx));
bot.hears('🎨 ARTE', (ctx) => mandarSeccion('ARTE', ctx));
bot.hears('🤖 BOTS', (ctx) => mandarSeccion('BOTS', ctx));

bot.action('volver_menu', async (ctx) => {
  await ctx.answerCbQuery().catch(()=>{});
  await ctx.reply(BIENVENIDA, getMenuPrincipal());
});

bot.action(/^sec_/, async (ctx) => {
  const seccion = ctx.callbackQuery.data.replace('sec_', '');
  await mandarSeccion(seccion, ctx);
});

bot.action(/^ver_/, async (ctx) => {
  const id = ctx.callbackQuery.data.replace('ver_', '');
  await mandarUnChat(id, ctx);
});

bot.launch().then(()=> console.log('BOT FINAL ON'));
console.log('Bot SEXOMANIA listo');

const app2 = express();
app2.get('/', (req,res) => res.send('Bot FINAL ON'));
app2.listen(process.env.PORT || 3000);
