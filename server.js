require('dotenv').config();

const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');
const cron = require('node-cron');

const credentials = require('./src/config/credentials');
const apiRouter = require('./src/routes/api');
const authRouter = require('./src/routes/auth');
const { requireAuth } = require('./src/middleware/auth');
const { runSync } = require('./src/services/sync');

credentials.getJwtSecret();

const app = express();
app.use(express.json());
app.use(cookieParser());

app.use('/api/auth', authRouter);
app.use('/api', requireAuth, apiRouter);

app.use(express.static(path.join(__dirname, 'frontend', 'dist')));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(__dirname, 'frontend', 'dist', 'index.html'), (err) => {
    if (err) next();
  });
});

const PORT = Number(credentials.get('PORT')) || 3000;

app.listen(PORT, () => {
  console.log(`Gestor de correo escuchando en http://localhost:${PORT}`);
  configurarSincronizacionAutomatica();
});

function configurarSincronizacionAutomatica() {
  const { cron: expresion, autoEnabled } = credentials.getSyncConfig();

  if (!autoEnabled) {
    console.log('Sincronización automática desactivada (SYNC_AUTO_ENABLED=false).');
    return;
  }
  if (!cron.validate(expresion)) {
    console.warn(`Expresión cron inválida ("${expresion}"), no se programó la sincronización automática.`);
    return;
  }

  cron.schedule(expresion, async () => {
    console.log('Ejecutando sincronización programada...');
    try {
      const resultado = await runSync('cron');
      console.log(`Sincronización OK: ${resultado.cuentasTotal} cuentas.`);
    } catch (err) {
      console.error('Sincronización programada falló:', err.message);
    }
  });

  console.log(`Sincronización automática programada con cron "${expresion}".`);
}
