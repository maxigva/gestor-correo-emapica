require('dotenv').config();
const readline = require('readline');
const db = require('../src/db/database');
const { crearUsuario } = require('../src/services/auth');

function crearLectorDeLineas() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const cola = [];
  const esperando = [];

  rl.on('line', (linea) => {
    if (esperando.length) esperando.shift()(linea);
    else cola.push(linea);
  });

  return {
    siguiente(prompt) {
      if (prompt) process.stdout.write(prompt);
      return new Promise((resolve) => {
        if (cola.length) resolve(cola.shift());
        else esperando.push(resolve);
      });
    },
    cerrar() { rl.close(); },
  };
}

function leerPasswordOculta(prompt) {
  return new Promise((resolve) => {
    process.stdout.write(prompt);
    const stdin = process.stdin;
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');

    let input = '';
    const onData = (char) => {
      if (char === '\n' || char === '\r' || char === '\u0004') {
        stdin.setRawMode(false);
        stdin.pause();
        stdin.removeListener('data', onData);
        process.stdout.write('\n');
        resolve(input);
      } else if (char === '\u0003') {
        process.stdout.write('\n');
        process.exit(1);
      } else if (char === '\u007f' || char === '\b') {
        input = input.slice(0, -1);
      } else {
        input += char;
      }
    };
    stdin.on('data', onData);
  });
}

async function main() {
  const lector = crearLectorDeLineas();

  const usuario = (await lector.siguiente('Usuario (para loguearse en el panel): ')).trim();

  let password;
  if (process.stdin.isTTY) {
    lector.cerrar();
    password = await leerPasswordOculta('Contraseña (mínimo 8 caracteres): ');
  } else {
    password = (await lector.siguiente('Contraseña (mínimo 8 caracteres): ')).trim();
    lector.cerrar();
  }

  try {
    await crearUsuario(usuario, password);
    console.log(`✅ Usuario "${usuario}" creado. Ya puede loguearse en el panel.`);
    process.exitCode = 0;
  } catch (err) {
    console.error('❌', err.message);
    process.exitCode = 1;
  } finally {
    db.close();
  }
}

main();
