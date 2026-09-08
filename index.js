require('dotenv').config();
const { Telegraf, session } = require('telegraf');
const { db } = require('./config/firebase');
const { getCanales } = require('./config/constantes');

const bot = new Telegraf(process.env.BOT_TOKEN);
bot.use(session());

// Middlewares
const { canalesMiddleware, setupCanalesHandler } = require('./handlers/admin/canales');
bot.use(canalesMiddleware());

// Handlers
setupCanalesHandler(bot);
require('./handlers/start')(bot);
require('./handlers/admin/panel')(bot);
require('./handlers/admin/chats')(bot);
require('./handlers/admin/users')(bot);
require('./handlers/user/misChats')(bot);

// Cargar canales al iniciar
getCanales().then(c => console.log('Canales cargados:', c));

bot.launch().then(() => console.log('Bot V9 ULTRA encendido 🔥'));
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
