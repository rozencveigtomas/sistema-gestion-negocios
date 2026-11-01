> Actualización vigente: [simplificación y pruebas del 25/10/2026](SIMPLIFICACION.md). Las verificaciones remotas de abajo son históricas.

# Lista de avance

No se considera terminado un módulo por tener código o una pantalla. Cada etapa combina pruebas locales, comprobaciones contra Supabase y recorridos de navegador; los límites de publicación quedan separados.

| Etapa | Estado | Puerta de aceptación |
|---|---|---|
| 1. Base segura | Completada y probada | Auth, correo, jefe/empleado, aislamiento, rotación de clave, permisos y concurrencia aprobados |
| 2. Inventario | Completada y probada | Productos, catálogo, stock atómico, RLS, archivo e historial verificados localmente y en Supabase |
| 3. Operación comercial | Completada y probada | Ventas, ofertas, gastos, devoluciones, cancelación, idempotencia y concurrencia verificadas |
| 4. Control físico | Completada y probada | Recuento, recuento posterior, aprobación, auditoría y pausa de ventas aprobados |
| 5. Información gerencial | Completada y probada | Instantáneas, calendario, exportaciones, cálculos y aislamiento aprobados |
| 6. Suscripción | Interfaz retirada | El backend histórico queda sin ruta ni navegación; no se ofrece cobro desde esta versión |
| 7. Calidad | Completada para el MVP | Seguridad financiera, responsive, accesibilidad, manuales y regresión aprobados |

## Dependencia externa confirmada

El responsable creó el proyecto Supabase `vmfzriudgtyjjwqpbxyq` y entregó su URL, clave pública y correo del primer jefe. Se guardaron en `.env.local` (excluido de Git); no se duplican las claves ni el correo en este documento. La conexión a Auth respondió HTTP 200. El responsable inició sesión en el panel; la consulta a `pg_tables` confirmó cero tablas en los esquemas `public` y `private`. La clave privada está guardada únicamente en `.env.local` y se verificó acceso administrativo. No se ha autorizado publicación. Los nombres y colores siguen provisionales; la interfaz actual no ofrece suscripciones ni cobros.

### Migración aplicada

Se cargó la migración de etapa 1 en SQL Editor, rodeada por BEGIN/COMMIT. Tras la autorización explícita del responsable, se ejecutó y Supabase devolvió `Success. No rows returned`. La comprobación posterior de la API devuelve HTTP 401 / PostgreSQL 42501 para lecturas anónimas de `profiles` y `businesses`, en lugar del anterior error de tablas inexistentes. No volver a ejecutar esta migración: se aplicó manualmente y todavía no se registró con Supabase CLI.

### Comprobación remota con la clave pública

- `/auth/v1/settings`: HTTP 200; correo habilitado, confirmación de correo requerida, **registro público deshabilitado**.
- `profiles` y `businesses`: HTTP 401 / 42501; lectura anónima rechazada.
- Estas comprobaciones GET no crean usuarios. Posteriormente se habilitó el primer jefe y se solicitó su correo; también se crearon cuentas QA separadas sin enviarles correo.
- La conexión, Auth y las lecturas anónimas se volvieron a comprobar después de aplicar las migraciones y ajustes.

## Evidencia

La regresión final del MVP sumó 104 pruebas de PostgreSQL y validación aprobadas, con compilación y TypeScript. La regresión actual suma 108 pruebas locales (incluye la cobertura de estos cambios). Las pruebas remotas y de navegador autenticado están detalladas en `docs/PRUEBAS.md`; ninguna prueba omitida se cuenta como aprobada.

### Ajustes Auth autorizados y guardados

Registro público e inicio anónimo desactivados; confirmación de correo y cambio seguro de contraseña activados; mínimo de 12 caracteres. Site URL `http://127.0.0.1:3000` y redirección exacta `http://127.0.0.1:3000/auth/confirm?next=/contrasena`. El panel exige SMTP para editar plantillas: se implementó compatibilidad con el fragmento de las plantillas predeterminadas, con confirmación explícita, eliminación del fragmento del historial y validación de identidad/perfil en servidor. El primer comercio/jefe están creados y el responsable confirmó el acceso real; la base registra perfil activo, rol de jefe, último acceso y auditoría. La clave privada expuesta accidentalmente fue reemplazada y la anterior revocada; el servidor y los accesos QA se verificaron nuevamente con la nueva.

## Etapa 1: componentes y pruebas

- `supabase/migrations/202609150001_foundation.sql`: comercios, perfiles, invitaciones, auditoría, RLS, limitador de acceso y funciones autorizadas.
- `src/app/actions/`: login, recuperación, contraseña, configuración, empleados e invitaciones.
- `src/lib/supabase/`, `src/lib/auth.ts`, `src/proxy.ts`: clientes de servidor, identidad y renovación de sesión.
- `src/app/(private)/`: inicio por rol, configuración, empleados y cuenta.
- `src/components/`: formularios, navegación y Guía contextual.
- `scripts/bootstrap.ts`, `.env.example`, `supabase/config.toml`: primera habilitación y entorno sin secretos.
- Prueba local: `pnpm test`, `pnpm typecheck`, `pnpm build`; servidor `pnpm start` y después `pnpm test:e2e`.
- Prueba con servicio real: las migraciones y escenarios QA de las siete etapas están registrados en `docs/PRUEBAS.md`.

## Criterios originales de aceptación

| N.º | Criterio | Evidencia / estado |
|---|---|---|
| 1 | Acceso solo autenticado | RLS anónimo, Auth real, sesiones, recuperación y redirecciones aprobados |
| 2 | Paneles diferentes por rol | Jefe y empleado probados en navegador de escritorio y móvil |
| 3 | Guía arriba a la derecha | Acceso, teclado, foco, Escape y responsive probados |
| 4–12 | Productos, movimientos, ventas, devoluciones, ofertas, calendario y análisis | Implementados y aprobados en SQL local, Supabase QA y navegador autenticado |
| 13–14 | Datos del jefe y restricciones del empleado | Costos, gastos, ganancias y vista financiera reservados al jefe y probados |
| 15 | Diferencias requieren aprobación | Control físico, recuento posterior, aprobación, auditoría y pausa de ventas aprobados |
| 16–18 | Suscripciones y cobros | Fuera del alcance de la interfaz actual; backend histórico sin navegación |
| 19 | Separación de comercios | Aprobada en todas las tablas y vistas remotas QA |
| 20 | Teléfono y computadora | Rutas privadas y recorridos principales aprobados en escritorio y móvil |
| 21 | Auditoría de acciones críticas | Operaciones, inventarios, reportes, pagos y permisos dejan auditoría verificada |
| 22 | ARS y Buenos Aires | Cálculos, fechas, exportaciones y formatos locales aprobados |

## Decisión de continuidad

La etapa 1 quedó cerrada: el empleado recibió el correo, el primer enlace falló y el proveedor limitó el reenvío; se completó mediante un enlace administrativo temporal servido una sola vez en `127.0.0.1`, sin mostrarlo ni persistirlo. La invitación quedó aceptada, el perfil activo como empleado, la contraseña fue definida por el usuario, el acceso y la auditoría quedaron registrados, y `/empleados` y `/configuracion` redirigieron al inicio mientras `/cuenta` mostró solamente su perfil.

La etapa 2 está implementada: categorías, ubicaciones, proveedores privados, productos, costos separados, stock resumido protegido, entradas/salidas, stock bajo, archivo y movimientos con auditoría. La migración remota y los recorridos QA reales quedaron aprobados.

La etapa 3 está implementada: ventas con artículos y ofertas calculadas en servidor, reintentos idempotentes, cancelación con reintegro auditado, gastos restringidos al jefe, devoluciones vinculadas a artículos vendidos y destinos que controlan el reingreso al stock. La migración remota y las pruebas de concurrencia, aislamiento y límites quedaron aprobadas.

## Integración remota (15/09/2026)

- `scripts/verify-remote.mjs`: 14 comprobaciones aprobadas de Auth/PostgREST/RLS y concurrencia, con dos comercios `is_demo` y tres identidades QA de dominio inválido; no se enviaron correos QA. No se alteró el comercio del responsable.
- Cuatro pruebas de navegador del callback aprobadas: errores, confirmación explícita, limpieza del fragmento e inexistencia de tokens en localStorage/sessionStorage.
- Tres pruebas autenticadas de escritorio aprobadas: jefe/configuración/logout, empleado/rutas prohibidas y enlace real del proveedor. La ampliación de cambio de contraseña y móvil se registra en PRUEBAS.md.
- Credenciales QA excluidas de Git en `.local-data/remote-qa.json`; no subir ese archivo.
- `scripts/verify-remote-inventory.mjs`: 14 comprobaciones remotas aprobadas sobre RLS, movimientos atómicos, stock negativo, archivo y referencias cruzadas.
- `scripts/verify-remote-operations.mjs`: 15 comprobaciones remotas aprobadas sobre ventas, ofertas, idempotencia, concurrencia, costos, gastos, devoluciones, cancelación y lecturas anónimas.

## Cierre del MVP (16/09/2026)

Las etapas 4, 5 y 7 quedaron implementadas y verificadas; la interfaz de suscripción se retiró por decisión de producto. Las migraciones 202609160004_physical.sql, 202609160005_physical_hardening.sql, 202609160006_reporting.sql y 202609160007_subscriptions.sql se aplicaron en Supabase. La migración 202609160008_financial_column_permissions.sql separa los costos de las lecturas operativas: empleado puede consultar total y operación propia, mientras que el jefe obtiene costos mediante boss_sales_financials. La migración 202609160009_quantity_hardening.sql endurece las cantidades según la unidad y fue aplicada en Supabase.

- Control físico: recuento inicial, segundo conteo, rechazo con recuento posterior, aprobación identificada, auditoría y pausa de ventas.
- Información gerencial: resumen diario idempotente, calendario por comercio, comparación, productos bajo mínimo, exportación CSV/PDF y horario de Buenos Aires.
- Suscripción: la interfaz fue retirada. Las tablas y funciones históricas no se exponen desde la aplicación y no participan en el flujo operativo.
- Correcciones de testeo: cantidades enteras para unidades discretas, varios colores, etiquetas de Compras/Ventas, alta de ventas, ofertas con alcance explícito y explicación de prioridad; se redujeron lecturas costosas y se añadió timeout de red para evitar bloqueos.
- Ajustes posteriores: Catálogo/Categorías reemplaza la etiqueta de Productos; el alta se presenta como **Agregar producto** y ofrece opciones de color y talle/tamaño; se retiraron del alta los campos de stock mínimo/ideal, código de barras, modelo y variante; se quitaron observaciones de venta y conteo; los filtros de stock bajo y archivados se aplican automáticamente; los controles de incremento de campos numéricos están ocultos.
- Calidad y seguridad: 108 pruebas locales aprobadas; 14 + 14 + 15 + 10 + 5 + 7 + 4 comprobaciones remotas aprobadas; pruebas autenticadas de escritorio y móvil aprobadas; accesibilidad Axe sin violaciones en las pantallas cubiertas.

El alcance que falta para publicar es operativo: valores definitivos del negocio, SMTP y dominio, hosting, backups/restauración, monitoreo, Storage privado si se usan comprobantes y una eventual conexión comercial futura. Ninguno de esos pendientes se presenta como una función terminada.




