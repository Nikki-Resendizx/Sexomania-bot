import { Telegraf, Markup } from 'telegraf';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';
const BOT_TOKEN = '8964621852:AAE66S21m-LH_xSvM7p2l9G9AftNNCB-qs4';
const URL_APP = 'https://sexomania-links.netlify.app';
const firebaseConfig = {
  apiKey: "AIzaSyC6eyDXaTCPgcb_se9vVP4rfwVkdc0ayn0",
  authDomain: "sexomania-links.firebaseapp.com",
  projectId: "sexomania-links",
  storageBucket: "sexomania-links.firebasestorage.app",
  messagingSenderId: "1061811152332",
  appId: "1:1061811152332:web:8d75649506182236862969"
};
const appFirebase = initializeApp(firebaseConfig);
const db = getFirestore(appFirebase);
const bot = new Telegraf(BOT_TOKEN);
bot.start((ctx) => {
  ctx.reply('🔥 *SEXOMANIA LINKS OFICIAL* 🔥\nBienvenido, elige una categoria:',{
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.webApp('🔞 CANALES ADULTOS', `${URL_APP}/?sec=CANALES%20ADULTOS`)],
        [Markup.button.webApp('🔞 GRUPOS ADULTOS', `${URL_APP}/?sec=GRUPOS%20ADULTOS`)],
        [Markup.button.webApp('💸 VENTAS', `${URL_APP}/?sec=VENTAS`)],
        [Markup.button.webApp('📣 PUBLICITARIOS', `${URL_APP}/?sec=PUBLICITARIOS`)],
        [Markup.button.webApp('🍿 ENTRETENIMIENTO', `${URL_APP}/?sec=ENTRETENIMIENTO`)],
        [Markup.button.webApp('🎨 ARTE', `${URL_APP}/?sec=ARTE`)],
        [Markup.button.webApp('🤖 BOTS', `${URL_APP}/?sec=BOTS`)],
        [Markup.button.webApp('🚀 ABRIR APP COMPLETA', URL_APP)]
      ])
    }
  );
});
bot.launch();
console.log('BOT ON');
