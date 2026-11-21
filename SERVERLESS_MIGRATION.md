# Migración a Telegram Serverless — Sexomania Links

## Alcance confirmado
- Repositorio de trabajo: `Nikki-Resendizx/Sexomania-bot`.
- Rama aislada: `migration/tgcloud-serverless`.
- WebApp fuente: `Nikki-Resendizx/Sexomania-links`.
- Producción original, repositorio fuente y Firebase deben permanecer intactos.

## Auditoría inicial
La WebApp original usa Firebase Web SDK directamente desde `index.html` y `admin.html`. El bot Node/Telegraf usa Firebase Admin en `config/firebase.js`, `config/webappData.js` y varios handlers. El repositorio destino también contiene una versión antigua de `web/index.html`; no se debe confundir con la WebApp fuente actual.

## Modelo inicial SQLite
`tgcloud/schema.js` define tablas para chats, administradores, usuarios y configuración. Los campos del directorio conservan los nombres/semántica de Firestore mediante un mapeo explícito en los endpoints.

## Endpoints iniciales
- `listChats`: lectura pública de chats activos, con filtro por sección.
- `trackChatClick`: incrementa el contador de clics en SQLite.

## Pendiente antes de activar
1. Exportar una copia de solo lectura de las colecciones Firebase `chats` y `config`; no borrar ni modificar Firestore.
2. Confirmar recuentos y muestras; importar conservando cada ID de documento como `legacyId`/ID.
3. Migrar autenticación de administración: el usuario de Mini App se valida con `ctx.initData.user`; el rol se consulta en `admin_users`. La lista inicial de admins se importa desde configuración validada.
4. Portar formularios y panel de administración a endpoints; eliminar Firebase SDK únicamente en la nueva copia de la WebApp, no en el repositorio original.
5. Portar los handlers del bot de Telegraf al modelo de handlers Serverless y probarlos sin despliegue.
6. Validar Mini App, permisos, altas/ediciones, filtros, botones, clics y deep links antes de considerar un despliegue de prueba.

## Regla de seguridad
No ejecutar `tgcloud push`, `tgcloud migrate`, cambios de BotFather ni despliegues externos hasta terminar pruebas y recibir autorización específica para esa etapa. No usar ni subir tokens o claves Firebase al repositorio.
