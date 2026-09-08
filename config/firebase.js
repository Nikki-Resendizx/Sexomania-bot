const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyC6eyDXaTCPgcb_se9vVP4rfwVkdc0ayn0",
  authDomain: "sexomania-links.firebaseapp.com",
  projectId: "sexomania-links",
  storageBucket: "sexomania-links.firebasestorage.app",
  messagingSenderId: "1061811152332",
  appId: "1:1061811152332:web:8d75649506182236862969"
};

const appFb = initializeApp(firebaseConfig);
const db = getFirestore(appFb);

let configBot = {
  catColors: {},
  bienvenida: null,
  plantilla: null,
  logChannel: null,
  originChannel: null,
  mainChannel: -1001234567890, // CAMBIA ESTO POR TU CANAL PRINCIPAL
  zonaHoraria: 'America/Mexico_City',
  idioma: 'es',
  listasMsgIds: {},
  ultimoCheckLinks: null
};

(async () => {
  try {
    const s = await getDoc(doc(db, "config", "bot"));
    if (s.exists()) {
      configBot = { ...configBot, ...s.data() };
      console.log("✅ Config cargada");
    }
  } catch (e) {
    console.log("Error config:", e.message);
  }
})();

module.exports = { db, configBot };
