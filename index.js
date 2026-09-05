const { Telegraf, Markup } = require('telegraf');
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, where, doc, getDoc, setDoc, updateDoc, increment } = require('firebase/firestore');
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
let pendingEdits = {};
let configBot = { catColors: {} };
(async()=>{ try{ const s=await getDoc(doc(db,"config","bot")); if(s.exists()) configBot={...configBot,...s.data()}; }catch{} })();

function parseColor(t){
  if(!t) return t;
  if(t.includes('#g')) return '🟢 ' + t.replace(/#g/g,'').trim();
  if(t.includes('#r')) return '🔴 ' + t.replace(/#r/g,'').trim();
  if(t.includes('#p')) return '🔵 ' + t.replace(/#p/g,'').trim();
  if(t.includes('#y')) return '🟡 ' + t.replace(/#y/g,'').trim();
  return t;
}
function textoSeguro(t){ if(!t) return "Chat"; t=parseColor(t); let b=0,r=""; for(const c of t){ const bl=Buffer.byteLength(c,'utf8'); if(b+bl>28) break; b+=bl; r+=c; } return r.trim()||"Chat"; }
function getColorEmoji(cat){ const col=configBot.catColors?.[cat]||""; if(col==="#g") return "🟢"; if(col==="#r") return "🔴"; if(col==="#p") return "🔵"; if(col==="#y") return "🟡"; return ""; }

function extraerBotonesDeDescripcion(desc){
  const botones=[]; const lineas=(desc||"").split('\n'); let descripcionLimpia=[];
  for(let linea of lineas){
    let l=linea.trim();
    let m=l.match(/^#(p|r|g|y)\s*(.+?)\s*-\s*(https?:\/\/\S+|t\.me\/\S+|@\S+)/i);
    if(m){
      let color=m[1].toLowerCase(); let texto=m[2].trim(); let url=m[3].trim();
      if(url.startsWith('t.me')||url.startsWith('@')) url='https://'+url.replace('@','t.me/');
      if(!url.startsWith('http')) url='https://'+url;
      let emoji=color==='r'?'🔴':color==='g'?'🟢':color==='y'?'🟡':'🔵';
      botones.push({texto:`${emoji} ${texto}`, url});
    }else descripcionLimpia.push(linea);
  }
  return {botones, descripcionLimpia: descripcionLimpia.join('\n').trim()};
}

function getBienvenida(ctx){
  const nombre = ctx.from.first_name || 'Bebe';
  const mention = `<a href="tg://user?id=${ctx.from.id}">${nombre}</a>`;
  return `🔥﹡﹡🔥﹡﹡🔥﹡﹡🔥﹡﹡🔥﹡﹡🔥﹡﹡🔥

💦 ${mention} 𝐁𝐢𝐞𝐧𝐯𝐞𝐧𝐢𝐝𝐨 𝐚 𝐥𝐚 𝐩𝐞𝐫𝐯𝐞𝐫𝐬𝐢𝐨‌𝐧 𝐭𝐨𝐭𝐚𝐥...

   🔥🅢🅔🅧🅞🅜🅐🅝🅘🅐🔥 ᴸⁱⁿᵏˢ
𝐸𝑙 𝑖𝑛𝑓𝑖𝑒𝑟𝑛𝑜 𝑑𝑜𝑛𝑑𝑒 𝑡𝑜𝑑𝑜𝑠 𝑞𝑢𝑖𝑒𝑟𝑒𝑛 𝑒𝑠𝑡𝑎𝑟 😈
   🔥 𝗘𝗻𝗰𝗼𝗻𝘁𝗿𝗮𝗿𝗮𝘀 𝗟𝗶𝗻𝗸𝘀 𝗱𝗲 🔥
<blockquote>━━━━━━━━━━━━━━━━━━━━━━━━━
🔞 𝗖𝗔𝗡𝗔𝗟𝗘𝗦 𝗫𝗫𝗫
🔞 𝗚𝗥𝗨𝗣𝗢𝗦 𝗫𝗫𝗫
💸 𝗚𝗥𝗨𝗣𝗢𝗦 𝗗𝗘 𝗩𝗘𝗡𝗧𝗔
📣 𝗣𝗨𝗕𝗟𝗜𝗖𝗜𝗧𝗔𝗥𝗜𝗢𝗦
🍿 𝗘𝗡𝗧𝗥𝗘𝗧𝗘𝗡𝗜𝗠𝗜𝗘𝗡𝗧𝗢
🎨 𝗖𝗔𝗡𝗔𝗟𝗘𝗦 𝗗𝗘 𝗔𝗥𝗧𝗘
🤖 𝗟𝗢𝗦 𝗠𝗘𝗝𝗢𝗥𝗘𝗦 𝗕𝗢𝗧𝗦
━━━━━━━━━━━━━━━━━━━━━━━━━</blockquote>
🌟 𝑷𝒂𝒓𝒂 𝒑𝒂𝒓𝒕𝒊𝒄𝒊𝒑𝒂𝒓, 𝒔𝒐𝒍𝒐 𝒅𝒆𝒃𝒆𝒔 𝒂𝒈𝒓𝒆𝒈𝒂𝒓 𝒏𝒖𝒆𝒔𝒕𝒓𝒐𝒔 𝒃𝒐𝒕𝒔 𝒅𝒆 𝒅𝒊𝒇𝒖𝒔𝒊𝒐𝒏, 𝒑𝒖𝒆𝒅𝒆 𝒔𝒆𝒓 𝒆𝒍 𝒅𝒆 𝒃𝒐𝒕𝒐𝒏𝒆𝒔 𝒐 𝒆𝒍 𝒅𝒆 𝒍𝒊𝒔𝒕𝒂𝒔.

⚡ 𝑺𝑰 𝑮𝑼𝑺𝑻𝑨𝑺 𝑷𝑼𝑬𝑫𝑬𝑺 𝑰𝑵𝑮𝑹𝑬𝑺𝑨𝑹 𝑳𝑶𝑺 𝑫𝑶𝑺 𝑩𝑶𝑻𝑺 𝒀 𝑯𝑨𝑪𝑬𝑹 𝑻𝑬𝑵𝑬𝑹 𝑴𝑨𝒀𝑶𝑹 𝑨𝑳𝑪𝑨𝑵𝑪𝑬 ⚡

¿𝗧𝗲 𝗮𝘁𝗿𝗲𝘃𝗲𝘀 𝗮 𝗲𝗻𝘁𝗿𝗮𝗿? 𝗘𝗹𝗶𝗴𝗲 𝗮𝗯𝗮𝗷𝗼 𝘆 𝗻𝗼 𝗵𝗮𝘆 𝘃𝘂𝗲𝗹𝘁𝗮 𝗮𝘁𝗿𝗮‌𝘀 👇

🔥﹡﹡🔥﹡﹡🔥﹡﹡🔥﹡﹡🔥﹡﹡🔥﹡﹡🔥`;
}

function getCaption(c, descLimpia){
const nombreLimpio = c.nombre.replace(/#g|#r|#p|#y/g,'').trim();
const emojiMap = {'𝗖𝗔𝗡𝗔𝗟𝗘𝗦 𝗫𝗫𝗫':'🔞','𝗚𝗥𝗨𝗣𝗢𝗦 𝗫𝗫𝗫':'🔞','𝗚𝗥𝗨𝗣𝗢𝗦 𝗗𝗘 𝗩𝗘𝗡𝗧𝗔':'💸','𝗣𝗨𝗕𝗟𝗜𝗖𝗜𝗧𝗔𝗥𝗜𝗢𝗦':'📣','𝗘𝗡𝗧𝗥𝗘𝗧𝗘𝗡𝗜𝗠𝗜𝗘𝗡𝗧𝗢':'🍿','𝗖𝗔𝗡𝗔𝗟𝗘𝗦 𝗗𝗘 𝗔𝗥𝗧𝗘':'🎨','𝗟𝗢𝗦 𝗠𝗘𝗝𝗢𝗥𝗘𝗦 𝗕𝗢𝗧𝗦':'🤖'};
let emojiCat = '🔥';
for(let k in emojiMap){ if(c.seccion.includes(k)) emojiCat=emojiMap[k]; }
return `🔥﹡﹡🔥﹡﹡🔥﹡﹡🔥﹡﹡🔥﹡﹡🔥﹡﹡🔥

  ㅤ🗂️ 𝗖𝗔𝗧𝗘𝗚𝗢𝗥𝗜𝗔⠅${emojiCat} ${c.seccion} ${emojiCat}
  ♡━━━━━━━━━━━━━━━━━━━━━━━━━━♡

    🇳 🇴 🇲 🇧 🇷 🇪   🇩 🇪 🇱   🇨 🇭 🇦 🇹 
<blockquote>${bold} ${nombreLimpio} ${textocentrado} ${bold}</blockquote> 𝄇</blockquote>

🔥﹡﹡🔥﹡﹡🔥﹡﹡🔥﹡﹡🔥﹡﹡🔥﹡﹡🔥

ㅤㅤㅤ🇩 🇪 🇸 🇨 🇷 🇮 🇵 🇨 🇮 🇴 🇳 
<blockquote>${bold} ${descLimpia || c.desc || "Sin descripcion"} ${bold}</blockquote>

ㅤㅤ📊 𝘼𝙇𝘾𝘼𝙉𝘾𝙀 𝙏𝙊𝙏𝘼𝙇⠅ 👁️ ${c.clicks||0} 𝚅𝙸𝚂𝚃𝙰𝚂
♡━━━━━━━━━━━━━━━━━━━━━━━━━━♡

🔥﹡﹡🔥﹡﹡🔥﹡﹡🔥﹡﹡🔥﹡﹡🔥﹡﹡🔥`;
}

function getMenuInline(){
  return Markup.inlineKeyboard([
    [Markup.button.callback(`${getColorEmoji('CANALES ADULTOS')} 🔞 𝗖𝗔𝗡𝗔𝗟𝗘𝗦 𝗗𝗘 𝗔𝗣𝗢𝗥𝗧𝗘𝗦 𝗫𝗫`.trim(),'sec_CANALES ADULTOS')],
    [Markup.button.callback(`${getColorEmoji('GRUPOS ADULTOS')} 👥 𝗚𝗥𝗨𝗣𝗢𝗦 𝗗𝗘 𝗔𝗣𝗢𝗥𝗧𝗘𝗦 𝗫𝗫`.trim(),'sec_GRUPOS ADULTOS')],
    [Markup.button.callback(`${getColorEmoji('VENTAS')} 💸 𝗚𝗥𝗨𝗣𝗢𝗦 𝗗𝗘 𝗩𝗘𝗡𝗧𝗔`.trim(),'sec_VENTAS')],
    [Markup.button.callback(`${getColorEmoji('PUBLICITARIOS')} 📣 𝗖𝗔𝗡𝗔𝗟𝗘𝗦 𝗣𝗨𝗕𝗟𝗜𝗖𝗜𝗧𝗔𝗥𝗜𝗢𝗦`.trim(),'sec_PUBLICITARIOS')],
    [Markup.button.callback(`${getColorEmoji('ENTRETENIMIENTO')} 🍿 𝗖𝗔𝗡𝗔𝗟𝗘𝗦 𝗗𝗘 𝗘𝗡𝗧𝗥𝗘𝗧𝗘𝗡𝗜𝗠𝗜𝗘𝗡𝗧𝗢`.trim(),'sec_ENTRETENIMIENTO')],
    [Markup.button.callback(`${getColorEmoji('ARTE')} 🎨 𝗖𝗔𝗡𝗔𝗟𝗘𝗦 𝗗𝗘 𝗔𝗥𝗧𝗘`.trim(),'sec_ARTE')],
    [Markup.button.callback(`${getColorEmoji('BOTS')} 🤖 𝗟𝗢𝗦 𝗠𝗘𝗝𝗢𝗥𝗘𝗦 𝗕𝗢𝗧𝗦`.trim(),'sec_BOTS')],
    [Markup.button.url('🌐 𝗣𝗔𝗡𝗘𝗟 𝗦𝗘𝗫𝗢𝗠𝗔𝗡𝗜𝗔 𝗟𝗜𝗡𝗞𝗦 🖥️','http://t.me/SexomaniaLinkbot/Panel')],
    [Markup.button.url('🌐 APP OFICIAL','https://sexomania-links.netlify.app')]
  ]);
}
function getAdminCatKeyboard(){
  const cats=['CANALES ADULTOS','GRUPOS ADULTOS','VENTAS','PUBLICITARIOS','ENTRETENIMIENTO','ARTE','BOTS'];
  let btns=[]; for(let c of cats){ let col=configBot.catColors?.[c]||"⚪"; btns.push([Markup.button.callback(`${col} ${c}`, 'editcat_'+c)]); }
  btns.push([Markup.button.callback('⬅️ Volver','volver_menu')]); return Markup.inlineKeyboard(btns);
}
async function mandarSeccion(sec,ctx){
  await ctx.answerCbQuery().catch(()=>{}); const snap=await getDocs(query(collection(db,"chats"),where("seccion","==",sec)));
  if(snap.empty) return ctx.reply(`😈 Nada en ${sec}`,getMenuInline());
  cacheChats={}; let btns=[]; snap.forEach(d=>{cacheChats[d.id]={id:d.id,...d.data()}; btns.push([Markup.button.callback(`${textoSeguro(d.data().nombre)} | ${d.data().clicks||0}`,`ver_${d.id}`)])});
  btns.push([Markup.button.callback('⬅️ VOLVER AL MENU','volver_menu')]); await ctx.reply(`📁 ${sec}:`,Markup.inlineKeyboard(btns));
}

async function mandarUnChat(id,ctx){
  await ctx.answerCbQuery().catch(()=>{});
  let c=cacheChats[id];
  if(!c){ const s=await getDoc(doc(db,"chats",id)); if(!s.exists()) return ctx.reply('No existe'); c={id:s.id,...s.data()}; }

  // CONTADOR DE VISTAS
  try{
    await updateDoc(doc(db,"chats",id), {clicks: increment(1)});
    c.clicks = (c.clicks||0)+1;
    if(cacheChats[id]) cacheChats[id].clicks = c.clicks;
  }catch{}

  const {botones, descripcionLimpia}=extraerBotonesDeDescripcion(c.desc);
  const cap=getCaption(c,descripcionLimpia);

  let kb=[];
  for(let b of botones) kb.push([Markup.button.url(b.texto,b.url)]);
  if(kb.length===0) kb.push([Markup.button.url('⚡ UNETE AQUI ⚡',c.link)]);
  kb.push([Markup.button.url('🔘 + Botonera','https://t.me/Sexomanialinksbot'),Markup.button.url('📝 + Listas','https://t.me/SexomaniaListas_Bot')]);

  if(ctx.from.id==8695673050){
    kb.push([Markup.button.callback('🟢','setcolor_'+id+'_#g'),Markup.button.callback('🔴','setcolor_'+id+'_#r'),Markup.button.callback('🔵','setcolor_'+id+'_#p'),Markup.button.callback('🟡','setcolor_'+id+'_#y'),Markup.button.callback('⚪','setcolor_'+id+'_none')]);
    kb.push([Markup.button.callback('🎨 EDITAR BOTONES','editbtns_'+id)]);
    kb.push([Markup.button.callback('🗑️ BORRAR BOTONES','clearbtns_'+id)]);
  }
  kb.push([Markup.button.callback('⬅️ Volver','sec_'+c.seccion)]);
  const kbd=Markup.inlineKeyboard(kb);

  // --- AQUI ESTA LA IMAGEN QUE ME PEDISTE ---
  try{
    if(c.foto && c.foto.startsWith('http')){
      await ctx.replyWithPhoto(c.foto,{caption:cap,parse_mode:'HTML',...kbd});
    } else if(c.foto && c.foto.startsWith('data:image')){
      const buf = Buffer.from(c.foto.split(',')[1],'base64');
      await ctx.replyWithPhoto({source: buf},{caption:cap,parse_mode:'HTML',...kbd});
    } else {
      await ctx.reply(cap,{parse_mode:'HTML',...kbd});
    }
  }catch(e){
    await ctx.reply(cap,{parse_mode:'HTML',...kbd});
  }
}

bot.start((ctx)=>ctx.reply(getBienvenida(ctx),{parse_mode:'HTML',...getMenuInline()}));
bot.command('menu',(ctx)=>ctx.reply(getBienvenida(ctx),{parse_mode:'HTML',...getMenuInline()}));
bot.command('admin', async (ctx)=>{ if(ctx.from.id!=8695673050) return ctx.reply('⛔ No admin'); await ctx.reply(`⚙️ PANEL ADMIN`, Markup.inlineKeyboard([[Markup.button.callback('🎨 COLORES CATEGORIAS','admin_cats')],[Markup.button.callback('👁️ Ver menu','volver_menu')]])); });
bot.action('admin_cats', async (ctx)=>{ if(ctx.from.id!=8695673050) return; await ctx.answerCbQuery().catch(()=>{}); await ctx.reply(`🎨 COLORES CATEGORIAS:`, getAdminCatKeyboard()); });
bot.action(/^editcat_/, async (ctx)=>{ if(ctx.from.id!=8695673050) return; const cat=ctx.callbackQuery.data.replace('editcat_',''); await ctx.answerCbQuery().catch(()=>{}); await ctx.reply(`Color para ${cat}:`, Markup.inlineKeyboard([[Markup.button.callback('🟢 Verde','setcatcolor_'+cat+'_#g'),Markup.button.callback('🔴 Rojo','setcatcolor_'+cat+'_#r')],[Markup.button.callback('🔵 Azul','setcatcolor_'+cat+'_#p'),Markup.button.callback('🟡 Amarillo','setcatcolor_'+cat+'_#y')],[Markup.button.callback('⚪ Sin color','setcatcolor_'+cat+'_none')],[Markup.button.callback('⬅️ Atras','admin_cats')]])); });
bot.action(/^setcatcolor_/, async (ctx)=>{ if(ctx.from.id!=8695673050) return; await ctx.answerCbQuery().catch(()=>{}); const data=ctx.callbackQuery.data.replace('setcatcolor_',''); const last=data.lastIndexOf('_'); const cat=data.substring(0,last); const color=data.substring(last+1); if(!configBot.catColors) configBot.catColors={}; if(color==='none') delete configBot.catColors[cat]; else configBot.catColors[cat]=color; await setDoc(doc(db,"config","bot"),configBot,{merge:true}); await ctx.reply(`✅ ${cat} -> ${color}`, getAdminCatKeyboard()); await ctx.reply(`Preview:`, getMenuInline()); });
bot.action(/^editbtns_/, async (ctx)=>{ if(ctx.from.id!=8695673050) return; await ctx.answerCbQuery().catch(()=>{}); const id=ctx.callbackQuery.data.replace('editbtns_',''); pendingEdits[ctx.from.id]=id; await ctx.reply(`🎨 Manda botones:\n#p Texto - https://t.me/link\n#r Texto - link\n#g Texto - link\n\n/cancel para cancelar`); });
bot.action(/^clearbtns_/, async (ctx)=>{ if(ctx.from.id!=8695673050) return; const id=ctx.callbackQuery.data.replace('clearbtns_',''); const ref=doc(db,"chats",id); const snap=await getDoc(ref); const {descripcionLimpia}=extraerBotonesDeDescripcion(snap.data().desc); await updateDoc(ref,{desc:descripcionLimpia}); if(cacheChats[id]) cacheChats[id].desc=descripcionLimpia; await ctx.answerCbQuery({text:"Borrados ✅"}); await ctx.reply("✅ Borrados"); });
bot.action(/^setcolor_/, async (ctx)=>{ if(ctx.from.id!=8695673050) return; await ctx.answerCbQuery().catch(()=>{}); const data=ctx.callbackQuery.data.replace('setcolor_',''); const last=data.lastIndexOf('_'); const id=data.substring(0,last); const color=data.substring(last+1); const ref=doc(db,"chats",id); const snap=await getDoc(ref); let nombreActual=snap.data().nombre.replace(/#g|#r|#p|#y/g,'').trim(); let nuevo=color==='none'?nombreActual:`${nombreActual} ${color}`; await updateDoc(ref,{nombre:nuevo}); if(cacheChats[id]) cacheChats[id].nombre=nuevo; await ctx.reply(`✅ ${nuevo}`); });
bot.command('cancel',(ctx)=>{ delete pendingEdits[ctx.from.id]; ctx.reply("❌ Cancelado"); });
bot.on('text', async (ctx,next)=>{ if(ctx.from.id!=8695673050) return next(); if(!pendingEdits[ctx.from.id]) return next(); const id=pendingEdits[ctx.from.id]; const textoNuevo=ctx.message.text; if(textoNuevo.startsWith('/')) return next(); try{ const ref=doc(db,"chats",id); const snap=await getDoc(ref); const {descripcionLimpia}=extraerBotonesDeDescripcion(snap.data().desc); const nuevaDesc=descripcionLimpia+"\n"+textoNuevo; await updateDoc(ref,{desc:nuevaDesc}); if(cacheChats[id]) cacheChats[id].desc=nuevaDesc; delete pendingEdits[ctx.from.id]; await ctx.reply(`✅ Guardado!`); }catch(e){ await ctx.reply("Error: "+e.message); } });
bot.action('volver_menu', async (ctx)=>{ await ctx.answerCbQuery().catch(()=>{}); await ctx.reply(getBienvenida(ctx),{parse_mode:'HTML',...getMenuInline()}); });
bot.action(/^sec_/, async (ctx)=>{ await mandarSeccion(ctx.callbackQuery.data.replace('sec_',''),ctx); });
bot.action(/^ver_/, async (ctx)=>{ await mandarUnChat(ctx.callbackQuery.data.replace('ver_',''),ctx); });
(async()=>{ await bot.telegram.deleteWebhook().catch(()=>{}); await bot.launch(); console.log('BOT CON IMAGEN ON'); })();
const app2=express(); app2.get('/',(r,s)=>s.send('ON')); app2.listen(process.env.PORT||3000);
