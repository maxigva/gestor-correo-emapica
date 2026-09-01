const express = require('express');
const db = require('../db/database');
const credentials = require('../config/credentials');
const { runSync } = require('../services/sync');

const router = express.Router();

router.get('/dashboard', (req, res) => {
  const { warning, critical } = credentials.getThresholds();

  const rows = db.prepare(`
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
