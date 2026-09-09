const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db/database');
const credentials = require('../config/credentials');

const SALT_ROUNDS = 12;
const TOKEN_EXPIRY = '7d';
const COOKIE_NAME = 'sesion';

const getByUsername = db.prepare('SELECT * FROM usuarios WHERE usuario = ?');
const insertUser = db.prepare('INSERT INTO usuarios (usuario, password_hash) VALUES (?, ?)');
const touchLastLogin = db.prepare("UPDATE usuarios SET ultimo_login = datetime('now') WHERE id = ?");
const countUsers = db.prepare('SELECT COUNT(*) AS n FROM usuarios').get;

async function crearUsuario(usuario, password) {
  if (getByUsername.get(usuario)) {
    throw new Error(`Ya existe un usuario "${usuario}".`);
  }
  if (!password || password.length < 8) {
    throw new Error('La contraseña debe tener al menos 8 caracteres.');
  }
  const hash = await bcrypt.hash(password, SALT_ROUNDS);
  insertUser.run(usuario, hash);
}

async function verificarLogin(usuario, password) {
  const fila = getByUsername.get(usuario);
  if (!fila) return null;

  const ok = await bcrypt.compare(password, fila.password_hash);
  if (!ok) return null;

  touchLastLogin.run(fila.id);
  return { id: fila.id, usuario: fila.usuario };
}

function emitirToken(usuario) {
  return jwt.sign(
    { sub: usuario.id, usuario: usuario.usuario },
    credentials.getJwtSecret(),
    { expiresIn: TOKEN_EXPIRY }
  );
}

function verificarToken(token) {
  try {
    return jwt.verify(token, credentials.getJwtSecret());
  } catch {
    return null;
  }
}

function hayAlgunUsuario() {
  return countUsers().n > 0;
}

module.exports = {
  COOKIE_NAME,
  crearUsuario,
  verificarLogin,
  emitirToken,
  verificarToken,
  hayAlgunUsuario,
};
