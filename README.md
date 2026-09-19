# Gestor de Cuentas de Correo

Sistema web para el monitoreo del almacenamiento de cuentas de correo
electrónico alojadas en un servidor DirectAdmin. Consulta el estado de los
buzones de forma automática, guarda un historial diario y muestra alertas
cuando una cuenta se acerca a su límite de cuota.

## Problema que resuelve

El panel de DirectAdmin permite ver el estado de cada cuenta, pero con
cientos de buzones no ofrece forma de ordenarlos por uso, filtrar los que
están por llenarse ni conservar historial. El problema se detecta cuando el
usuario reporta que su buzón ya no recibe correos, es decir, cuando el
servicio ya se vio afectado.

Este sistema invierte ese esquema: consulta el servidor todos los días,
guarda el resultado y señala las cuentas en riesgo antes de que lleguen al
límite.

## Características

- Sincronización automática programable (por defecto, una vez al día)
- Panel con resumen general y detalle por cuenta
- Umbrales de alerta configurables (por defecto, 70 % y 90 %)
- Modificación de la cuota de cada cuenta directamente desde el panel
- Historial diario de cada buzón
- Acceso protegido con usuario y contraseña
- Configuración editable desde el panel, sin reiniciar el servidor

## Requisitos

- Node.js 18 o superior
- Acceso a un servidor DirectAdmin con una Login Key que tenga habilitado
  el comando `CMD_API_POP`

## Instalación

```bash
npm run setup
```

Este comando instala las dependencias del backend y del frontend, y compila
la interfaz.

## Configuración

Copie el archivo de ejemplo:

```bash
cp .env.example .env
```

Genere una clave para las sesiones:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Pegue el resultado en la variable `JWT_SECRET` del archivo `.env`. Es el
único valor obligatorio para que el servidor inicie.

Las credenciales de DirectAdmin (`DA_HOST`, `DA_PORT`, `DA_DOMAIN`,
`DA_USERNAME`, `DA_LOGIN_KEY`) pueden completarse en el `.env` o cargarse
después desde la sección Configuración del panel. Lo que se guarde desde el
panel tiene prioridad sobre el archivo.

## Uso

Cree un usuario para acceder al panel:

```bash
npm run create-user
```

Inicie el servidor:

```bash
npm start
```

El panel queda disponible en `http://localhost:3000`.

## Comandos disponibles

| Comando | Descripción |
|---|---|
| `npm start` | Inicia el servidor y el panel web |
| `npm run setup` | Instala dependencias y compila el frontend |
| `npm run create-user` | Crea un usuario de acceso al panel |
| `npm run sync-now` | Ejecuta una sincronización desde la terminal |
| `npm run dev` | Inicia el servidor con recarga automática |
| `npm run build:frontend` | Recompila la interfaz |

## Estructura del proyecto

```
gestor-correo/
├─ server.js                     Punto de entrada: Express, tareas programadas
├─ src/
│  ├─ config/credentials.js      Configuración y credenciales centralizadas
│  ├─ db/database.js             Esquema y conexión a SQLite
│  ├─ middleware/auth.js         Validación de sesión en rutas protegidas
│  ├─ services/
│  │  ├─ directadmin.js          Comunicación con la API de DirectAdmin
│  │  ├─ sync.js                 Obtención y registro de datos
│  │  └─ auth.js                 Usuarios, contraseñas y tokens
│  └─ routes/
│     ├─ api.js                  Endpoints del panel
│     └─ auth.js                 Inicio y cierre de sesión
├─ scripts/
│  ├─ sync-now.js                Sincronización manual
│  └─ create-user.js             Alta de usuarios
└─ frontend/                     Interfaz en React (Vite)
   └─ src/
      ├─ api/client.js           Cliente HTTP
      ├─ context/                Estado de sesión
      ├─ components/             Componentes reutilizables
      ├─ hooks/                  Lógica compartida
      └─ pages/                  Login, Dashboard, Configuración
```

Cada capa se comunica únicamente con la inmediata inferior. Agregar una
vista implica un archivo en `pages/`; agregar un endpoint, una función en
`routes/`. Los detalles de la API de DirectAdmin están contenidos en un solo
archivo, de modo que un cambio en el servidor no afecta al resto del sistema.

## Desarrollo

Para trabajar sobre la interfaz con recarga automática, ejecute el backend y
el frontend por separado:

```bash
# Terminal 1
npm start

# Terminal 2
cd frontend
npm run dev
```

La interfaz de desarrollo queda en `http://localhost:5173` y redirige las
llamadas de la API al backend. Al terminar, `npm run build:frontend`
recompila la versión que sirve `npm start`.

## Notas técnicas

**Base de datos.** Se utiliza SQLite, que almacena toda la información en un
único archivo (`data/gestor-correo.db`). No requiere instalar ni configurar
un servidor de base de datos.

**API de DirectAdmin.** La gestión de cuentas de correo se realiza mediante
el comando `CMD_API_POP`, que devuelve el estado de todos los buzones del
dominio en una sola consulta. Las versiones recientes de DirectAdmin
incorporan una API REST, pero esta funcionalidad aún no está disponible allí.

**Seguridad.** Las contraseñas se almacenan cifradas con bcrypt. Las sesiones
se manejan con tokens JWT en cookies no accesibles desde JavaScript. La Login
Key de DirectAdmin debe restringirse al comando mínimo necesario y, de ser
posible, a la dirección IP del servidor donde se ejecuta el sistema.

## Pendientes

- Gráficos de evolución por cuenta
- Notificaciones automáticas al superar umbrales
- Cifrado de la Login Key almacenada en base de datos
