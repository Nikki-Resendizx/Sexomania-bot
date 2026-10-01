# SEXOMANIA BOT V10

Bot de Telegram basado en Node.js, Telegraf y Firebase Firestore.

## Requisitos

- Node.js 18+
- Bot token de Telegram
- Firebase/Firestore si se usan las funciones persistentes

## Variables de entorno

`BOT_TOKEN` — token del bot.

`ADMIN_IDS` — IDs de administradores separados por comas. Ejemplo: `123456789,987654321`.

Firebase admite cualquiera de estas configuraciones:

1. `FIREBASE_SERVICE_ACCOUNT` con el JSON completo de la cuenta de servicio.
2. `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL` y `FIREBASE_PRIVATE_KEY`.

`FLOOD_INTERVAL_MS` es opcional y por defecto vale 1500 ms.

## Arranque

```bash
npm install
npm start
```

## Estructura

- `index.js`: arranque, sesión, anti-flood, anti-spam, comandos globales y manejo de errores.
- `config/firebase.js`: inicialización segura de Firebase.
- `config/constantes.js`: administradores, estados y configuración de canales.
- `handlers/admin/canales.js`: configuración de canales y middleware de selección.
- `handlers/admin/chats.js`: consulta y administración de chats.
- `handlers/admin/users.js`: consulta y edición administrativa de usuarios.
- `utils/extractor.js`: extracción de información de Telegram.
- `utils/keyboards.js`: teclados del panel.

## Seguridad

Las operaciones administrativas verifican el ID del usuario mediante `ADMIN_IDS`. No se usa `@username` como indicador de spam porque es una característica normal de Telegram.

Nunca subas credenciales de Firebase, tokens ni archivos de servicio al repositorio.
