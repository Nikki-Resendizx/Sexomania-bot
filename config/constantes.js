const { db } = require('./firebase');

let CACHE_CANALES = {
  principal: null,
  log: null,
  origen: null,
  registro_privado: null
};

async function getCanales() {
  try {
    let doc = await db.collection('config').doc('canales').get();
    if (doc.exists) {
      CACHE_CANALES = {...CACHE_CANALES,...doc.data() };
      return CACHE_CANALES;
    }
  } catch {}
  return CACHE_CANALES;
}

async function setCanal(tipo, id) {
  CACHE_CANALES[tipo] = id;
  await db.collection('config').doc('canales').set(CACHE_CANALES, { merge: true });
  return CACHE_CANALES;
}

async function getCanal(tipo) {
  if (!CACHE_CANALES[tipo]) await getCanales();
  return CACHE_CANALES[tipo];
}

module.exports = {
  ADMIN_IDS: [8695673050], // 👈 CAMBIA TU ID
  getCanales,
  setCanal,
  getCanal,
  CACHE_CANALES,
  CATEGORIAS: [], // 👈 VACÍO, tú las creas desde el bot

  ESTADOS_CHAT: {
    PENDIENTE: 'pendiente',
    APROBADO: 'aprobado',
    BANEADO: 'baneado',
    EXPULSADO_BOT: 'expulsado_bot',
    EXPULSADO_SOLICITANTE: 'expulsado_solicitante',
    PRIVADO: 'privado'
  },
  ESTADOS_USUARIO: {
    ACTIVO: 'activo',
    BANEADO: 'baneado'
  }
};
