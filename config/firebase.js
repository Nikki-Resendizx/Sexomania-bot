const admin = require('firebase-admin');

if (!admin.apps.length) {
  // En Render usamos variable de entorno
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  } else {
    // Si estás en local con archivo
    try {
      const serviceAccount = require('./serviceAccountKey.json');
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    } catch (e) {
      console.log('❌ No se encontró serviceAccountKey.json ni variable FIREBASE_SERVICE_ACCOUNT');
      console.log('Configúrala en Render > Environment');
    }
  }
}

const db = admin.firestore();

module.exports = { db, admin };
