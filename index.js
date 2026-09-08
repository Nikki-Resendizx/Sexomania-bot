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
let buscarEstado = {};
let editLinkEstado = {};
let editNombreEstado = {};
let difusorData = {}; // {adminId: {texto, botonesFilas, foto}}
global.popupCache = {};

(async()=>{ try{ const s=await getDoc(doc(db,"config","bot")); if(s.exists()) configBot={...configBot,...s.data()}; }catch{} })();

const CATS_USUARIO = ['CANALES ADULTOS','GRUPOS ADULTOS','VENTAS','PUBLICITARIOS','ENTRETENIMIENTO','ARTE'];
const CAT_BOTS = 'BOTS';

function parseColor(t){ if(!t) return t; if(t.includes('#g')) return '🟢 '+t.replace(/#g/g,'').trim(); if(t.includes('#r')) return '🔴 '+t.replace(/#r/g,'').trim(); if(t.includes('#p')) return '🔵 '+t.replace(/#p/g,'').trim(); if(t.includes('#y')) return '🟡 '+t.replace(/#y/g,'').trim(); return t; }
function textoSeguro(t){ if(!t) return "Chat"; t=parseColor(t); let b=0,r=""; for(const c of t){ const bl=Buffer.byteLength(c,'utf8'); if(b+bl>28) break; b+=bl; r+=c; } return r.trim()||"Chat"; }
function getColorEmoji(cat){ const col=configBot.catColors?.[cat]||""; if(col==="#g") return "🟢"; if(col==="#r") return "🔴"; if(col==="#p") return "🔵"; if(col==="#y") return "🟡"; return ""; }

function extraerBotonesDeDescripcion(desc){
  const botonesFilas = [];
  const lineas = (desc||"").split('\n');
  let descripcionLimpia = [];
  for(let linea of lineas){
    let l = linea.trim();
    if(l.length<3 ||!l.includes('-')) { descripcionLimpia.push(linea); continue; }
    const partes = l.split('&&');
    let filaActual = [];
    let esBotonLinea = false;
    for(let parte of partes){
      parte = parte.trim();
      let m = parte.match(/^(#p|#r|#g|#y)?\s*(.+?)\s*-\s*(.+)$/i);
      if(m){
        esBotonLinea = true;
        let color = (m[1]||'').toLowerCase();
        let texto = m[2].trim();
        let url = m[3].trim();
        let emoji = '';
        if(color==='#r') emoji='🔴 '; else if(color==='#g') emoji='🟢 '; else if(color==='#y') emoji='🟡 '; else if(color==='#p') emoji='🔵 ';
        texto = emoji + texto;
        let lowUrl = url.toLowerCase();
        if(lowUrl.startsWith('popup:') || lowUrl.startsWith('alert:')){
          filaActual.push({ texto, tipo: 'popup', valor: url.split(':').slice(1).join(':').trim() });
        } else if(lowUrl === 'rules'){
          filaActual.push({ texto, tipo: 'rules', valor: 'rules' });
        } else if(lowUrl.startsWith('share:')){
          filaActual.push({ texto, tipo: 'share', valor: url.split(':').slice(1).join(':').trim() });
        } else if(lowUrl.startsWith('copy:')){
          filaActual.push({ texto, tipo: 'copy', valor: url.split(':').slice(1).join(':').trim() });
        } else {
          if(url.startsWith('t.me') || url.startsWith('@')) url = 'https://'+url.replace('@','t.me/');
          if(!url.startsWith('http')) url = 'https://'+url;
          filaActual.push({ texto, tipo: 'url', valor: url });
        }
      }
    }
    if(esBotonLinea && filaActual.length>0) botonesFilas.push(filaActual);
    else descripcionLimpia.push(linea);
  }
  return { botonesFilas, descripcionLimpia: descripcionLimpia.join('\n').trim() };
}

function parseDifusorBotonera(textoCompleto){
  // Formato:
  // Texto de la botonera arriba
  // ---
  // Botones con tu sintaxis
  let partes = textoCompleto.split('---');
  let texto = partes[0].trim();
  let botonesTexto = partes[1]? partes[1].trim() : "";
  const {botonesFilas} = extraerBotonesDeDescripcion(botonesTexto);
  return {texto, botonesFilas};
}

function buildKeyboardFromFilas(filas, idBase){
  let kb=[];
  for(let fila of filas){
    let filaKb=[];
    for(let b of fila){
      if(b.tipo==='url') filaKb.push(Markup.button.url(b.texto, b.valor));
      else if(b.tipo==='popup'){
        const keyBase = Buffer.from(b.valor).toString('base64').substring(0,30).replace(/=/g,'');
        global.popupCache[`${idBase}_${keyBase}`]=b.valor;
        filaKb.push(Markup.button.callback(b.texto, `popup_${idBase}_${keyBase}`));
      }
      else if(b.tipo==='share') filaKb.push(Markup.button.switchToChat(b.texto, b.valor));
      else if(b.tipo==='copy'){
        global.popupCache[`copy_${idBase}`]=b.valor;
        filaKb.push(Markup.button.callback(b.texto, `copy_${idBase}`));
      }
      else if(b.tipo==='rules') filaKb.push(Markup.button.callback(b.texto, `rules_${idBase}`));
    }
    if(filaKb.length>0) kb.push(filaKb);
  }
  return kb;
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
let emojiCat = '🔥'; for(let k in emojiMap){ if(c.seccion.includes(k)) emojiCat=emojiMap[k]; }
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
    [Markup.button.callback('⚙️ GESTIONAR GRUPOS Y CANALES','admin_gestionar')],
    [Markup.button.callback('📢 DIFUSOR BOTONERAS / LISTAS','admin_difusor')],
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
function getGestionarKeyboard(){
  return Markup.inlineKeyboard([
    [Markup.button.callback('📺 LISTA DE CANALES','gestion_canales')],
    [Markup.button.callback('👥 LISTA DE GRUPOS','gestion_grupos')],
    [Markup.button.callback('🔍 BUSCAR CANAL/GRUPO','gestion_buscar')],
    [Markup.button.callback('⬅️ VOLVER ADMIN','admin_back')]
  ]);
}
function getDifusorKeyboard(){
  return Markup.inlineKeyboard([
    [Markup.button.callback('🔘 CREAR BOTONERA','dif_crear_botonera')],
    [Markup.button.callback('📝 CREAR LISTA','dif_crear_lista')],
    [Markup.button.callback('👁️ VER BORRADOR','dif_ver_borrador')],
    [Markup.button.callback('🚀 DIFUNDIR A CATEGORIAS','dif_elegir_cat')],
    [Markup.button.callback('⬅️ VOLVER ADMIN','admin_back')]
  ]);
}

async function mandarSeccion(sec,ctx){ await ctx.answerCbQuery().catch(()=>{}); const snap=await getDocs(query(collection(db,"chats"),where("seccion","==",sec))); if(snap.empty) return ctx.reply(`😈 Nada en ${sec} aún`,getMenuInline()); cacheChats={}; let btns=[]; snap.forEach(d=>{cacheChats[d.id]={id:d.id,...d.data()}; btns.push([Markup.button.callback(`${textoSeguro(d.data().nombre)} | ${d.data().clicks||0}`,`ver_${d.id}`)])}); btns.push([Markup.button.callback('⬅️ VOLVER','volver_menu')]); await ctx.reply(`📁 ${sec}:`,Markup.inlineKeyboard(btns)); }

async function mandarUnChat(id,ctx){
  await ctx.answerCbQuery().catch(()=>{}); let c=cacheChats[id]; if(!c){ const s=await getDoc(doc(db,"chats",id)); if(!s.exists()) return ctx.reply('No existe'); c={id:s.id,...s.data()}; }
  try{ await updateDoc(doc(db,"chats",id), {clicks: increment(1)}); c.clicks=(c.clicks||0)+1; if(cacheChats[id]) cacheChats[id].clicks=c.clicks; }catch{}
  const {botonesFilas, descripcionLimpia}=extraerBotonesDeDescripcion(c.desc);
  const cap=getCaption(c,descripcionLimpia);
  let kb=[];
  for(let fila of botonesFilas){
    let filaKb = [];
    for(let b of fila){
      if(b.tipo==='url') filaKb.push(Markup.button.url(b.texto, b.valor));
      else if(b.tipo==='popup'){
        const keyBase = Buffer.from(b.valor).toString('base64').substring(0,40).replace(/=/g,'');
        const cbData = `popup_${id}_${keyBase}`;
        global.popupCache[`${id}_${keyBase}`] = b.valor;
        filaKb.push(Markup.button.callback(b.texto, cbData));
      }
      else if(b.tipo==='share') filaKb.push(Markup.button.switchToChat(b.texto, b.valor));
      else if(b.tipo==='copy') filaKb.push(Markup.button.callback(b.texto, `copy_${id}`));
      else if(b.tipo==='rules') filaKb.push(Markup.button.callback(b.texto, `rules_${id}`));
      if(b.tipo==='copy') global.popupCache[`copy_${id}`] = b.valor;
    }
    if(filaKb.length>0) kb.push(filaKb);
  }
  if(kb.length===0) kb.push([Markup.button.url('⚡ UNETE AQUI ⚡',c.link)]);
  kb.push([Markup.button.url('🔘 + Botonera','https://t.me/Sexomanialinksbot'),Markup.button.url('📝 + Listas','https://t.me/SexomaniaListas_Bot')]);
  if(ctx.from.id==ADMIN_ID){
    kb.push([Markup.button.callback('🟢','setcolor_'+id+'_#g'),Markup.button.callback('🔴','setcolor_'+id+'_#r'),Markup.button.callback('🔵','setcolor_'+id+'_#p'),Markup.button.callback('🟡','setcolor_'+id+'_#y'),Markup.button.callback('⚪','setcolor_'+id+'_none')]);
    kb.push([Markup.button.callback('🎨 EDITAR BOTONES','editbtns_'+id)]);
    kb.push([Markup.button.callback('🗑️ BORRAR BOTONES','clearbtns_'+id)]);
    kb.push([Markup.button.callback('❌ ELIMINAR CHAT','delchat_'+id)]);
  }
  kb.push([Markup.button.callback('⬅️ Volver','sec_'+c.seccion)]);
  const kbd=Markup.inlineKeyboard(kb);
  try{
    if(c.foto && c.foto.startsWith('http')) await ctx.replyWithPhoto(c.foto,{caption:cap,parse_mode:'HTML',...kbd});
    else if(c.foto && c.foto.startsWith('data:image')){ const buf=Buffer.from(c.foto.split(',')[1],'base64'); await ctx.replyWithPhoto({source:buf},{caption:cap,parse_mode:'HTML',...kbd}); }
    else await ctx.reply(cap,{parse_mode:'HTML',...kbd});
  }catch(e){ await ctx.reply(cap,{parse_mode:'HTML',...kbd}); }
}

async function mostrarDetalleGestion(id, ctx){
  let c; try{ const s=await getDoc(doc(db,"chats",id)); if(!s.exists()) return ctx.reply('❌ No existe'); c={id:s.id,...s.data()}; }catch{ return ctx.reply('Error'); }
  let miembros = "N/A"; let tipoReal="canal"; let bio=""; let foto=c.foto||null;
  try{
    const chatInfo = await bot.telegram.getChat(c.id.includes('-')? Number(c.id) : c.id).catch(()=>null);
    if(chatInfo){
      if(chatInfo.type) tipoReal=chatInfo.type;
      if(chatInfo.description) bio=chatInfo.description;
      try{ miembros = await bot.telegram.getChatMembersCount(chatInfo.id); }catch{ miembros="Oculto"; }
    }
  }catch{}
  let estadoEmoji="⏰ PENDIENTE"; if(c.baneado) estadoEmoji="⛔️ BANEADO POR ADMIN"; else if(c.autobaneado) estadoEmoji="🚷 BOT EXPULSADO POR SOLICITANTE"; else if(c.pendiente) estadoEmoji="⏰ PENDIENTE"; else estadoEmoji="✅ APROBADO";
  let solicitanteInfo = c.ownerId? `👤SOLICITANTE: <code>${c.ownerId}</code> <a href="tg://user?id=${c.ownerId}">Ver</a>` : "Desconocido";
  let fecha = c.fecha? new Date(c.fecha).toLocaleString('es-MX') : (c.fecha_registro||"N/A");
  let detalle = `🗒️ <b>DETALLES DEL ${tipoReal.toUpperCase()}</b>\n\n🖼️ Foto: ${foto?"Si":"No"}\n✏️ <b>Nombre:</b> ${c.nombre}\n📝 <b>Biografia:</b> ${bio||c.desc?.substring(0,300)||"Sin bio"}\n🆔 <b>Id:</b> <code>${c.id}</code>\n📁 <b>Categoría:</b> ${c.seccion}\n🏷 <b>Tipo:</b> ${tipoReal}\n👥 <b>Miembros:</b> ${miembros}\n${solicitanteInfo}\n📅 <b>Fecha registro:</b> ${fecha}\n${estadoEmoji}\n🔗 <b>Enlace:</b> ${c.link}`;
  let kb = Markup.inlineKeyboard([
    [Markup.button.callback('🔗 1-Cambiar enlace','editlink_'+c.id)],
    [Markup.button.callback('🚫 2-Autoban Bot','ban_'+c.id)],
    [Markup.button.callback('✏️ 3-Cambiar nombre','editname_'+c.id)],
    [Markup.button.callback('📁 4-Cambiar categoría','editcatbtn_'+c.id)],
    [Markup.button.callback('✅ 5-Aprobación','toggleaprob_'+c.id)],
    [Markup.button.callback('❌ Eliminar','delchat_'+c.id)],
    [Markup.button.callback('⬅️ Volver','admin_gestionar')]
  ]);
  try{
    if(foto && foto.startsWith('http')) await ctx.replyWithPhoto(foto,{caption:detalle,parse_mode:'HTML',...kb});
    else await ctx.reply(detalle,{parse_mode:'HTML',...kb});
  }catch{ await ctx.reply(detalle,{parse_mode:'HTML',...kb}); }
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
  if(snap.empty) return ctx.reply('😕 No tienes chats agregados.', Markup.inlineKeyboard([[Markup.button.callback('🔵 + Agregar','agregar_chat')],[Markup.button.callback('⬅️ MENU','volver_menu')]]));
  let btns=[]; snap.forEach(d=>{ cacheChats[d.id]={id:d.id,...d.data()}; btns.push([Markup.button.callback(`📁 ${d.data().nombre} | ${d.data().seccion}`,`ver_${d.id}`)])}); btns.push([Markup.button.callback('⬅️ MENU','volver_menu')]);
  await ctx.reply(`🟢 <b>TUS CHATS (${snap.size})</b>`,{parse_mode:'HTML',...Markup.inlineKeyboard(btns)});
});
bot.action('agregar_chat', async (ctx)=>{
  await ctx.answerCbQuery().catch(()=>{}); agregarEstado[ctx.from.id]={paso:1};
  await ctx.reply(`🔵 <b>AGREGAR CANAL O GRUPO</b>\n\n1️⃣ Agrégame como ADMIN a tu canal/grupo\n2️⃣ Reenvía aquí un mensaje de ese canal\n3️⃣ O envía su @username o link`,{parse_mode:'HTML',...Markup.inlineKeyboard([[Markup.button.callback('❌ Cancelar','volver_menu')]])});
});

// GESTIONAR
bot.action('admin_gestionar', async (ctx)=>{ if(ctx.from.id!=ADMIN_ID) return; await ctx.answerCbQuery().catch(()=>{}); await ctx.reply(`⚙️ <b>GESTIONAR GRUPOS Y CANALES</b>`,{parse_mode:'HTML',...getGestionarKeyboard()}); });
bot.action('gestion_canales', async (ctx)=>{
  if(ctx.from.id!=ADMIN_ID) return; await ctx.answerCbQuery().catch(()=>{});
  const snap=await getDocs(collection(db,"chats"));
  let canales = []; snap.forEach(d=>{ if((d.data().tipo||'canal')!=='grupo' && d.data().seccion!==CAT_BOTS) canales.push({id:d.id,...d.data()}); });
  if(canales.length===0) return ctx.reply('No hay canales', getGestionarKeyboard());
  let btns=[]; canales.slice(0,40).forEach(c=> btns.push([Markup.button.callback(`📺 ${c.nombre.substring(0,25)} | ${c.id}`,`det_${c.id}`)]));
  btns.push([Markup.button.callback('⬅️ Volver','admin_gestionar')]);
  await ctx.reply(`📺 <b>CANALES (${canales.length})</b>`,{parse_mode:'HTML',...Markup.inlineKeyboard(btns)});
});
bot.action('gestion_grupos', async (ctx)=>{
  if(ctx.from.id!=ADMIN_ID) return; await ctx.answerCbQuery().catch(()=>{});
  const snap=await getDocs(collection(db,"chats"));
  let grupos = []; snap.forEach(d=>{ if((d.data().tipo||'')==='grupo' || d.data().seccion==='GRUPOS ADULTOS') grupos.push({id:d.id,...d.data()}); });
  if(grupos.length===0) return ctx.reply('No hay grupos', getGestionarKeyboard());
  let btns=[]; grupos.slice(0,40).forEach(c=> btns.push([Markup.button.callback(`👥 ${c.nombre.substring(0,25)} | ${c.id}`,`det_${c.id}`)]));
  btns.push([Markup.button.callback('⬅️ Volver','admin_gestionar')]);
  await ctx.reply(`👥 <b>GRUPOS (${grupos.length})</b>`,{parse_mode:'HTML',...Markup.inlineKeyboard(btns)});
});
bot.action('gestion_buscar', async (ctx)=>{ if(ctx.from.id!=ADMIN_ID) return; buscarEstado[ctx.from.id]=true; await ctx.reply(`🔍 <b>BUSCAR</b>\n\nEnvía el Título o ID`,{parse_mode:'HTML'}); });
bot.action(/^det_/, async (ctx)=>{ if(ctx.from.id!=ADMIN_ID) return; await ctx.answerCbQuery().catch(()=>{}); const id=ctx.callbackQuery.data.replace('det_',''); await mostrarDetalleGestion(id, ctx); });
bot.action(/^editlink_/, async (ctx)=>{ if(ctx.from.id!=ADMIN_ID) return; const id=ctx.callbackQuery.data.replace('editlink_',''); editLinkEstado[ctx.from.id]=id; await ctx.reply(`🔗 Envía el nuevo enlace para <code>${id}</code>`,{parse_mode:'HTML'}); });
bot.action(/^ban_/, async (ctx)=>{ if(ctx.from.id!=ADMIN_ID) return; const id=ctx.callbackQuery.data.replace('ban_',''); await updateDoc(doc(db,"chats",id),{baneado:true, autobaneado:true}); await ctx.answerCbQuery({text:'Baneado'}); await ctx.reply(`🚫 Chat ${id} baneado.`); });
bot.action(/^editname_/, async (ctx)=>{ if(ctx.from.id!=ADMIN_ID) return; const id=ctx.callbackQuery.data.replace('editname_',''); editNombreEstado[ctx.from.id]=id; await ctx.reply(`✏️ Envía el nuevo nombre`,{parse_mode:'HTML'}); });
bot.action(/^editcatbtn_/, async (ctx)=>{ if(ctx.from.id!=ADMIN_ID) return; const id=ctx.callbackQuery.data.replace('editcatbtn_',''); let btns=CATS_USUARIO.map(c=>[Markup.button.callback(c,`setcatadm_${id}_${c}`)]); btns.push([Markup.button.callback('⬅️','det_'+id)]); await ctx.reply(`📁 Elige nueva categoría:`,Markup.inlineKeyboard(btns)); });
bot.action(/^setcatadm_/, async (ctx)=>{ if(ctx.from.id!=ADMIN_ID) return; const data=ctx.callbackQuery.data.replace('setcatadm_',''); const last=data.lastIndexOf('_'); const id=data.substring(0,last); const cat=data.substring(last+1); await updateDoc(doc(db,"chats",id),{seccion:cat}); await ctx.answerCbQuery({text:cat}); await mostrarDetalleGestion(id, ctx); });
bot.action(/^toggleaprob_/, async (ctx)=>{ if(ctx.from.id!=ADMIN_ID) return; const id=ctx.callbackQuery.data.replace('toggleaprob_',''); const s=await getDoc(doc(db,"chats",id)); const cur=s.data(); await updateDoc(doc(db,"chats",id),{pendiente:!cur.pendiente? false :!cur.pendiente, baneado:false, autobaneado:false}); await ctx.answerCbQuery({text:cur.pendiente?'Aprobado':'Pendiente'}); await mostrarDetalleGestion(id, ctx); });

// DIFUSOR
bot.action('admin_difusor', async (ctx)=>{ if(ctx.from.id!=ADMIN_ID) return; await ctx.answerCbQuery().catch(()=>{}); await ctx.reply(`📢 <b>DIFUSOR DE BOTONERAS Y LISTAS</b>\n\nCrea tu botonera o lista y difúndela`,{parse_mode:'HTML',...getDifusorKeyboard()}); });
bot.action('dif_crear_botonera', async (ctx)=>{ if(ctx.from.id!=ADMIN_ID) return; pendingAdminEdit='dif_botonera'; await ctx.reply(`🔘 <b>CREAR BOTONERA</b>\n\nManda así:\n\n<code>Texto principal de la botonera (puede ser largo, con emojis)\n---\n#p Boton 1 - t.me/link\nBoton 2 - t.me/link && Boton 3 - t.me/link\nReglas - rules\nAlerta - popup:Bienvenido</code>\n\nUsa --- para separar texto de botones\n\n/cancel para cancelar`,{parse_mode:'HTML'}); });
bot.action('dif_crear_lista', async (ctx)=>{ if(ctx.from.id!=ADMIN_ID) return; pendingAdminEdit='dif_lista'; await ctx.reply(`📝 <b>CREAR LISTA</b>\n\nManda la lista de canales así:\n\n<code>TITULO DE LA LISTA\n\n1. Nombre - t.me/link\n2. Nombre - t.me/link\n3. Nombre - t.me/link\n---\n#p Unete al principal - t.me/Sexomania_Links</code>\n\n/cancel`,{parse_mode:'HTML'}); });
bot.action('dif_ver_borrador', async (ctx)=>{
  if(ctx.from.id!=ADMIN_ID) return;
  const d = difusorData[ctx.from.id];
  if(!d) return ctx.reply('❌ No hay borrador. Crea una botonera primero.', getDifusorKeyboard());
  let kb = buildKeyboardFromFilas(d.botonesFilas, 'dif_preview');
  kb.push([Markup.button.callback('⬅️ Volver','admin_difusor')]);
  if(d.foto){
    await ctx.replyWithPhoto(d.foto,{caption:d.texto,parse_mode:'HTML',...Markup.inlineKeyboard(kb)}).catch(async()=>{ await ctx.reply(d.texto,{parse_mode:'HTML',...Markup.inlineKeyboard(kb)}); });
  } else {
    await ctx.reply(d.texto,{parse_mode:'HTML',...Markup.inlineKeyboard(kb)});
  }
});
bot.action('dif_elegir_cat', async (ctx)=>{
  if(ctx.from.id!=ADMIN_ID) return;
  if(!difusorData[ctx.from.id]) return ctx.reply('❌ Crea primero una botonera/lista');
  let btns = CATS_USUARIO.map(c=>[Markup.button.callback(`📤 Enviar a ${c}`,`dif_send_${c}`)]);
  btns.push([Markup.button.callback('🌐 Enviar a TODOS','dif_send_TODOS')]);
  btns.push([Markup.button.callback('⬅️ Volver','admin_difusor')]);
  await ctx.reply(`🚀 <b>¿A dónde difundir?</b>\n\nBorrador listo: ${(difusorData[ctx.from.id].texto||'').substring(0,100)}...`,{parse_mode:'HTML',...Markup.inlineKeyboard(btns)});
});
bot.action(/^dif_send_/, async (ctx)=>{
  if(ctx.from.id!=ADMIN_ID) return; const target = ctx.callbackQuery.data.replace('dif_send_','');
  const d = difusorData[ctx.from.id]; if(!d) return ctx.answerCbQuery({text:'No hay borrador'});
  await ctx.answerCbQuery({text:`Difundiendo a ${target}...`});
  let q; if(target==='TODOS') q=collection(db,"chats"); else q=query(collection(db,"chats"), where("seccion","==",target));
  const snap=await getDocs(q);
  let ok=0, fail=0;
  let kb = buildKeyboardFromFilas(d.botonesFilas, 'dif');
  kb.push([Markup.button.url('🔘 + Botonera','https://t.me/Sexomanialinksbot'), Markup.button.url('📝 + Listas','https://t.me/SexomaniaListas_Bot')]);
  const kbd = Markup.inlineKeyboard(kb);
  for(let docu of snap.docs){
    try{
      const chatId = docu.data().tipo==='channel' || docu.id.startsWith('-100')? Number(docu.id) : docu.id;
      // Si es canal/grupo real, intentar enviar. Si no, skip.
      if(String(docu.id).startsWith('-100')){
        if(d.foto) await bot.telegram.sendPhoto(chatId, d.foto, {caption:d.texto, parse_mode:'HTML',...kbd}).catch(()=>{});
        else await bot.telegram.sendMessage(chatId, d.texto, {parse_mode:'HTML',...kbd}).catch(()=>{});
        ok++;
      } else {
        // Para chats sin ID real, solo cuenta como lista
        ok++;
      }
      await new Promise(r=>setTimeout(r, 300)); // anti-flood
    }catch{ fail++; }
  }
  await ctx.reply(`✅ Difusión terminada\n\n🎯 Destino: ${target}\n✅ Enviados: ${ok}\n❌ Fallos: ${fail}\n📦 Total en BD: ${snap.size}\n\nLa botonera queda guardada como borrador para reusar.`, getDifusorKeyboard());
  // Guardar en colección difusiones
  await setDoc(doc(db,"difusiones", String(Date.now())), { texto:d.texto, botones:d.botonesFilas, destino:target, fecha:new Date().toISOString(), enviados:ok }).catch(()=>{});
});

bot.on('my_chat_member', async (ctx)=>{
  const chat = ctx.chat; const status = ctx.myChatMember.new_chat_member.status;
  if(status === 'administrator'){
    await setDoc(doc(db,"chats_pendientes", String(chat.id)), { chatId: chat.id, nombre: chat.title || "Sin nombre", tipo: chat.type, username: chat.username||null, ownerId: ctx.myChatMember.from.id, fecha: new Date().toISOString() });
    try{ await bot.telegram.sendMessage(ctx.myChatMember.from.id, `✅ <b>¡Gracias por agregarme a ${chat.title}!</b>\n\nAhora elige en qué categoría lo pongo:`,{parse_mode:'HTML', reply_markup:{inline_keyboard: CATS_USUARIO.map(c=>[{text:c, callback_data:`setcatnew_${chat.id}_${c}`}] )}}); }catch{}
  } else if(status==='kicked' || status==='left'){
    await setDoc(doc(db,"chats", String(chat.id)), { autobaneado:true, botExpulsadoPor: ctx.myChatMember.from.id }, {merge:true}).catch(()=>{});
    await bot.telegram.sendMessage(ADMIN_ID, `🚷 BOT EXPULSADO\n\nChat: ${chat.title} (${chat.id})\nPor: ${ctx.myChatMember.from.id}`).catch(()=>{});
  }
});
bot.action(/^setcatnew_/, async (ctx)=>{
  await ctx.answerCbQuery().catch(()=>{});
  const data = ctx.callbackQuery.data.replace('setcatnew_',''); const idx = data.indexOf('_'); const chatId = data.substring(0,idx); const cat = data.substring(idx+1);
  const pend = await getDoc(doc(db,"chats_pendientes", chatId)); if(!pend.exists()) return ctx.reply('❌ Ya no existe ese pendiente');
  const d = pend.data();
  await setDoc(doc(db,"chats", String(chatId)), { nombre: d.nombre, seccion: cat, link: d.username? `https://t.me/${d.username}` : `https://t.me/c/${String(chatId).replace('-100','')}`, desc: 'Chat agregado por usuario', clicks:0, ownerId: ctx.from.id, foto:null, pendiente: true, tipo: d.tipo, fecha: new Date().toISOString() });
  await deleteDoc(doc(db,"chats_pendientes", chatId));
  await ctx.reply(`✅ <b>${d.nombre}</b> agregado a <b>${cat}</b>\n\nEstá en revisión, un admin lo aprobará pronto.`,{parse_mode:'HTML',...getMenuInline()});
  await bot.telegram.sendMessage(ADMIN_ID, `🆕 <b>NUEVO CHAT POR APROBAR</b>\n\n📁 ${d.nombre}\n🗂️ ${cat}\n👤 Dueño: ${ctx.from.id}\nID: ${chatId}`,{parse_mode:'HTML'});
});
bot.action('admin_pendientes', async (ctx)=>{
  if(ctx.from.id!=ADMIN_ID) return; await ctx.answerCbQuery().catch(()=>{});
  const snap = await getDocs(query(collection(db,"chats"), where("pendiente","==", true)));
  if(snap.empty) return ctx.reply('✅ No hay pendientes', getAdminKeyboard());
  let btns=[]; snap.forEach(d=>{ btns.push([Markup.button.callback(`✅ ${d.data().nombre} | ${d.data().seccion}`,`det_${d.id}`), Markup.button.callback('❌','rechazar_'+d.id)])});
  btns.push([Markup.button.callback('⬅️ Admin','admin_back')]);
  await ctx.reply(`⏳ <b>PENDIENTES (${snap.size})</b>`,{parse_mode:'HTML',...Markup.inlineKeyboard(btns)});
});
bot.action(/^aprobar_/, async (ctx)=>{ if(ctx.from.id!=ADMIN_ID) return; const id=ctx.callbackQuery.data.replace('aprobar_',''); await updateDoc(doc(db,"chats",id),{pendiente:false}); await ctx.answerCbQuery({text:'Aprobado'}); await ctx.reply('✅ Aprobado'); });
bot.action(/^rechazar_/, async (ctx)=>{ if(ctx.from.id!=ADMIN_ID) return; const id=ctx.callbackQuery.data.replace('rechazar_',''); await deleteDoc(doc(db,"chats",id)); await ctx.answerCbQuery({text:'Rechazado'}); await ctx.reply('❌ Eliminado'); });
bot.action('admin_add_bot', async (ctx)=>{ if(ctx.from.id!=ADMIN_ID) return; await ctx.answerCbQuery().catch(()=>{}); pendingAdminEdit='add_bot'; await ctx.reply('🤖 <b>AGREGAR BOT SOCIO</b>\n\nMándame en este formato:\n\n<code>Nombre del bot\n@username o link\nDescripcion</code>',{parse_mode:'HTML'}); });
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
bot.action(/^editbtns_/, async (ctx)=>{ if(ctx.from.id!=ADMIN_ID) return; const id=ctx.callbackQuery.data.replace('editbtns_',''); pendingEdits[ctx.from.id]=id; await ctx.reply(`🎨 Manda botones con tu sintaxis`,{parse_mode:'HTML'}); });
bot.action(/^clearbtns_/, async (ctx)=>{ if(ctx.from.id!=ADMIN_ID) return; const id=ctx.callbackQuery.data.replace('clearbtns_',''); const ref=doc(db,"chats",id); const snap=await getDoc(ref); const {descripcionLimpia}=extraerBotonesDeDescripcion(snap.data().desc); await updateDoc(ref,{desc:descripcionLimpia}); await ctx.answerCbQuery({text:"Borrados"}); });
bot.action(/^setcolor_/, async (ctx)=>{ if(ctx.from.id!=ADMIN_ID) return; const data=ctx.callbackQuery.data.replace('setcolor_',''); const last=data.lastIndexOf('_'); const id=data.substring(0,last); const color=data.substring(last+1); const ref=doc(db,"chats",id); const snap=await getDoc(ref); let nombreActual=snap.data().nombre.replace(/#g|#r|#p|#y/g,'').trim(); let nuevo=color==='none'?nombreActual:`${nombreActual} ${color}`; await updateDoc(ref,{nombre:nuevo}); await ctx.reply(`✅ ${nuevo}`); });

bot.action(/^popup_/, async (ctx)=>{ try{ const data = ctx.callbackQuery.data.replace('popup_',''); const idx = data.indexOf('_'); const chatId = data.substring(0,idx); const key = data.substring(idx+1); const texto = global.popupCache[`${chatId}_${key}`] || "Sin texto"; await ctx.answerCbQuery(texto, {show_alert: true}); }catch{} });
bot.action(/^copy_/, async (ctx)=>{ try{ const id = ctx.callbackQuery.data.replace('copy_',''); const texto = global.popupCache[`copy_${id}`] || ""; await ctx.answerCbQuery(`📋 ${texto}`, {show_alert: true}); }catch{} });
bot.action(/^rules_/, async (ctx)=>{ try{ await ctx.answerCbQuery("📜 Reglas: Respetar, no spam, no CP. Cualquier falta = ban", {show_alert: true}); }catch{} });

bot.command('cancel',(ctx)=>{ delete pendingEdits[ctx.from.id]; pendingAdminEdit=null; delete agregarEstado[ctx.from.id]; delete buscarEstado[ctx.from.id]; delete editLinkEstado[ctx.from.id]; delete editNombreEstado[ctx.from.id]; ctx.reply("❌ Cancelado"); });

bot.on('photo', async (ctx)=>{
  if(ctx.from.id!=ADMIN_ID) return;
  if(pendingAdminEdit && pendingAdminEdit.startsWith('dif_')){
    const fileId = ctx.message.photo[ctx.message.photo.length-1].file_id;
    const file = await ctx.telegram.getFile(fileId);
    const url = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${file.file_path}`;
    if(!difusorData[ctx.from.id]) difusorData[ctx.from.id]={texto:"", botonesFilas:[], foto:null};
    difusorData[ctx.from.id].foto = url;
    await ctx.reply(`🖼️ Foto guardada para difusor. Ahora manda el texto+botones`);
    pendingAdminEdit = pendingAdminEdit; // keep
  }
});

bot.on('text', async (ctx,next)=>{
  if(buscarEstado[ctx.from.id]){
    const q=ctx.message.text.toLowerCase(); const snap=await getDocs(collection(db,"chats"));
    let encontrados=[]; snap.forEach(d=>{ if(d.data().nombre.toLowerCase().includes(q) || d.id.includes(q)) encontrados.push({id:d.id,...d.data()}); });
    delete buscarEstado[ctx.from.id];
    if(encontrados.length===0) return ctx.reply('❌ No encontrado', getGestionarKeyboard());
    let btns=encontrados.slice(0,20).map(c=>[Markup.button.callback(`${c.nombre.substring(0,25)} | ${c.id}`,`det_${c.id}`)]);
    btns.push([Markup.button.callback('⬅️ Volver','admin_gestionar')]);
    return ctx.reply(`🔍 Resultados para "${ctx.message.text}" (${encontrados.length})`,{...Markup.inlineKeyboard(btns)});
  }
  if(editLinkEstado[ctx.from.id]){
    const id=editLinkEstado[ctx.from.id]; let link=ctx.message.text.trim(); if(link.startsWith('@')) link=`https://t.me/${link.replace('@','')}`; if(!link.startsWith('http')) link='https://'+link;
    await updateDoc(doc(db,"chats",id),{link}); delete editLinkEstado[ctx.from.id]; return ctx.reply(`✅ Link de ${id} actualizado a ${link}`);
  }
  if(editNombreEstado[ctx.from.id]){
    const id=editNombreEstado[ctx.from.id]; await updateDoc(doc(db,"chats",id),{nombre:ctx.message.text}); delete editNombreEstado[ctx.from.id]; return ctx.reply(`✅ Nombre actualizado`);
  }
  if(ctx.from.id==ADMIN_ID && pendingAdminEdit==='dif_botonera'){
    const {texto, botonesFilas} = parseDifusorBotonera(ctx.message.text);
    if(!difusorData[ctx.from.id]) difusorData[ctx.from.id]={};
    difusorData[ctx.from.id].texto=texto;
    difusorData[ctx.from.id].botonesFilas=botonesFilas;
    pendingAdminEdit=null;
    let kb=buildKeyboardFromFilas(botonesFilas, 'dif_preview');
    kb.push([Markup.button.callback('🚀 DIFUNDIR','dif_elegir_cat')]);
    return ctx.reply(`✅ Botonera guardada!\n\nPreview:`,{parse_mode:'HTML',...Markup.inlineKeyboard(kb)});
  }
  if(ctx.from.id==ADMIN_ID && pendingAdminEdit==='dif_lista'){
    const {texto, botonesFilas} = parseDifusorBotonera(ctx.message.text);
    if(!difusorData[ctx.from.id]) difusorData[ctx.from.id]={};
    difusorData[ctx.from.id].texto=texto;
    difusorData[ctx.from.id].botonesFilas=botonesFilas;
    pendingAdminEdit=null;
    let kb=buildKeyboardFromFilas(botonesFilas, 'dif_preview');
    kb.push([Markup.button.callback('🚀 DIFUNDIR','dif_elegir_cat')]);
    return ctx.reply(`✅ Lista guardada!\n\nPreview:`,{parse_mode:'HTML',...Markup.inlineKeyboard(kb)});
  }
  if(ctx.from.id==ADMIN_ID && pendingAdminEdit==='add_bot'){
    const lines = ctx.message.text.split('\n'); if(lines.length<2) return ctx.reply('Formato mal');
    const nombre=lines[0]; const link=lines[1].includes('t.me')||lines[1].includes('http')?lines[1]:`https://t.me/${lines[1].replace('@','')}`; const desc=lines.slice(2).join('\n');
    await setDoc(doc(db,"chats", String(Date.now())), { nombre, seccion: CAT_BOTS, link, desc, clicks:0, ownerId: ADMIN_ID, pendiente:false });
    pendingAdminEdit=null; return ctx.reply(`🤖 Bot ${nombre} agregado`, getAdminKeyboard());
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

(async()=>{ await bot.telegram.deleteWebhook().catch(()=>{}); await bot.launch(); console.log('SEXOMANIA V5 DIFUSOR ON'); })();
const app2=express(); app2.get('/',(r,s)=>s.send('V5 DIFUSOR ON')); app2.listen(process.env.PORT||3000);
