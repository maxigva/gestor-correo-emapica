require('dotenv').config();
const db = require('../src/db/database');
const { runSync } = require('../src/services/sync');

runSync('manual')
  .then((r) => {
    console.log(`✅ Sincronización OK: ${r.cuentasTotal} cuentas guardadas.`);
    db.close();
    process.exitCode = 0;
  })
  .catch((err) => {
    console.error('❌ Falló la sincronización:', err.message);
    if (err.details) console.error('Detalles:', err.details);
    db.close();
    process.exitCode = 1;
  });
