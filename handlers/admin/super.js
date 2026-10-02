const { Markup } = require('telegraf');
const { db } = require('../../config/firebase');
const { isAdmin, ADMIN_IDS, ESTADOS_CHAT } = require('../../config/constantes');
const { getCategorias } = require('../../config/categorias');

const guard = ctx => isAdmin(ctx.from?.id);
const back = 'admin_back';

function menu(title, rows) {
  return Markup.inlineKeyboard([...rows, [Markup.button.callback('⬅️ VOLVER', back)]]);
}

async function countCollection(name) {
  if (!db) return 0;
  try { return (await db.collection(name).count().get()).data().count || 0; }
  catch { return (await db.collection(name).get()).size; }
}

async function renderUsers(ctx, page = 0, query = '') {
  if (!db) return ctx.editMessageText('❌ Firebase no disponible.', menu('Usuarios', []));
  const all = await db.collection('usuarios').orderBy('ultimaActividad', 'desc').limit(200).get().catch(() => db.collection('usuarios').limit(200).get());
  let docs = all.docs;
  const q = query.toLowerCase().trim();
  if (q) docs = docs.filter(d => {
    const u=d.data()||{};
    return String(d.id).includes(q) || String(u.first_name||'').toLowerCase().includes(q) || String(u.last_name||'').toLowerCase().includes(q) || String(u.username||'').toLowerCase().includes(q);
  });
  const size=10, start=page*size, slice=docs.slice(start,start+size);
  const rows=slice.map(d=>{
    const u=d.data()||{};
    const name=String(u.first_name||u.username||d.id).slice(0,28);
    return [Markup.button.callback((u.baneado?'🚫 ':'👤 ')+name,'super_user_'+d.id)];
  });
  const nav=[];
  if(page>0) nav.push(Markup.button.callback('◀️','super_users_page_'+(page-1)+(q?'_'+encodeURIComponent(q):'')));
  if(start+size<docs.length) nav.push(Markup.button.callback('▶️','super_users_page_'+(page+1)+(q?'_'+encodeURIComponent(q):'')));
  if(nav.length) rows.push(nav);
  rows.push([Markup.button.callback('🔍 BUSCAR','super_user_search'),Markup.button.callback('📣 BROADCAST','super_broadcast')]);
  rows.push([Markup.button.callback('🚫 BANEADOS','super_banned')]);
  await ctx.editMessageText('👥 USUARIOS\n\n'+(q?'🔎 '+q+'\n':'')+'Mostrando '+(slice.length)+' de '+docs.length+'.',menu('Usuarios',rows));
}

async function renderChats(ctx,page=0,status=null){
  if(!db) return ctx.editMessageText('❌ Firebase no disponible.',menu('Chats',[]));
  let snap;
  try {
    let ref=db.collection('chats');
    if(status) ref=ref.where('estado','==',status);
    snap=await ref.limit(200).get();
  } catch { snap=await db.collection('chats').limit(200).get(); }
  const size=8,start=page*size,slice=snap.docs.slice(start,start+size);
  const rows=slice.map(d=>{
    const c=d.data()||{};
    return [Markup.button.callback((c.estado==='baneado'?'🚫 ':c.estado==='pendiente'?'⏳ ':'📺 ')+String(c.nombre||d.id).slice(0,35),'super_chat_'+d.id)];
  });
  const nav=[];
  if(page>0) nav.push(Markup.button.callback('◀️','super_chats_page_'+(page-1)+(status?'_'+status:'')));
  if(start+size<snap.docs.length) nav.push(Markup.button.callback('▶️','super_chats_page_'+(page+1)+(status?'_'+status:'')));
  if(nav.length) rows.push(nav);
  rows.push([Markup.button.callback('⏳ PENDIENTES','super_pending'),Markup.button.callback('🚫 BANEADOS','super_banned_chats')]);
  await ctx.editMessageText('📋 LISTA G/C\n\n'+(status?'Filtro: '+status:'Todos')+'\nPágina '+(page+1),menu('Chats',rows));
}

async function renderBannedUsers(ctx){
  if(!db) return ctx.answerCbQuery('Firebase no disponible',{show_alert:true});
  const snap=await db.collection('usuarios').where('baneado','==',true).limit(100).get();
  const rows=snap.docs.slice(0,50).map(d=>[Markup.button.callback('🚫 '+String(d.data()?.first_name||d.id).slice(0,30),'super_user_'+d.id)]);
  rows.push([Markup.button.callback('♻️ DESBAN MASIVO','super_unban_all_users',{style:'danger'})]);
  await ctx.editMessageText('🚫 USUARIOS BANEADOS\n\nTotal mostrado: '+snap.size,menu('Baneados',rows));
}

async function renderPending(ctx){
  if(!db) return ctx.answerCbQuery('Firebase no disponible',{show_alert:true});
  const snap=await db.collection('chats').where('pendiente','==',true).limit(50).get();
  const rows=[];
  for(const d of snap.docs){
    const c=d.data()||{};
    rows.push([Markup.button.callback('✅ '+String(c.nombre||d.id).slice(0,32),'super_approve_'+d.id),Markup.button.callback('🚫','super_ban_chat_'+d.id,{style:'danger'})]);
  }
  await ctx.editMessageText('⏳ PENDIENTES\n\n'+(snap.empty?'No hay pendientes.':'Aprueba o bloquea directamente.'),menu('Pendientes',rows));
}

function register(bot){
  bot.action('super_admins',async ctx=>{
    if(!guard(ctx)) return ctx.answerCbQuery('⛔ Sin permiso',{show_alert:true});
    const extras=db?await db.collection('config').doc('admins').get():null;
    const ids=[...new Set([...ADMIN_IDS,...((extras?.exists?extras.data()?.ids:[])||[]).map(Number)])];
    await ctx.editMessageText('👮 GESTIÓN DE ADMINS\n\n'+(ids.length?ids.map((id,i)=>(i+1)+'. '+id).join('\n'):'Sin administradores')+'\n\nPuedes agregar o quitar IDs.',menu('Admins',[
      [Markup.button.callback('➕ AGREGAR','super_admin_add'),Markup.button.callback('➖ QUITAR','super_admin_remove')]
    ])); await ctx.answerCbQuery();
  });
  for(const [action,mode,prompt] of [['super_admin_add','add','➕ Envía el ID del nuevo administrador.'],['super_admin_remove','remove','➖ Envía el ID del administrador que quieres quitar.']]){
    bot.action(action,async ctx=>{
      if(!guard(ctx)) return ctx.answerCbQuery('⛔ Sin permiso',{show_alert:true});
      ctx.session=ctx.session||{};ctx.session.superAdminAction=mode;
      await ctx.reply(prompt+'\n/cancel para cancelar.');await ctx.answerCbQuery();
    });
  }

  bot.action('super_stats',async ctx=>{
    if(!guard(ctx)) return ctx.answerCbQuery('⛔ Sin permiso',{show_alert:true});
    const [users,chats,pubs]=await Promise.all(['usuarios','chats','publicaciones'].map(countCollection));
    const active=db?await db.collection('usuarios').where('estado','==','activo').limit(1000).get().catch(()=>({size:0})):null;
    const cats=(await getCategorias()).length;
    await ctx.editMessageText('📊 ESTADÍSTICAS AVANZADAS\n\n👥 Usuarios: '+users+'\n🟢 Activos (muestra): '+(active?.size||0)+'\n📋 G/C: '+chats+'\n📢 Publicaciones: '+pubs+'\n📁 Categorías: '+cats+'\n\n📈 Los clicks requieren registrar eventos de navegación; el módulo queda preparado para esa métrica.',menu('Stats',[[Markup.button.callback('🔄 ACTUALIZAR','super_stats')]]));await ctx.answerCbQuery();
  });

  bot.action('super_chats',async ctx=>{if(!guard(ctx))return ctx.answerCbQuery('⛔',{show_alert:true});await renderChats(ctx);await ctx.answerCbQuery();});
  bot.action(/^super_chats_page_(\d+)(?:_(.+))?$/,async ctx=>{if(!guard(ctx))return ctx.answerCbQuery('⛔',{show_alert:true});await renderChats(ctx,Number(ctx.match[1]),ctx.match[2]||null);await ctx.answerCbQuery();});
  bot.action('super_pending',async ctx=>{if(!guard(ctx))return ctx.answerCbQuery('⛔',{show_alert:true});await renderPending(ctx);await ctx.answerCbQuery();});
  bot.action('super_banned_chats',async ctx=>{if(!guard(ctx))return ctx.answerCbQuery('⛔',{show_alert:true});await renderChats(ctx,0,'baneado');await ctx.answerCbQuery();});

  bot.action('super_banned',async ctx=>{if(!guard(ctx))return ctx.answerCbQuery('⛔',{show_alert:true});await renderBannedUsers(ctx);await ctx.answerCbQuery();});
  bot.action('super_unban_all_users',async ctx=>{
    if(!guard(ctx))return ctx.answerCbQuery('⛔',{show_alert:true});
    if(!db)return ctx.answerCbQuery('Firebase no disponible',{show_alert:true});
    const snap=await db.collection('usuarios').where('baneado','==',true).limit(500).get();
    const batch=db.batch();snap.docs.forEach(d=>batch.set(d.ref,{baneado:false,estado:'activo',actualizado:new Date()},{merge:true}));await batch.commit();
    await ctx.answerCbQuery('♻️ Desbaneados: '+snap.size);await renderBannedUsers(ctx);
  });

  bot.action('super_users',async ctx=>{if(!guard(ctx))return ctx.answerCbQuery('⛔',{show_alert:true});await renderUsers(ctx);await ctx.answerCbQuery();});
  bot.action(/^super_users_page_(\d+)(?:_(.*))?$/,async ctx=>{if(!guard(ctx))return ctx.answerCbQuery('⛔',{show_alert:true});const q=ctx.match[2]?decodeURIComponent(ctx.match[2]):'';await renderUsers(ctx,Number(ctx.match[1]),q);await ctx.answerCbQuery();});
  bot.action('super_user_search',async ctx=>{if(!guard(ctx))return ctx.answerCbQuery('⛔',{show_alert:true});ctx.session=ctx.session||{};ctx.session.superSearch='user';await ctx.reply('🔍 Envía ID, nombre o @username.\n/cancel para cancelar.');await ctx.answerCbQuery();});

  bot.action(/^super_user_(\d+)$/,async ctx=>{
    if(!guard(ctx))return ctx.answerCbQuery('⛔',{show_alert:true});
    if(!db)return ctx.answerCbQuery('Firebase no disponible',{show_alert:true});
    const id=ctx.match[1],doc=await db.collection('usuarios').doc(id).get();if(!doc.exists)return ctx.answerCbQuery('No encontrado',{show_alert:true});
    const u=doc.data()||{};
    await ctx.editMessageText('👤 USUARIO\n\n🆔 '+id+'\n📝 '+(u.first_name||'Sin nombre')+' '+(u.last_name||'')+'\n👤 '+(u.username?'@'+u.username:'Sin username')+'\n⭐ Premium: '+(u.premium?'✅':'❌')+'\n🚫 Baneado: '+(u.baneado?'✅':'❌')+'\n📈 Chats: '+(u.chatsRegistrados||0),menu('Usuario',[
      [Markup.button.callback(u.premium?'🎁 QUITAR PREMIUM':'🎁 DAR PREMIUM','super_premium_'+id)],
      [Markup.button.callback(u.baneado?'♻️ DESBAN':'🚫 BAN','super_userban_'+id,{style:u.baneado?'success':'danger'})],
      [Markup.button.callback('📨 MENSAJE','super_dm_'+id)]
    ]));await ctx.answerCbQuery();
  });
  bot.action(/^super_premium_(\d+)$/,async ctx=>{if(!guard(ctx))return ctx.answerCbQuery('⛔',{show_alert:true});if(!db)return ctx.answerCbQuery('Firebase no disponible',{show_alert:true});const id=ctx.match[1],d=await db.collection('usuarios').doc(id).get();if(!d.exists)return ctx.answerCbQuery('No encontrado',{show_alert:true});const value=!d.data()?.premium;await d.ref.set({premium:value,premiumUpdatedAt:new Date()},{merge:true});await ctx.answerCbQuery(value?'🎁 Premium activado':'Premium retirado');await ctx.reply('✅ Premium '+(value?'activado':'retirado')+' para '+id+'.');});
  bot.action(/^super_userban_(\d+)$/,async ctx=>{if(!guard(ctx))return ctx.answerCbQuery('⛔',{show_alert:true});if(!db)return ctx.answerCbQuery('Firebase no disponible',{show_alert:true});const id=ctx.match[1],r=db.collection('usuarios').doc(id),d=await r.get();if(!d.exists)return ctx.answerCbQuery('No encontrado',{show_alert:true});const v=!d.data()?.baneado;await r.set({baneado:v,estado:v?'baneado':'activo',actualizado:new Date()},{merge:true});await ctx.answerCbQuery(v?'🚫 Baneado':'♻️ Desbaneado');await renderUsers(ctx);});
  bot.action(/^super_dm_(\d+)$/,async ctx=>{if(!guard(ctx))return ctx.answerCbQuery('⛔',{show_alert:true});ctx.session=ctx.session||{};ctx.session.superDM=ctx.match[1];await ctx.reply('📨 Escribe el mensaje para el usuario.\n/cancel para cancelar.');await ctx.answerCbQuery();});

  bot.action('super_broadcast',async ctx=>{if(!guard(ctx))return ctx.answerCbQuery('⛔',{show_alert:true});ctx.session=ctx.session||{};ctx.session.superBroadcast=true;await ctx.reply('📣 Envía el mensaje que quieres difundir a los usuarios registrados.\n\nSe respetarán los límites de Telegram. /cancel para cancelar.');await ctx.answerCbQuery();});

  bot.on('message',async(ctx,next)=>{
    if(!guard(ctx)||!ctx.session||!ctx.message)return next();
    if(ctx.session.superAdminAction && ctx.message.text){
      const id=Number(ctx.message.text.trim());if(!Number.isSafeInteger(id))return ctx.reply('❌ ID inválido.');
      const snap=db?await db.collection('config').doc('admins').get():null;let ids=[...new Set([...ADMIN_IDS,...((snap?.exists?snap.data()?.ids:[])||[]).map(Number)])];
      if(ctx.session.superAdminAction==='add'){if(!ids.includes(id))ids.push(id);}else{ids=ids.filter(x=>x!==id);if(ADMIN_IDS.includes(id))return ctx.reply('❌ Un ADMIN_ID del entorno no puede eliminarse desde el panel.');}
      if(db)await db.collection('config').doc('admins').set({ids,updatedAt:new Date()},{merge:true});
      if(ctx.session.superAdminAction==='add'&&!ADMIN_IDS.includes(id))ADMIN_IDS.push(id);
      if(ctx.session.superAdminAction==='remove'){const i=ADMIN_IDS.indexOf(id);if(i>=0)ADMIN_IDS.splice(i,1);}
      ctx.session.superAdminAction=null;return ctx.reply('✅ Administradores actualizados.');
    }
    if(ctx.session.superSearch==='user'&&ctx.message.text){
      const q=ctx.message.text.trim().replace(/^@/,'').toLowerCase();ctx.session.superSearch=null;return renderUsers(ctx,0,q);
    }
    if(ctx.session.superDM&&ctx.message.text){
      const id=ctx.session.superDM;ctx.session.superDM=null;try{await bot.telegram.sendMessage(id,ctx.message.text);return ctx.reply('✅ Mensaje enviado.');}catch(e){return ctx.reply('❌ No se pudo enviar: '+e.message);}
    }
    if(ctx.session.superBroadcast){
      ctx.session.superBroadcast=null;
      if(!db)return ctx.reply('❌ Firebase no disponible.');
      const snap=await db.collection('usuarios').where('baneado','!=',true).limit(5000).get().catch(()=>db.collection('usuarios').limit(5000).get());
      let ok=0,fail=0;
      for(const d of snap.docs){try{await bot.telegram.sendMessage(d.id,ctx.message.text||'');ok++;}catch{fail++;}await new Promise(r=>setTimeout(r,60));}
      return ctx.reply('📣 Difusión terminada.\n\n✅ Enviados: '+ok+'\n❌ Fallidos: '+fail);
    }
    return next();
  });

  bot.action(/^super_chat_(.+)$/,async ctx=>{
    if(!guard(ctx))return ctx.answerCbQuery('⛔',{show_alert:true});
    if(!db)return ctx.answerCbQuery('Firebase no disponible',{show_alert:true});
    const id=ctx.match[1],d=await db.collection('chats').doc(id).get();if(!d.exists)return ctx.answerCbQuery('No encontrado',{show_alert:true});const c=d.data()||{};
    await ctx.editMessageText('📋 CHAT\n\n🆔 '+id+'\n📝 '+(c.nombre||'Sin nombre')+'\n📁 '+(c.categoria||'Sin categoría')+'\n⚙️ '+(c.estado||'sin estado')+'\n👥 '+(c.miembros||0)+'\n🔗 '+(c.enlace||'Sin enlace'),menu('Chat',[
      [Markup.button.callback(c.estado==='aprobado'?'💀 MARCAR CAÍDO':'✅ APROBAR','super_toggle_chat_'+id)],
      [Markup.button.callback(c.estado==='baneado'?'♻️ REACTIVAR':'🚫 BANEAR','super_ban_toggle_'+id,{style:c.estado==='baneado'?'success':'danger'})]
    ]));await ctx.answerCbQuery();
  });
  bot.action(/^super_approve_(.+)$/,async ctx=>{if(!guard(ctx))return ctx.answerCbQuery('⛔',{show_alert:true});if(!db)return ctx.answerCbQuery('Firebase no disponible',{show_alert:true});await db.collection('chats').doc(ctx.match[1]).set({aprobado:true,pendiente:false,estado:'aprobado',baneadoAdmin:false,actualizado:new Date()},{merge:true});await ctx.answerCbQuery('✅ Aprobado');await renderPending(ctx);});
  bot.action(/^super_ban_chat_(.+)$/,async ctx=>{if(!guard(ctx))return ctx.answerCbQuery('⛔',{show_alert:true});if(!db)return ctx.answerCbQuery('Firebase no disponible',{show_alert:true});await db.collection('chats').doc(ctx.match[1]).set({baneadoAdmin:true,pendiente:false,estado:'baneado',actualizado:new Date()},{merge:true});await ctx.answerCbQuery('🚫 Baneado');await renderPending(ctx);});
  bot.action(/^super_ban_toggle_(.+)$/,async ctx=>{if(!guard(ctx))return ctx.answerCbQuery('⛔',{show_alert:true});if(!db)return ctx.answerCbQuery('Firebase no disponible',{show_alert:true});const r=db.collection('chats').doc(ctx.match[1]),d=await r.get();const v=d.data()?.estado!=='baneado';await r.set({baneadoAdmin:v,estado:v?'baneado':'aprobado',pendiente:false,actualizado:new Date()},{merge:true});await ctx.answerCbQuery(v?'🚫 Baneado':'♻️ Reactivado');await renderChats(ctx);});
  bot.action(/^super_toggle_chat_(.+)$/,async ctx=>{if(!guard(ctx))return ctx.answerCbQuery('⛔',{show_alert:true});if(!db)return ctx.answerCbQuery('Firebase no disponible',{show_alert:true});const r=db.collection('chats').doc(ctx.match[1]);await r.set({estado:'caido',baneadoAdmin:true,actualizado:new Date()},{merge:true});await ctx.answerCbQuery('💀 Marcado como caído');await renderChats(ctx);});

  bot.action('super_backup',async ctx=>{
    if(!guard(ctx))return ctx.answerCbQuery('⛔',{show_alert:true});
    if(!db)return ctx.answerCbQuery('Firebase no disponible',{show_alert:true});
    await ctx.answerCbQuery('📦 Generando backup...');
    const names=['usuarios','chats','publicaciones','config','botoneras'];
    const data={createdAt:new Date().toISOString(),collections:{}};
    for(const name of names){try{const s=await db.collection(name).limit(5000).get();data.collections[name]=s.docs.map(d=>({id:d.id,data:d.data()}));}catch(e){data.collections[name]={error:e.message};}}
    const buffer=Buffer.from(JSON.stringify(data,null,2),'utf8');
    await ctx.replyWithDocument({source:buffer,filename:'sexomania-backup-'+new Date().toISOString().slice(0,10)+'.json'},{caption:'📦 Backup JSON de SEXOMANIA'});
  });

  bot.action('super_security',async ctx=>{
    if(!guard(ctx))return ctx.answerCbQuery('⛔',{show_alert:true});
    const d=db?await db.collection('config').doc('security').get():null,s=d?.exists?d.data():{};
    await ctx.editMessageText('🛡️ SEGURIDAD\n\n🛡️ AutoBan: '+(s.autoBan?'ON':'OFF')+'\n🚫 Anti-spam: '+(s.antiSpam===false?'OFF':'ON')+'\n🚨 Filtro de contenido ilegal: '+(s.illegalFilter===false?'OFF':'ON')+'\n🤖 Detector de bots: '+(s.botFilter?'ON':'OFF')+'\n\nLas palabras prohibidas se almacenan en config/security.',menu('Seguridad',[
      [Markup.button.callback('🛡️ AUTOBAN','super_sec_toggle_autoban')],
      [Markup.button.callback('🚫 ANTI-SPAM','super_sec_toggle_spam')],
      [Markup.button.callback('🚨 FILTRO ILEGAL','super_sec_toggle_illegal')],
      [Markup.button.callback('🤖 DETECTOR BOTS','super_sec_toggle_bots')],
      [Markup.button.callback('📝 PALABRAS PROHIBIDAS','super_sec_words')]
    ]));await ctx.answerCbQuery();
  });
  for(const [cb,key] of [['super_sec_toggle_autoban','autoBan'],['super_sec_toggle_spam','antiSpam'],['super_sec_toggle_illegal','illegalFilter'],['super_sec_toggle_bots','botFilter']]){
    bot.action(cb,async ctx=>{if(!guard(ctx))return ctx.answerCbQuery('⛔',{show_alert:true});if(!db)return ctx.answerCbQuery('Firebase no disponible',{show_alert:true});const r=db.collection('config').doc('security'),d=await r.get(),v=!d.data()?.[key];await r.set({[key]:v,updatedAt:new Date()},{merge:true});await ctx.answerCbQuery(v?'✅ Activado':'❌ Desactivado');await ctx.editMessageText('🛡️ '+key+': '+(v?'ON':'OFF'),menu('Seguridad',[[Markup.button.callback('⚙️ VOLVER A SEGURIDAD','super_security')]]));});
  }
  bot.action('super_sec_words',async ctx=>{if(!guard(ctx))return ctx.answerCbQuery('⛔',{show_alert:true});ctx.session=ctx.session||{};ctx.session.superWords=true;await ctx.reply('📝 Envía las palabras prohibidas separadas por comas.\n/cancel para cancelar.');await ctx.answerCbQuery();});

  bot.action('super_verify_links',async ctx=>{
    if(!guard(ctx))return ctx.answerCbQuery('⛔',{show_alert:true});
    if(!db)return ctx.answerCbQuery('Firebase no disponible',{show_alert:true});
    await ctx.answerCbQuery('🔍 Verificando...');
    const snap=await db.collection('chats').limit(100).get();let ok=0,broken=0;
    for(const d of snap.docs){const url=d.data()?.enlace;if(!url)continue;try{const res=await fetch(url,{method:'HEAD',redirect:'follow'});if(res.ok)ok++;else{broken++;await d.ref.set({linkStatus:'broken',linkCheckedAt:new Date()},{merge:true});}}catch{broken++;await d.ref.set({linkStatus:'broken',linkCheckedAt:new Date()},{merge:true});}}
    await ctx.editMessageText('🔍 VERIFICACIÓN DE LINKS\n\n✅ Válidos: '+ok+'\n❌ Rotos/expirados: '+broken,menu('Links',[[Markup.button.callback('🔄 VERIFICAR OTRA VEZ','super_verify_links')]]));
  });

  bot.on('message',async(ctx,next)=>{
    if(!guard(ctx)||!ctx.session?.superWords||!ctx.message?.text)return next();
    const words=ctx.message.text.split(',').map(x=>x.trim()).filter(Boolean);
    if(db)await db.collection('config').doc('security').set({forbiddenWords:words,updatedAt:new Date()},{merge:true});
    ctx.session.superWords=null;return ctx.reply('✅ Palabras prohibidas actualizadas: '+words.length);
  });
}

module.exports=register;
