const credentials = require('../config/credentials');

class DirectAdminError extends Error {
  constructor(message, details) {
    super(message);
    this.name = 'DirectAdminError';
    this.details = details;
  }
}

function baseUrl() {
  const { host, port } = credentials.getDirectAdminConfig();
  return `https://${host}:${port}`;
}

function authHeader() {
  const { username, loginKey } = credentials.getDirectAdminConfig();
  if (!username || !loginKey) {
    throw new DirectAdminError('Faltan credenciales de DirectAdmin (usuario o login key). Configúralas antes de sincronizar.');
  }
  const token = Buffer.from(`${username}:${loginKey}`).toString('base64');
  return `Basic ${token}`;
}

function parseNumericOrUnlimited(value) {
  if (value === undefined || value === null || value === '') return null;
  if (value === 'unlimited') return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function parseFullList(rawText) {
  const top = new URLSearchParams(rawText);
  const cuentas = [];

  for (const [usuario, nestedRaw] of top.entries()) {

    if (!nestedRaw.includes('=')) continue;

    const nested = new URLSearchParams(nestedRaw);
    cuentas.push({
      usuario,
      mbCuota: parseNumericOrUnlimited(nested.get('quota')),
      mbUsado: Number(nested.get('usage_bytes') ?? nested.get('usage') ?? 0),
      mensajesLimite: parseNumericOrUnlimited(nested.get('limit')),
      mensajesEnviados: Number(nested.get('sent') ?? 0),
      suspendida: nested.get('suspended') === 'yes',
    });
  }

  return cuentas;
}

function throwIfError(rawText) {
  if (/(^|&)error=1(&|$)/.test(rawText)) {
    const params = new URLSearchParams(rawText);
    throw new DirectAdminError(
      params.get('text') || 'DirectAdmin devolvió un error',
      params.get('details') || rawText
    );
  }
}

async function fetchEmailAccounts() {
  const { domain } = credentials.getDirectAdminConfig();
  if (!domain) throw new DirectAdminError('Falta configurar DA_DOMAIN.');

  const url = `${baseUrl()}/CMD_API_POP?domain=${encodeURIComponent(domain)}&action=full_list`;

  const res = await fetch(url, {
    headers: { Authorization: authHeader() },
  });

  const rawText = await res.text();

  if (!res.ok) {
    throw new DirectAdminError(`DirectAdmin respondió HTTP ${res.status}`, rawText);
  }
  throwIfError(rawText);

  return parseFullList(rawText);
}

module.exports = {
  fetchEmailAccounts,
  parseFullList,
  DirectAdminError,
};
