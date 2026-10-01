const admin = require('firebase-admin');

let db = null;
let firebaseReady = false;

function initializeFirebase() {
  if (firebaseReady) return db;

  try {
    if (admin.apps.length) {
      firebaseReady = true;
      db = admin.firestore();
      return db;
    }

    let serviceAccount = null;

    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      serviceAccount = {
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
      };
    } else {
      try {
        serviceAccount = require('./serviceAccountKey.json');
      } catch {
        console.warn('⚠️ Firebase no configurado. El bot arrancará con funciones de DB deshabilitadas.');
        return null;
      }
    }

    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    db = admin.firestore();
    firebaseReady = true;
    console.log('✅ Firebase/Firestore conectado');
    return db;
  } catch (error) {
    console.error('❌ Error inicializando Firebase:', error.message);
    db = null;
    return null;
  }
}

initializeFirebase();

module.exports = {
  db,
  admin,
  isFirebaseReady: () => firebaseReady
};
