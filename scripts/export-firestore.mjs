import fs from 'node:fs';
import path from 'node:path';
import admin from 'firebase-admin';

function initialize() {
  if (admin.apps.length) return admin.firestore();

  let serviceAccount;
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    };
  } else {
    throw new Error('Configura credenciales Firebase por variables de entorno; no guardes claves en el repositorio.');
  }

  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  return admin.firestore();
}

function serialize(value) {
  if (value && typeof value.toDate === 'function') {
    return { __type: 'timestamp', value: value.toDate().toISOString() };
  }
  if (Array.isArray(value)) return value.map(serialize);
  if (value && typeof value === 'object') {
    const out = {};
    for (const [key, item] of Object.entries(value)) out[key] = serialize(item);
    return out;
  }
  return value;
}

async function exportCollection(collectionRef) {
  const docs = [];
  let last = null;

  while (true) {
    let query = collectionRef.orderBy(admin.firestore.FieldPath.documentId()).limit(300);
    if (last) query = query.startAfter(last);
    const snap = await query.get();
    if (snap.empty) break;

    for (const doc of snap.docs) {
      const subcollections = {};
      const children = await doc.ref.listCollections();
      for (const child of children) {
        subcollections[child.id] = await exportCollection(child);
      }
      docs.push({
        id: doc.id,
        data: serialize(doc.data()),
        subcollections,
      });
    }

    last = snap.docs[snap.docs.length - 1];
    if (snap.size < 300) break;
  }

  return docs;
}

async function main() {
  const db = initialize();
  const collections = {};
  for (const collectionRef of await db.listCollections()) {
    collections[collectionRef.id] = await exportCollection(collectionRef);
  }

  const dir = path.join(process.cwd(), 'backups');
  fs.mkdirSync(dir, { recursive: true });
  const filename = path.join(dir, 'firestore-export.json');
  fs.writeFileSync(filename, JSON.stringify({
    exportedAt: new Date().toISOString(),
    projectId: process.env.FIREBASE_PROJECT_ID || 'from-service-account',
    readOnly: true,
    collections,
  }, null, 2));

  console.log('Exportación de solo lectura creada:', filename);
  console.log('Colecciones:', Object.keys(collections).join(', ') || '(ninguna)');
}

main().catch(error => {
  console.error('Falló la exportación:', error.message);
  process.exitCode = 1;
});
