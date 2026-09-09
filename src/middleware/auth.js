const { COOKIE_NAME, verificarToken } = require('../services/auth');

function requireAuth(req, res, next) {
  const token = req.cookies?.[COOKIE_NAME];
  const payload = token ? verificarToken(token) : null;

  if (!payload) {
    return res.status(401).json({ error: 'No autenticado' });
  }

  req.usuario = { id: payload.sub, usuario: payload.usuario };
  next();
}

module.exports = { requireAuth };
