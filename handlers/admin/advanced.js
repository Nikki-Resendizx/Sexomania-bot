const { Markup } = require('telegraf');
const { db } = require('../../config/firebase');
const { isAdmin } = require('../../config/constantes');
const guard = ctx => isAdmin(ctx.from?.id);

function menu(rows){ return Markup.inlineKeyboard([...rows,[Markup.button.callback('⬅️ VOLVER','admin_back')]]); }

function register(bot){
  bot.action('admin_lists_manage', async ctx => {
    if(!guard(ctx)) return ctx.answerCbQuery('⛔',{show_alert:true});
    const snap=db?await db.collection('listas').limit(50).get():null;
    const rows=(snap?.docs||[]).map(d=>[Markup.button.callback('📝 '+String(d.data()?.titulo||d.id).slice(0,35),'list_edit_'+d.id)]);
    rows.push([Markup.button.callback('➕ CREAR LISTA','list_create')]);
    await ctx.editMessageText('📝 LISTAS\n\n'+(snap?.empty?'No hay listas.':'Selecciona una lista.'),menu(rows));await ctx.answerCbQuery();
  });
  bot.action('list_create',async ctx=>{
    if(!guard(ctx))return ctx.answerCbQuery('⛔',{show_alert:true});
    ctx.session=ctx.session||{};ctx.session.listCreate=true;
    await ctx.reply('📝 Envía la lista en texto.\n\nPuedes usar líneas como:\nNombre | enlace\nNombre | enlace\n\n/cancel para cancelar.');await ctx.answerCbQuery();
  });
  bot.action(/^list_edit_(.+)$/,async ctx=>{
    if(!guard(ctx))return ctx.answerCbQuery('⛔',{show_alert:true});
    const d=await db.collection('listas').doc(ctx.match[1]).get();if(!d.exists)return ctx.answerCbQuery('No encontrada',{show_alert:true});
    const x=d.data()||{};await ctx.editMessageText('📝 LISTA\n\n🆔 '+d.id+'\n🏷️ '+(x.titulo||'Sin título')+'\n📌 Elementos: '+(x.items?.length||0),menu([
      [Markup.button.callback('📢 PUBLICAR','list_publish_'+d.id,{style:'success'}),Markup.button.callback('🗑️ ELIMINAR','list_delete_'+d.id,{style:'danger'})]
    ]));await ctx.answerCbQuery();
  });
  bot.action(/^list_publish_(.+)$/,async ctx=>{
    if(!guard(ctx))return ctx.answerCbQuery('⛔',{show_alert:true});
    const d=await db.collection('listas').doc(ctx.match[1]).get();if(!d.exists)return ctx.answerCbQuery('No encontrada',{show_alert:true});
    const x=d.data()||{};const text=(x.items||[]).map((i,n)=>(n+1)+'. '+i.nombre+' — '+i.enlace).join('\n');
    await ctx.reply(text||'Lista vacía');await ctx.answerCbQuery('📢 Vista preparada');
  });
  bot.action(/^list_delete_(.+)$/,async ctx=>{
    if(!guard(ctx))return ctx.answerCbQuery('⛔',{show_alert:true});
    await db.collection('listas').doc(ctx.match[1]).delete();await ctx.answerCbQuery('🗑️ Eliminada');
    await ctx.editMessageText('✅ Lista eliminada.',menu([]));
  });
  bot.on('message',async(ctx,next)=>{
    if(!guard(ctx)||!ctx.session)return next();
    if(ctx.session.listCreate&&ctx.message.text){
      if(ctx.message.text.startsWith('/'))return next();
      const lines=ctx.message.text.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
      const items=lines.map(line=>{const m=line.split('|');return {nombre:(m[0]||'').trim(),enlace:(m.slice(1).join('|')||'').trim()};}).filter(x=>x.nombre&&x.enlace);
      if(!items.length)return ctx.reply('❌ No encontré elementos válidos. Usa Nombre | enlace.');
      const id='lista_'+Date.now();await db.collection('listas').doc(id).set({titulo:'LISTA '+new Date().toLocaleDateString('es-MX'),items,creadoPor:ctx.from.id,creadoAt:new Date(),actualizadoAt:new Date()});
      ctx.session.listCreate=null;return ctx.reply('✅ Lista creada con '+items.length+' elementos.',menu([[Markup.button.callback('📝 VER LISTAS','admin_lists_manage')]]));
    }
    return next();
  });
}
module.exports=register;
