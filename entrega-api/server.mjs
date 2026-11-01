import http from 'node:http';
import {pathToFileURL} from 'node:url';

/** @typedef {{nombre: string, mensaje: string}} Mensaje */

// Cada instancia tiene su propio arreglo vacío. Nada se persiste al reiniciar.
export function crearServidor() {
  /** @type {Mensaje[]} */
  const mensajes = [];
  const responder = (res, estado, datos, headers = {}) => {
    res.writeHead(estado, {'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers});
    res.end(JSON.stringify(datos));
  };
  return http.createServer(async (req, res) => {
    try {
      const ruta = new URL(req.url, 'http://localhost').pathname;
      const metodos = ruta === '/mensajes' ? ['GET', 'POST'] : ['/', '/health', '/time'].includes(ruta) ? ['GET'] : null;
      if (!metodos) return responder(res, 404, {error: 'Ruta no encontrada.'});
      if (!metodos.includes(req.method)) return responder(res, 405, {error: 'Método no permitido.'}, {Allow: metodos.join(', ')});
      if (req.method === 'GET') {
        if (ruta === '/') return responder(res, 200, {mensaje: 'Bienvenido a la API', descripcion: 'API de mensajes almacenados en memoria. GET y POST /mensajes, GET /health y GET /time.', version: '1.0'});
        if (ruta === '/health') return responder(res, 200, {status: 'Estoy vivo!'});
        if (ruta === '/time') {
          const ahora = new Date();
          const hora = [ahora.getHours(), ahora.getMinutes(), ahora.getSeconds()].map(n => String(n).padStart(2, '0')).join(':');
          return responder(res, 200, {hora});
        }
        return responder(res, 200, mensajes);
      }
      if (req.headers['content-type']?.split(';')[0].trim().toLowerCase() !== 'application/json') {
        req.resume();
        return responder(res, 415, {error: 'Usá Content-Type: application/json.'});
      }
      const partes = [];
      let bytes = 0;
      for await (const parte of req) {
        bytes += parte.length;
        if (bytes > 65536) return responder(res, 413, {error: 'El cuerpo supera el límite de 64 KiB.'});
        partes.push(parte);
      }
      let datos;
      try { datos = JSON.parse(Buffer.concat(partes).toString('utf8')); }
      catch { return responder(res, 400, {error: 'El cuerpo debe contener JSON válido.'}); }
      if (!datos || Array.isArray(datos) || typeof datos !== 'object' || typeof datos.nombre !== 'string' || typeof datos.mensaje !== 'string' || !datos.nombre.trim() || !datos.mensaje.trim()) {
        return responder(res, 400, {error: 'nombre y mensaje son obligatorios y deben ser cadenas no vacías.'});
      }
      const nuevo = {nombre: datos.nombre.trim(), mensaje: datos.mensaje.trim()};
      mensajes.push(nuevo);
      return responder(res, 201, nuevo);
    } catch {
      if (!res.headersSent && !res.destroyed) responder(res, 500, {error: 'Error interno del servidor.'});
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const servidor = crearServidor();
  servidor.on('error', error => {
    console.error(error.code === 'EADDRINUSE' ? 'El puerto 8080 ya está ocupado.' : 'No se pudo iniciar el servidor.');
    process.exitCode = 1;
  });
  servidor.listen(8080, '127.0.0.1', () => console.log('API disponible en http://127.0.0.1:8080'));
}
