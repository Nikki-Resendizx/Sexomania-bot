const { Telegraf, Markup } = require('telegraf');
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, where, doc, getDoc, setDoc, updateDoc } = require('firebase/firestore');
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
let configBot = { layout: "1x1", emoji: "fuego" };
async function cargarConfig(){ try{ const s=await getDoc(doc(db,"config","bot")); if(s.exists()) configBot={...configBot,...s.data()}; }catch{} } cargarConfig();

function parseColor(t){
  if(!t) return t;
  if(t.includes('#g')) return '🟢 ' + t.replace(/#g/g,'').trim();
  if(t.includes('#r')) return '🔴 ' + t.replace(/#r/g,'').trim();
  if(t.includes('#p')) return '🔵 ' + t.replace(/#p/g,'').trim();
  if(t.includes('#y')) return '🟡 ' + t.replace(/#y/g,'').trim();
  return t;
}
function getEmoji(){
  if(configBot.emoji==="neon") return {c:"🟣",g:"🟢",v:"🟡",p:"🔵",e:"🟠",a:"💗",b:"⚪"};
  return {c:"🔞",g:"👥",v:"💸",p:"📣",e:"🍿",a:"🎨",b:"🤖"};
}
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

function getCaption(c){
const nombreLimpio = c.nombre.replace(/#g|#r|#p|#y/g,'').trim();
return `· • • •⊰🔥𖤍⋆🅢🅔🅧🅞🅜🅐🅝🅘🅐⋆𖤍🔥⊱• • • ·

<blockquote>═══◄•• 𝘾𝘼𝙏𝙀𝙂𝙊𝙍𝙄𝘼 ••►═══</blockquote>
》 ${c.seccion} 《

<blockquote>═══◄••𝙉𝙊𝙈𝘽𝙍𝙀 𝘿𝙀𝙇 𝘾𝙃𝘼𝙏••►═══</blockquote>
》 ${nombreLimpio} 《

<blockquote>═══◄•• 𝘿𝙀𝙎𝘾𝙍𝙄𝙋𝘾𝙄𝙊𝙉 ••►═══</blockquote>

${c.desc}

<blockquote>📊 𝘼𝙇𝘾𝘼𝙉𝘾𝙀 𝙏𝙊𝙏𝘼𝙇⠅ 👁️ ${c.clicks||0} 𝚅𝙸𝚂𝚃𝙰𝚂</blockquote>

· • • •⊰🔥𖤍⋆🅢🅔🅧🅞🅜🅐🅝🅘🅐⋆𖤍🔥⊱• • • ·`;
}

async function mandarSeccion(sec, ctx){
  await ctx.answerCbQuery().catch(()=>{});
  const snap=await getDocs(query(collection(db,"chats"),where("seccion","==",sec)));
  if(snap.empty) return ctx.reply(`😈 Nada en ${sec}`,getMenuInline());
  cacheChats={}; let btns=[];
  snap.forEach(d=>{cacheChats[d.id]={id:d.id,...d.data()}; btns.push([Markup.button.callback(`${textoSeguro(d.data().nombre)} | ${d.data().clicks||0}`,`ver_${d.id}`)])});
  btns.push([Markup.button.callback('⬅️ VOLVER AL MENU','volver_menu')]);
  await ctx.reply(`📁 ${sec} - Toca un nombre:`,Markup.inlineKeyboard(btns));
}

async function mandarUnChat(id, ctx){
  await ctx.answerCbQuery().catch(()=>{});
  let c=cacheChats[id];
  if(!c){ const s=await getDoc(doc(db,"chats",id)); if(!s.exists()) return ctx.reply('No existe'); c={id:s.id,...s.data()}; }
  const cap=getCaption(c);
  const esAdmin = ctx.from.id==8695673050;

  let kbButtons = [
    [Markup.button.url('⚡ UNETE AQUI ⚡',c.link)],
    [Markup.button.url('🔘 + Botonera','https://t.me/Sexomanialinksbot'),Markup.button.url('📝 + Listas','https://t.me/SexomaniaListas_Bot')],
  ];

  // SI ERES ADMIN, TE SALEN LOS BOTONES DE COLORES
  if(esAdmin){
    kbButtons.push([
      Markup.button.callback('🟢 Verde','setcolor_'+id+'_#g'),
      Markup.button.callback('🔴 Rojo','setcolor_'+id+'_#r'),
      Markup.button.callback('🔵 Azul','setcolor_'+id+'_#p'),
      Markup.button.callback('🟡 Amarillo','setcolor_'+id+'_#y')
    ]);
    kbButtons.push([Markup.button.callback('⚪ Quitar color','setcolor_'+id+'_none')]);
  }

  kbButtons.push([Markup.button.callback('⬅️ ATRAS',`sec_${c.seccion}`)]);
  const kb=Markup.inlineKeyboard(kbButtons);

  try{
    if(c.foto?.startsWith('http')) await ctx.replyWithPhoto(c.foto,{caption:cap, parse_mode:'HTML',...kb});
    else if(c.foto?.startsWith('data:image')){ const buf=Buffer.from(c.foto.split(',')[1],'base64'); await ctx.replyWithPhoto({source:buf},{caption:cap, parse_mode:'HTML',...kb}); }
    else await ctx.reply(cap,{parse_mode:'HTML',...kb});
  }catch(e){ await ctx.reply(cap,{parse_mode:'HTML',...kb}); }
}

bot.start((ctx)=>ctx.reply(`· • • •⊰🔥𖤍⋆🅢🅔🅧🅞🅜🅐🅝🅘🅐⋆𖤍🔥⊱• • • ·

<blockquote>═══◄•• 𝘽𝙄𝙀𝙉𝙑𝙀𝙉𝙄𝘿𝙊 ••►═══</blockquote>
💦 A la perversion total...

<blockquote>═══◄•• 𝘾𝘼𝙏𝙀𝙂𝙊𝙍𝙄𝘼𝙎 ••►═══</blockquote>
Elige una categoria 👇

· • • •⊰🔥𖤍⋆🅢🅔🅧🅞🅜🅐🅝🅘🅐⋆𖤍🔥⊱• • • ·`,{parse_mode:'HTML',...getMenuInline()}));
bot.command('menu',(ctx)=>ctx.reply('Elige 👇',getMenuInline()));
bot.command('admin', async (ctx)=>{
  if(ctx.from.id!=8695673050) return ctx.reply('⛔ No eres admin');
  await ctx.reply(`⚙️ PANEL ADMIN\n\nAhora puedes cambiar colores directo en el bot. Abre cualquier chat y abajo te salen los colores.`,{...Markup.inlineKeyboard([
    [Markup.button.callback('📐 1x1','cfg_layout_1x1'),Markup.button.callback('📐 2x2','cfg_layout_2x2')],
    [Markup.button.callback('🔥 Fuego','cfg_emoji_fuego'),Markup.button.callback('🟣 Neon','cfg_emoji_neon')],
    [Markup.button.callback('👁️ Ver menu','volver_menu')]
  ])});
});

// CAMBIAR COLOR DIRECTO DESDE EL BOT
bot.action(/^setcolor_/, async (ctx)=>{
  if(ctx.from.id!=8695673050) return ctx.answerCbQuery({text:"⛔ Solo admin"});
  await ctx.answerCbQuery().catch(()=>{});
  const data = ctx.callbackQuery.data.replace('setcolor_','');
  const lastUnderscore = data.lastIndexOf('_');
  const id = data.substring(0, lastUnderscore);
  const color = data.substring(lastUnderscore+1);

  try{
    const ref = doc(db,"chats",id);
    const snap = await getDoc(ref);
    if(!snap.exists()) return ctx.reply('No existe');
    let nombreActual = snap.data().nombre.replace(/#g|#r|#p|#y/g,'').trim();
    let nuevoNombre = color==='none'? nombreActual : `${nombreActual} ${color}`;

    await updateDoc(ref, { nombre: nuevoNombre });
    if(cacheChats[id]) cacheChats[id].nombre = nuevoNombre;

    await ctx.reply(`✅ Color cambiado a ${color==='none'?'SIN COLOR':color}\nNuevo nombre: ${nuevoNombre}\n\nVuelve a abrir la categoria para ver el cambio.`);
  }catch(e){
    await ctx.reply('Error: '+e.message);
  }
});

bot.action(/^cfg_/, async (ctx)=>{ if(ctx.from.id!=8695673050) return; const d=ctx.callbackQuery.data; if(d.startsWith('cfg_layout_')) configBot.layout=d.replace('cfg_layout_',''); if(d.startsWith('cfg_emoji_')) configBot.emoji=d.replace('cfg_emoji_',''); await setDoc(doc(db,"config","bot"),configBot); await ctx.answerCbQuery({text:"Guardado ✅"}); await ctx.reply(`✅ Guardado`,getMenuInline()); });
bot.action('volver_menu', async (ctx)=>{ await ctx.answerCbQuery().catch(()=>{}); await ctx.reply(`· • • •⊰🔥𖤍⋆🅢🅔🅧🅞🅜🅐🅝🅘🅐⋆𖤍🔥⊱• • • ·`,{parse_mode:'HTML',...getMenuInline()}); });
bot.action(/^sec_/, async (ctx)=>{ await mandarSeccion(ctx.callbackQuery.data.replace('sec_',''),ctx); });
bot.action(/^ver_/, async (ctx)=>{ await mandarUnChat(ctx.callbackQuery.data.replace('ver_',''),ctx); });

(async()=>{ await bot.telegram.deleteWebhook().catch(()=>{}); await bot.launch(); console.log('BOT CON COLORES EN BOT ON'); })();
const app2=express(); app2.get('/',(r,s)=>s.send('ON')); app2.get('/ping',(r,s)=>s.send('pong')); app2.listen(process.env.PORT||3000);
