require('dotenv').config();
const { Telegraf, session } = require('telegraf');
const { db } = require('./config/firebase');
const { getChannels } = require('./config/constantes');

const bot = new Telegraf(process.env.BOT_TOKEN || process.env.TOKEN_BOT);
bot.use(session());

// Solo cargamos lo que SI tienes en tu GitHub
const canalesHandler = require('./handlers/admin/canales');
if (canalesHandler.configurarControladorDeCanales) {
  bot.use(canalesHandler.configurarControladorDeCanales);
  canalesHandler.configurarControladorDeCanales(bot);
}

require('./handlers/admin/chats')(bot);
require('./handlers/admin/users')(bot);

console.log('Canales cargados');

bot.launch().then(() => console.log('Bot V9 ULTRA encendido 🔥'));
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
