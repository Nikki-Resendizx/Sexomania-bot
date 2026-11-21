# Exportación segura de Firebase

Este script solo lee Firestore y crea `backups/firestore-export.json`. No modifica ni elimina documentos.

## Ejecución local
1. Usa Node.js 20 o superior.
2. Instala dependencias: `npm install`.
3. Define `FIREBASE_SERVICE_ACCOUNT` como JSON de la cuenta de servicio, o las variables `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL` y `FIREBASE_PRIVATE_KEY`.
4. Ejecuta: `node scripts/export-firestore.mjs`.
5. Conserva el JSON en un lugar privado y no lo subas a GitHub.

La exportación incluye colecciones y subcolecciones, conservando IDs de documentos y convirtiendo timestamps a ISO. Revisa el proyecto Firebase antes de ejecutar para confirmar que las credenciales corresponden al respaldo que deseas exportar.
