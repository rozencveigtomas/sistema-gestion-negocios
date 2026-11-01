## Restablecimiento de acceso real · 26/10/2026

Supabase restaurado y endpoint Auth HTTP 200. Verificación real aprobada: contraseña solicitada válida, perfil de jefe activo, comercio activo, limitador de intentos y auditoría. Un navegador de prueba inició sesión en la aplicación local, abrió Administración y cerró únicamente esa sesión. No se guardaron contraseñas, tokens ni capturas de credenciales. Esta prueba verifica acceso; no acredita una repetición de las operaciones comerciales remotas.

## Verificación vigente · simplificación (26/10/2026)

La versión actual se describe en [SIMPLIFICACION.md](SIMPLIFICACION.md). Las verificaciones de etapas que siguen son históricas.

- PostgreSQL embebido y validaciones: **113/113**, sin omisiones.
- `pnpm typecheck` y `pnpm build`: correctos con Next.js 16.4.3.
- `pnpm test:ui`: **16/16** recorridos en escritorio y móvil, usando una API local con datos ficticios. Se comprobaron productos, colores/talles, compras sin observación, ventas, devoluciones, archivados, conteos, ofertas, gastos, permisos de interfaz y accesibilidad.
- Acceso público en servidor aislado sin configuración: **22/22** casos; las **22 pruebas remotas** se omitieron porque requieren el servicio Supabase real.
- Auditoría de producción: sin vulnerabilidades conocidas después de actualizar Next.js, Zod y source-map-js.
- La última prueba de Supabase real devolvió host desconocido. No se certifica integración remota actual.
- Las dos suites de navegador escriben en carpetas diferentes para no borrar trazas de la otra ejecución.

# Evidencia de pruebas

## Resultado local

| Verificación | Resultado |
|---|---|
| PostgreSQL + validaciones (`pnpm test`) | **108 aprobadas, 0 fallidas, 0 omitidas** |
| Compilación de producción (`pnpm build`) | Aprobada |
| TypeScript estricto (`pnpm typecheck`) | Aprobado |
| Dependencias de producción (`pnpm audit --prod`) | Sin vulnerabilidades conocidas en la consulta realizada |
| Navegador Edge, computadora y teléfono emulado | Pruebas públicas y autenticadas aprobadas; detalle actual abajo |

## Qué se ejecutó realmente

La migración SQL se aplicó desde cero en PostgreSQL embebido (PGlite 0.5.8). Las pruebas cambian entre roles `anon`, `authenticated` y `service_role`, y entre identidades de dos comercios. No inspeccionan solamente el texto de las políticas: ejecutan SELECT, UPDATE y funciones SQL, y verifican los rechazos y cambios persistidos dentro de transacciones. Cada prueba revierte su transacción para mantenerse aislada.

El esquema `auth.users` y `auth.uid()` de esas pruebas es un arnés mínimo. No crea sesiones reales, no verifica JWT, no envía correos y no prueba PostgREST. PGlite usa una conexión: no acredita comportamiento bajo múltiples conexiones concurrentes.

Se ejecutó Next.js en modo de producción en `http://127.0.0.1:3000`, sin credenciales de Supabase. Playwright abrió Microsoft Edge headless en computadora y con emulación de iPhone 13 (motor Chromium). Se comprobaron rutas privadas cerradas, mensajes reales de falta de configuración, recuperación deshabilitada, errores de enlaces inválidos, Guía, teclado, foco, Escape, ancho de 320 px y texto ampliado al 200%. Axe revisó WCAG 2 A/AA y 2.1 AA en las pantallas públicas y el diálogo. Se inspeccionaron visualmente capturas de computadora y teléfono.

## Fallos encontrados y correcciones

1. Inicio de sesión: la consulta de perfil no estaba limitada por identidad y un jefe podía devolver múltiples filas. Se cambió a `auth_user_id` de la sesión y se verificó con Auth real.
2. Dependencias: el instalador no ejecutó inicialmente el postinstall de esbuild. Se autorizó ese paquete en `pnpm-workspace.yaml`, se repitió la instalación y luego se pudieron ejecutar las pruebas.
3. Accesibilidad: un enlace turquesa sobre fondo claro tenía contraste 4.38:1. Se oscureció la variable de color y la prueba pasó.
4. Prueba de error: el selector encontraba dos alertas porque Next.js agrega su anunciador accesible. Se precisó el selector al mensaje esperado; no se eliminó el anunciador.
5. Revisión visual móvil: se retiró el bloque de presentación para que el formulario de acceso aparezca antes y evitar texto unido al ocultar saltos de línea.

## Cobertura SQL

RLS en tablas privadas; denegación anónima; usuario sin perfil; aislamiento entre comercios; empleado solo propio; intentos de escalamiento directo y por RPC; configuración restringida; imposibilidad de omitir auditoría; modificación cruzada rechazada; snapshots de configuración; rollback de errores; último jefe protegido; transferencia de responsabilidad; desactivación y reactivación conservando identidad; comercio inactivo; auditoría inmutable; último acceso; invitaciones autorizadas, verificadas, idempotentes, vencidas, revocadas y cruzadas; bootstrap restringido y atómico; limitación compartida de intentos; valores nulos/roles desconocidos; inyección tratada como texto; search_path y privilegios de funciones.

## Histórico de la etapa 1

- SMTP propio para producción; la entrega predeterminada llegó, pero el primer enlace fue inválido y el proveedor bloqueó el reenvío por límite temporal.
- Invitación en otro navegador y definición de contraseña.
- Caducidad temporal y renovación automática de sesión. Inicio/cierre ya probados remotamente.
- Vencimiento temporal real del enlace. Recuperación, reutilización y revocación de otras sesiones ya probadas.
- Completar teclado y navegación del menú móvil y pantallas de empleados/cuenta. Configuración e inicio ya probados con usuarios QA.

Los puntos anteriores explican decisiones y fallos históricos. La etapa 1 quedó cerrada; las etapas posteriores tienen cobertura específica en las secciones siguientes. Backups, restauración, monitorización, SMTP y Storage siguen siendo tareas de publicación, no funciones declaradas como probadas.

## Primera conexión remota (histórico, antes de la migración)

Se ejecutó `scripts/check-connection.mjs` con las variables públicas de `.env.local`. El registro público sigue habilitado (`disable_signup: false`), la confirmación por correo está activa y la API no encuentra `public.profiles` ni `public.businesses`. Falta aplicar la configuración privada y la migración. Solo se realizaron solicitudes GET, sin crear registros ni probar contraseñas.

## Migración remota autorizada

La consulta previa a `pg_tables` confirmó cero tablas en `public` y `private`. Con autorización explícita del responsable se ejecutó la migración de etapa 1 en una transacción desde SQL Editor. Resultado: `Success. No rows returned`. Posteriormente, la API rechazó las lecturas anónimas de `profiles` y `businesses` con HTTP 401 y código PostgreSQL 42501. La configuración Auth quedó guardada y el inicio de sesión real se verificó en navegador.

## Integración remota actual: 15/09/2026

- Migración aplicada y Auth guardado: registro público/anónimo desactivado, confirmación de correo y cambio seguro activados, 12 caracteres, origen local y callback exacto.
- `.env.local` y credenciales QA excluidos de Git. Bootstrap real creó el primer comercio y jefe. Tras reiniciar el servidor con acceso de red y solicitar un enlace nuevo, el responsable confirmó que pudo entrar. Una consulta administrativa comprobó perfil activo, rol de jefe, `last_login_at` y auditoría `session.login`.
- `scripts/verify-remote.mjs`: **14 comprobaciones remotas aprobadas**, utilizando Auth y PostgREST reales, dos comercios QA marcados `is_demo` y tres usuarios de dominio inválido. Aislamiento, escalamiento, persistencia/auditoría, perfil/comercio inactivos, último jefe, invitaciones concurrentes y limitador concurrente. No se enviaron correos QA ni se modificó el comercio del responsable.
- Callback: **4 pruebas de navegador aprobadas** (dos casos en escritorio/móvil): errores, limpieza del fragmento, confirmación explícita, ausencia de almacenamiento persistente de tokens.
- Integración de navegador: jefe/configuración persistida/logout, empleado/rutas restringidas y enlace real de recuperación aprobados en escritorio y móvil. Se amplió el caso de recuperación para cambiar la contraseña QA, comprobar rechazo del refresh token anterior y del enlace reutilizado; aprobado en móvil y escritorio. Trazas, capturas y videos desactivados en estas pruebas para evitar registrar credenciales.
- Fallos corregidos: bootstrap con top-level await incompatible con tsx/CJS; fragmento nuevo no procesado al reutilizar pestaña; limitador mostraba agotamiento ante fallo de conexión (ahora informa indisponibilidad); rol oculto en móvil; menú móvil cerrado expuesto a lectores de pantalla; etiqueta accesible de nueva contraseña.
- Compilación y TypeScript aprobados con las correcciones. Regresión local: 46/46, sin omisiones.

Estas pruebas QA no equivalían por sí solas a la entrega real de correo; esa entrega y la aceptación posterior se verificaron en el cierre indicado debajo.

## Cierre de la etapa 1

La invitación real a un segundo correo llegó y fue registrada. Debido al enlace inválido y al límite 429 del proveedor, se generó un enlace temporal administrativo de recuperación, se mantuvo únicamente en memoria y se sirvió una vez por `127.0.0.1`; no apareció en el chat ni en archivos. El usuario definió la contraseña. La base confirmó perfil activo `employee`, invitación `accepted`, coincidencia de `accepted_by`, último acceso y auditorías `invitation.accepted` y `session.login`. En navegador se confirmó el panel de empleado, redirección de `/empleados` y `/configuracion`, y acceso a `/cuenta` propia.

## Etapa 2: pruebas locales y remotas

La migración `202609160002_inventory.sql` pasó 15 pruebas nuevas. Comprueban RLS en seis tablas; denegación anónima; costos y proveedores invisibles al empleado; aislamiento entre comercios; ausencia de escrituras directas; entradas/salidas atómicas con auditoría; rollback por stock insuficiente; motivos sensibles solo para jefe; aprobación identificada; SKU único; referencias del mismo comercio; archivo sin borrado; y privilegios/search_path. La migración se aplicó en Supabase y `scripts/verify-remote-inventory.mjs` aprobó 14 comprobaciones reales con datos QA `is_demo`.

## Etapa 3: operación comercial

La migración `202609160003_operations.sql` crea ventas, artículos, ofertas, gastos y devoluciones con RLS. Las funciones del servidor validan fechas, cantidades, medios de pago y referencias, calculan descuentos y costo histórico, bloquean el producto durante la operación, actualizan stock e inventario dentro de la misma transacción y usan claves idempotentes para reintentos. La cancelación exige jefe y motivo; la devolución controla cantidades ya devueltas y solo reingresa stock cuando corresponde.

La regresión local completa suma **108 aprobadas**. `scripts/verify-remote-operations.mjs` aprobó **15 comprobaciones remotas**: oferta vigente, reintento sin duplicar, dos ventas simultáneas, falta de stock, aislamiento entre comercios, costos privados, gasto restringido, devolución idempotente, devolución excedida, aprobación de disposición sensible, cancelación y acceso anónimo. Los datos QA son comercios separados marcados `is_demo`; no se enviaron correos.

TypeScript y compilación de producción aprobaron después de agregar `/ventas`, `/gastos`, `/devoluciones` y `/ofertas`. Las rutas se cargaron con una sesión real de empleado en el navegador; los estados vacíos y consultas relacionales no mostraron errores.

## Rotación de clave privada

La clave privada expuesta accidentalmente se reemplazó por una nueva y el responsable revocó la anterior. Se reinició el servidor con el entorno actualizado. La conexión administrativa, el acceso real del jefe con persistencia y cierre de sesión, y el acceso del empleado con rutas restringidas volvieron a aprobarse. El valor de la clave nueva no se registró en documentación ni resultados de prueba.

## Etapa 4: control físico

La migración 202609160004_physical.sql y el endurecimiento 202609160005_physical_hardening.sql se aplicaron en Supabase. La suite local verifica fotografía de stock, conteo por empleado, recuento posterior, diferencia pendiente, aprobación identificada, auditoría, referencias cruzadas y bloqueo de ventas durante una sesión pausada. scripts/verify-remote-physical.mjs aprobó **10 comprobaciones remotas** con un producto QA aislado.

## Etapa 5: información gerencial

La migración 202609160006_reporting.sql crea snapshots diarios idempotentes y limita fechas futuras o inválidas. scripts/verify-remote-reporting.mjs aprobó **5 comprobaciones remotas**: conciliación del resumen, regeneración sin duplicados, bloqueo al empleado, aislamiento de otro comercio y rechazo de escrituras directas. La interfaz agrega calendario, comparación, productos bajo mínimo y exportación CSV/PDF; las fechas se calculan en horario de Buenos Aires.

## Etapa 6: suscripción retirada

La migración 202609160007_subscriptions.sql y su suite histórica permanecen para no borrar datos, pero la sección fue retirada de la navegación y la ruta antigua redirige a Inicio. No se ofrece configuración ni cobro desde la interfaz actual.

## Etapa 7: privacidad y regresión

La migración 202609160008_financial_column_permissions.sql revoca costos de las lecturas operativas y los expone al jefe mediante boss_sales_financials. scripts/verify-remote-financial-permissions.mjs aprobó **4 comprobaciones remotas**: empleado sin costos, jefe con costos autorizados, aislamiento por rol/comercio y denegación anónima. La regresión actual local quedó en **108/108**; TypeScript y build de producción pasan. Playwright aprobó **22/22** casos públicos sin credenciales en puerto aislado y **10/10** casos autenticados de control físico, reportes y la ruta retirada de suscripción en escritorio y móvil, además de los recorridos de Auth y operaciones registrados arriba. Axe no encontró violaciones en las pantallas cubiertas.

## Correcciones posteriores al testeo (16/09/2026)

- La migración `202609160009_quantity_hardening.sql` fija las unidades discretas (`unidad`, `caja`, `paquete`) a cantidades enteras en productos, movimientos, ventas, devoluciones y conteos; las unidades medidas conservan hasta tres decimales. Los formularios cambian `step` y mínimo según la unidad.
- El alta se presenta como **Agregar producto**; color y talle/tamaño ofrecen opciones habituales y una alternativa personalizada. Los colores se editan como etiquetas múltiples, se deduplican y se muestran como chips. Las pantallas de historial usan **Compras** y **Ventas**.
- El alta de venta incorporó el campo de fecha que exigía el esquema y la oferta envía siempre ambos alcances (el no elegido queda vacío); esto elimina los errores de validación que impedían registrar.
- El inventario explica el flujo de fotografía, conteo, recuento, aprobación, auditoría y pausa de ventas. La navegación de Suscripción fue retirada y la ruta anterior redirige a Inicio.
- Para el lag se evitaron lecturas globales de artículos vendidos, se agregaron límites a consultas, se omitió la renovación de Auth en rutas públicas y se estableció un tiempo máximo de red para Supabase. La prueba autenticada de ventas/ofertas y formulario de colores quedó en **3/3** y la redirección de Suscripción en **4/4** (2 escritorio y 2 móvil).
- La comprobación remota de calidad de esta migración aprobó **3/3** casos: fracción rechazada para unidad, decimal admitido para kg y creación de oferta con alcance explícito.

## Límites de esta evidencia

Los datos QA se identifican con is_demo y no sustituyen una carga inicial real del comercio. No se enviaron correos QA ni se procesaron cobros. Antes de publicar se deben configurar SMTP, dominio/hosting, backups y restauración, monitoreo, política de incidentes y Storage privado si se guardan comprobantes. La app no ofrece pagos ni suscripciones desde esta versión; cualquier integración futura requiere decisión comercial y nuevas pruebas.





