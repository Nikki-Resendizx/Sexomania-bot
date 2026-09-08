const { db } = require('../config/firebase');

async function extraerInfoChat(ctx, chatId, solicitanteId = null) {
  try {
    let chat = await ctx.telegram.getChat(chatId);
    let miembros = 0;
    try { miembros = await ctx.telegram.getChatMembersCount(chatId); } catch {}

    let enlace = chat.invite_link || '';
    if (!enlace && chat.username) enlace = `https://t.me/${chat.username}`;
    if (!enlace) enlace = 'Sin enlace';

    return {
      foto: chat.photo? true : false,
      nombre: chat.title || chat.first_name || 'Sin nombre',
      biografia: chat.description || 'Sin biografía',
      id: chat.id,
      categoria: 'Sin categoría',
      tipo: chat.type === 'channel'? 'canal' : 'grupo',
      miembros: miembros,
      solicitante: solicitanteId,
      fechaRegistro: new Date(),
      aprobado: false,
      baneadoAdmin: false,
      autoBaneado: false,
      botExpulsado: false,
      expulsadoSolicitante: false,
      pendiente: true,
      enlace: enlace,
      username: chat.username || null,
      isPrivate: false
    };
  } catch (e) {
    console.log('Error extractor chat', e.message);
    return null;
  }
}

async function extraerInfoUsuario(ctx, userId, userDB) {
  try {
    let tieneFoto = false;
    try {
      let fotos = await ctx.telegram.getUserProfilePhotos(userId);
      tieneFoto = fotos.total_count > 0;
    } catch {}

    let bio = userDB.bio || 'Sin biografía';
    try {
      let chat = await ctx.telegram.getChat(userId);
      if (chat.bio) bio = chat.bio;
    } catch {}

    return {
      fotoPerfil: tieneFoto,
      nombre: `${userDB.first_name || ''} ${userDB.last_name || ''}`.trim() || userDB.nombre || 'Sin nombre',
      id: userId,
      username: userDB.username? `@${userDB.username}` : 'Sin @',
      biografia: bio,
      fechaIngreso: userDB.fechaIngreso || userDB.creado || new Date(),
      estado: userDB.baneado? 'BANEADO' : 'ACTIVO',
      numChats: userDB.chatsRegistrados || 0,
      esAdmin: userDB.esAdmin || false
    };
  } catch (e) {
    return null;
  }
}

function crearEstructuraBotonera(datos = {}) {
  return {
    titulo: datos.titulo || '🔥 GRUPOS Y CANALES HOTS 🔥',
    tipoEnlace: datos.tipoEnlace || 'Enlace con aprobación',
    vistaPrevia: datos.vistaPrevia?? false,
    media: datos.media?? true,
    botones: datos.botones?? true,
    posicionBotones: datos.posicionBotones || 'arriba',
    minimoMiembros: datos.minimoMiembros || 0,
    maximoMiembros: datos.maximoMiembros || null,
    duracionHoras: datos.duracionHoras || 7,
    eliminarMensajes: datos.eliminarMensajes || false,
    rotarBotones: datos.rotarBotones || false,
    fijado: datos.fijado || false,
    publicarComoEnlaces: datos.publicarComoEnlaces || false,
    siguienteEnvio: datos.siguienteEnvio || null,
    siguienteEliminacion: datos.siguienteEliminacion || null,
    permitirGrupos: datos.permitirGrupos || false,
    activoDias: datos.activoDias || ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'],
    columnas: datos.columnas || 2,
    colores: datos.colores || ['Azul','Verde','Rojo'],
    coloresExtra: datos.coloresExtra || ['Azul','Azul','Verde','Rojo','Rojo'],
    patronColores: datos.patronColores || 'Azul,Verde,Rojo',
    patronColumnas: datos.patronColumnas || 2,
    descripcion: datos.descripcion || '',
    medios: datos.medios || null,
    canalesIncluidos: datos.canalesIncluidos || []
  };
}

module.exports = { extraerInfoChat, extraerInfoUsuario, crearEstructuraBotonera };
