require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, where, doc, getDoc, setDoc, updateDoc, increment, deleteDoc, orderBy, limit } = require('firebase/firestore');
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
let pendingEdits = {}, pendingAdminEdit = null;
let configBot = { catColors: {}, bienvenida: null, plantilla: null, logChannel: null, originChannel: null, mainChannel: -1001234567890, zonaHoraria: 'America/Mexico_City', idioma: 'es', listasMsgIds: {}, startButtons: [], carpetas: [], ultimoCheckLinks: null };
let agregarEstado = {}, buscarEstado = {}, editLinkEstado = {}, editNombreEstado = {}, difusorData = {};
global.popupCache = {};
(async()=>{ try{ const s=await getDoc(doc(db,"config","bot")); if(s.exists()) configBot={...configBot,...s.data()}; }catch{} })();

const CATS_USUARIO = ['CANALES ADULTOS','GRUPOS ADULTOS','VENTAS','PUBLICITARIOS','ENTRETENIMIENTO','ARTE'];
const CAT_BOTS = 'BOTS';
const PALABRAS_PROHIBIDAS = ['cp','child','niños','niñas','menor','gore','asesinato','sicario','narco','zoofilia'];

function esInapropiado(texto){ if(!texto) return false; texto=texto.toLowerCase(); return PALABRAS_PROHIBIDAS.some(p=> texto.includes(p)); }
async function checkAutoban(chatInfo){
  const textoCheck = `${chatInfo.title||''} ${chatInfo.description||''}`.toLowerCase();
  if(esInapropiado(textoCheck)){
    try{ await bot.telegram.leaveChat(chatInfo.id); await setDoc(doc(db,"chats_baneados",String(chatInfo.id)),{id:chatInfo.id, nombre:chatInfo.title, motivo:'Inapropiado', texto:textoCheck, fecha:new Date().toISOString()}); if(configBot.logChannel) bot.telegram.sendMessage(configBot.logChannel,`🚫 AUTOBAN\n${chatInfo.title} (${chatInfo.id})`).catch(()=>{}); return true; }catch{}
  } return false;
}
function parseColor(t){ if(!t) return t; if(t.includes('#g')) return '🟢 '+t.replace(/#g/g,'').trim(); if(t.includes('#r')) return '🔴 '+t.replace(/#r/g,'').trim(); if(t.includes('#p')) return '🔵 '+t.replace(/#p/g,'').trim(); return t; }
function textoSeguro(t){ if(!t) return "Chat"; t=parseColor(t); let b=0,r=""; for(const c of t){ const bl=Buffer.byteLength(c,'utf8'); if(b+bl>28) break; b+=bl; r+=c; } return r.trim()||"Chat"; }
async function isAdmin(id){ if(id==ADMIN_ID) return true; const s=await getDoc(doc(db,"admins",String(id))); return s.exists(); }
async function logAdminAccion(adminId, accion){ await setDoc(doc(db,"admin_logs",String(Date.now())),{adminId, accion, fecha:new Date().toISOString()}); if(configBot.logChannel) bot.telegram.sendMessage(configBot.logChannel,`📝 LOG\n👤 ${adminId}\n${accion}`).catch(()=>{}); }
function extraerBotonesDeDescripcion(desc){ const botonesFilas = []; const lineas = (desc||"").split('\n'); let descripcionLimpia = []; for(let linea of lineas){ let l=linea.trim(); if(l.length<3 ||!l.includes('-')){ descripcionLimpia.push(linea); continue; } const partes=l.split('&&'); let filaActual=[]; let esBotonLinea=false; for(let parte of partes){ parte=parte.trim(); let m=parte.match(/^(#p|#r|#g|#y)?\s*(.+?)\s*-\s*(.+)$/i); if(m){ esBotonLinea=true; let color=(m[1]||'').toLowerCase(); let texto=m[2].trim(); let url=m[3].trim(); let emoji=''; if(color==='#r') emoji='🔴 '; else if(color==='#g') emoji='🟢 '; else if(color==='#y') emoji='🟡 '; else if(color==='#p') emoji='🔵 '; texto=emoji+texto; let lowUrl=url.toLowerCase(); if(lowUrl.startsWith('popup:')) filaActual.push({texto,tipo:'popup',valor:url.split(':').slice(1).join(':').trim()}); else if(lowUrl==='rules') filaActual.push({texto,tipo:'rules',valor:'rules'}); else if(lowUrl.startsWith('share:')) filaActual.push({texto,tipo:'share',valor:url.split(':').slice(1).join(':').trim()}); else if(lowUrl.startsWith('copy:')) filaActual.push({texto,tipo:'copy',valor:url.split(':').slice(1).join(':').trim()}); else{ if(url.startsWith('t.me')||url.startsWith('@')) url='https://'+url.replace('@','t.me/'); if(!url.startsWith('http')) url='https://'+url; filaActual.push({texto,tipo:'url',valor:url}); } } } if(esBotonLinea&&filaActual.length>0) botonesFilas.push(filaActual); else descripcionLimpia.push(linea); } return {botonesFilas, descripcionLimpia: descripcionLimpia.join('\n').trim()}; }
function parseDifusorBotonera(textoCompleto){ let partes=textoCompleto.split('---'); let texto=partes[0].trim(); let botonesTexto=partes[1]?partes[1].trim():""; const {botonesFilas}=extraerBotonesDeDescripcion(botonesTexto); return {texto, botonesFilas}; }
function buildKeyboardFromFilas(filas, idBase){ let kb=[]; for(let fila of filas){ let filaKb=[]; for(let b of fila){ if(b.tipo==='url') filaKb.push({text:b.texto, url:b.valor, style:b.texto.includes('🔴')?'danger':b.texto.includes('🟢')?'success':b.texto.includes('🔵')?'primary':undefined}); else if(b.tipo==='popup'){ const keyBase=Buffer.from(b.valor).toString('base64').substring(0,30).replace(/=/g,''); global.popupCache[`${idBase}_${keyBase}`]=b.valor; filaKb.push({text:b.texto, callback_data:`popup_${idBase}_${keyBase}`, style:'primary'}); } else if(b.tipo==='rules') filaKb.push({text:b.texto, callback_data:`rules_${idBase}`, style:'danger'}); else if(b.tipo==='copy'){ global.popupCache[`copy_${idBase}`]=b.valor; filaKb.push({text:b.texto, callback_data:`copy_${idBase}`, style:'success'}); } } if(filaKb.length>0) kb.push(filaKb); } return kb; }

async function publicarListasCategorias(){
  if(!configBot.mainChannel){ console.log("No mainChannel"); return; }
  for(let cat of [...CATS_USUARIO, CAT_BOTS]){
    const snap=await getDocs(query(collection(db,"chats"), where("seccion","==",cat), where("pendiente","==",false)));
    if(snap.empty) continue;
    let texto=`🔥 <b>${cat}</b> 🔥\n\n📋 Actualizado: ${new Date().toLocaleString('es-MX',{timeZone:configBot.zonaHoraria})}\n━━━━━━━━━━━━━━━\n`;
    let count=0; snap.forEach(d=>{ count++; const c=d.data(); if(c.baneado) return; texto+=`${count}. ${c.nombre.replace(/#g|#r|#p|#y/g,'')} - ${c.link}\n`; });
    texto+=`━━━━━━━━━━━━━━━\nTotal: ${count}\n@Sexomania_Links`;
    let msgId = configBot.listasMsgIds?.[cat];
    try{
      if(msgId){ await bot.telegram.editMessageText(configBot.mainChannel, msgId, null, texto, {parse_mode:'HTML'}).catch(async()=>{ let msg=await bot.telegram.sendMessage(configBot.mainChannel, texto, {parse_mode:'HTML'}); configBot.listasMsgIds[cat]=msg.message_id; await setDoc(doc(db,"config","bot"),{listasMsgIds: configBot.listasMsgIds},{merge:true}); }); }
      else { let msg=await bot.telegram.sendMessage(configBot.mainChannel, texto, {parse_mode:'HTML'}); configBot.listasMsgIds[cat]=msg.message_id; await setDoc(doc(db,"config","bot"),{listasMsgIds: configBot.listasMsgIds},{merge:true}); }
      await new Promise(r=>setTimeout(r,1000));
    }catch(e){ console.log(`Error lista ${cat}:`, e.message); }
  }
}
setInterval(()=>{ publicarListasCategorias().catch(()=>{}); }, 3600000);

// === 4. ACTUALIZACION INTELIGENTE DE LINKS ===
async function autoActualizarLinks(soloCaidos=false){
  console.log(`🔄 Verificando links... modo: ${soloCaidos?'solo caidos':'completo'}`);
  const snap = await getDocs(collection(db,"chats"));
  let actualizados=0, caidos=0;
  for(let d of snap.docs){
    try{
      const data=d.data(); const idChat=data.id||d.id;
      if(!String(idChat).startsWith('-100')) continue;
      const chatInfo=await bot.telegram.getChat(Number(idChat)).catch(()=>null);
      if(!chatInfo){
        caidos++;
        if(soloCaidos){ await updateDoc(doc(db,"chats",d.id),{baneado:true, motivo:'Link caido / No accesible'}).catch(()=>{}); if(configBot.logChannel) bot.telegram.sendMessage(configBot.logChannel,`💀 LINK CAIDO\n📁 ${data.nombre}\n🆔 ${idChat}\n🔗 ${data.link}`).catch(()=>{}); }
        continue;
      }
      let nuevoLink=data.link;
      if(chatInfo.username){ nuevoLink=`https://t.me/${chatInfo.username}`; }
      else { if(soloCaidos) continue; try{ const inv=await bot.telegram.exportChatInviteLink(Number(idChat)); if(inv) nuevoLink=inv; }catch{} }
      if(nuevoLink && nuevoLink!==data.link){
        await updateDoc(doc(db,"chats",d.id),{link:nuevoLink, username:chatInfo.username||null});
        actualizados++;
        if(configBot.logChannel) bot.telegram.sendMessage(configBot.logChannel,`🔗 @ CAMBIADO\n📁 ${chatInfo.title}\nAntes: ${data.link}\nAhora: ${nuevoLink}`).catch(()=>{});
      }
      await new Promise(r=>setTimeout(r,700));
    }catch{}
  }
  configBot.ultimoCheckLinks=new Date().toISOString();
  await setDoc(doc(db,"config","bot"),{ultimoCheckLinks: configBot.ultimoCheckLinks},{merge:true});
  if(actualizados>0 || caidos>0){ await publicarListasCategorias().catch(()=>{}); if(configBot.logChannel) bot.telegram.sendMessage(configBot.logChannel,`✅ REVISION\n🔄 Actualizados: ${actualizados}\n💀 Caidos: ${caidos}\n📅 ${configBot.ultimoCheckLinks}`).catch(()=>{}); }
  return {actualizados, caidos};
}
// 1 vez por semana: Domingo 3 AM
setInterval(async ()=>{ const ahora=new Date(); if(ahora.getDay()===0 && ahora.getHours()===3){ await autoActualizarLinks(false); } }, 3600000);
// Detecta cambio al ver un chat
async function verificarLinkAlVer(id){
  try{
    const s=await getDoc(doc(db,"chats",id)); if(!s.exists()) return true;
    const data=s.data(); if(!String(data.id||id).startsWith('-100')) return true;
    const chatInfo=await bot.telegram.getChat(Number(data.id||id)).catch(()=>null);
    if(!chatInfo){ await updateDoc(doc(db,"chats",id),{baneado:true, motivo:'Caido detectado al visualizar'}).catch(()=>{}); return false; }
    if(chatInfo.username){
      const nuevoLink=`https://t.me/${chatInfo.username}`;
      if(nuevoLink!==data.link){ await updateDoc(doc(db,"chats",id),{link:nuevoLink, username:chatInfo.username}); if(configBot.logChannel) bot.telegram.sendMessage(configBot.logChannel,`⚡ CAMBIO @ AL VER\n📁 ${chatInfo.title}\n${data.link} -> ${nuevoLink}`).catch(()=>{}); }
    }
    return true;
  }catch{ return true; }
}

function getPanelAdminPrincipal(){ return Markup.inlineKeyboard([[Markup.button.callback('👮 Gestión de Admis','adm_gestion'), Markup.button.callback('📊 Estadísticas','adm_stats'), Markup.button.callback('📝 Canales log y origen','adm_logorigen')], [Markup.button.callback('📋 Lista de G/C','admin_gestionar'), Markup.button.callback('👥 Lista de usuarios','adm_lista_users'), Markup.button.callback('🔍 Buscar C/G o Usuario','gestion_buscar')], [Markup.button.callback('📁 Categorías en el canal principal','admin_cats'), Markup.button.callback('🔘 Crear botonera o lista','admin_difusor'), Markup.button.callback('⏰ Programar Reenvío','adm_programar')], [Markup.button.callback('💬 Editar bienvenida','admin_edit_welcome'), Markup.button.callback('📝 editar plantilla','admin_edit_template'), Markup.button.callback('📂 Carpetas','adm_carpetas')], [Markup.button.callback('🤖 Bots Socios','adm_botsocios'), Markup.button.callback('⭐ Destacados','adm_destacados'), Markup.button.callback('🌍 Zona horaria','adm_zona')], [Markup.button.callback('📩 Solicitudes','admin_pendientes'), Markup.button.callback('🌐 Idioma','adm_idioma'), Markup.button.callback('⚙️ botones /start','adm_startbtn')], [Markup.button.callback('📢 PUBLICAR LISTAS','publicar_listas_now',undefined,{style:'primary'})],[Markup.button.callback('🔗 ACTUALIZAR LINKS AHORA','actualizar_links_now',undefined,{style:'success'}), Markup.button.callback('💀 REVISAR SOLO CAIDOS','revisar_caidos_now',undefined,{style:'danger'})]]); }
function getBienvenida(ctx){ const nombre=ctx.from.first_name||'Bebe'; const mention=`<a href="tg://user?id=${ctx.from.id}">${nombre}</a>`; let txt=configBot.bienvenida||`🔥﹡﹡﹡🔥\n\n💦 {mention} Bienvenido a SEXOMANIA LINKS\n`; return txt.replace('{mention}',mention).replace('{nombre}',nombre); }
function getCaption(c, descLimpia){ const nombreLimpio=c.nombre.replace(/#g|#r|#p|#y/g,'').trim(); return `🗂️ ${c.seccion}\n<b>${nombreLimpio}</b>\n\n${descLimpia||c.desc||"Sin desc"}\n\n👁️ ${c.clicks||0} VISTAS`; }
function getMenuInline(){ return Markup.inlineKeyboard([[Markup.button.callback('🔴 CATEGORIAS','ver_categorias_user')],[Markup.button.callback('🟢 MIS GRUPOS Y CANALES','mis_chats')],[Markup.button.callback('🔵 + CANAL O GRUPO','agregar_chat')],[Markup.button.url('🔴 CANAL OFICIAL','https://t.me/Sexomania_Links')]]); }
function getAdminCatKeyboard(){ const cats=[...CATS_USUARIO,CAT_BOTS]; let btns=[]; for(let c of cats){ let col=configBot.catColors?.[c]||"⚪"; btns.push([Markup.button.callback(`${col} ${c}`,'editcat_'+c)]); } btns.push([Markup.button.callback('⬅️ Volver Admin','admin_back')]); return Markup.inlineKeyboard(btns); }
function getGestionarKeyboard(){ return Markup.inlineKeyboard([[Markup.button.callback('📺 CANALES','gestion_canales')],[Markup.button.callback('👥 GRUPOS','gestion_grupos')],[Markup.button.callback('🔍 BUSCAR','gestion_buscar')],[Markup.button.callback('⬅️ VOLVER ADMIN','admin_back')]]); }
function getDifusorKeyboard(){ return Markup.inlineKeyboard([[Markup.button.callback('🔘 CREAR BOTONERA','dif_crear_botonera')],[Markup.button.callback('📝 CREAR LISTA','dif_crear_lista')],[Markup.button.callback('👁️ VER BORRADOR','dif_ver_borrador')],[Markup.button.callback('🚀 DIFUNDIR','dif_elegir_cat')],[Markup.button.callback('⬅️ VOLVER ADMIN','admin_back')]]); }

async function mandarSeccion(sec,ctx){ await ctx.answerCbQuery().catch(()=>{}); const snap=await getDocs(query(collection(db,"chats"),where("seccion","==",sec))); if(snap.empty) return ctx.reply(`😈 Nada en ${sec}`,getMenuInline()); cacheChats={}; let btns=[]; snap.forEach(d=>{cacheChats[d.id]={id:d.id,...d.data()}; btns.push([Markup.button.callback(`${textoSeguro(d.data().nombre)} | ${d.data().clicks||0}`,`ver_${d.id}`)])}); btns.push([Markup.button.callback('⬅️ VOLVER','volver_menu')]); await ctx.reply(`📁 ${sec}:`,Markup.inlineKeyboard(btns)); }
async function mandarUnChat(id,ctx){
  await verificarLinkAlVer(id);
  await ctx.answerCbQuery().catch(()=>{}); let c=cacheChats[id]; if(!c){ const s=await getDoc(doc(db,"chats",id)); if(!s.exists()) return ctx.reply('No existe'); c={id:s.id,...s.data()}; }
  try{ await updateDoc(doc(db,"chats",id),{clicks:increment(1)}); c.clicks=(c.clicks||0)+1; }catch{}
  const {botonesFilas,descripcionLimpia}=extraerBotonesDeDescripcion(c.desc); const cap=getCaption(c,descripcionLimpia); let kb=[];
  for(let fila of botonesFilas){ let filaKb=[]; for(let b of fila){ if(b.tipo==='url') filaKb.push({text:b.texto, url:b.valor, style:b.texto.includes('🔴')?'danger':b.texto.includes('🟢')?'success':b.texto.includes('🔵')?'primary':undefined}); else if(b.tipo==='popup'){ const keyBase=Buffer.from(b.valor).toString('base64').substring(0,30).replace(/=/g,''); global.popupCache[`${id}_${keyBase}`]=b.valor; filaKb.push({text:b.texto, callback_data:`popup_${id}_${keyBase}`, style:'primary'}); } else if(b.tipo==='rules') filaKb.push({text:b.texto, callback_data:`rules_${id}`, style:'danger'}); else if(b.tipo==='copy') filaKb.push({text:b.texto, callback_data:`copy_${id}`, style:'success'}); } if(filaKb.length>0) kb.push(filaKb); }
  if(kb.length===0) kb.push([{text:'⚡ UNETE AQUI ⚡', url:c.link, style:'primary'}]);
  kb.push([{text:'🔘 + Botonera', url:'https://t.me/Sexomanialinksbot'}, {text:'📝 + Listas', url:'https://t.me/SexomaniaListas_Bot'}]);
  if(await isAdmin(ctx.from.id)){ kb.push([{text:'🟢', callback_data:`setcolor_${id}_#g`},{text:'🔴', callback_data:`setcolor_${id}_#r`},{text:'🔵', callback_data:`setcolor_${id}_#p`},{text:'⚪', callback_data:`setcolor_${id}_none`}]); kb.push([{text:'🎨 EDITAR BOTONES', callback_data:`editbtns_${id}`}],[{text:'🗑️ BORRAR BOTONES', callback_data:`clearbtns_${id}`}],[{text:'❌ ELIMINAR', callback_data:`delchat_${id}`, style:'danger'}]); }
  kb.push([{text:'⬅️ Volver', callback_data:`sec_${c.seccion}`}]);
  try{ if(c.foto&&c.foto.startsWith('http')) await ctx.replyWithPhoto(c.foto,{caption:cap,parse_mode:'HTML', reply_markup:{inline_keyboard:kb}}); else await ctx.reply(cap,{parse_mode:'HTML', reply_markup:{inline_keyboard:kb}}); }catch(e){ await ctx.reply(cap,{parse_mode:'HTML', reply_markup:{inline_keyboard:kb}}); }
}
async function mostrarDetalleGestion(id, ctx){
  let c; try{ const s=await getDoc(doc(db,"chats",id)); if(!s.exists()) return ctx.reply('❌ No existe'); c={id:s.id,...s.data()}; }catch{ return ctx.reply('Error'); }
  let miembros=c.miembros||"N/A"; let tipoReal=c.tipo||"canal"; let bio=c.bio||c.desc||""; let foto=c.foto||null;
  try{ const chatInfo=await bot.telegram.getChat(c.id.includes('-')?Number(c.id):c.id).catch(()=>null); if(chatInfo){ if(chatInfo.type) tipoReal=chatInfo.type; if(chatInfo.description) bio=chatInfo.description; try{ miembros=await bot.telegram.getChatMembersCount(chatInfo.id); }catch{ miembros=c.miembros||"Oculto"; } await updateDoc(doc(db,"chats",id),{nombre:chatInfo.title||c.nombre, bio:bio, tipo:tipoReal, miembros: typeof miembros==='number'?miembros: c.miembros, username: chatInfo.username||null}).catch(()=>{}); if(await checkAutoban(chatInfo)){ await updateDoc(doc(db,"chats",id),{baneado:true}).catch(()=>{}); return ctx.reply(`🚫 AUTOBANEADO\n${chatInfo.title}`); } } }catch{}
  let estadoEmoji="⏰ PENDIENTE"; if(c.baneado) estadoEmoji="⛔ BANEADO"; else if(c.autobaneado) estadoEmoji="🚷 BOT EXPULSADO"; else if(c.pendiente) estadoEmoji="⏰ PENDIENTE"; else estadoEmoji="✅ APROBADO";
  let solicitanteInfo=c.ownerId? `👤SOLICITANTE: <code>${c.ownerId}</code> <a href="tg://user?id=${c.ownerId}">Ver</a>`: "Desconocido"; let fecha=c.fecha? new Date(c.fecha).toLocaleString('es-MX'): (c.fecha_registro||"N/A");
  let detalle=`🗒️ <b>DETALLES DEL ${tipoReal.toUpperCase()}</b>\n\n🖼️ Foto: ${foto?"Si":"No"}\n✏️ Nombre: ${c.nombre}\n📝 Biografia: ${bio.substring(0,300)||"Sin bio"}\n🆔 Id: <code>${c.id}</code>\n📁 Categoría: ${c.seccion}\n🏷 Tipo: ${tipoReal}\n👥 Miembros: ${miembros}\n${solicitanteInfo}\n📅 Fecha: ${fecha}\n${estadoEmoji}\n🔗 Enlace: ${c.link}\n\nUltimo check links: ${configBot.ultimoCheckLinks||'Nunca'}`;
  let kb=[[ {text:'🔗 1-Cambiar enlace', callback_data:`editlink_${c.id}`, style:'primary'}],[{text:'🚫 2-Autoban Bot', callback_data:`ban_${c.id}`, style:'danger'}],[{text:'✏️ 3-Cambiar nombre', callback_data:`editname_${c.id}`}],[{text:'📁 4-Cambiar categoría', callback_data:`editcatbtn_${c.id}`}],[{text:'✅ 5-Aprobación', callback_data:`toggleaprob_${c.id}`, style:'success'}],[{text:'⬅️ Volver', callback_data:`admin_gestionar`}]];
  try{ if(foto&&foto.startsWith('http')) await ctx.replyWithPhoto(foto,{caption:detalle,parse_mode:'HTML', reply_markup:{inline_keyboard:kb}}); else await ctx.reply(detalle,{parse_mode:'HTML', reply_markup:{inline_keyboard:kb}}); }catch{ await ctx.reply(detalle,{parse_mode:'HTML', reply_markup:{inline_keyboard:kb}}); }
}
async function registrarUsuario(ctx){ try{ const user=ctx.from; const ref=doc(db,"usuarios",String(user.id)); const snap=await getDoc(ref); await setDoc(ref,{id:user.id, first_name:user.first_name||"", last_name:user.last_name||"", username:user.username||"", is_bot:user.is_bot||false, lenguaje:user.language_code||"", ultima_vez:new Date().toISOString(), fecha_registro:snap.exists()? snap.data().fecha_registro : new Date().toISOString(), chats_agg: snap.exists()? (snap.data().chats_agg||0) : 0, activo:true}, {merge:true}); }catch(e){} }

bot.command('menu',(ctx)=> ctx.reply(getBienvenida(ctx),{parse_mode:'HTML',...getMenuInline()}));
bot.command('admin', async (ctx)=>{ if(!await isAdmin(ctx.from.id)) return ctx.reply('⛔ Solo admin'); await ctx.reply(`⚙️ PANEL DE ADMINISTRACIÓN\nUltimo check: ${configBot.ultimoCheckLinks||'Nunca'}`,getPanelAdminPrincipal()); });
bot.command('actualizarlinks', async (ctx)=>{ if(!await isAdmin(ctx.from.id)) return; await ctx.reply('🔄 Verificando links...'); const r=await autoActualizarLinks(false); await ctx.reply(`✅ Actualizados: ${r.actualizados} Caidos: ${r.caidos}`); });
bot.command('revisarcaidos', async (ctx)=>{ if(!await isAdmin(ctx.from.id)) return; await ctx.reply('💀 Revisando solo caidos...'); const r=await autoActualizarLinks(true); await ctx.reply(`💀 Caidos: ${r.caidos}`); });
bot.command('publicarlistas', async (ctx)=>{ if(!await isAdmin(ctx.from.id)) return; await publicarListasCategorias(); await ctx.reply('✅ Listas publicadas'); });
bot.command('setmain', async (ctx)=>{ if(!await isAdmin(ctx.from.id)) return; let id=ctx.message.text.split(' ')[1]; if(!id) return ctx.reply('Usa: /setmain -100xxx'); configBot.mainChannel=Number(id); await setDoc(doc(db,"config","bot"),{mainChannel: configBot.mainChannel},{merge:true}); await ctx.reply(`✅ Canal principal: ${id}`); });
bot.command('addadmin', async (ctx)=>{ if(ctx.from.id!=ADMIN_ID) return; let id=ctx.message.text.split(' ')[1]; await setDoc(doc(db,"admins",id),{id:Number(id), fecha:new Date().toISOString()}); await ctx.reply(`✅ Admin ${id}`); });
bot.command('addban', async (ctx)=>{ let palabra=ctx.message.text.split(' ').slice(1).join(' ').toLowerCase(); if(!palabra) return ctx.reply('Usa /addban palabra'); PALABRAS_PROHIBIDAS.push(palabra); await ctx.reply(`✅ Palabra baneada: ${palabra}`); });
bot.start(async (ctx)=>{ await registrarUsuario(ctx); await ctx.reply(getBienvenida(ctx),{parse_mode:'HTML',...getMenuInline()}); });

bot.action('admin_back', async (ctx)=>{ if(!await isAdmin(ctx.from.id)) return; await ctx.answerCbQuery().catch(()=>{}); await ctx.reply(`⚙️ PANEL DE ADMINISTRACIÓN\nUltimo check: ${configBot.ultimoCheckLinks||'Nunca'}`,getPanelAdminPrincipal()); });
bot.action('publicar_listas_now', async (ctx)=>{ if(!await isAdmin(ctx.from.id)) return; await ctx.answerCbQuery({text:'Publicando...'}); await publicarListasCategorias(); await ctx.reply('✅ Listas publicadas'); });
bot.action('actualizar_links_now', async (ctx)=>{ if(!await isAdmin(ctx.from.id)) return; await ctx.answerCbQuery({text:'Actualizando todo...'}); await ctx.reply('🔄 Actualizando TODOS los links, tarda...'); const r=await autoActualizarLinks(false); await ctx.reply(`✅ Terminado\n🔄 Actualizados: ${r.actualizados}\n💀 Caidos: ${r.caidos}`); });
bot.action('revisar_caidos_now', async (ctx)=>{ if(!await isAdmin(ctx.from.id)) return; await ctx.answerCbQuery({text:'Revisando caidos...'}); await ctx.reply('💀 Revisando solo caídos...'); const r=await autoActualizarLinks(true); await ctx.reply(`💀 Caídos: ${r.caidos}\nActualizados: ${r.actualizados}`); });
bot.action('adm_autoban', async (ctx)=>{ if(!await isAdmin(ctx.from.id)) return; const snap=await getDocs(collection(db,"chats_baneados")); await ctx.reply(`🚫 AUTOBAN\nPalabras: ${PALABRAS_PROHIBIDAS.join(', ')}\nBaneados: ${snap.size}\nUltimo check: ${configBot.ultimoCheckLinks||'Nunca'}`, Markup.inlineKeyboard([[Markup.button.callback('📜 Ver baneados','ver_autoban')],[Markup.button.callback('⬅️','admin_back')]])); });
bot.action('ver_autoban', async (ctx)=>{ const snap=await getDocs(query(collection(db,"chats_baneados"),limit(20))); let txt=`🚫 ULTIMOS AUTOBANEADOS (${snap.size}):\n\n`; snap.forEach(d=> txt+=`• ${d.data().nombre} - ${d.data().motivo}\n`); await ctx.reply(txt, Markup.inlineKeyboard([[Markup.button.callback('⬅️','adm_autoban')]])); });
bot.action('adm_gestion', async (ctx)=>{ if(!await isAdmin(ctx.from.id)) return; await ctx.answerCbQuery().catch(()=>{}); await ctx.reply(`👮 GESTION DE ADMINS`, Markup.inlineKeyboard([[Markup.button.callback('📜 Ver logs','adm_logs')],[Markup.button.callback('➕ Agregar Admin','adm_add_admin_prompt')],[Markup.button.callback('⬅️ Volver','admin_back')]])); });
bot.action('adm_logs', async (ctx)=>{ const snap=await getDocs(query(collection(db,"admin_logs"),orderBy("fecha","desc"),limit(20))); let txt="📜 LOGS:\n\n"; snap.forEach(d=>{ txt+=`👤 ${d.data().adminId}: ${d.data().accion}\n`; }); await ctx.reply(txt||"Sin logs"); });
bot.action('adm_add_admin_prompt', async (ctx)=>{ pendingAdminEdit='add_admin'; await ctx.reply('Envía ID del nuevo admin'); });
bot.action('adm_stats', async (ctx)=>{ if(!await isAdmin(ctx.from.id)) return; const snapU=await getDocs(collection(db,"usuarios")); const snapC=await getDocs(collection(db,"chats")); let activos=0,baneados=0,nuevosHoy=0; const hoy=new Date().toISOString().slice(0,10); snapU.forEach(d=>{ if(d.data().activo!==false) activos++; if(d.data().baneado) baneados++; if(d.data().fecha_registro&&d.data().fecha_registro.slice(0,10)===hoy) nuevosHoy++; }); await ctx.reply(`📊 ESTADISTICAS\n• Total Usuarios: ${snapU.size}\n• Usuarios activos: ${activos}\n• Usuarios Baneados: ${baneados}\n• Usuarios Nuevos HOY: ${nuevosHoy}\n• Total de C/G: ${snapC.size}\n• Ultimo check links: ${configBot.ultimoCheckLinks||'Nunca'}`, Markup.inlineKeyboard([[Markup.button.callback('⬅️ Volver','admin_back')]])); });
bot.action('adm_logorigen', async (ctx)=>{ if(!await isAdmin(ctx.from.id)) return; await ctx.reply(`📝 LOG Y ORIGEN\nLog: ${configBot.logChannel||'No'}\nOrigen: ${configBot.originChannel||'No'}\nPrincipal: ${configBot.mainChannel||'No'}`, Markup.inlineKeyboard([[Markup.button.callback('➕ LOG','adm_set_log')],[Markup.button.callback('➕ ORIGEN','adm_set_origen')],[Markup.button.callback('➕ CANAL PRINCIPAL','adm_set_main')],[Markup.button.callback('⬅️','admin_back')]])); });
bot.action('adm_set_log', async (ctx)=>{ pendingAdminEdit='set_log'; await ctx.reply('Reenvía mensaje del canal LOG o ID'); });
bot.action('adm_set_origen', async (ctx)=>{ pendingAdminEdit='set_origen'; await ctx.reply('Reenvía mensaje del canal ORIGEN o ID'); });
bot.action('adm_set_main', async (ctx)=>{ pendingAdminEdit='set_main'; await ctx.reply('Reenvía mensaje del canal PRINCIPAL o ID -100...'); });
bot.action('adm_lista_users', async (ctx)=>{ if(!await isAdmin(ctx.from.id)) return; await ctx.reply(`👥 LISTA DE USUARIOS`, Markup.inlineKeyboard([[Markup.button.callback('Todos','lista_todos')],[Markup.button.callback('Baneados','lista_baneados')],[Markup.button.callback('Mas activos','lista_activos')],[Markup.button.callback('⬅️','admin_back')]])); });
bot.action('lista_todos', async (ctx)=>{ const snap=await getDocs(query(collection(db,"usuarios"),limit(30))); let btns=[]; snap.forEach(d=> btns.push([Markup.button.callback(`${d.data().first_name||'Sin'} | ${d.id}`,`detuser_${d.id}`)])); btns.push([Markup.button.callback('⬅️','adm_lista_users')]); await ctx.reply(`👥 Todos (${snap.size})`,Markup.inlineKeyboard(btns)); });
bot.action('lista_baneados', async (ctx)=>{ const snap=await getDocs(query(collection(db,"usuarios"),where("baneado","==",true),limit(30))); let btns=[]; snap.forEach(d=> btns.push([Markup.button.callback(`${d.data().first_name} | ${d.id}`,`detuser_${d.id}`)])); btns.push([Markup.button.callback('⬅️','adm_lista_users')]); await ctx.reply(`🚫 Baneados`,Markup.inlineKeyboard(btns)); });
bot.action('lista_activos', async (ctx)=>{ const snap=await getDocs(query(collection(db,"usuarios"),orderBy("chats_agg","desc"),limit(20))); let btns=[]; snap.forEach(d=> btns.push([Markup.button.callback(`${d.data().first_name} (${d.data().chats_agg||0})`,`detuser_${d.id}`)])); btns.push([Markup.button.callback('⬅️','adm_lista_users')]); await ctx.reply(`🔥 Activos`,Markup.inlineKeyboard(btns)); });
bot.action(/^detuser_/, async (ctx)=>{ const id=ctx.callbackQuery.data.replace('detuser_',''); const s=await getDoc(doc(db,"usuarios",id)); if(!s.exists()) return ctx.reply('No existe'); const u=s.data(); let txt=`👤 USUARIO\nNOMBRE: ${u.first_name}\nID: <code>${u.id}</code>\n@USUARIO: @${u.username||'sin'}\nRegistro: ${u.fecha_registro}\nEstatus: ${u.baneado?'BANEADO':'ACTIVO'}\n# chats agg: ${u.chats_agg||0}\n<a href="tg://user?id=${u.id}">Ver</a>`; await ctx.reply(txt,{parse_mode:'HTML', reply_markup:{inline_keyboard:[[{text:u.baneado?'Desbanear':'Banear', callback_data:`togglebanuser_${id}`, style:u.baneado?'success':'danger'}],[{text:'⬅️', callback_data:'adm_lista_users'}]]}}); });
bot.action(/^togglebanuser_/, async (ctx)=>{ const id=ctx.callbackQuery.data.replace('togglebanuser_',''); const ref=doc(db,"usuarios",id); const s=await getDoc(ref); await updateDoc(ref,{baneado:!s.data().baneado}); await ctx.answerCbQuery({text:!s.data().baneado?'Baneado':'Desbaneado'}); });
bot.action('adm_programar', async (ctx)=>{ if(!await isAdmin(ctx.from.id)) return; pendingAdminEdit='programar_reenvio'; await ctx.reply(`⏰ PROGRAMAR REENVÍO\nFormato: HH:MM mensaje`); });
bot.action('adm_carpetas', async (ctx)=>{ if(!await isAdmin(ctx.from.id)) return; await ctx.reply(`📂 Carpetas: ${(configBot.carpetas||[]).join(', ')||'Ninguna'}`, Markup.inlineKeyboard([[Markup.button.callback('➕ Crear','crear_carpeta_prompt')],[Markup.button.callback('⬅️','admin_back')]])); });
bot.action('crear_carpeta_prompt', async (ctx)=>{ pendingAdminEdit='crear_carpeta'; await ctx.reply('Nombre carpeta'); });
bot.action('adm_botsocios', async (ctx)=>{ pendingAdminEdit='add_bot'; await ctx.reply('🤖 BOTS SOCIOS\nNombre\n@user\nDesc'); });
bot.action('adm_destacados', async (ctx)=>{ const snap=await getDocs(query(collection(db,"chats"),where("destacado","==",true))); await ctx.reply(`⭐ DESTACADOS (${snap.size})`, Markup.inlineKeyboard([[Markup.button.callback('➕ Agregar','adm_dest_add')],[Markup.button.callback('⬅️','admin_back')]])); });
bot.action('adm_dest_add', async (ctx)=>{ pendingAdminEdit='add_destacado'; await ctx.reply('ID del chat a destacar'); });
bot.action('adm_zona', async (ctx)=>{ await ctx.reply(`🌍 Zona: ${configBot.zonaHoraria}`, Markup.inlineKeyboard([[Markup.button.callback('Mexico','setzona_America/Mexico_City')],[Markup.button.callback('Colombia','setzona_America/Bogota')],[Markup.button.callback('Argentina','setzona_America/Argentina/Buenos_Aires')],[Markup.button.callback('España','setzona_Europe/Madrid')],[Markup.button.callback('⬅️','admin_back')]])); });
bot.action(/^setzona_/, async (ctx)=>{ let zona=ctx.callbackQuery.data.replace('setzona_',''); configBot.zonaHoraria=zona; await setDoc(doc(db,"config","bot"),configBot,{merge:true}); await ctx.reply(`✅ Zona: ${zona}`); });
bot.action('adm_idioma', async (ctx)=>{ await ctx.reply(`🌐 Idioma: ${configBot.idioma}`, Markup.inlineKeyboard([[Markup.button.callback('Español','setidioma_es')],[Markup.button.callback('Inglés','setidioma_en')],[Markup.button.callback('⬅️','admin_back')]])); });
bot.action(/^setidioma_/, async (ctx)=>{ configBot.idioma=ctx.callbackQuery.data.replace('setidioma_',''); await setDoc(doc(db,"config","bot"),configBot,{merge:true}); await ctx.reply(`✅ Idioma ${configBot.idioma}`); });
bot.action('adm_startbtn', async (ctx)=>{ await ctx.reply(`⚙️ botones /start\n${(configBot.startButtons||[]).length} filas`, Markup.inlineKeyboard([[Markup.button.callback('✏️ Editar','edit_startbtn')],[Markup.button.callback('⬅️','admin_back')]])); });
bot.action('edit_startbtn', async (ctx)=>{ pendingAdminEdit='edit_startbtn'; await ctx.reply(`Manda botones /start en sintaxis #p Texto - url`); });
bot.action('admin_gestionar', async (ctx)=>{ if(!await isAdmin(ctx.from.id)) return; await ctx.answerCbQuery().catch(()=>{}); await ctx.reply(`📋 LISTA DE G/C`,{...getGestionarKeyboard()}); });
bot.action('gestion_canales', async (ctx)=>{ const snap=await getDocs(collection(db,"chats")); let canales=[]; snap.forEach(d=>{ if((d.data().tipo||'canal')!=='grupo' && d.data().seccion!==CAT_BOTS) canales.push({id:d.id,...d.data()}); }); let btns=canales.slice(0,40).map(c=>[Markup.button.callback(`📺 ${c.nombre.substring(0,25)} | ${c.id}`,`det_${c.id}`)]); btns.push([Markup.button.callback('⬅️ Volver','admin_gestionar')]); await ctx.reply(`📺 CANALES (${canales.length})`,Markup.inlineKeyboard(btns)); });
bot.action('gestion_grupos', async (ctx)=>{ const snap=await getDocs(collection(db,"chats")); let grupos=[]; snap.forEach(d=>{ if((d.data().tipo||'')==='grupo' || d.data().seccion==='GRUPOS ADULTOS') grupos.push({id:d.id,...d.data()}); }); let btns=grupos.slice(0,40).map(c=>[Markup.button.callback(`👥 ${c.nombre.substring(0,25)} | ${c.id}`,`det_${c.id}`)]); btns.push([Markup.button.callback('⬅️ Volver','admin_gestionar')]); await ctx.reply(`👥 GRUPOS (${grupos.length})`,Markup.inlineKeyboard(btns)); });
bot.action('gestion_buscar', async (ctx)=>{ buscarEstado[ctx.from.id]=true; await ctx.reply(`🔍 BUSCAR C/G o Usuario\nEnvía Título o ID`); });
bot.action(/^det_/, async (ctx)=>{ await ctx.answerCbQuery().catch(()=>{}); const id=ctx.callbackQuery.data.replace('det_',''); await mostrarDetalleGestion(id, ctx); });
bot.action(/^editlink_/, async (ctx)=>{ const id=ctx.callbackQuery.data.replace('editlink_',''); editLinkEstado[ctx.from.id]=id; await ctx.reply(`🔗 Nuevo enlace para ${id}`); });
bot.action(/^ban_/, async (ctx)=>{ const id=ctx.callbackQuery.data.replace('ban_',''); await updateDoc(doc(db,"chats",id),{baneado:true, autobaneado:true}); await logAdminAccion(ctx.from.id,`Baneó ${id}`); await ctx.answerCbQuery({text:'Baneado'}); });
bot.action(/^editname_/, async (ctx)=>{ const id=ctx.callbackQuery.data.replace('editname_',''); editNombreEstado[ctx.from.id]=id; await ctx.reply(`✏️ Nuevo nombre`); });
bot.action(/^editcatbtn_/, async (ctx)=>{ const id=ctx.callbackQuery.data.replace('editcatbtn_',''); let btns=CATS_USUARIO.map(c=>[Markup.button.callback(c,`setcatadm_${id}_${c}`)]); btns.push([Markup.button.callback('⬅️','det_'+id)]); await ctx.reply(`📁 Nueva categoría:`,Markup.inlineKeyboard(btns)); });
bot.action(/^setcatadm_/, async (ctx)=>{ const data=ctx.callbackQuery.data.replace('setcatadm_',''); const last=data.lastIndexOf('_'); const id=data.substring(0,last); const cat=data.substring(last+1); await updateDoc(doc(db,"chats",id),{seccion:cat}); await mostrarDetalleGestion(id, ctx); });
bot.action(/^toggleaprob_/, async (ctx)=>{ const id=ctx.callbackQuery.data.replace('toggleaprob_',''); const s=await getDoc(doc(db,"chats",id)); const cur=s.data(); await updateDoc(doc(db,"chats",id),{pendiente:!cur.pendiente?false:!cur.pendiente, baneado:false, autobaneado:false}); await mostrarDetalleGestion(id, ctx); });
bot.action('admin_difusor', async (ctx)=>{ await ctx.reply(`📢 DIFUSOR`,{...getDifusorKeyboard()}); });
bot.action('dif_crear_botonera', async (ctx)=>{ pendingAdminEdit='dif_botonera'; await ctx.reply(`🔘 CREAR BOTONERA\nTexto\n---\n#p Boton - t.me/link`); });
bot.action('dif_crear_lista', async (ctx)=>{ pendingAdminEdit='dif_lista'; await ctx.reply(`📝 CREAR LISTA\nTITULO\n1. Nombre - link\n---\n#p Unete - link`); });
bot.action('dif_ver_borrador', async (ctx)=>{ const d=difusorData[ctx.from.id]; if(!d) return ctx.reply('❌ No hay borrador'); let kb=buildKeyboardFromFilas(d.botonesFilas,'dif_preview'); kb.push([{text:'⬅️', callback_data:'admin_difusor'}]); if(d.foto) await ctx.replyWithPhoto(d.foto,{caption:d.texto,parse_mode:'HTML', reply_markup:{inline_keyboard:kb}}).catch(()=>ctx.reply(d.texto,{parse_mode:'HTML', reply_markup:{inline_keyboard:kb}})); else await ctx.reply(d.texto,{parse_mode:'HTML', reply_markup:{inline_keyboard:kb}}); });
bot.action('dif_elegir_cat', async (ctx)=>{ if(!difusorData[ctx.from.id]) return ctx.reply('❌ Crea primero'); let btns=CATS_USUARIO.map(c=>[Markup.button.callback(`📤 ${c}`,`dif_send_${c}`)]); btns.push([Markup.button.callback('🌐 TODOS','dif_send_TODOS')]); btns.push([Markup.button.callback('⬅️','admin_difusor')]); await ctx.reply(`🚀 ¿A dónde?`,Markup.inlineKeyboard(btns)); });
bot.action(/^dif_send_/, async (ctx)=>{ const target=ctx.callbackQuery.data.replace('dif_send_',''); const d=difusorData[ctx.from.id]; if(!d) return ctx.answerCbQuery({text:'No borrador'}); await ctx.answerCbQuery({text:`Difundiendo ${target}`}); let q; if(target==='TODOS') q=collection(db,"chats"); else q=query(collection(db,"chats"),where("seccion","==",target)); const snap=await getDocs(q); let ok=0; let kb=buildKeyboardFromFilas(d.botonesFilas,'dif'); for(let docu of snap.docs){ try{ if(String(docu.id).startsWith('-100')){ if(d.foto) await bot.telegram.sendPhoto(Number(docu.id),d.foto,{caption:d.texto,parse_mode:'HTML', reply_markup:{inline_keyboard:kb}}).catch(()=>{}); else await bot.telegram.sendMessage(Number(docu.id),d.texto,{parse_mode:'HTML', reply_markup:{inline_keyboard:kb}}).catch(()=>{}); ok++; } await new Promise(r=>setTimeout(r,300)); }catch{} } await ctx.reply(`✅ Difusión ${target}: ${ok}/${snap.size}`); });
bot.on('my_chat_member', async (ctx)=>{
  const chat=ctx.chat; const status=ctx.myChatMember.new_chat_member.status;
  if(status==='administrator'){
    let chatInfo=null; try{ chatInfo=await bot.telegram.getChat(chat.id); }catch{}
    if(chatInfo && await checkAutoban(chatInfo)) return;
    let miembros=0; try{ miembros=await bot.telegram.getChatMembersCount(chat.id); }catch{}
    let bio=chatInfo?.description||""; let linkReal=chatInfo?.username? `https://t.me/${chatInfo.username}` : '';
    if(!linkReal){ try{ linkReal=await bot.telegram.exportChatInviteLink(chat.id); }catch{ linkReal=`https://t.me/c/${String(chat.id).replace('-100','')}`; } }
    await setDoc(doc(db,"chats",String(chat.id)),{ id:String(chat.id), nombre:chat.title||chatInfo?.title||"Sin nombre", seccion:CATS_USUARIO[0], link:linkReal, desc:bio||'Chat auto', bio:bio, tipo:chat.type, miembros:miembros, foto:null, clicks:0, ownerId:ctx.myChatMember.from.id, pendiente:true, fecha:new Date().toISOString(), username:chatInfo?.username||null },{merge:true});
    try{ await bot.telegram.sendMessage(ctx.myChatMember.from.id, `✅ Auto-llenado: ${chat.title}\n👥 Miembros: ${miembros}\n📝 Bio: ${bio.substring(0,100)}\n🆔 ID: ${chat.id}\n🔗 Link: ${linkReal}\n\nElige categoría:`,{reply_markup:{inline_keyboard: CATS_USUARIO.map(c=>[{text:c, callback_data:`setcatnew_${chat.id}_${c}`}])}}); }catch{}
    if(configBot.logChannel) bot.telegram.sendMessage(configBot.logChannel,`📥 NUEVO AUTO\n📁 ${chat.title}\n🆔 ${chat.id}\n👥 ${miembros}\n🔗 ${linkReal}\n👤 ${ctx.myChatMember.from.id}`).catch(()=>{});
  } else if(status==='kicked'||status==='left'){ await setDoc(doc(db,"chats",String(chat.id)),{autobaneado:true, botExpulsadoPor:ctx.myChatMember.from.id},{merge:true}).catch(()=>{}); }
});
bot.action(/^setcatnew_/, async (ctx)=>{ await ctx.answerCbQuery().catch(()=>{}); const data=ctx.callbackQuery.data.replace('setcatnew_',''); const idx=data.indexOf('_'); const chatId=data.substring(0,idx); const cat=data.substring(idx+1); const ref=doc(db,"chats",chatId); const s=await getDoc(ref); if(!s.exists()) return ctx.reply('❌ No existe'); await updateDoc(ref,{seccion:cat}); await ctx.reply(`✅ ${s.data().nombre} agregado a ${cat}\nEn revisión`); await bot.telegram.sendMessage(ADMIN_ID,`🆕 NUEVO CHAT\n${s.data().nombre}\n${cat}\nID: ${chatId}`,{parse_mode:'HTML'}); await publicarListasCategorias().catch(()=>{}); });
bot.action('admin_pendientes', async (ctx)=>{ const snap=await getDocs(query(collection(db,"chats"),where("pendiente","==",true))); if(snap.empty) return ctx.reply('✅ No hay pendientes',getPanelAdminPrincipal()); let btns=[]; snap.forEach(d=> btns.push([Markup.button.callback(`✅ ${d.data().nombre} | ${d.data().seccion}`,`det_${d.id}`), Markup.button.callback('❌','rechazar_'+d.id)])); btns.push([Markup.button.callback('⬅️ Admin','admin_back')]); await ctx.reply(`⏳ PENDIENTES (${snap.size})`,Markup.inlineKeyboard(btns)); });
bot.action(/^rechazar_/, async (ctx)=>{ const id=ctx.callbackQuery.data.replace('rechazar_',''); await deleteDoc(doc(db,"chats",id)); await ctx.answerCbQuery({text:'Rechazado'}); });
bot.action(/^delchat_/, async (ctx)=>{ const id=ctx.callbackQuery.data.replace('delchat_',''); await deleteDoc(doc(db,"chats",id)); await ctx.answerCbQuery({text:'Eliminado'}); });
bot.action('admin_cats', async (ctx)=>{ await ctx.reply(`📁 CATEGORÍAS`,getAdminCatKeyboard()); });
bot.action('admin_users', async (ctx)=>{ const snap=await getDocs(collection(db,"usuarios")); await ctx.reply(`👥 Usuarios: ${snap.size}`,getPanelAdminPrincipal()); });
bot.action('admin_stats', async (ctx)=>{ const snap=await getDocs(collection(db,"chats")); let total=0,vistas=0; snap.forEach(d=>{ total++; vistas+=(d.data().clicks||0); }); const snapU=await getDocs(collection(db,"usuarios")); await ctx.reply(`📊 Total chats: ${total}\n👁️ Vistas: ${vistas}\n👥 Usuarios: ${snapU.size}`,getPanelAdminPrincipal()); });
bot.action('admin_reset_views', async (ctx)=>{ await ctx.reply(`⚠️ ¿Resetear vistas?`,Markup.inlineKeyboard([[Markup.button.callback('✅ SI','admin_reset_confirm',undefined,{style:'danger'})],[Markup.button.callback('❌ NO','admin_back')]])); });
bot.action('admin_reset_confirm', async (ctx)=>{ const snap=await getDocs(collection(db,"chats")); for(let d of snap.docs){ await updateDoc(doc(db,"chats",d.id),{clicks:0}).catch(()=>{}); } await ctx.reply(`✅ Reset`,getPanelAdminPrincipal()); });
bot.action('admin_edit_welcome', async (ctx)=>{ pendingAdminEdit='welcome'; await ctx.reply(`💬 Manda nueva bienvenida`); });
bot.action('admin_edit_template', async (ctx)=>{ pendingAdminEdit='template'; await ctx.reply(`📝 Manda nueva plantilla`); });
bot.action(/^editcat_/, async (ctx)=>{ const cat=ctx.callbackQuery.data.replace('editcat_',''); await ctx.reply(`Color para ${cat}:`,Markup.inlineKeyboard([[Markup.button.callback('🟢 Verde','setcatcolor_'+cat+'_#g',undefined,{style:'success'}),Markup.button.callback('🔴 Rojo','setcatcolor_'+cat+'_#r',undefined,{style:'danger'})],[Markup.button.callback('🔵 Azul','setcatcolor_'+cat+'_#p',undefined,{style:'primary'})],[Markup.button.callback('⚪ Sin color','setcatcolor_'+cat+'_none')],[Markup.button.callback('⬅️','admin_cats')]])); });
bot.action(/^setcatcolor_/, async (ctx)=>{ const data=ctx.callbackQuery.data.replace('setcatcolor_',''); const last=data.lastIndexOf('_'); const cat=data.substring(0,last); const color=data.substring(last+1); if(!configBot.catColors) configBot.catColors={}; if(color==='none') delete configBot.catColors[cat]; else configBot.catColors[cat]=color; await setDoc(doc(db,"config","bot"),configBot,{merge:true}); await ctx.reply(`✅ ${cat} -> ${color}`,getAdminCatKeyboard()); });
bot.action(/^editbtns_/, async (ctx)=>{ const id=ctx.callbackQuery.data.replace('editbtns_',''); pendingEdits[ctx.from.id]=id; await ctx.reply(`🎨 Manda botones`); });
bot.action(/^clearbtns_/, async (ctx)=>{ const id=ctx.callbackQuery.data.replace('clearbtns_',''); const ref=doc(db,"chats",id); const snap=await getDoc(ref); const {descripcionLimpia}=extraerBotonesDeDescripcion(snap.data().desc); await updateDoc(ref,{desc:descripcionLimpia}); await ctx.answerCbQuery({text:"Borrados"}); });
bot.action(/^setcolor_/, async (ctx)=>{ const data=ctx.callbackQuery.data.replace('setcolor_',''); const last=data.lastIndexOf('_'); const id=data.substring(0,last); const color=data.substring(last+1); const ref=doc(db,"chats",id); const snap=await getDoc(ref); let nombreActual=snap.data().nombre.replace(/#g|#r|#p|#y/g,'').trim(); let nuevo=color==='none'?nombreActual:`${nombreActual} ${color}`; await updateDoc(ref,{nombre:nuevo}); await ctx.reply(`✅ ${nuevo}`); });
bot.action(/^popup_/, async (ctx)=>{ try{ const data=ctx.callbackQuery.data.replace('popup_',''); const idx=data.indexOf('_'); const chatId=data.substring(0,idx); const key=data.substring(idx+1); const texto=global.popupCache[`${chatId}_${key}`]||"Sin texto"; await ctx.answerCbQuery(texto,{show_alert:true}); }catch{} });
bot.action(/^copy_/, async (ctx)=>{ try{ const id=ctx.callbackQuery.data.replace('copy_',''); const texto=global.popupCache[`copy_${id}`]||""; await ctx.answerCbQuery(`📋 ${texto}`,{show_alert:true}); }catch{} });
bot.action(/^rules_/, async (ctx)=>{ try{ await ctx.answerCbQuery("📜 Reglas: Respetar, no spam, no CP. Ban = permanente",{show_alert:true}); }catch{} });
bot.command('cancel',(ctx)=>{ delete pendingEdits[ctx.from.id]; pendingAdminEdit=null; delete agregarEstado[ctx.from.id]; delete buscarEstado[ctx.from.id]; delete editLinkEstado[ctx.from.id]; delete editNombreEstado[ctx.from.id]; ctx.reply("❌ Cancelado"); });

bot.on('text', async (ctx,next)=>{
  if(buscarEstado[ctx.from.id]){ const q=ctx.message.text.toLowerCase(); const snap=await getDocs(collection(db,"chats")); let encontrados=[]; snap.forEach(d=>{ if(d.data().nombre.toLowerCase().includes(q)||d.id.includes(q)) encontrados.push({id:d.id,...d.data()}); }); delete buscarEstado[ctx.from.id]; if(encontrados.length===0) return ctx.reply('❌ No encontrado',getPanelAdminPrincipal()); let btns=encontrados.slice(0,20).map(c=>[Markup.button.callback(`${c.nombre.substring(0,25)} | ${c.id}`,`det_${c.id}`)]); btns.push([Markup.button.callback('⬅️ Volver','admin_back')]); return ctx.reply(`🔍 Resultados "${ctx.message.text}" (${encontrados.length})`,Markup.inlineKeyboard(btns)); }
  if(editLinkEstado[ctx.from.id]){ const id=editLinkEstado[ctx.from.id]; let link=ctx.message.text.trim(); if(link.startsWith('@')) link=`https://t.me/${link.replace('@','')}`; if(!link.startsWith('http')) link='https://'+link; await updateDoc(doc(db,"chats",id),{link}); delete editLinkEstado[ctx.from.id]; return ctx.reply(`✅ Link actualizado`); }
  if(editNombreEstado[ctx.from.id]){ const id=editNombreEstado[ctx.from.id]; await updateDoc(doc(db,"chats",id),{nombre:ctx.message.text}); delete editNombreEstado[ctx.from.id]; return ctx.reply(`✅ Nombre actualizado`); }
  if(await isAdmin(ctx.from.id)&&pendingAdminEdit==='add_admin'){ await setDoc(doc(db,"admins",ctx.message.text.trim()),{id:Number(ctx.message.text.trim()), fecha:new Date().toISOString()}); pendingAdminEdit=null; return ctx.reply(`✅ Admin agregado`); }
  if(await isAdmin(ctx.from.id)&&pendingAdminEdit==='set_log'){ let id=ctx.message.text.trim(); configBot.logChannel=Number(id)||id; await setDoc(doc(db,"config","bot"),configBot,{merge:true}); pendingAdminEdit=null; return ctx.reply(`✅ Log: ${id}`); }
  if(await isAdmin(ctx.from.id)&&pendingAdminEdit==='set_origen'){ let id=ctx.message.text.trim(); configBot.originChannel=Number(id)||id; await setDoc(doc(db,"config","bot"),configBot,{merge:true}); pendingAdminEdit=null; return ctx.reply(`✅ Origen: ${id}`); }
  if(await isAdmin(ctx.from.id)&&pendingAdminEdit==='set_main'){ let id=ctx.message.text.trim(); configBot.mainChannel=Number(id)||id; await setDoc(doc(db,"config","bot"),configBot,{merge:true}); pendingAdminEdit=null; return ctx.reply(`✅ Principal: ${id}\nAhora usa /publicarlistas`); }
  if(await isAdmin(ctx.from.id)&&pendingAdminEdit==='dif_botonera'){ const {texto,botonesFilas}=parseDifusorBotonera(ctx.message.text); if(!difusorData[ctx.from.id]) difusorData[ctx.from.id]={}; difusorData[ctx.from.id].texto=texto; difusorData[ctx.from.id].botonesFilas=botonesFilas; pendingAdminEdit=null; let kb=buildKeyboardFromFilas(botonesFilas,'dif_preview'); kb.push([{text:'🚀 DIFUNDIR', callback_data:'dif_elegir_cat', style:'primary'}]); return ctx.reply(`✅ Botonera guardada!`,{reply_markup:{inline_keyboard:kb}}); }
  if(await isAdmin(ctx.from.id)&&pendingAdminEdit==='dif_lista'){ const {texto,botonesFilas}=parseDifusorBotonera(ctx.message.text); if(!difusorData[ctx.from.id]) difusorData[ctx.from.id]={}; difusorData[ctx.from.id].texto=texto; difusorData[ctx.from.id].botonesFilas=botonesFilas; pendingAdminEdit=null; let kb=buildKeyboardFromFilas(botonesFilas,'dif_preview'); kb.push([{text:'🚀 DIFUNDIR', callback_data:'dif_elegir_cat', style:'primary'}]); return ctx.reply(`✅ Lista guardada!`,{reply_markup:{inline_keyboard:kb}}); }
  if(await isAdmin(ctx.from.id)&&pendingAdminEdit==='add_bot'){ const lines=ctx.message.text.split('\n'); const nombre=lines[0]; const link=lines[1].includes('t.me')||lines[1].includes('http')?lines[1]:`https://t.me/${lines[1].replace('@','')}`; const desc=lines.slice(2).join('\n'); await setDoc(doc(db,"chats",String(Date.now())),{nombre,seccion:CAT_BOTS,link,desc,clicks:0,ownerId:ADMIN_ID,pendiente:false}); pendingAdminEdit=null; return ctx.reply(`🤖 Bot ${nombre} agregado`); }
  if(await isAdmin(ctx.from.id)&&pendingAdminEdit==='welcome'){ configBot.bienvenida=ctx.message.text; await setDoc(doc(db,"config","bot"),configBot,{merge:true}); pendingAdminEdit=null; return ctx.reply(`✅ Bienvenida guardada!`); }
  if(await isAdmin(ctx.from.id)&&pendingAdminEdit==='template'){ configBot.plantilla=ctx.message.text; await setDoc(doc(db,"config","bot"),configBot,{merge:true}); pendingAdminEdit=null; return ctx.reply(`✅ Plantilla guardada!`); }
  if(await isAdmin(ctx.from.id)&&pendingAdminEdit==='crear_carpeta'){ configBot.carpetas=configBot.carpetas||[]; configBot.carpetas.push(ctx.message.text); await setDoc(doc(db,"config","bot"),configBot,{merge:true}); pendingAdminEdit=null; return ctx.reply(`✅ Carpeta ${ctx.message.text} creada`); }
  if(await isAdmin(ctx.from.id)&&pendingAdminEdit==='edit_startbtn'){ const {botonesFilas}=extraerBotonesDeDescripcion(ctx.message.text); configBot.startButtons=botonesFilas; await setDoc(doc(db,"config","bot"),configBot,{merge:true}); pendingAdminEdit=null; return ctx.reply(`✅ Botones /start guardados`); }
  if(await isAdmin(ctx.from.id)&&pendingAdminEdit==='add_destacado'){ await updateDoc(doc(db,"chats",ctx.message.text.trim()),{destacado:true}); pendingAdminEdit=null; return ctx.reply(`⭐ Destacado`); }
  if(await isAdmin(ctx.from.id)&&pendingAdminEdit==='programar_reenvio'){ let parts=ctx.message.text.split(' '); let hora=parts[0]; let mensaje=parts.slice(1).join(' '); await setDoc(doc(db,"programados",String(Date.now())),{hora,mensaje,origen:configBot.originChannel, fecha:new Date().toISOString()}); pendingAdminEdit=null; return ctx.reply(`⏰ Reenvío programado a las ${hora}`); }
  if(pendingEdits[ctx.from.id]){ const id=pendingEdits[ctx.from.id]; const ref=doc(db,"chats",id); const snap=await getDoc(ref); const {descripcionLimpia}=extraerBotonesDeDescripcion(snap.data().desc); await updateDoc(ref,{desc:descripcionLimpia+"\n"+ctx.message.text}); delete pendingEdits[ctx.from.id]; return ctx.reply(`✅ Guardado!`); }
  if(agregarEstado[ctx.from.id]){ let link=ctx.message.text.trim(); if(link.startsWith('@')) link=`https://t.me/${link.replace('@','')}`; await setDoc(doc(db,"chats_pendientes",String(ctx.from.id)),{chatId:Date.now(),nombre:link,tipo:'canal',username:link,ownerId:ctx.from.id,link:link,fecha:new Date().toISOString()}); await ctx.reply(`✅ Link recibido: ${link}\n¿En qué categoría?`,{reply_markup:{inline_keyboard: CATS_USUARIO.map(c=>[{text:c, callback_data:`setcatnew_${ctx.from.id}_${c}`}])}}); delete agregarEstado[ctx.from.id]; return; }
  return next();
});

bot.action('volver_menu', async (ctx)=>{ await ctx.answerCbQuery().catch(()=>{}); await ctx.reply(getBienvenida(ctx),{parse_mode:'HTML',...getMenuInline()}); });
bot.action(/^sec_/, async (ctx)=>{ await mandarSeccion(ctx.callbackQuery.data.replace('sec_',''),ctx); });
bot.action(/^ver_/, async (ctx)=>{ await mandarUnChat(ctx.callbackQuery.data.replace('ver_',''),ctx); });

(async()=>{ await bot.telegram.deleteWebhook().catch(()=>{}); await bot.launch(); console.log('SEXOMANIA V8.1 INTELIGENTE ON'); })();
const app2=express(); app2.get('/',(r,s)=>s.send('V8.1 INTELIGENTE ON')); app2.listen(process.env.PORT||3000);
