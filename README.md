# Gestor de Cuentas de Correo — EMAPICA

Monitoreo de uso de disco de las cuentas de correo del dominio
`emapica.com.pe` (vía la API de DirectAdmin), con historial diario,
dashboard con alertas por umbral, y login básico.

## Arquitectura

```
gestor-correo/
├─ server.js                     Backend: Express + cron + sirve el build de React
├─ src/
│  ├─ config/credentials.js      Credenciales/config centralizadas
│  ├─ db/database.js             Esquema SQLite (cuentas, snapshots, usuarios, settings)
│  ├─ middleware/auth.js         Exige sesión válida en las rutas protegidas
│  ├─ services/
│  │  ├─ directadmin.js          Habla con CMD_API_POP de DirectAdmin
│  │  ├─ sync.js                 Orquesta: trae datos → guarda snapshot diario
│  │  └─ auth.js                 Crear usuarios, verificar login, emitir/verificar JWT
│  └─ routes/
│     ├─ api.js                  Endpoints del dashboard (protegidos)
│     └─ auth.js                 /login, /logout, /me
├─ scripts/
│  ├─ sync-now.js                Sincronizar desde la terminal
│  └─ create-user.js             Crear un usuario del panel (no hay registro público)
└─ frontend/                     App en React (Vite)
   └─ src/
      ├─ api/client.js           Único punto de fetch al backend
      ├─ context/AuthContext.jsx Sabe quién está logueado, en toda la app
      ├─ components/             Piezas reutilizables (Topbar, StatusBadge, UsageGauge, Toast…)
      ├─ hooks/useSync.js         Lógica de "sincronizar ahora"
      └─ pages/                   Login, Dashboard, Settings
```

**Por qué esta separación:** cada capa solo conoce la de abajo. Agregar una
vista nueva es una carpeta en `pages/`; agregar un endpoint es una función
en `routes/`; cambiar cómo se guardan las credenciales es un solo archivo
(`credentials.js`). No hace falta tocar lo que ya funciona para sumar algo.

## 1. Instalación (primera vez)

```bash
npm run setup
```

Esto instala las dependencias del backend **y** del frontend, y compila el
frontend a `frontend/dist/` (que es lo que Express sirve en producción).

## 2. Configuración

```bash
cp .env.example .env
```

Completá:
- `DA_HOST`, `DA_PORT`, `DA_DOMAIN`, `DA_USERNAME`, `DA_LOGIN_KEY` → ver
  sección "Login key" más abajo
- `JWT_SECRET` → generalo con:
  ```bash
  node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
  ```
  Pegá el resultado en `.env`. Esto firma las sesiones de login — sin esto,
  el servidor no arranca (falla rápido con un mensaje claro).

## 3. Crear tu usuario

No hay pantalla de "registrarse" a propósito — solo quien tiene acceso a
la terminal del servidor puede dar de alta gente:

```bash
npm run create-user
```

Te va a pedir usuario y contraseña (mínimo 8 caracteres).

## 4. Correr la app

```bash
npm start
```

Abrí `http://localhost:3000` (o el puerto de tu `.env`) y logueate con el
usuario que creaste.

## 5. Desarrollo (si vas a tocar el frontend)

Corré backend y frontend por separado, en dos terminales:

```bash
# Terminal 1 — backend
npm start

# Terminal 2 — frontend con recarga en caliente
cd frontend
npm run dev
```

Abrí `http://localhost:5173` (Vite). Las llamadas a `/api` se redirigen
automáticamente al backend en el puerto 3000 (ver `frontend/vite.config.js`).
Cuando termines de tocar el frontend, `npm run build:frontend` desde la raíz
recompila `frontend/dist/` para que `npm start` lo sirva.

## 6. Login key de DirectAdmin

Login Keys → Create Login Key, con **`CMD_API_POP`** habilitado (mínimo
necesario para leer cuentas/uso/cuota). Si más adelante suman la función de
modificar cuotas desde la app, agregar también `CMD_API_EMAIL_POP`.
Restringí la IP a la del servidor donde corra este backend.

Podés actualizar la llave desde la propia app (Configuración), sin
reiniciar el servidor ni tocar el `.env`.

## 7. Ideas para expandir

- **Modificar cuotas desde la app**: método en `directadmin.js` con
  `CMD_API_EMAIL_POP&action=modify`, botón en el dashboard con confirmación.
- **Gráfico de evolución por cuenta**: `GET /api/accounts/:usuario/history`
  ya devuelve hasta 90 días — falta una página `pages/AccountHistory.jsx`
  con un gráfico (Chart.js o Recharts).
- **Notificaciones**: cuando el cron detecte una cuenta que cruzó el
  umbral crítico, disparar un correo/webhook desde `sync.js`.
- **Múltiples usuarios sin fricción**: correr `npm run create-user` de
  nuevo por cada persona — la tabla `usuarios` ya soporta varios, sin roles.

## 8. Seguridad — antes de producción

- [ ] Restringir la login key de DirectAdmin a la IP real del servidor.
- [ ] Generar un `JWT_SECRET` propio para producción (no reusar el de dev).
- [ ] Cifrar `DA_LOGIN_KEY` en la tabla `settings` (hoy se guarda en texto
      plano ahí, igual que en `.env`).
- [ ] Servir todo detrás de HTTPS (las cookies de sesión son `secure` en
      producción — `NODE_ENV=production` — así que sin HTTPS el login no
      va a persistir).
- [ ] Definir una política de contraseñas / rotación si el equipo crece.
