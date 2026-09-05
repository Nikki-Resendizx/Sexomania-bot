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
━━━━━━━━━━━━━━━━━━━━━━━━━

🌟 𝑷𝒂𝒓𝒂 𝒑𝒂𝒓𝒕𝒊𝒄𝒊𝒑𝒂𝒓, 𝒔𝒐𝒍𝒐 𝒅𝒆𝒃𝒆𝒔 𝒂𝒈𝒓𝒆𝒈𝒂𝒓 𝒏𝒖𝒆𝒔𝒕𝒓𝒐𝒔 𝒃𝒐𝒕𝒔 𝒅𝒆 𝒅𝒊𝒇𝒖𝒔𝒊𝒐𝒏, 𝒑𝒖𝒆𝒅𝒆 𝒔𝒆𝒓 𝒆𝒍 𝒅𝒆 𝒃𝒐𝒕𝒐𝒏𝒆𝒔 𝒐 𝒆𝒍 𝒅𝒆 𝒍𝒊𝒔𝒕𝒂𝒔.

⚡ 𝑺𝑰 𝑮𝑼𝑺𝑻𝑨𝑺 𝑷𝑼𝑬𝑫𝑬𝑺 𝑰𝑵𝑮𝑹𝑬𝑺𝑨𝑹 𝑳𝑶𝑺 𝑫𝑶𝑺 𝑩𝑶𝑻𝑺 𝒀 𝑯𝑨𝑪𝑰 𝑻𝑬𝑵𝑬𝑹 𝑴𝑨𝒀𝑶𝑹 𝑨𝑳𝑪𝑨𝑵𝑪𝑬 ⚡

¿𝗧𝗲 𝗮𝘁𝗿𝗲𝘃𝗲𝘀 𝗮 𝗲𝗻𝘁𝗿𝗮𝗿? 𝗘𝗹𝗶𝗴𝗲 𝗮𝗯𝗮𝗷𝗼 𝘆 𝗻𝗼 𝗵𝗮𝘆 𝘃𝘂𝗲𝗹𝘁𝗮 𝗮𝘁𝗿𝗮‌𝘀 👇`;

function getMenuInline(){
  return Markup.inlineKeyboard([
    [Markup.button.callback('🔞 CANALES XXX', 'sec_CANALES ADULTOS')],
    [Markup.button.callback('👥 GRUPOS XXX', 'sec_GRUPOS ADULTOS')],
    [Markup.button.callback('💸 GRUPOS VENTAS', 'sec_VENTAS')],
    [Markup.button.callback('📣 PUBLICITARIOS', 'sec_PUBLICITARIOS')],
    [Markup.button.callback('🍿 ENTRETENIMIENTO', 'sec_ENTRETENIMIENTO')],
    [Markup.button.callback('🎨 ARTE', 'sec_ARTE')],
    [Markup.button.callback('🤖 BOTS', 'sec_BOTS')],
    [Markup.button.url('🌐 APP OFICIAL', 'https://sexomania-links.netlify.app')]
  ]);
}

// FIX NOMBRES BONITOS - CONSERVA EMOJIS Y LETRAS RARAS PERO CORTA POR BYTES
function textoSeguro(texto){
  if(!texto) return "Chat";
  let bytes = 0;
  let res = "";
  for(const c of texto){
    const b = Buffer.byteLength(c, 'utf8');
    if(bytes + b > 28) break;
    bytes += b;
    res += c;
  }
  return res.trim() || "Chat";
}

async function mandarSeccion(seccion, ctx){
  try{
    await ctx.answerCbQuery().catch(()=>{});
    await ctx.reply(`🔍 Buscando en *${seccion}*...`, {parse_mode:'Markdown'});
    const q = query(collection(db, "chats"), where("seccion", "==", seccion));
    const snap = await getDocs(q);

    if(snap.empty){
      return ctx.reply(`😈 Aún no hay nada en ${seccion}`, getMenuInline());
    }

    cacheChats = {};
    let botones = [];
    snap.forEach(d => {
      const data = { id: d.id,...d.data() };
      cacheChats[d.id] = data;
      let nombreBoton = textoSeguro(data.nombre);
      botones.push([Markup.button.callback(`${nombreBoton} • ${data.clicks||0}👁️`, `ver_${d.id}`)]);
    });

    botones.sort((a,b) => {
      const idA = a[0].callback_data.replace('ver_','');
      const idB = b[0].callback_data.replace('ver_','');
      return (cacheChats[idB]?.clicks||0) - (cacheChats[idA]?.clicks||0);
    });

    botones.push([Markup.button.callback('⬅️ VOLVER AL MENU', 'volver_menu')]);

    await ctx.reply(`📁 *${seccion}* - Toca un nombre:`, {
      parse_mode:'Markdown',
     ...Markup.inlineKeyboard(botones)
    });

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

    const caption = `📁 CATEGORIA: ${c.seccion}\n\n✍️ NOMBRE DEL CHAT ✍️\n${c.nombre}\n\n📝 DESCRIPCION 📝\n${c.desc}\n\n👁️ ${c.clicks||0} VISTAS`;

    const botones = Markup.inlineKeyboard([
      [Markup.button.url('⚡ UNETE AQUI ⚡', c.link)],
      [Markup.button.url('🔘 + Botonera', 'https://t.me/Sexomanialinksbot'), Markup.button.url('📝 + Listas', 'https://t.me/SexomaniaListas_Bot')],
      [Markup.button.callback('⬅️ ATRAS', `sec_${c.seccion}`), Markup.button.callback('🏠 MENU', 'volver_menu')]
    ]);

    try {
      if(c.foto && c.foto.startsWith('http')){
        await ctx.replyWithPhoto(c.foto, { caption,...botones });
      } else if(c.foto && c.foto.startsWith('data:image')){
        const base64 = c.foto.split(',')[1];
        const buffer = Buffer.from(base64, 'base64');
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

bot.start((ctx) => ctx.reply(BIENVENIDA, getMenuInline()));
bot.command('menu', (ctx) => ctx.reply('Elige categoría 👇', getMenuInline()));

bot.action('volver_menu', async (ctx) => {
  await ctx.answerCbQuery().catch(()=>{});
  await ctx.reply(BIENVENIDA, getMenuInline());
});

bot.action(/^sec_/, async (ctx) => {
  const seccion = ctx.callbackQuery.data.replace('sec_', '');
  await mandarSeccion(seccion, ctx);
});

bot.action(/^ver_/, async (ctx) => {
  const id = ctx.callbackQuery.data.replace('ver_', '');
  await mandarUnChat(id, ctx);
});

bot.launch().then(()=> console.log('BOT INLINE FINAL ON'));
console.log('Bot SEXOMANIA listo');

const app2 = express();
app2.get('/', (req,res) => res.send('Bot INLINE FINAL ON'));
app2.listen(process.env.PORT || 3000);
