# Conectar Supabase y habilitar al primer jefe

El proyecto ya existe, la migración está aplicada y los ajustes Auth están guardados. Falta completar la clave privada local y verificar el flujo real. Esta guía sirve también para futuros entornos vacíos. No se publicó la aplicación.

## 1. Crear el proyecto

Abrí https://supabase.com/dashboard y creá un proyecto dedicado. Elegí una región cercana a los usuarios y guardá la contraseña de PostgreSQL en tu gestor de contraseñas. Elegí el plan desde Supabase según lo que muestre actualmente; este proyecto no asume precios ni límites del proveedor.

Desde los ajustes del proyecto obtené:

- URL del proyecto → `NEXT_PUBLIC_SUPABASE_URL`.
- Clave publishable (o anon heredada) → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- Clave secret (o service_role heredada) → `SUPABASE_SECRET_KEY`, exclusivamente servidor.

Copiá `.env.example` a `.env.local` y completá los valores ahí. **Nunca pongas la clave secret en una variable NEXT_PUBLIC_, un repositorio, correo o chat.** `APP_URL` debe ser el origen real del navegador; para las pruebas incluidas: `http://127.0.0.1:3000`. No mezcles localhost y 127.0.0.1 durante el flujo de autenticación.

## 2. Aplicar la migración

En un proyecto vacío, ejecutá el contenido de `supabase/migrations/202609150001_foundation.sql` desde SQL Editor como administrador. Alternativamente, vinculá el proyecto con Supabase CLI y ejecutá `supabase db push`.

No ejecutes la migración sobre una base compartida o existente sin revisar su esquema. La migración no es idempotente: el seguimiento de versiones lo lleva Supabase CLI. No se crean tablas desde el navegador ni en cada inicio de la aplicación.

## 3. Auth: acceso solo por invitación

En Authentication:

1. Desactivá el registro de nuevos usuarios y el inicio anónimo. Los usuarios se invitan con la API administrativa desde una acción autorizada del jefe.
2. Activá confirmación de correo y cambio seguro de contraseña; mínimo de 12 caracteres.
3. Configurá expiración del JWT en 3600 segundos y revisá los límites de Auth. El código también limita a 8 intentos por correo cada 15 minutos, compartidos en la base y sin guardar correos en claro en ese registro.
4. Configurá Site URL con `APP_URL` y permití la ruta exacta `APP_URL/auth/confirm` (y sus parámetros) como redirección. Agregá solo los orígenes concretos usados en desarrollo y producción.
5. Para uso real, configurá SMTP y verificá la entrega. Los límites o destinatarios habilitados del correo de prueba de Supabase pueden impedir invitar empleados.

`supabase/config.toml` documenta la configuración local; **no aplica automáticamente esos ajustes al proyecto remoto**. Deben comprobarse en el dashboard.

## 4. Plantillas de correo

Las plantillas predeterminadas pueden devolver tokens en el fragmento URL. `/auth/confirm` conserva ese fragmento al redirigir a `/auth/complete`, que lo quita del historial, lo conserva solo en memoria y pide confirmación. Una acción del servidor verifica sesión, identidad y permisos antes de habilitar la contraseña. Esta compatibilidad está implementada; falta validar la entrega y el flujo real.

El panel actual exige configurar SMTP para editar plantillas. Si se habilita, estas plantillas opcionales usan token_hash sin depender del verificador PKCE del navegador que invitó:

**Invite user:**

```html
<p>Te invitaron a tu comercio. Abrí este enlace para elegir tu contraseña:</p>
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite&next=/contrasena">Aceptar invitación</a>
```

**Reset password:**

```html
<p>Recibimos una solicitud para elegir una nueva contraseña:</p>
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/contrasena">Cambiar contraseña</a>
```

La ruta admite también intercambio PKCE mediante `code`. Rechaza redirecciones externas. El enlace debe tratarse como una credencial temporal. Los scanners de correo pueden consumir enlaces de un solo uso: si sucede, deberá añadirse una pantalla intermedia de confirmación antes de activar producción.

## 5. Aprovisionar el primer comercio

Completá en `.env.local`: `INITIAL_ADMIN_EMAIL`, `INITIAL_ADMIN_NAME`, `INITIAL_BUSINESS_NAME`. Después ejecutá:

```powershell
pnpm bootstrap
```

El script prepara la identidad, crea comercio + perfil + auditoría mediante una función atómica y solicita el correo de contraseña. No imprime contraseñas, tokens ni enlaces de acceso. La creación de Auth, la transacción de PostgreSQL y el envío de correo son servicios distintos: si falla un paso, el script informa qué pudo haber quedado creado y no borra cuentas automáticamente. El flujo completo del primer jefe todavía debe verificarse en Supabase real.

No usar el script para empleados. El jefe los invita desde Empleados. Un usuario nuevo no adquiere rol por los metadatos de Auth ni por enviarlo en una solicitud.

## 6. Prueba obligatoria de conexión

Registrar evidencia de:

- Primer correo recibido, enlace abierto en otro navegador, contraseña establecida y acceso correcto.
- Registro público desactivado.
- Invitación de empleado recibida, aceptada y asociada al comercio correcto.
- Diferencia real entre panel de jefe y empleado; acceso directo del empleado a `/configuracion` rechazado.
- Configuración guardada y conservada al recargar y volver a iniciar sesión.
- Recuperación recibida; enlace vencido/reutilizado rechazado.
- Cierre de sesión, expiración y recuperación de sesiones.
- Desactivación de empleado y rechazo con una sesión previamente abierta.
- Dos comercios en el mismo proyecto, sin lectura ni escritura cruzada.
- Cambios de rol y conservación del último jefe bajo solicitudes simultáneas.

Ese recorrido fue la puerta histórica de la etapa 1; las etapas posteriores y sus comprobaciones quedan registradas en docs/PRUEBAS.md.

## Antes de publicar

Definir nombre y administrador reales; completar SMTP y soporte; establecer políticas de backup/restauración; configurar dominio HTTPS, orígenes exactos y sesiones; decidir hosting y pedir autorización de publicación. La interfaz de suscripción fue retirada; las tablas históricas no participan del flujo operativo. Cualquier checkout futuro requiere una decisión comercial, integración explícita y nuevas pruebas.

