require('dotenv').config();
const db = require('../db/database');

const DEFAULTS = {
  DA_HOST: 'localhost',
  DA_PORT: '2222',
  DA_DOMAIN: '',
  DA_USERNAME: '',
  DA_LOGIN_KEY: '',
  THRESHOLD_WARNING: '70',
  THRESHOLD_CRITICAL: '90',
  SYNC_CRON: '0 7 * * *',
  SYNC_AUTO_ENABLED: 'true',
  JWT_SECRET: '',
};

const SECRET_KEYS = new Set(['DA_LOGIN_KEY', 'JWT_SECRET']);

const getStmt = db.prepare('SELECT valor FROM settings WHERE clave = ?');
const upsertStmt = db.prepare(`
  INSERT INTO settings (clave, valor, actualizado_en)
  VALUES (@clave, @valor, datetime('now'))
  ON CONFLICT(clave) DO UPDATE SET valor = @valor, actualizado_en = datetime('now')
`);

class CredentialsManager {
  get(key) {
    const fromDb = getStmt.get(key);
    if (fromDb && fromDb.valor !== null && fromDb.valor !== '') return fromDb.valor;
    if (process.env[key] !== undefined && process.env[key] !== '') return process.env[key];
    return DEFAULTS[key] ?? null;
  }

  set(updates) {
    const tx = db.transaction((entries) => {
      for (const [clave, valor] of entries) {
        upsertStmt.run({ clave, valor: String(valor) });
      }
    });
    tx(Object.entries(updates));
    return this.getAll();
  }

  getDirectAdminConfig() {
    return {
      host: this.get('DA_HOST'),
      port: Number(this.get('DA_PORT')),
      domain: this.get('DA_DOMAIN'),
      username: this.get('DA_USERNAME'),
      loginKey: this.get('DA_LOGIN_KEY'),
    };
  }

  getThresholds() {
    return {
      warning: Number(this.get('THRESHOLD_WARNING')),
      critical: Number(this.get('THRESHOLD_CRITICAL')),
    };
  }

  getJwtSecret() {
    const secret = this.get('JWT_SECRET');
    if (!secret) {
      throw new Error(
        'Falta JWT_SECRET en el .env. Generá uno con: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"'
      );
    }
    return secret;
  }

  getSyncConfig() {
    return {
      cron: this.get('SYNC_CRON'),
      autoEnabled: this.get('SYNC_AUTO_ENABLED') === 'true',
    };
  }

  getAll({ redactSecrets = true } = {}) {
    const keys = Object.keys(DEFAULTS);
    const out = {};
    for (const key of keys) {
      const value = this.get(key);
      out[key] = redactSecrets && SECRET_KEYS.has(key) && value
        ? maskSecret(value)
        : value;
    }
    return out;
  }
}

function maskSecret(value) {
  if (!value || value.length < 6) return '••••••';
  return `${value.slice(0, 3)}${'•'.repeat(Math.max(4, value.length - 6))}${value.slice(-3)}`;
}

module.exports = new CredentialsManager();
