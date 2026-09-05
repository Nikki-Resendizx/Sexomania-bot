const { Telegraf, Markup } = require('telegraf');
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, where, doc, getDoc, setDoc } = require('firebase/firestore');
const express = require('express');

const bot = new Telegraf(process.env.BOT_TOKEN);
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
let configBot = { layout: "1x1", emoji: "fuego", plantilla: "vip" };
async function cargarConfig(){ try{ const s=await getDoc(doc(db,"config","bot")); if(s.exists()) configBot={...configBot,...s.data()}; }catch{} } cargarConfig();

const BIENVENIDA = `╔═══ 🔥🅢🅔🅧🅞🅜🅐🅝🅘🅐🔥 ═══╗

> 💦 𝐁𝐢𝐞𝐧𝐯𝐞𝐧𝐢𝐝𝐨 𝐚 𝐥𝐚 𝐩𝐞𝐫𝐯𝐞𝐫𝐬𝐢𝐨‌𝐧 𝐭𝐨𝐭𝐚𝐥...

> 𝐸𝑠𝑡𝑜 𝑒𝑠 🔥🅢🅔🅧🅞🅜🅐🅝🅘🅐🔥 ᴸⁱⁿᵏˢ
> 𝐸𝑙 𝑖𝑛𝑓𝑖𝑒𝑟𝑛𝑜 𝑑𝑜𝑛𝑑𝑒 𝑡𝑜𝑑𝑜𝑠 𝑞𝑢𝑖𝑒𝑟𝑒𝑛 𝑒𝑠𝑡𝑎𝑟 😈

> 📁 ❼ 𝐂𝐀𝐓𝐄𝐆𝐎𝐑𝐈𝐀𝐒 𝐃𝐈𝐒𝐓𝐈𝐍𝐓𝐀𝐒

> 🔞 𝗖𝗔𝗡𝗔𝗟𝗘𝗦 𝗫𝗫𝗫
> 👥 𝗚𝗥𝗨𝗣𝗢𝗦 𝗫𝗫
> 💸 𝗚𝗥𝗨𝗣𝗢𝗦 𝗩𝗘𝗡𝗧𝗔
> 📣 𝗣𝗨𝗕𝗟𝗜𝗖𝗜𝗧𝗔𝗥𝗜𝗢𝗦
> 🍿 𝗘𝗡𝗧𝗥𝗘𝗧𝗘𝗡𝗜𝗠𝗜𝗘𝗡𝗧𝗢
> 🎨 𝗔𝗥𝗧𝗘
> 🤖 𝗕𝗢𝗧𝗦

> 🌟 𝑨𝒈𝒓𝒆𝒈𝒂 𝒏𝒖𝒆𝒔𝒕𝒓𝒐𝒔 𝒃𝒐𝒕𝒔 𝒅𝒆 𝒅𝒊𝒇𝒖𝒔𝒊𝒐𝒏
> ⚡ 𝑰𝒏𝒈𝒓𝒆𝒔𝒂 𝒍𝒐𝒔 2 𝒃𝒐𝒕𝒔 𝒚 𝒕𝒆𝒏 𝒎𝒂𝒚𝒐𝒓 𝒂𝒍𝒄𝒂𝒏𝒄𝒆

> ¿𝗧𝗲 𝗮𝘁𝗿𝗲𝘃𝗲𝘀 𝗮 𝗲𝗻𝘁𝗿𝗮𝗿? 👇

╚═══ 🔥🅢🅔🅧🅞🅜🅐🅝🅘🅐🔥 ═══╝`;

function parseColor(texto){
  if(!texto) return texto;
  if(texto.includes('#g')) return '🟢 ' + texto.replace(/#g/g,'').trim();
  if(texto.includes('#r')) return '🔴 ' + texto.replace(/#r/g,'').trim();
  if(texto.includes('#p')) return '🔵 ' + texto.replace(/#p/g,'').trim();
  if(texto.includes('#y')) return '🟡 ' + texto.replace(/#y/g,'').trim();
  return texto;
}

function getEmoji(){ if(configBot.emoji==="neon") return {c:"🟣",g:"🟢",v:"🟡",p:"🔵",e:"🟠",a:"💗",b:"⚪"}; if(configBot.emoji==="clasico") return {c:"▫️",g:"▫️",v:"▫️",p:"▫️",e:"▫️",a:"▫️",b:"▫️"}; return {c:"🔞",g:"👥",v:"💸",p:"📣",e:"🍿",a:"🎨",b:"🤖"}; }

function getMenuInline(){
  const em=getEmoji();
  const b=[
    [Markup.button.callback(`${em.c} CANALES XXX`,'sec_CANALES ADULTOS')],
    [Markup.button.callback(`${em.g} GRUPOS XXX`,'sec_GRUPOS ADULTOS')],
    [Markup.button.callback(`${em.v} GRUPOS VENTAS`,'sec_VENTAS')],
    [Markup.button.callback(`${em.p} PUBLICITARIOS`,'sec_PUBLICITARIOS')],
    [Markup.button.callback(`${em.e} ENTRETENIMIENTO`,'sec_ENTRETENIMIENTO')],
    [Markup.button.callback(`${em.a} ARTE`,'sec_ARTE')],
    [Markup.button.callback(`${em.b} BOTS`,'sec_BOTS')]
  ];
  if(configBot.layout==="2x2") return Markup.inlineKeyboard([[b[0][0],b[1][0]],[b[2][0],b[3][0]],[b[4][0],b[5][0]],[b[6][0]],[Markup.button.url('🌐 APP OFICIAL','https://sexomania-links.netlify.app')]]);
  b.push([Markup.button.url('🌐 APP OFICIAL','https://sexomania-links.netlify.app')]);
  return Markup.inlineKeyboard(b);
}

function textoSeguro(t){ if(!t) return "Chat"; t=parseColor(t); let b=0,r=""; for(const c of t){ const bl=Buffer.byteLength(c,'utf8'); if(b+bl>28) break; b+=bl; r+=c; } return r.trim()||"Chat"; }

async function mandarSeccion(sec, ctx){ await ctx.answerCbQuery().catch(()=>{}); const snap=await getDocs(query(collection(db,"chats"),where("seccion","==",sec))); if(snap.empty) return ctx.reply(`😈 Nada en ${sec}`,getMenuInline()); cacheChats={}; let btns=[]; snap.forEach(d=>{cacheChats[d.id]={id:d.id,...d.data()}; btns.push([Markup.button.callback(`${textoSeguro(d.data().nombre)} | ${d.data().clicks||0}`,`ver_${d.id}`)])}); btns.push([Markup.button.callback('⬅️ VOLVER AL MENU','volver_menu')]); await ctx.reply(`📁 ${sec} - Toca un nombre:`,Markup.inlineKeyboard(btns)); }

function getCaption(c){
  return `╔═══ 🔥🅢🅔🅧🅞🅜🅐🅝🅘🅐🔥 ═══╗

> 📁 𝘾𝘼𝙏𝙀𝙂𝙊𝙍𝙄𝘼:
> ${c.seccion}

> ✍🏻 𝙉𝙊𝙈𝘽𝙍𝙀 𝘿𝙀𝙇 𝘾𝙃𝘼𝙏 ✍🏻
> 《 ${c.nombre} 》

> 📝 𝘿𝙀𝙎𝘾𝙍𝙄𝙋𝘾𝙄𝙊𝙉 📝

${c.desc}

> 👁️ ${c.clicks||0} 𝗩𝗜𝗦𝗧𝗔𝗦

╚═══ 🔥🅢🅔🅧🅞🅜🅐🅝🅘🅐🔥 ═══╝`;
}

async function mandarUnChat(id, ctx){ await ctx.answerCbQuery().catch(()=>{}); let c=cacheChats[id]; if(!c){ const s=await getDoc(doc(db,"chats",id)); if(!s.exists()) return ctx.reply('No existe'); c={id:s.id,...s.data()}; } const cap=getCaption(c); const kb=Markup.inlineKeyboard([[Markup.button.url('⚡ UNETE AQUI ⚡',c.link)],[Markup.button.url('🔘 + Botonera','https://t.me/Sexomanialinksbot'),Markup.button.url('📝 + Listas','https://t.me/SexomaniaListas_Bot')],[Markup.button.callback('⬅️ ATRAS',`sec_${c.seccion}`)]]); try{ if(c.foto?.startsWith('http')) await ctx.replyWithPhoto(c.foto,{caption:cap,...kb}); else if(c.foto?.startsWith('data:image')){ const buf=Buffer.from(c.foto.split(',')[1],'base64'); await ctx.replyWithPhoto({source:buf},{caption:cap,...kb}); } else await ctx.reply(cap,kb); }catch{ await ctx.reply(cap,kb); } }

bot.start((ctx)=>ctx.reply(BIENVENIDA,getMenuInline()));
bot.command('menu',(ctx)=>ctx.reply('Elige 👇',getMenuInline()));
bot.command('admin', async (ctx)=>{ if(ctx.from.id!=8695673050) return ctx.reply('⛔ No eres admin'); await ctx.reply(`⚙️ PANEL ADMIN\n\nPara colores usa en el NOMBRE:\n#g = 🟢 verde\n#r = 🔴 rojo\n#p = 🔵 azul\n#y = 🟡 amarillo\n\nEj: #g Mi Grupo XXX`,Markup.inlineKeyboard([[Markup.button.callback('📐 1x1','cfg_layout_1x1'),Markup.button.callback('📐 2x2','cfg_layout_2x2')],[Markup.button.callback('🔥 Fuego','cfg_emoji_fuego'),Markup.button.callback('🟣 Neon','cfg_emoji_neon')],[Markup.button.callback('👁️ Ver menu','volver_menu')]])); });
bot.action(/^cfg_/, async (ctx)=>{ if(ctx.from.id!=8695673050) return; const d=ctx.callbackQuery.data; if(d.startsWith('cfg_layout_')) configBot.layout=d.replace('cfg_layout_',''); if(d.startsWith('cfg_emoji_')) configBot.emoji=d.replace('cfg_emoji_',''); await setDoc(doc(db,"config","bot"),configBot); await ctx.answerCbQuery({text:"Guardado ✅"}); await ctx.reply(`✅ Guardado`,getMenuInline()); });
bot.action('volver_menu', async (ctx)=>{ await ctx.answerCbQuery().catch(()=>{}); await ctx.reply(BIENVENIDA,getMenuInline()); });
bot.action(/^sec_/, async (ctx)=>{ await mandarSeccion(ctx.callbackQuery.data.replace('sec_',''),ctx); });
bot.action(/^ver_/, async (ctx)=>{ await mandarUnChat(ctx.callbackQuery.data.replace('ver_',''),ctx); });

(async()=>{ await bot.telegram.deleteWebhook().catch(()=>{}); await bot.launch(); console.log('BOT FINAL CON MARCOS ON'); })();
const app2=express(); app2.get('/',(r,s)=>s.send('ON')); app2.get('/ping',(r,s)=>s.send('pong')); app2.listen(process.env.PORT||3000);
