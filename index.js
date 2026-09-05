const { Telegraf, Markup } = require('telegraf');
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, where, doc, getDoc, setDoc } = require('firebase/firestore');
const express = require('express');

const bot = new Telegraf(process.env.BOT_TOKEN);
const ADMIN_ID = parseInt(process.env.ADMIN_ID || "8695673050"); // TU ID YA PUESTO
bot.catch((err) => console.log('ERROR:', err.message));

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
let configBot = {
  layout: "1x1",
  emoji: "fuego",
  plantilla: "vip"
};

async function cargarConfig(){
  try{
    const snap = await getDoc(doc(db, "config", "bot"));
    if(snap.exists()) configBot = {...configBot,...snap.data()};
  }catch(e){}
}
cargarConfig();

const BIENVENIDA = `💦 𝐁𝐢𝐞𝐧𝐯𝐞𝐧𝐢𝐝𝐨 𝐚 𝐥𝐚 𝐩𝐞𝐫𝐯𝐞𝐫𝐬𝐢𝐨‌𝐧 𝐭𝐨𝐭𝐚𝐥...

𝐸𝑠𝑡𝑜 𝑒𝑠 🔥🅢🅔🅧🅞🅜🅐🅝🅘🅐🔥 ᴸⁱⁿᵏˢ
𝐸𝑙 𝑖𝑛𝑓𝑖𝑒𝑟𝑛𝑜 𝑑𝑜𝑛𝑑𝑒 𝑡𝑜𝑑𝑜𝑠 𝑞𝑢𝑖𝑒𝑟𝑒𝑛 𝑒𝑠𝑡𝑎𝑟 😈

¿𝗧𝗲 𝗮𝘁𝗿𝗲𝘃𝗲𝘀 𝗮 𝗲𝗻𝘁𝗿𝗮𝗿? 𝗘𝗹𝗶𝗴𝗲 𝗮𝗯𝗮𝗷𝗼 𝘆 𝗻𝗼 𝗵𝗮𝘆 𝘃𝘂𝗲𝗹𝘁𝗮 𝗮𝘁𝗿𝗮‌𝘀 👇`;

function getEmoji(){
  if(configBot.emoji === "neon") return { c: "🟣", g: "🟢", v: "🟡", p: "🔵", e: "🟠", a: "💗", b: "⚪" };
  if(configBot.emoji === "clasico") return { c: "▫️", g: "▫️", v: "▫️", p: "▫️", e: "▫️", a: "▫️", b: "▫️" };
  return { c: "🔞", g: "👥", v: "💸", p: "📣", e: "🍿", a: "🎨", b: "🤖" };
}

function getMenuInline(){
  const em = getEmoji();
  const botones = [
    [Markup.button.callback(`${em.c} CANALES XXX`, 'sec_CANALES ADULTOS')],
    [Markup.button.callback(`${em.g} GRUPOS XXX`, 'sec_GRUPOS ADULTOS')],
    [Markup.button.callback(`${em.v} GRUPOS VENTAS`, 'sec_VENTAS')],
    [Markup.button.callback(`${em.p} PUBLICITARIOS`, 'sec_PUBLICITARIOS')],
    [Markup.button.callback(`${em.e} ENTRETENIMIENTO`, 'sec_ENTRETENIMIENTO')],
    [Markup.button.callback(`${em.a} ARTE`, 'sec_ARTE')],
    [Markup.button.callback(`${em.b} BOTS`, 'sec_BOTS')],
  ];
  if(configBot.layout === "2x2"){
    return Markup.inlineKeyboard([
      [botones[0][0], botones[1][0]],
      [botones[2][0], botones[3][0]],
      [botones[4][0], botones[5][0]],
      [botones[6][0]],
      [Markup.button.url('🌐 APP OFICIAL', 'https://sexomania-links.netlify.app')]
    ]);
  }
  botones.push([Markup.button.url('🌐 APP OFICIAL', 'https://sexomania-links.netlify.app')]);
  return Markup.inlineKeyboard(botones);
}

function textoSeguro(t){
  if(!t) return "Chat";
  let b=0,res=""; for(const c of t){ const bl=Buffer.byteLength(c,'utf8'); if(b+bl>28) break; b+=bl; res+=c; } return res.trim()||"Chat";
}

async function mandarSeccion(sec, ctx){
  await ctx.answerCbQuery().catch(()=>{});
  const snap = await getDocs(query(collection(db,"chats"), where("seccion","==",sec)));
  if(snap.empty) return ctx.reply(`😈 Nada en ${sec}`, getMenuInline());
  cacheChats={}; let btns=[];
  snap.forEach(d=>{ cacheChats[d.id]={id:d.id,...d.data()}; btns.push([Markup.button.callback(`${textoSeguro(d.data().nombre)} | ${d.data().clicks||0}`,`ver_${d.id}`)]) });
  btns.push([Markup.button.callback('⬅️ VOLVER AL MENU', 'volver_menu')]);
  await ctx.reply(`📁 ${sec} - Toca un nombre:`, Markup.inlineKeyboard(btns));
}

function getCaption(c){
  if(configBot.plantilla === "minimal") return `📁 ${c.seccion}\n\n${c.nombre}\n\n${c.desc}\n\n👁️ ${c.clicks||0} vistas`;
  if(configBot.plantilla === "xxx") return `🔥🔥🔥 ${c.seccion} 🔥🔥🔥\n\n💦 ${c.nombre} 💦\n\n🥵 ${c.desc}\n\n👀 ${c.clicks||0} CALIENTES VIENDO\n\n👇👇👇`;
  return `╔═══ ${c.seccion} ═══╗\n\n✍️ 𝐍𝐎𝐌𝐁𝐑𝐄\n${c.nombre}\n\n📝 𝐃𝐄𝐒𝐂𝐑𝐈𝐏𝐂𝐈𝐎𝐍\n${c.desc}\n\n╚═══ 👁️ ${c.clicks||0} VISTAS ═══╝`;
}

async function mandarUnChat(id, ctx){
  await ctx.answerCbQuery().catch(()=>{});
  let c=cacheChats[id]; if(!c){ const s=await getDoc(doc(db,"chats",id)); if(!s.exists()) return ctx.reply('No existe'); c={id:s.id,...s.data()}; }
  const cap=getCaption(c);
  const kb=Markup.inlineKeyboard([
    [Markup.button.url('⚡ UNETE AQUI ⚡', c.link)],
    [Markup.button.url('🔘 + Botonera','https://t.me/Sexomanialinksbot'), Markup.button.url('📝 + Listas','https://t.me/SexomaniaListas_Bot')],
    [Markup.button.callback('⬅️ ATRAS',`sec_${c.seccion}`)]
  ]);
  try{
    if(c.foto?.startsWith('http')) await ctx.replyWithPhoto(c.foto,{caption:cap,...kb});
    else if(c.foto?.startsWith('data:image')){ const buf=Buffer.from(c.foto.split(',')[1],'base64'); await ctx.replyWithPhoto({source:buf},{caption:cap,...kb}); }
    else await ctx.reply(cap,kb);
  }catch{ await ctx.reply(cap,kb); }
}

bot.start((ctx)=>ctx.reply(BIENVENIDA, getMenuInline()));
bot.command('menu',(ctx)=>ctx.reply('Elige categoría 👇', getMenuInline()));

// PANEL ADMIN - SOLO TU ID 8695673050
bot.command('admin', async (ctx)=>{
  if(ctx.from.id!= 8695673050) return ctx.reply('⛔ No eres admin');
  await ctx.reply(`⚙️ PANEL ADMIN\n\nTu ID: ${ctx.from.id}\nLayout: ${configBot.layout}\nEmoji: ${configBot.emoji}\nPlantilla: ${configBot.plantilla}`, Markup.inlineKeyboard([
    [Markup.button.callback('📐 1 por fila','cfg_layout_1x1'), Markup.button.callback('📐 2 por fila','cfg_layout_2x2')],
    [Markup.button.callback('🔥 Fuego','cfg_emoji_fuego'), Markup.button.callback('🟣 Neon','cfg_emoji_neon'), Markup.button.callback('▫️ Simple','cfg_emoji_clasico')],
    [Markup.button.callback('💎 VIP','cfg_plant_vip'), Markup.button.callback('⚪ Minimal','cfg_plant_minimal'), Markup.button.callback('🥵 XXX','cfg_plant_xxx')],
    [Markup.button.callback('👁️ Ver como usuario','volver_menu')]
  ]));
});

bot.action(/^cfg_/, async (ctx)=>{
  if(ctx.from.id!= 8695673050) return ctx.answerCbQuery({text:"No eres admin"});
  const d=ctx.callbackQuery.data;
  if(d.startsWith('cfg_layout_')) configBot.layout=d.replace('cfg_layout_','');
  if(d.startsWith('cfg_emoji_')) configBot.emoji=d.replace('cfg_emoji_','');
  if(d.startsWith('cfg_plant_')) configBot.plantilla=d.replace('cfg_plant_','');
  await setDoc(doc(db,"config","bot"), configBot);
  await ctx.answerCbQuery({text:`Guardado ✅`});
  await ctx.reply(`✅ Nuevo diseño guardado:\n${JSON.stringify(configBot,null,2)}`, getMenuInline());
});

bot.action('volver_menu', async (ctx)=>{ await ctx.answerCbQuery().catch(()=>{}); await ctx.reply(BIENVENIDA, getMenuInline()); });
bot.action(/^sec_/, async (ctx)=>{ await mandarSeccion(ctx.callbackQuery.data.replace('sec_',''), ctx); });
bot.action(/^ver_/, async (ctx)=>{ await mandarUnChat(ctx.callbackQuery.data.replace('ver_',''), ctx); });

(async()=>{ await bot.telegram.deleteWebhook().catch(()=>{}); await bot.launch(); console.log('BOT ADMIN 8695673050 ON'); })();
const app2=express();
app2.get('/',(req,res)=>res.send('Bot Sexomania Admin ON'));
app2.get('/ping',(req,res)=>res.send('pong'));
app2.listen(process.env.PORT||3000, ()=>console.log('Web OK'));
