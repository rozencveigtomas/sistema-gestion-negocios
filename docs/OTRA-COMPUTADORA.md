# Usar el sistema en otra computadora Windows

Esta instalación ejecuta la aplicación en la nueva computadora y se conecta al mismo Supabase por Internet. Comparte productos, ventas y cuentas con la instalación actual. No necesita PostgreSQL ni Docker locales. No publica la aplicación.

## 1. Copiar el proyecto

Descargá el ZIP del proyecto y extraelo, por ejemplo, en `C:\GestionComercio`. Si lo descargás desde GitHub, extraé también el ZIP antes de continuar. La carpeta correcta contiene `package.json`, `pnpm-lock.yaml`, `src` y `.env.example`.

No copies `node_modules` ni `.next`: se generan en la computadora nueva.

## 2. Instalar Node.js

Instalá Node.js de la rama **24 LTS** desde https://nodejs.org/en/download. La instalación actual se comprobó con Node 24.22.1. Cerrá y abrí PowerShell después de instalarlo.

```powershell
node --version
npm.cmd --version
```

Si los comandos no se reconocen, verificá la instalación y volvé a abrir la terminal.

## 3. Instalar pnpm

Usamos la versión comprobada en este proyecto:

```powershell
npm.cmd install --global pnpm@11.25.0
pnpm.cmd --version
```

Usamos los comandos `.cmd` para evitar el bloqueo de scripts de PowerShell sin cambiar su política de seguridad. Referencia: https://pnpm.io/installation.

## 4. Abrir la carpeta y configurar las claves

```powershell
cd C:\GestionComercio
```

Si elegiste otra carpeta, cambiá esa ruta. Verificá que `package.json` esté directamente allí.

En la computadora actual, copiá el archivo **`.env.local`** mediante un medio privado y colocalo junto a `package.json` en la nueva computadora. Contiene una clave administrativa: solo debe estar en computadoras de confianza bajo tu control. No lo subas a GitHub ni lo envíes por chat. El ZIP entregado no lo incluye.

Si preferís configurarlo manualmente, copiá `.env.example` como `.env.local` únicamente si todavía no existe y completá estas variables desde el mismo proyecto Supabase:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://vmfzriudgtyjjwqpbxyq.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=PEGAR_CLAVE_PUBLICA
SUPABASE_SECRET_KEY=PEGAR_CLAVE_PRIVADA
APP_URL=http://127.0.0.1:3000
```

Los textos PEGAR_CLAVE son ejemplos, no claves válidas. Guardá como `.env.local`, no `.env.local.txt`. No sobrescribas una configuración existente sin revisarla. Las variables `INITIAL_*` son de aprovisionamiento inicial; no necesitás completarlas para usar el comercio existente.

**No ejecutes `pnpm bootstrap`, migraciones ni crees otro proyecto Supabase para este traslado.** La base y el jefe ya existen.

## 5. Instalar y comprobar

Ejecutá cada comando y continuá solo si termina sin errores:

```powershell
pnpm.cmd install --frozen-lockfile
pnpm.cmd typecheck
pnpm.cmd test
node --env-file=.env.local scripts/check-connection.mjs
pnpm.cmd build
```

La comprobación de conexión debe mostrar `auth` con estado 200 y `serverSecretConfigured: true`. Los estados 401 de `profiles` y `businesses` en este script son esperables: consulta sin iniciar sesión y las tablas son privadas. No acreditan por sí solos que el acceso autenticado funcione.

Si hay un error, resolvelo antes del siguiente paso. No compartas el contenido de `.env.local` al pedir ayuda.

## 6. Iniciar y probar el acceso

```powershell
pnpm.cmd start
```

Dejá esa terminal abierta. Entrá desde el navegador de esa misma computadora a:

http://127.0.0.1:3000/acceso

Ingresá con tu cuenta habitual. Comprobá que Inicio y Catálogo muestren los datos esperados y, con una cuenta de jefe, que puedas abrir Administración. No se guarda la contraseña en esta guía.

## 7. Iniciar los próximos días

```powershell
cd C:\GestionComercio
pnpm.cmd start
```

No hace falta instalar ni compilar cada día. Para detener el servidor presioná `Ctrl+C`. Al cambiar código o variables, detenelo, ejecutá `pnpm.cmd build` y volvé a iniciarlo.

## 8. Qué significa la dirección local

`127.0.0.1` siempre apunta a la computadora donde abrís el navegador. En esta modalidad cada computadora inicia su propia copia de la aplicación; ambas usan los datos compartidos en Supabase. Necesitan Internet para ingresar y operar.

Abrí los enlaces de invitación o recuperación en una computadora con el servidor iniciado y usá siempre `http://127.0.0.1:3000`, sin alternar con `localhost`. Que el servidor esté encendido en otra computadora no alcanza para abrir un enlace local en tu teléfono.

Para que empleados entren desde cualquier equipo sin instalar nada, hace falta un despliegue con dirección HTTPS y configurar las redirecciones de Auth para esa dirección. Eso es una publicación separada.

## Problemas habituales

- **Puerto 3000 ocupado:** cerrá la otra instancia de este mismo sistema y volvé a iniciar; no cierres procesos desconocidos. Mantener este puerto conserva la dirección configurada para los correos.
- **No pudimos conectar:** verificá Internet, que Supabase esté activo y las variables. Repetí el script de conexión.
- **Falta configuración:** verificá nombre, ubicación y contenido de `.env.local`; luego recompilá y reiniciá.
- **Enlace inválido o vencido:** solicitá un enlace nuevo y abrilo una sola vez con el servidor local iniciado.
- **No se encuentra package.json:** estás en una carpeta equivocada o en el nivel superior del ZIP.

## Alcance de la verificación

En la computadora actual se comprobaron el acceso HTTP 200 en `/acceso`, la disponibilidad de Auth de Supabase y las versiones Node 24.22.1/pnpm 11.25.0. La instalación en otra computadora debe verificarse allí con los pasos 5 y 6; todavía no fue ejecutada en ese equipo.
