const express = require('express');
const authService = require('../services/auth');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const isProd = process.env.NODE_ENV === 'production';
const cookieOpts = {
  httpOnly: true,
  sameSite: 'lax',
  secure: isProd,
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

router.post('/login', async (req, res) => {
  const { usuario, password } = req.body || {};
  if (!usuario || !password) {
    return res.status(400).json({ error: 'Faltan usuario y/o contraseña' });
  }

  const user = await authService.verificarLogin(usuario, password);
  if (!user) {
    return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
  }

  const token = authService.emitirToken(user);
  res.cookie(authService.COOKIE_NAME, token, cookieOpts);
  res.json({ usuario: user.usuario });
});

router.post('/logout', (req, res) => {
  res.clearCookie(authService.COOKIE_NAME);
  res.json({ ok: true });
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ usuario: req.usuario.usuario });
});

module.exports = router;
