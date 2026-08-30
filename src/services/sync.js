const db = require('../db/database');
const directadmin = require('./directadmin');

const upsertCuenta = db.prepare(`
  INSERT INTO cuentas (usuario, email)
  VALUES (@usuario, @email)
  ON CONFLICT(usuario) DO UPDATE SET activo = 1
`);

const getCuentaId = db.prepare('SELECT id FROM cuentas WHERE usuario = ?');

const insertSnapshot = db.prepare(`
  INSERT INTO snapshots
    (cuenta_id, mb_usado, mb_cuota, mensajes_usado, mensajes_limite, suspendida, porcentaje)
  VALUES
    (@cuentaId, @mbUsado, @mbCuota, @mensajesUsado, @mensajesLimite, @suspendida, @porcentaje)
`);

const insertSyncLog = db.prepare(`
  INSERT INTO sync_log (origen, exito, cuentas_total, mensaje)
  VALUES (@origen, @exito, @cuentasTotal, @mensaje)
`);

function calcularPorcentaje(mbUsado, mbCuota) {
  if (mbCuota === null || mbCuota === undefined || mbCuota <= 0) return null;
  return Math.round((mbUsado / mbCuota) * 1000) / 10;
}

async function runSync(origen = 'manual') {
  try {
    const cuentas = await directadmin.fetchEmailAccounts();

    const tx = db.transaction((lista) => {
      for (const c of lista) {
        upsertCuenta.run({ usuario: c.usuario, email: `${c.usuario}@${dominioActual()}` });
        const { id: cuentaId } = getCuentaId.get(c.usuario);

        insertSnapshot.run({
          cuentaId,
          mbUsado: c.mbUsado,
          mbCuota: c.mbCuota,
          mensajesUsado: c.mensajesEnviados,
          mensajesLimite: c.mensajesLimite,
          suspendida: c.suspendida ? 1 : 0,
          porcentaje: calcularPorcentaje(c.mbUsado, c.mbCuota),
        });
      }
    });

    tx(cuentas);

    insertSyncLog.run({
      origen,
      exito: 1,
      cuentasTotal: cuentas.length,
      mensaje: null,
    });

    return { ok: true, cuentasTotal: cuentas.length };
  } catch (err) {
    insertSyncLog.run({
      origen,
      exito: 0,
      cuentasTotal: null,
      mensaje: err.message,
    });
    throw err;
  }
}

function dominioActual() {

  return require('../config/credentials').get('DA_DOMAIN');
}

module.exports = { runSync };
