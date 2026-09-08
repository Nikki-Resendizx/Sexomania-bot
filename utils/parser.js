const { Markup } = require('telegraf');

function extraerBotonesDeDescripcion(desc) {
  const botonesFilas = [];
  const lineas = (desc || "").split('\n');
  let descripcionLimpia = [];

  for (let linea of lineas) {
    let l = linea.trim();
    if (l.length < 3 ||!l.includes('-')) {
      descripcionLimpia.push(linea);
      continue;
    }

    const partes = l.split('&&');
    let filaActual = [];
    let esBotonLinea = false;

    for (let parte of partes) {
      parte = parte.trim();
      // Detecta #r #g #p #y Texto - url
      let m = parte.match(/^(#p|#r|#g|#y)?\s*(.+?)\s*-\s*(.+)$/i);
      if (m) {
        esBotonLinea = true;
        let colorTag = (m[1] || '').toLowerCase(); // #r, #g, #p, #y
        let texto = m[2].trim();
        let url = m[3].trim();

        // MAPEO DE COLOR A STYLE
        let style = null;
        if (colorTag === '#r') style = 'danger'; // 🔴 ROJO
        else if (colorTag === '#g') style = 'success'; // 🟢 VERDE
        else if (colorTag === '#p') style = 'primary'; // 🔵 AZUL
        else if (colorTag === '#y') style = 'secondary'; // 🟡 AMARILLO

        let lowUrl = url.toLowerCase();
        if (lowUrl.startsWith('popup:')) {
          filaActual.push({ texto, tipo: 'popup', valor: url.split(':').slice(1).join(':').trim(), style });
        } else if (lowUrl === 'rules') {
          filaActual.push({ texto, tipo: 'rules', valor: 'rules', style: 'danger' });
        } else if (lowUrl.startsWith('copy:')) {
          filaActual.push({ texto, tipo: 'copy', valor: url.split(':').slice(1).join(':').trim(), style: style || 'success' });
        } else {
          if (url.startsWith('t.me') || url.startsWith('@')) url = 'https://' + url.replace('@', 't.me/');
          if (!url.startsWith('http')) url = 'https://' + url;
          filaActual.push({ texto, tipo: 'url', valor: url, style });
        }
      }
    }

    if (esBotonLinea && filaActual.length > 0) botonesFilas.push(filaActual);
    else descripcionLimpia.push(linea);
  }

  return {
    botonesFilas,
    descripcionLimpia: descripcionLimpia.join('\n').trim()
  };
}

function buildKeyboardFromFilas(filas, idBase, globalCache) {
  let kb = [];
  for (let fila of filas) {
    let filaKb = [];
    for (let b of fila) {
      try {
        if (b.tipo === 'url') {
          // BOTON URL CON STYLE
          filaKb.push({ text: b.texto, url: b.valor, style: b.style });
        } else if (b.tipo === 'popup') {
          const keyBase = Buffer.from(b.valor).toString('base64').substring(0, 30).replace(/=/g, '');
          globalCache[`${idBase}_${keyBase}`] = b.valor;
          filaKb.push({ text: b.texto, callback_data: `popup_${idBase}_${keyBase}`, style: b.style || 'primary' });
        } else if (b.tipo === 'rules') {
          filaKb.push({ text: b.texto, callback_data: `rules_${idBase}`, style: 'danger' });
        } else if (b.tipo === 'copy') {
          globalCache[`copy_${idBase}`] = b.valor;
          filaKb.push({ text: b.texto, callback_data: `copy_${idBase}`, style: b.style || 'success' });
        }
      } catch {}
    }
    if (filaKb.length > 0) kb.push(filaKb);
  }
  return kb;
}

function parseDifusorBotonera(textoCompleto) {
  let partes = textoCompleto.split('---');
  let texto = partes[0].trim();
  let botonesTexto = partes[1]? partes[1].trim() : "";
  const { botonesFilas } = extraerBotonesDeDescripcion(botonesTexto);
  return { texto, botonesFilas };
}

module.exports = { extraerBotonesDeDescripcion, buildKeyboardFromFilas, parseDifusorBotonera };
