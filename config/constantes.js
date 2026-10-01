const { db } = require('./firebase');

const ADMIN_IDS = (process.env.ADMIN_IDS || process.env.ADMIN_ID || '8695673050')
  .split(',')
  .map(v => Number(v.trim()))
  .filter(Number.isSafeInteger);

const TIPOS_CANALES = new Set(['principal', 'log', 'origen', 'registro_privado']);

let CACHE_CANALES = {
  principal: null,
  log: null,
  origen: null,
  registro_privado: null
};

const isAdmin = userId => ADMIN_IDS.includes(Number(userId));

async function getCanales() {
  if (!db) return { ...CACHE_CANALES };
  try {
    const doc = await db.collection('config').doc('canales').get();
    if (doc.exists) CACHE_CANALES = { ...CACHE_CANALES, ...doc.data() };
  } catch (error) {
    console.error('❌ Error leyendo config/canales:', error.message);
  }
  return { ...CACHE_CANALES };
}

async function setCanal(tipo, id) {
  if (!TIPOS_CANALES.has(tipo)) throw new Error(`Tipo de canal no válido: ${tipo}`);
  const numericId = Number(id);
  if (!Number.isSafeInteger(numericId)) throw new Error('ID de canal inválido');
  CACHE_CANALES[tipo] = numericId;
  if (db) {
    await db.collection('config').doc('canales').set(
      { [tipo]: numericId, updatedAt: new Date() },
      { merge: true }
    );
  }
  return { ...CACHE_CANALES };
}

async function getCanal(tipo) {
  if (!TIPOS_CANALES.has(tipo)) return null;
  if (CACHE_CANALES[tipo] === null) await getCanales();
  return CACHE_CANALES[tipo];
}

module.exports = {
  ADMIN_IDS, isAdmin, TIPOS_CANALES, getCanales, setCanal, getCanal, CACHE_CANALES,
  ESTADOS_CHAT: {
    PENDIENTE: 'pendiente', APROBADO: 'aprobado', BANEADO: 'baneado',
    EXPULSADO_BOT: 'expulsado_bot', EXPULSADO_SOLICITANTE: 'expulsado_solicitante',
    PRIVADO: 'privado'
  },
  ESTADOS_USUARIO: { ACTIVO: 'activo', BANEADO: 'baneado' }
};
