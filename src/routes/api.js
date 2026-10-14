const express = require('express');
const db = require('../db/database');
const credentials = require('../config/credentials');
const { runSync } = require('../services/sync');
const directadmin = require('../services/directadmin');

const router = express.Router();

function calcularPorcentaje(mbUsado, mbCuota) {
  if (mbCuota === null || mbCuota === undefined || mbCuota <= 0) return null;
  return Math.round((mbUsado / mbCuota) * 1000) / 10;
}

function obtenerCuentasActuales() {
  return db.prepare(`
    SELECT
      c.usuario,
      c.email,
      s.mb_usado        AS mbUsado,
      s.mb_cuota        AS mbCuota,
      s.mensajes_usado  AS mensajesUsado,
      s.mensajes_limite AS mensajesLimite,
      s.suspendida      AS suspendida,
      s.porcentaje      AS porcentaje,
      s.fecha           AS ultimaActualizacion
    FROM cuentas c
    JOIN snapshots s ON s.cuenta_id = c.id
    WHERE c.activo = 1
      AND s.fecha = (
        SELECT MAX(fecha) FROM snapshots WHERE cuenta_id = c.id
      )
    ORDER BY (s.porcentaje IS NULL), s.porcentaje DESC
  `).all();
}

function fechaLocal(d = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

router.get('/dashboard', (req, res) => {
  const { warning, critical } = credentials.getThresholds();

  const rows = obtenerCuentasActuales();

  const withEstado = rows.map((r) => ({
    ...r,
    suspendida: !!r.suspendida,
    estado: r.porcentaje === null
      ? 'sin_limite'
      : r.porcentaje >= critical
        ? 'critico'
        : r.porcentaje >= warning
          ? 'alerta'
          : 'normal',
  }));

  res.json({
    thresholds: { warning, critical },
    totalCuentas: withEstado.length,
    criticas: withEstado.filter((r) => r.estado === 'critico').length,
    enAlerta: withEstado.filter((r) => r.estado === 'alerta').length,
    cuentas: withEstado,
  });
});

router.get('/accounts/export', (req, res) => {
  const encabezado = ['usuario', 'dominio', 'cuota_mb', 'uso_mb', 'porcentaje'];
  const filas = obtenerCuentasActuales().map((c) => [
    c.usuario,
    (c.email || '').split('@')[1] || '',
    c.mbCuota ?? '',
    c.mbUsado ?? '',
    c.porcentaje ?? '',
  ].join(','));

  const csv = [encabezado.join(','), ...filas].join('\r\n') + '\r\n';

  res.set('Content-Type', 'text/csv; charset=utf-8');
  res.set('Content-Disposition', `attachment; filename="cuentas-emapica-${fechaLocal()}.csv"`);
  res.send(csv);
});

router.get('/accounts/:usuario/history', (req, res) => {
  const cuenta = db.prepare('SELECT id, usuario, email FROM cuentas WHERE usuario = ?')
    .get(req.params.usuario);

  if (!cuenta) return res.status(404).json({ error: 'Cuenta no encontrada' });

  const historial = db.prepare(`
    SELECT fecha, mb_usado AS mbUsado, mb_cuota AS mbCuota, porcentaje, suspendida
    FROM snapshots
    WHERE cuenta_id = ?
    ORDER BY fecha DESC
    LIMIT 90
  `).all(cuenta.id);

  res.json({ cuenta, historial });
});

router.put('/accounts/:usuario/quota', async (req, res) => {
  const { usuario } = req.params;
  const nuevaCuotaMB = Number(req.body?.nuevaCuotaMB);

  if (!Number.isInteger(nuevaCuotaMB) || nuevaCuotaMB <= 0) {
    return res.status(400).json({ error: 'nuevaCuotaMB debe ser un número entero positivo' });
  }

  const cuenta = db.prepare('SELECT id, usuario, email FROM cuentas WHERE usuario = ?').get(usuario);
  if (!cuenta) return res.status(404).json({ error: 'Cuenta no encontrada' });

  try {
    await directadmin.modifyQuota(usuario, nuevaCuotaMB);
  } catch (err) {
    if (err instanceof directadmin.DirectAdminError) {
      return res.status(502).json({ error: err.message, details: err.details ?? null });
    }
    return res.status(500).json({ error: err.message });
  }

  const snapshot = db.prepare(`
    SELECT id, mb_usado AS mbUsado
    FROM snapshots
    WHERE cuenta_id = ?
    ORDER BY fecha DESC, id DESC
    LIMIT 1
  `).get(cuenta.id);

  if (snapshot) {
    db.prepare('UPDATE snapshots SET mb_cuota = ?, porcentaje = ? WHERE id = ?')
      .run(nuevaCuotaMB, calcularPorcentaje(snapshot.mbUsado, nuevaCuotaMB), snapshot.id);
  }

  const actualizada = db.prepare(`
    SELECT
      c.usuario,
      c.email,
      s.mb_usado        AS mbUsado,
      s.mb_cuota        AS mbCuota,
      s.mensajes_usado  AS mensajesUsado,
      s.mensajes_limite AS mensajesLimite,
      s.suspendida      AS suspendida,
      s.porcentaje      AS porcentaje,
      s.fecha           AS ultimaActualizacion
    FROM cuentas c
    LEFT JOIN snapshots s ON s.id = ?
    WHERE c.id = ?
  `).get(snapshot?.id ?? null, cuenta.id);

  res.json({ ...actualizada, suspendida: !!actualizada.suspendida });
});

router.post('/sync', async (req, res) => {
  try {
    const resultado = await runSync('manual');
    res.json(resultado);
  } catch (err) {
    res.status(502).json({ error: err.message, details: err.details ?? null });
  }
});

router.get('/sync/log', (req, res) => {
  const registros = db.prepare(`
    SELECT fecha, origen, exito, cuentas_total AS cuentasTotal, mensaje
    FROM sync_log ORDER BY fecha DESC LIMIT 20
  `).all();
  res.json(registros);
});

router.get('/settings', (req, res) => {
  res.json(credentials.getAll({ redactSecrets: true }));
});

router.put('/settings', (req, res) => {
  const permitido = [
    'DA_HOST', 'DA_PORT', 'DA_DOMAIN', 'DA_USERNAME', 'DA_LOGIN_KEY',
    'THRESHOLD_WARNING', 'THRESHOLD_CRITICAL', 'SYNC_CRON', 'SYNC_AUTO_ENABLED',
  ];
  const updates = {};
  for (const key of permitido) {
    if (req.body[key] !== undefined && req.body[key] !== '') updates[key] = req.body[key];
  }
  credentials.set(updates);
  res.json(credentials.getAll({ redactSecrets: true }));
});

module.exports = router;
