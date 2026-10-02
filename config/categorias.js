const { db } = require('./firebase');

const CATEGORIAS_DEFAULT = [
  '🔞 CANALES DE APORTES XXX',
  '🔞 GRUPOS DE APORTES XXX',
  '💸 GRUPOS DE VENTAS',
  '📣 CANALES PUBLICITARIOS',
  '🍿 CANALES DE ENTRETENIMIENTO',
  '🎨 CANALES DE ARTE',
  '💰(𝐂 & 𝐆)',
  '🤖 LOS MEJORES BOTS'
];

const CACHE = { lista: null };

function normalizar(lista) {
  if (!Array.isArray(lista)) return [];
  return [...new Set(lista.map(v => String(v || '').trim()).filter(Boolean))];
}

function migrarCategorias(lista) {
  const salida = normalizar(lista);
  const cg = '💰(𝐂 & 𝐆)';
  const bots = '🤖 LOS MEJORES BOTS';
  if (!salida.includes(cg)) {
    const posBots = salida.indexOf(bots);
    if (posBots >= 0) salida.splice(posBots, 0, cg);
    else salida.push(cg);
  }
  return salida;
}

async function getCategorias(options = {}) {
  if (!options.force && CACHE.lista) return [...CACHE.lista];
  if (!db) {
    CACHE.lista = [...CATEGORIAS_DEFAULT];
    return [...CACHE.lista];
  }
  try {
    const ref = db.collection('config').doc('categorias');
    const snap = await ref.get();
    if (!snap.exists || !Array.isArray(snap.data().lista) || !snap.data().lista.length) {
      CACHE.lista = [...CATEGORIAS_DEFAULT];
      await ref.set({ lista: CACHE.lista, version: 3, updatedAt: new Date() }, { merge: true });
    } else {
      const original = normalizar(snap.data().lista);
      CACHE.lista = migrarCategorias(original);
      if (CACHE.lista.join('\n') !== original.join('\n')) {
        await ref.set({ lista: CACHE.lista, version: 3, updatedAt: new Date() }, { merge: true });
      }
    }
  } catch (error) {
    console.error('❌ Error leyendo categorías:', error.message);
    CACHE.lista = CACHE.lista || [...CATEGORIAS_DEFAULT];
  }
  return [...CACHE.lista];
}

async function guardarCategorias(lista) {
  const limpia = normalizar(lista);
  if (!limpia.length) throw new Error('Debe existir al menos una categoría.');
  CACHE.lista = limpia;
  if (db) await db.collection('config').doc('categorias').set({ lista: limpia, version: 3, updatedAt: new Date() }, { merge: true });
  return [...CACHE.lista];
}

function limpiarCacheCategorias() { CACHE.lista = null; }

async function agregarCategoria(nombre) {
  const lista = await getCategorias();
  const valor = String(nombre || '').trim();
  if (!valor) throw new Error('Nombre vacío.');
  if (lista.some(c => c.toLowerCase() === valor.toLowerCase())) throw new Error('La categoría ya existe.');
  lista.push(valor);
  return guardarCategorias(lista);
}

async function editarCategoria(index, nombre) {
  const lista = await getCategorias();
  const i = Number(index), valor = String(nombre || '').trim();
  if (!Number.isInteger(i) || !lista[i]) throw new Error('Categoría no encontrada.');
  if (!valor) throw new Error('Nombre vacío.');
  if (lista.some((c, n) => n !== i && c.toLowerCase() === valor.toLowerCase())) throw new Error('La categoría ya existe.');
  lista[i] = valor;
  return guardarCategorias(lista);
}

async function eliminarCategoria(index) {
  const lista = await getCategorias();
  const i = Number(index);
  if (!Number.isInteger(i) || !lista[i]) throw new Error('Categoría no encontrada.');
  if (lista.length <= 1) throw new Error('Debe quedar al menos una categoría.');
  lista.splice(i, 1);
  return guardarCategorias(lista);
}

async function moverCategoria(index, direccion) {
  const lista = await getCategorias();
  const i = Number(index), destino = i + Number(direccion);
  if (!Number.isInteger(i) || !lista[i] || destino < 0 || destino >= lista.length) return lista;
  [lista[i], lista[destino]] = [lista[destino], lista[i]];
  return guardarCategorias(lista);
}

module.exports = { CATEGORIAS_DEFAULT, getCategorias, guardarCategorias, agregarCategoria, editarCategoria, eliminarCategoria, moverCategoria, limpiarCacheCategorias };
