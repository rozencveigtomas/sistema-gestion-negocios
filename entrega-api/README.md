# Entrega: API de mensajes en memoria

Requiere Node.js 18 o posterior. Esta carpeta es independiente de la aplicación de gestión comercial: no usa Supabase, bases de datos, archivos para mensajes ni paquetes externos.

Desde esta carpeta:

```sh
node server.mjs
```

Escucha en **http://127.0.0.1:8080**. Para detenerla: Ctrl+C. Los mensajes se pierden al detener o reiniciar el proceso.

| Método y ruta | Respuesta |
| --- | --- |
| GET / | 200: bienvenida, descripción y versión |
| GET /health | 200: `{"status":"Estoy vivo!"}` |
| GET /time | 200: hora local del sistema, `{"hora":"14:30:33"}` |
| POST /mensajes | 201: mensaje registrado; 400 para JSON inválido o campos incompletos |
| GET /mensajes | 200: arreglo completo de mensajes, inicialmente `[]` |

POST requiere `Content-Type: application/json` y este cuerpo:

```json
{"nombre":"Juan","mensaje":"Hola mundo"}
```

Ambos campos deben ser strings con contenido. Se ignoran campos adicionales. Las respuestas, incluidos los errores 400, 404, 405, 413, 415 y 500, usan JSON. Se limita cada cuerpo a 64 KiB.

La consigna pide objetos JSON en general, pero específicamente un arreglo para GET /mensajes: esta implementación conserva ese arreglo y utiliza objetos en las demás rutas.

Pruebas reales HTTP (levantan servidores temporales y verifican rutas, estados, JSON, validación y aislamiento de memoria):

```sh
node --test server.test.mjs
```

Ejemplo en PowerShell, con el servidor iniciado:

```powershell
Invoke-RestMethod http://127.0.0.1:8080/health
Invoke-RestMethod http://127.0.0.1:8080/mensajes -Method Post -ContentType 'application/json' -Body '{"nombre":"Juan","mensaje":"Hola mundo"}'
Invoke-RestMethod http://127.0.0.1:8080/mensajes
```

Para entregar este ejercicio alcanza con esta carpeta. No incluyas `.env.local` ni credenciales de la aplicación comercial.
