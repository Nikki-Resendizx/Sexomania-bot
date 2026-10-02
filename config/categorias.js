const { db } = require('./firebase');

const CATEGORIAS_DEFAULT = [
  '🔞 𝐂𝐚𝐧𝐚𝐥𝐞𝐬 𝐃𝐞 𝐀𝐩𝐨𝐫𝐭𝐞𝐬 𝐗𝐗𝐗 🔞',
  '💸 𝐆𝐫𝐮𝐩𝐨𝐬 𝐃𝐞 𝐕𝐞𝐧𝐭𝐚𝐬 ✚𝟏𝟖 💸',
  'VENTAS +18',
  '📢 𝐂𝐚𝐧𝐚𝐥𝐞𝐬 & 𝐆𝐫𝐮𝐩𝐨𝐬 𝐏𝐮𝐛𝐥𝐢𝐜𝐢𝐭𝐚𝐫𝐢𝐨𝐬 📢',
  '🍿 (𝐂 & 𝐆) 𝐃𝐞 𝐄𝐧𝐭𝐫𝐞𝐭𝐞𝐧𝐢𝐦𝐢𝐞𝐧𝐭𝐨🍿',
  '🎨 𝐂𝐚𝐧𝐚𝐥𝐞𝐬 & 𝐆𝐫𝐮𝐩𝐨𝐬 𝐃𝐞 𝐀𝐫𝐭𝐞𝐬 🎨',
  '💰(𝐂 & 𝐆) 𝐃𝐞 𝐕𝐞𝐧𝐭𝐚𝐬 𝐃𝐞 𝐀𝐫𝐭𝐢𝐜𝐮𝐥𝐨𝐬💰',
  '🤖 𝐋𝐨𝐬 𝐌𝐞𝐣𝐨𝐫𝐞𝐬 𝐁𝐎𝐓𝐒 🤖'
];

const CACHE = { lista: null };

function normalizar(lista) {
  if (!Array.isArray(lista)) return [];
  return [...new Set(lista.map(v => String(v || '').trim()).filter(Boolean))];
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
    const lista = CATEGORIAS_DEFAULT.slice();

    if (!snap.exists || !Array.isArray(snap.data().lista) || !snap.data().lista.length) {
      await ref.set({ lista, version: 4, updatedAt: new Date() }, { merge: true });
    } else if (normalizar(snap.data().lista).join('\n') !== lista.join('\n')) {
      await ref.set({ lista, version: 4, updatedAt: new Date() }, { merge: true });
    }

    CACHE.lista = lista;
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
  if (db) await db.collection('config').doc('categorias').set({ lista: limpia, version: 4, updatedAt: new Date() }, { merge: true });
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
