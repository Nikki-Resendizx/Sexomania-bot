// Parser con #r #g #p (danger/success/primary)

function parsearLista(texto) {
  let lineas = texto.split('\n').filter(l => l.trim());
  let resultado = [];

  for (let linea of lineas) {
    let color = 'secondary';
    let textoLimpio = linea.trim();

    if (textoLimpio.startsWith('#r ')) {
      color = 'danger';
      textoLimpio = textoLimpio.substring(3);
    } else if (textoLimpio.startsWith('#g ')) {
      color = 'success';
      textoLimpio = textoLimpio.substring(3);
    } else if (textoLimpio.startsWith('#p ')) {
      color = 'primary';
      textoLimpio = textoLimpio.substring(3);
    } else if (textoLimpio.startsWith('# ')) {
      color = 'secondary';
      textoLimpio = textoLimpio.substring(2);
    }

    // Formato: https://t.me/link | Texto
    let partes = textoLimpio.split('|');
    let url = partes[0]?.trim();
    let textoBoton = partes[1]?.trim() || url;

    if (url) {
      resultado.push({ text: textoBoton, url: url, style: color });
    }
  }
  return resultado;
}

function crearBotoneraTexto(botones, columnas = 2) {
  // Para Telegraf con style
  let keyboard = [];
  for (let i = 0; i < botones.length; i += columnas) {
    let fila = botones.slice(i, i + columnas).map(b => ({
      text: b.text,
      url: b.url,
      style: b.style
    }));
    keyboard.push(fila);
  }
  return keyboard;
}

module.exports = { parsearLista, crearBotoneraTexto };
