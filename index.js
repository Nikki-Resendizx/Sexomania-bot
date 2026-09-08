require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, where, doc, getDoc, setDoc, updateDoc, increment, deleteDoc } = require('firebase/firestore');
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

const ADMIN_ID = 8695673050;
let cacheChats = {};
let pendingEdits = {};
let pendingAdminEdit = null;
let configBot = { catColors: {}, bienvenida: null, plantilla: null };
let agregarEstado = {};
(async()=>{ try{ const s=await getDoc(doc(db,"config","bot")); if(s.exists()) configBot={...configBot,...s.data()}; }catch{} })();

const CATS_USUARIO = ['CANALES ADULTOS','GRUPOS ADULTOS','VENTAS','PUBLICITARIOS','ENTRETENIMIENTO','ARTE'];
const CAT_BOTS = 'BOTS';

function parseColor(t){ if(!t) return t; if(t.includes('#g')) return '🟢 '+t.replace(/#g/g,'').trim(); if(t.includes('#r')) return '🔴 '+t.replace(/#r/g,'').trim(); if(t.includes('#p')) return '🔵 '+t.replace(/#p/g,'').trim(); if(t.includes('#y')) return '🟡 '+t.replace(/#y/g,'').trim(); return t; }
function textoSeguro(t){ if(!t) return "Chat"; t=parseColor(t); let b=0,r=""; for(const c of t){ const bl=Buffer.byteLength(c,'utf8'); if(b+bl>28) break; b+=bl; r+=c; } return r.trim()||"Chat"; }
function getColorEmoji(cat){ const col=configBot.catColors?.[cat]||""; if(col==="#g") return "🟢"; if(col==="#r") return "🔴"; if(col==="#p") return "🔵"; if(col==="#y") return "🟡"; return ""; }
function extraerBotonesDeDescripcion(desc){
  const botones=[]; const lineas=(desc||"").split('\n'); let descripcionLimpia=[];
  for(let linea of lineas){ let l=linea.trim(); let m=l.match(/^#(p|r|g|y)\s*(.+?)\s*-\s*(https?:\/\/\S+|t\.me\/\S+|@\S+)/i); if(m){ let color=m[1].toLowerCase(); let texto=m[2].trim(); let url=m[3].trim(); if(url.startsWith('t.me')||url.startsWith('@')) url='https://'+url.replace('@','t.me/'); if(!url.startsWith('http')) url='https://'+url; let emoji=color==='r'?'🔴':color==='g'?'🟢':color==='y'?'🟡':'🔵'; botones.push({texto:`${emoji} ${texto}`, url}); }else descripcionLimpia.push(linea); }
  return {botones, descripcionLimpia: descripcionLimpia.join('\n').trim()};
}
function getBienvenida(ctx){
  const nombre = ctx.from.first_name || 'Bebe';
  const mention = `<a href="tg://user?id=${ctx.from.id}">${nombre}</a>`;
  let txt = configBot.bienvenida || `🔥﹡﹡﹡🔥\n\n💦 {mention} 𝐁𝐢𝐞𝐧𝐯𝐞𝐧𝐢𝐝𝐨 𝐚 𝐥𝐚 𝐩𝐞𝐫𝐯𝐞𝐫𝐬𝐢𝐨‌𝐧 𝐭𝐨𝐭𝐚𝐥...\n\n 🔥🅢🅔🅧🅞🅜🅐🅝🅘🅐🔥 ᴸⁱⁿᵏˢ\n𝐸𝑙 𝑖𝑛𝑓𝑖𝑒𝑟𝑛𝑜 𝑑𝑜𝑛𝑑𝑒 𝑡𝑜𝑑𝑜𝑠 𝑞𝑢𝑖𝑒𝑟𝑒𝑛 𝑒𝑠𝑡𝑎𝑟 😈\n 🔥 𝗘𝗻𝗰𝗼𝗻𝘁𝗿𝗮𝘀 𝗟𝗶𝗻𝗸𝘀 𝗱𝗲 🔥\n<blockquote>━━━━━━━━━━━━━━━━━━━━━━━━━\n🔞 𝗖𝗔𝗡𝗔𝗟𝗘𝗦 𝗫𝗫\n👥 𝗚𝗥𝗨𝗣𝗢𝗦 𝗫𝗫\n💸 𝗚𝗥𝗨𝗣𝗢𝗦 𝗗𝗘 𝗩𝗘𝗡𝗧𝗔\n📣 𝗖𝗔𝗡𝗔𝗟𝗘𝗦 𝗣𝗨𝗕𝗟𝗜𝗖𝗜𝗧𝗔𝗥𝗜𝗢𝗦\n🍿 𝗘𝗡𝗧𝗥𝗘𝗧𝗘𝗡𝗜𝗠𝗜𝗘𝗡𝗧𝗢\n🎨 𝗔𝗥𝗧𝗘\n🤖 𝗟𝗢𝗦 𝗠𝗘𝗝𝗢𝗥𝗘𝗦 𝗕𝗢𝗧𝗦\n━━━━━━━━━━━━━━━━━━━━━━━━━</blockquote>\n🌟 𝑷𝒂𝒓𝒂 𝒑𝒂𝒓𝒕𝒊𝒄𝒊𝒑𝒂𝒓, 𝒔𝒐𝒍𝒐 𝒅𝒆𝒃𝒆𝒔 𝒂𝒈𝒓𝒆𝒈𝒂𝒓 𝒏𝒖𝒆𝒔𝒕𝒓𝒐𝒔 𝒃𝒐𝒕𝒔.\n\n¿𝗧𝗲 𝗮𝘁𝗿𝗲𝘃𝗲𝘀? 👇\n\n🔥﹡﹡﹡🔥`;
  return txt.replace('{mention}', mention).replace('{nombre}', nombre);
}
function getCaption(c, descLimpia){
const nombreLimpio = c.nombre.replace(/#g|#r|#p|#y/g,'').trim();
const emojiMap = {'CANALES ADULTOS':'🔞','GRUPOS ADULTOS':'👥','VENTAS':'💸','PUBLICITARIOS':'📣','ENTRETENIMIENTO':'🍿','ARTE':'🎨','BOTS':'🤖'};
let emojiCat = '🔥';
for(let k in emojiMap){ if(c.seccion.includes(k)) emojiCat=emojiMap[k]; }
if(configBot.plantilla){
  return configBot.plantilla.replace('{nombre}', nombreLimpio).replace('{categoria}', c.seccion).replace('{emojiCat}', emojiCat).replace('{desc}', descLimpia || c.desc || "Sin descripcion").replace('{vistas}', c.clicks||0);
}
return `🔥﹡﹡🔥﹡﹡🔥﹡﹡🔥﹡﹡🔥﹡﹡🔥﹡﹡🔥\n\nㅤ 🗂️ 𝗖𝗔𝗧𝗘𝗚𝗢𝗥𝗜𝗔⠅${emojiCat} ${c.seccion} ${emojiCat}\n♡━━━━━━━━━━━━━━━━━━━━━━━━━━♡\n\n 🇳 🇴 🇲 🇧 🇷 🇪  🇩 🇪 🇱  🇨 🇭 🇦 🇹 \n<blockquote><b>${nombreLimpio}</b></blockquote>\n\n🔥﹡﹡🔥﹡﹡🔥﹡﹡🔥﹡﹡🔥﹡﹡🔥﹡﹡🔥\n\nㅤㅤㅤ🇩 🇪 🇸 🇨 🇷 🇮 🇵 🇨 🇮 🇴 🇳 \n<blockquote><b>${descLimpia || c.desc || "Sin descripcion"}</b></blockquote>\n\nㅤㅤ📊 𝘼𝙇𝘾𝘼𝙉𝘾𝙀 𝙏𝙊𝙏𝘼𝙇⠅ 👁️ ${c.clicks||0} 𝚅𝙸𝚂𝚃𝙰𝚂\n♡━━━━━━━━━━━━━━━━━━━━━━━━━━♡\n\n🔥﹡﹡🔥﹡﹡🔥﹡﹡🔥﹡﹡🔥﹡﹡🔥﹡﹡🔥`;
}
function getMenuInline(){
  return Markup.inlineKeyboard([
    [Markup.button.callback('🔴 CATEGORIAS','ver_categorias_user')],
    [Markup.button.callback('🟢 MIS GRUPOS Y CANALES','mis_chats')],
    [Markup.button.callback('🔵 + CANAL O GRUPO','agregar_chat')],
    [Markup.button.url('🔴 CANAL OFICIAL','https://t.me/Sexomania_Links')],
    [Markup.button.url('🌐 PANEL SEXOMANIA LINKS','http://t.me/SexomaniaLinkbot/Panel')],
  ]);
}
function getAdminKeyboard(){
  return Markup.inlineKeyboard([
    [Markup.button.callback('🎨 COLORES CATEGORIAS','admin_cats')],
    [Markup.button.callback('💬 EDITAR BIENVENIDA','admin_edit_welcome')],
    [Markup.button.callback('📝 EDITAR PLANTILLA CHAT','admin_edit_template')],
    [Markup.button.callback('📊 ESTADISTICAS','admin_stats')],
    [Markup.button.callback('👥 USUARIOS','admin_users')],
    [Markup.button.callback('✅ CHATS PENDIENTES','admin_pendientes')],
    [Markup.button.callback('🤖 AGREGAR BOT SOCIO','admin_add_bot')],
    [Markup.button.callback('👁️ RESET VISTAS','admin_reset_views')],
    [Markup.button.callback('⬅️ MENU','volver_menu')],
  ]);
}
function getAdminCatKeyboard(){ const cats=[...CATS_USUARIO, CAT_BOTS]; let btns=[]; for(let c of cats){ let col=configBot.catColors?.[c]||"⚪"; btns.push([Markup.button.callback(`${col} ${c}`, 'editcat_'+c)]); } btns.push([Markup.button.callback('⬅️ Volver Admin','admin_back')]); return Markup.inlineKeyboard(btns); }
async function mandarSeccion(sec,ctx){ await ctx.answerCbQuery().catch(()=>{}); const snap=await getDocs(query(collection(db,"chats"),where("seccion","==",sec))); if(snap.empty) return ctx.reply(`😈 Nada en ${sec} aún`,getMenuInline()); cacheChats={}; let btns=[]; snap.forEach(d=>{cacheChats[d.id]={id:d.id,...d.data()}; btns.push([Markup.button.callback(`${textoSeguro(d.data().nombre)} | ${d.data().clicks||0}`,`ver_${d.id}`)])}); btns.push([Markup.button.callback('⬅️ VOLVER','volver_menu')]); await ctx.reply(`📁 ${sec}:`,Markup.inlineKeyboard(btns)); }
async function mandarUnChat(id,ctx){
  await ctx.answerCbQuery().catch(()=>{}); let c=cacheChats[id]; if(!c){ const s=await getDoc(doc(db,"chats",id)); if(!s.exists()) return ctx.reply('No existe'); c={id:s.id,...s.data()}; }
  try{ await updateDoc(doc(db,"chats",id), {clicks: increment(1)}); c.clicks=(c.clicks||0)+1; if(cacheChats[id]) cacheChats[id].clicks=c.clicks; }catch{}
  const {botones, descripcionLimpia}=extraerBotonesDeDescripcion(c.desc); const cap=getCaption(c,descripcionLimpia);
  let kb=[]; for(let b of botones) kb.push([Markup.button.url(b.texto,b.url)]); if(kb.length===0) kb.push([Markup.button.url('⚡ UNETE AQUI ⚡',c.link)]);
  kb.push([Markup.button.url('🔘 + Botonera','https://t.me/Sexomanialinksbot'),Markup.button.url('📝 + Listas','https://t.me/SexomaniaListas_Bot')]);
  if(ctx.from.id==ADMIN_ID){ kb.push([Markup.button.callback('🟢','setcolor_'+id+'_#g'),Markup.button.callback('🔴','setcolor_'+id+'_#r'),Markup.button.callback('🔵','setcolor_'+id+'_#p'),Markup.button.callback('🟡','setcolor_'+id+'_#y'),Markup.button.callback('⚪','setcolor_'+id+'_none')]); kb.push([Markup.button.callback('🎨 EDITAR BOTONES','editbtns_'+id)]); kb.push([Markup.button.callback('🗑️ BORRAR BOTONES','clearbtns_'+id)]); kb.push([Markup.button.callback('❌ ELIMINAR CHAT','delchat_'+id)]); }
  kb.push([Markup.button.callback('⬅️ Volver','sec_'+c.seccion)]); const kbd=Markup.inlineKeyboard(kb);
  try{ if(c.foto && c.foto.startsWith('http')) await ctx.replyWithPhoto(c.foto,{caption:cap,parse_mode:'HTML',...kbd}); else if(c.foto && c.foto.startsWith('data:image')){ const buf=Buffer.from(c.foto.split(',')[1],'base64'); await ctx.replyWithPhoto({source:buf},{caption:cap,parse_mode:'HTML',...kbd}); } else await ctx.reply(cap,{parse_mode:'HTML',...kbd}); }catch(e){ await ctx.reply(cap,{parse_mode:'HTML',...kbd}); }
}
async function registrarUsuario(ctx){
  try{
    const user = ctx.from; const ref = doc(db,"usuarios", String(user.id)); const snap = await getDoc(ref); const esNuevo =!snap.exists();
    await setDoc(ref, { id: user.id, first_name: user.first_name||"", last_name: user.last_name||"", username: user.username||"", is_bot: user.is_bot||false, lenguaje: user.language_code||"", ultima_vez: new Date().toISOString(), fecha_registro: snap.exists()? snap.data().fecha_registro : new Date().toISOString() }, {merge:true});
    if(esNuevo){ const fecha = new Date().toLocaleString('es-MX'); const info = `👤 𝗡𝗨𝗘𝗩𝗢 𝗨𝗦𝗨𝗔𝗥𝗜𝗢\n\n🆔 ID: <code>${user.id}</code>\n👤 Nombre: ${user.first_name||""}\n🔗 Username: @${user.username||"sin"}\n📅 ${fecha}\n\n<a href="tg://user?id=${user.id}">👉 Ver perfil</a>`; await bot.telegram.sendMessage(ADMIN_ID, info, {parse_mode:'HTML'}).catch(()=>{}); }
  }catch(e){ console.log("Error registro:", e.message); }
}
bot.command('menu', (ctx)=> ctx.reply(getBienvenida(ctx),{parse_mode:'HTML',...getMenuInline()}));
bot.command('admin', async (ctx)=>{ if(ctx.from.id!=ADMIN_ID) return ctx.reply('⛔ Solo admin'); await ctx.reply(`⚙️ 𝗣𝗔𝗡𝗘𝗟 𝗔𝗗𝗠𝗜𝗡`, getAdminKeyboard()); });
bot.start(async (ctx)=>{ await registrarUsuario(ctx); await ctx.reply(getBienvenida(ctx),{parse_mode:'HTML',...getMenuInline()}); });

bot.action('ver_categorias_user', async (ctx)=>{
  await ctx.answerCbQuery().catch(()=>{});
  let btns = CATS_USUARIO.map(c => [Markup.button.callback(`${getColorEmoji(c)} ${c}`,`sec_${c}`)]);
  btns.push([Markup.button.callback(`${getColorEmoji(CAT_BOTS)} 🤖 LOS MEJORES BOTS (Socios)`,'sec_BOTS')]);
  btns.push([Markup.button.callback('⬅️ MENU','volver_menu')]);
  await ctx.reply('🗂️ <b>SELECCIONA UNA CATEGORÍA</b>',{parse_mode:'HTML',...Markup.inlineKeyboard(btns)});
});
bot.action('mis_chats', async (ctx)=>{
  await ctx.answerCbQuery().catch(()=>{});
  const q = query(collection(db,"chats"), where("ownerId","==", ctx.from.id));
  const snap = await getDocs(q);
  if(snap.empty) return ctx.reply('😕 No tienes chats agregados. Dale a + CANAL O GRUPO', Markup.inlineKeyboard([[Markup.button.callback('🔵 + Agregar','agregar_chat')],[Markup.button.callback('⬅️ MENU','volver_menu')]]));
  let btns=[]; snap.forEach(d=>{ cacheChats[d.id]={id:d.id,...d.data()}; btns.push([Markup.button.callback(`📁 ${d.data().nombre} | ${d.data().seccion}`,`ver_${d.id}`)])}); btns.push([Markup.button.callback('⬅️ MENU','volver_menu')]);
  await ctx.reply(`🟢 <b>TUS CHATS (${snap.size})</b>`,{parse_mode:'HTML',...Markup.inlineKeyboard(btns)});
});
bot.action('agregar_chat', async (ctx)=>{
  await ctx.answerCbQuery().catch(()=>{}); agregarEstado[ctx.from.id]={paso:1};
  await ctx.reply(`🔵 <b>AGREGAR CANAL O GRUPO</b>\n\n1️⃣ Agrégame como ADMIN a tu canal/grupo\n2️⃣ Reenvía aquí un mensaje de ese canal\n3️⃣ O envía su @username o link\n\n<i>Después elegirás la categoría</i>`,{parse_mode:'HTML',...Markup.inlineKeyboard([[Markup.button.callback('❌ Cancelar','volver_menu')]])});
});
bot.on('my_chat_member', async (ctx)=>{
  const chat = ctx.chat; const status = ctx.myChatMember.new_chat_member.status;
  if(status === 'administrator'){
    await setDoc(doc(db,"chats_pendientes", String(chat.id)), { chatId: chat.id, nombre: chat.title || "Sin nombre", tipo: chat.type, username: chat.username||null, ownerId: ctx.myChatMember.from.id, fecha: new Date().toISOString() });
    try{ await bot.telegram.sendMessage(ctx.myChatMember.from.id, `✅ <b>¡Gracias por agregarme a ${chat.title}!</b>\n\nAhora elige en qué categoría lo pongo:`,{parse_mode:'HTML', reply_markup:{inline_keyboard: CATS_USUARIO.map(c=>[{text:c, callback_data:`setcatnew_${chat.id}_${c}`}] )}}); }catch{}
  }
});
bot.action(/^setcatnew_/, async (ctx)=>{
  await ctx.answerCbQuery().catch(()=>{});
  const data = ctx.callbackQuery.data.replace('setcatnew_',''); const idx = data.indexOf('_'); const chatId = data.substring(0,idx); const cat = data.substring(idx+1);
  const pend = await getDoc(doc(db,"chats_pendientes", chatId)); if(!pend.exists()) return ctx.reply('❌ Ya no existe ese pendiente');
  const d = pend.data();
  await setDoc(doc(db,"chats", String(chatId)), { nombre: d.nombre, seccion: cat, link: d.username? `https://t.me/${d.username}` : `https://t.me/c/${String(chatId).replace('-100','')}`, desc: 'Chat agregado por usuario', clicks:0, ownerId: ctx.from.id, foto:null, pendiente: true });
  await deleteDoc(doc(db,"chats_pendientes", chatId));
  await ctx.reply(`✅ <b>${d.nombre}</b> agregado a <b>${cat}</b>\n\nEstá en revisión, un admin lo aprobará pronto.`,{parse_mode:'HTML',...getMenuInline()});
  await bot.telegram.sendMessage(ADMIN_ID, `🆕 <b>NUEVO CHAT POR APROBAR</b>\n\n📁 ${d.nombre}\n🗂️ ${cat}\n👤 Dueño: ${ctx.from.id}\nID: ${chatId}`,{parse_mode:'HTML'});
});
bot.action('admin_pendientes', async (ctx)=>{
  if(ctx.from.id!=ADMIN_ID) return; await ctx.answerCbQuery().catch(()=>{});
  const snap = await getDocs(query(collection(db,"chats"), where("pendiente","==", true)));
  if(snap.empty) return ctx.reply('✅ No hay pendientes', getAdminKeyboard());
  let btns=[]; snap.forEach(d=>{ btns.push([Markup.button.callback(`✅ ${d.data().nombre} | ${d.data().seccion}`,`aprobar_${d.id}`), Markup.button.callback('❌','rechazar_'+d.id)])});
  btns.push([Markup.button.callback('⬅️ Admin','admin_back')]);
  await ctx.reply(`⏳ <b>PENDIENTES (${snap.size})</b>`,{parse_mode:'HTML',...Markup.inlineKeyboard(btns)});
});
bot.action(/^aprobar_/, async (ctx)=>{ if(ctx.from.id!=ADMIN_ID) return; const id=ctx.callbackQuery.data.replace('aprobar_',''); await updateDoc(doc(db,"chats",id),{pendiente:false}); await ctx.answerCbQuery({text:'Aprobado'}); await ctx.reply('✅ Aprobado'); });
bot.action(/^rechazar_/, async (ctx)=>{ if(ctx.from.id!=ADMIN_ID) return; const id=ctx.callbackQuery.data.replace('rechazar_',''); await deleteDoc(doc(db,"chats",id)); await ctx.answerCbQuery({text:'Rechazado'}); await ctx.reply('❌ Eliminado'); });
bot.action('admin_add_bot', async (ctx)=>{ if(ctx.from.id!=ADMIN_ID) return; await ctx.answerCbQuery().catch(()=>{}); pendingAdminEdit='add_bot'; await ctx.reply('🤖 <b>AGREGAR BOT SOCIO</b>\n\nMándame en este formato:\n\n<code>Nombre del bot\n@username o link\nDescripcion</code>\n\nEjemplo:\nMi Bot XXX\n@MiBot\nEl mejor bot porno',{parse_mode:'HTML'}); });
bot.action(/^delchat_/, async (ctx)=>{ if(ctx.from.id!=ADMIN_ID) return; const id=ctx.callbackQuery.data.replace('delchat_',''); await deleteDoc(doc(db,"chats",id)); await ctx.answerCbQuery({text:'Eliminado'}); await ctx.reply('🗑️ Chat eliminado'); });

bot.action('admin_back', async (ctx)=>{ if(ctx.from.id!=ADMIN_ID) return; await ctx.answerCbQuery().catch(()=>{}); await ctx.reply(`⚙️ 𝗣𝗔𝗡𝗘𝗟 𝗔𝗗𝗠𝗜𝗡`, getAdminKeyboard()); });
bot.action('admin_cats', async (ctx)=>{ if(ctx.from.id!=ADMIN_ID) return; await ctx.answerCbQuery().catch(()=>{}); await ctx.reply(`🎨 COLORES CATEGORIAS:`, getAdminCatKeyboard()); });
bot.action('admin_users', async (ctx)=>{ if(ctx.from.id!=ADMIN_ID) return; const snap=await getDocs(collection(db,"usuarios")); await ctx.reply(`👥 Usuarios: ${snap.size}`, getAdminKeyboard()); });
bot.action('admin_stats', async (ctx)=>{ if(ctx.from.id!=ADMIN_ID) return; const snap=await getDocs(collection(db,"chats")); let total=0, vistas=0; snap.forEach(d=>{ total++; vistas+=(d.data().clicks||0); }); const snapU=await getDocs(collection(db,"usuarios")); await ctx.reply(`📊 Total chats: ${total}\n👁️ Vistas: ${vistas}\n👥 Usuarios: ${snapU.size}`, getAdminKeyboard()); });
bot.action('admin_reset_views', async (ctx)=>{ if(ctx.from.id!=ADMIN_ID) return; await ctx.reply(`⚠️ ¿Resetear vistas?`, Markup.inlineKeyboard([[Markup.button.callback('✅ SI','admin_reset_confirm')],[Markup.button.callback('❌ NO','admin_back')]])); });
bot.action('admin_reset_confirm', async (ctx)=>{ if(ctx.from.id!=ADMIN_ID) return; const snap=await getDocs(collection(db,"chats")); for(let d of snap.docs){ await updateDoc(doc(db,"chats",d.id),{clicks:0}).catch(()=>{}); } await ctx.reply(`✅ Reset`, getAdminKeyboard()); });
bot.action('admin_edit_welcome', async (ctx)=>{ if(ctx.from.id!=ADMIN_ID) return; pendingAdminEdit='welcome'; await ctx.reply(`💬 Manda nueva bienvenida con {mention} y {nombre}\n/cancel para cancelar`); });
bot.action('admin_edit_template', async (ctx)=>{ if(ctx.from.id!=ADMIN_ID) return; pendingAdminEdit='template'; await ctx.reply(`📝 Manda nueva plantilla con {nombre} {categoria} {emojiCat} {desc} {vistas}\n/cancel`); });
bot.action(/^editcat_/, async (ctx)=>{ if(ctx.from.id!=ADMIN_ID) return; const cat=ctx.callbackQuery.data.replace('editcat_',''); await ctx.reply(`Color para ${cat}:`, Markup.inlineKeyboard([[Markup.button.callback('🟢 Verde','setcatcolor_'+cat+'_#g'),Markup.button.callback('🔴 Rojo','setcatcolor_'+cat+'_#r')],[Markup.button.callback('🔵 Azul','setcatcolor_'+cat+'_#p'),Markup.button.callback('🟡 Amarillo','setcatcolor_'+cat+'_#y')],[Markup.button.callback('⚪ Sin color','setcatcolor_'+cat+'_none')],[Markup.button.callback('⬅️ Atras','admin_cats')]])); });
bot.action(/^setcatcolor_/, async (ctx)=>{ if(ctx.from.id!=ADMIN_ID) return; const data=ctx.callbackQuery.data.replace('setcatcolor_',''); const last=data.lastIndexOf('_'); const cat=data.substring(0,last); const color=data.substring(last+1); if(!configBot.catColors) configBot.catColors={}; if(color==='none') delete configBot.catColors[cat]; else configBot.catColors[cat]=color; await setDoc(doc(db,"config","bot"),configBot,{merge:true}); await ctx.reply(`✅ ${cat} -> ${color}`, getAdminCatKeyboard()); });
bot.action(/^editbtns_/, async (ctx)=>{ if(ctx.from.id!=ADMIN_ID) return; const id=ctx.callbackQuery.data.replace('editbtns_',''); pendingEdits[ctx.from.id]=id; await ctx.reply(`🎨 Manda botones:\n#p Texto - https://t.me/link`); });
bot.action(/^clearbtns_/, async (ctx)=>{ if(ctx.from.id!=ADMIN_ID) return; const id=ctx.callbackQuery.data.replace('clearbtns_',''); const ref=doc(db,"chats",id); const snap=await getDoc(ref); const {descripcionLimpia}=extraerBotonesDeDescripcion(snap.data().desc); await updateDoc(ref,{desc:descripcionLimpia}); await ctx.answerCbQuery({text:"Borrados"}); });
bot.action(/^setcolor_/, async (ctx)=>{ if(ctx.from.id!=ADMIN_ID) return; const data=ctx.callbackQuery.data.replace('setcolor_',''); const last=data.lastIndexOf('_'); const id=data.substring(0,last); const color=data.substring(last+1); const ref=doc(db,"chats",id); const snap=await getDoc(ref); let nombreActual=snap.data().nombre.replace(/#g|#r|#p|#y/g,'').trim(); let nuevo=color==='none'?nombreActual:`${nombreActual} ${color}`; await updateDoc(ref,{nombre:nuevo}); await ctx.reply(`✅ ${nuevo}`); });
bot.command('cancel',(ctx)=>{ delete pendingEdits[ctx.from.id]; pendingAdminEdit=null; delete agregarEstado[ctx.from.id]; ctx.reply("❌ Cancelado"); });

bot.on('text', async (ctx,next)=>{
  if(ctx.from.id==ADMIN_ID && pendingAdminEdit==='add_bot'){
    const lines = ctx.message.text.split('\n'); if(lines.length<2) return ctx.reply('Formato mal, usa 3 lineas');
    const nombre=lines[0]; const link=lines[1].includes('t.me')||lines[1].includes('http')?lines[1]:`https://t.me/${lines[1].replace('@','')}`; const desc=lines.slice(2).join('\n');
    await setDoc(doc(db,"chats", String(Date.now())), { nombre, seccion: CAT_BOTS, link, desc, clicks:0, ownerId: ADMIN_ID, pendiente:false });
    pendingAdminEdit=null; return ctx.reply(`🤖 Bot ${nombre} agregado a MEJORES BOTS`, getAdminKeyboard());
  }
  if(ctx.from.id==ADMIN_ID && pendingAdminEdit==='welcome'){
    configBot.bienvenida=ctx.message.text; await setDoc(doc(db,"config","bot"),configBot,{merge:true}); pendingAdminEdit=null; return ctx.reply(`✅ Bienvenida guardada!`, getAdminKeyboard());
  }
  if(ctx.from.id==ADMIN_ID && pendingAdminEdit==='template'){
    configBot.plantilla=ctx.message.text; await setDoc(doc(db,"config","bot"),configBot,{merge:true}); pendingAdminEdit=null; return ctx.reply(`✅ Plantilla guardada!`, getAdminKeyboard());
  }
  if(pendingEdits[ctx.from.id]){ const id=pendingEdits[ctx.from.id]; const ref=doc(db,"chats",id); const snap=await getDoc(ref); const {descripcionLimpia}=extraerBotonesDeDescripcion(snap.data().desc); await updateDoc(ref,{desc:descripcionLimpia+"\n"+ctx.message.text}); delete pendingEdits[ctx.from.id]; return ctx.reply(`✅ Guardado!`); }
  if(agregarEstado[ctx.from.id]){
    let link = ctx.message.text.trim(); if(link.startsWith('@')) link = `https://t.me/${link.replace('@','')}`;
    await setDoc(doc(db,"chats_pendientes", String(ctx.from.id)), { chatId: Date.now(), nombre: link, tipo: 'canal', username: link, ownerId: ctx.from.id, link: link, fecha: new Date().toISOString() });
    await ctx.reply(`✅ Link recibido: ${link}\n\n¿En qué categoría lo pongo?`,{ reply_markup:{inline_keyboard: CATS_USUARIO.map(c=>[{text:c, callback_data:`setcatnew_${ctx.from.id}_${c}`}]) } });
    delete agregarEstado[ctx.from.id]; return;
  }
  return next();
});

bot.action('volver_menu', async (ctx)=>{ await ctx.answerCbQuery().catch(()=>{}); await ctx.reply(getBienvenida(ctx),{parse_mode:'HTML',...getMenuInline()}); });
bot.action(/^sec_/, async (ctx)=>{ await mandarSeccion(ctx.callbackQuery.data.replace('sec_',''),ctx); });
bot.action(/^ver_/, async (ctx)=>{ await mandarUnChat(ctx.callbackQuery.data.replace('ver_',''),ctx); });
(async()=>{ await bot.telegram.deleteWebhook().catch(()=>{}); await bot.launch(); console.log('SEXOMANIA LINKS V2 ON'); })();
const app2=express(); app2.get('/',(r,s)=>s.send('ON')); app2.listen(process.env.PORT||3000);
