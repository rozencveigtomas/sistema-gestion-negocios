import {test} from 'node:test';
import assert from 'node:assert/strict';
import {crearServidor} from './server.mjs';

test('API HTTP completa y almacenamiento exclusivamente en memoria', async () => {
  const servidor = crearServidor();
  await new Promise(resolve => servidor.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${servidor.address().port}`;
  async function pedir(ruta, estado, opciones) {
    const res = await fetch(base + ruta, opciones);
    assert.equal(res.status, estado);
    assert.match(res.headers.get('content-type'), /^application\/json/);
    return res.json();
  }
  const post = datos => ({method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(datos)});
  try {
    assert.equal((await pedir('/', 200)).version, '1.0');
    assert.equal((await pedir('/health', 200)).status, 'Estoy vivo!');
    assert.match((await pedir('/time', 200)).hora, /^\d{2}:\d{2}:\d{2}$/);
    assert.deepEqual(await pedir('/mensajes', 200), []);
    const mensaje = {nombre: 'Juan', mensaje: 'Hola mundo'};
    assert.deepEqual(await pedir('/mensajes', 201, post(mensaje)), mensaje);
    assert.deepEqual(await pedir('/mensajes', 200), [mensaje]);
    for (const datos of [{nombre: 'Juan'}, {mensaje: 'Hola'}, {}, null, [], {nombre: 1, mensaje: 'Hola'}, {nombre: ' ', mensaje: 'Hola'}, {nombre: 'Juan', mensaje: ''}]) {
      assert.ok((await pedir('/mensajes', 400, post(datos))).error);
    }
    await pedir('/mensajes', 400, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: '{'});
    await pedir('/mensajes', 415, {method: 'POST', body: 'texto'});
    await pedir('/mensajes', 413, post({nombre: 'Juan', mensaje: 'x'.repeat(70000)}));
    await pedir('/desconocida', 404);
    await pedir('/mensajes', 405, {method: 'DELETE'});
    await pedir('/health', 405, {method: 'POST'});
    assert.deepEqual(await pedir('/mensajes', 200), [mensaje]);
    const segundo = crearServidor();
    await new Promise(resolve => segundo.listen(0, '127.0.0.1', resolve));
    try {
      const res = await fetch(`http://127.0.0.1:${segundo.address().port}/mensajes`);
      assert.deepEqual(await res.json(), []);
    } finally { await new Promise(resolve => segundo.close(resolve)); }
  } finally { await new Promise(resolve => servidor.close(resolve)); }
});
